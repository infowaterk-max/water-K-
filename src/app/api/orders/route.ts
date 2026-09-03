import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { placeTenantOrder } from '@/lib/orders/tenant-checkout';
import { getPaymentGatewayAdapter, getShippingProviderAdapter } from '@/lib/integrations/adapters';
import {
  attachPaymentAttemptReference,
  createPaymentAttempt,
  getLatestPaymentAttempt,
  markPaymentAttemptRequiresAction,
} from '@/lib/integrations/payment-attempts';
import { getCommunicationIdentity } from '@/lib/communication/identity';
import { enqueueExternalLogisticsOrderEmail } from '@/lib/integrations/external-logistics';

const providerCode = z.string().trim().regex(/^[a-z0-9_-]{2,80}$/);
const checkoutSchema = z.object({
  customerType: z.enum(['retail', 'company', 'reseller']),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  companyName: z.string().trim().max(200).optional(),
  taxNumber: z.string().trim().max(40).optional(),
  billingPostcode: z.string().trim().min(2).max(20),
  billingCity: z.string().trim().min(2).max(120),
  billingAddress: z.string().trim().min(2).max(300),
  sameAddress: z.enum(['true', 'false']).default('true'),
  shippingPostcode: z.string().trim().max(20).optional(),
  shippingCity: z.string().trim().max(120).optional(),
  shippingAddress: z.string().trim().max(300).optional(),
  shippingProvider: providerCode,
  shippingKind: z.string().optional(),
  paymentProvider: providerCode,
  parcelPointId: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
  couponCode: z.string().trim().max(32).optional(),
  legalAccepted: z.literal('true'),
});
const schema = z.object({
  checkout: checkoutSchema,
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(99) })).min(1).max(30),
});

type PlaceOrderResult = {
  order_id: string;
  order_number: string;
  subtotal_gross_huf: number;
  discount_gross_huf: number;
  shipping_gross_huf: number;
  total_gross_huf: number;
  coupon_code: string | null;
  idempotency_replayed?: boolean;
};

export async function POST(request: Request) {
  const idempotencyKey = (request.headers.get('x-idempotency-key') ?? '').trim();
  if (idempotencyKey.length < 16 || idempotencyKey.length > 120) {
    return NextResponse.json({ error: 'Hiányzó vagy érvénytelen rendelési kérésazonosító.' }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Érvénytelen JSON kérés.' }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Hiányos vagy érvénytelen rendelési adatok.' }, { status: 400 });

  const instance = await getCurrentWebshopInstance();
  if (!instance || !['pilot', 'active'].includes(instance.status)) {
    return NextResponse.json({ error: 'Ehhez a kéréshez nem tartozik rendelhető webshop.' }, { status: 409 });
  }

  const { checkout, items } = parsed.data;
  const commerce = await getCommerceSettings();
  const shipping = commerce.shippingOptions.find(option => option.code === checkout.shippingProvider);
  const payment = commerce.paymentOptions.find(option => option.code === checkout.paymentProvider);
  if (!shipping) return NextResponse.json({ error: 'Ez a szállítási szolgáltató ebben a webáruházban nem aktív.' }, { status: 409 });
  if (!payment) return NextResponse.json({ error: 'Ez a fizetési szolgáltató ebben a webáruházban nem aktív.' }, { status: 409 });
  if (checkout.customerType !== 'retail' && (!checkout.companyName || !checkout.taxNumber)) {
    return NextResponse.json({ error: 'Céges vagy viszonteladói rendeléshez cégnév és adószám szükséges.' }, { status: 400 });
  }

  if (shipping.kind === 'parcel_point') {
    if (!checkout.parcelPointId) return NextResponse.json({ error: 'Ehhez a szállítási módhoz átvételi pontot kell választani.' }, { status: 400 });
    try {
      const shippingAdapter = getShippingProviderAdapter(shipping.adapterKey);
      if (!shippingAdapter.validatePickupPoint) {
        return NextResponse.json({ error: 'A kiválasztott csomagpont szerveroldali ellenőrzése ehhez a szolgáltatóhoz még nincs aktiválva.' }, { status: 409 });
      }
      const valid = await shippingAdapter.validatePickupPoint(checkout.parcelPointId);
      if (!valid) return NextResponse.json({ error: 'A kiválasztott átvételi pont már nem érvényes. Kérlek válassz másikat.' }, { status: 409 });
    } catch (error) {
      console.error('pickup point validation failed', { provider: shipping.code, error });
      return NextResponse.json({ error: 'A csomagpont ellenőrzése átmenetileg nem érhető el. Kérlek próbáld újra.' }, { status: 503 });
    }
  }

  const homeDelivery = shipping.kind === 'home_delivery';
  if (homeDelivery && checkout.sameAddress === 'false' && (!checkout.shippingPostcode || !checkout.shippingCity || !checkout.shippingAddress)) {
    return NextResponse.json({ error: 'A szállítási cím hiányos.' }, { status: 400 });
  }
  const shippingPostcode = homeDelivery && checkout.sameAddress === 'false' ? checkout.shippingPostcode ?? '' : checkout.billingPostcode;
  const shippingCity = homeDelivery && checkout.sameAddress === 'false' ? checkout.shippingCity ?? '' : checkout.billingCity;
  const shippingAddress = homeDelivery && checkout.sameAddress === 'false' ? checkout.shippingAddress ?? '' : checkout.billingAddress;

  try {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    const admin = createAdminClient();

    let order: PlaceOrderResult;
    try {
      order = await placeTenantOrder({
        instanceId: instance.id,
        idempotencyKey,
        customerEmail: checkout.email,
        billingName: checkout.name,
        billingCompany: checkout.companyName ?? '',
        billingTaxNumber: checkout.taxNumber ?? '',
        billingPostcode: checkout.billingPostcode,
        billingCity: checkout.billingCity,
        billingAddress: checkout.billingAddress,
        shippingName: checkout.name,
        shippingPostcode,
        shippingCity,
        shippingAddress,
        customerPhone: checkout.phone,
        shippingProvider: shipping.code,
        shippingKind: shipping.kind,
        shippingFeeHuf: shipping.fee,
        freeShippingThresholdHuf: commerce.freeShippingThreshold,
        parcelPointId: checkout.parcelPointId ?? '',
        paymentProvider: payment.code,
        note: checkout.note ?? '',
        customerId: user?.id ?? null,
        couponCode: (checkout.couponCode ?? '').toUpperCase(),
        items: items.map(item => ({ variant_id: item.productId, quantity: item.quantity })),
      }) as PlaceOrderResult;
    } catch (tenantOrderError) {
      console.error('tenant checkout rejected', { instanceId: instance.id, error: tenantOrderError });
      return NextResponse.json({ error: 'A rendelés mentése nem sikerült. Ellenőrizd a kosár tartalmát és próbáld újra.' }, { status: 409 });
    }

    const replayed = order.idempotency_replayed === true;
    if (user?.id) await admin.rpc('convert_checkout_recovery_intent_v2', { p_instance_id: instance.id, p_user_id: user.id, p_order_id: order.order_id });

    const { data: confirmation } = await admin
      .from('orders')
      .select('confirmation_token,status')
      .eq('id', order.order_id)
      .eq('instance_id', instance.id)
      .maybeSingle();
    if (!confirmation?.confirmation_token) {
      return NextResponse.json({ error: 'A rendelés rögzült, de a visszaigazolás előkészítése nem sikerült.' }, { status: 503 });
    }

    if (!replayed) {
      await admin.from('order_events').insert({
        order_id: order.order_id,
        event_type: 'legal_terms_accepted',
        actor_user_id: user?.id ?? null,
        metadata: {
          accepted_at: new Date().toISOString(),
          terms_path: '/aszf',
          privacy_path: '/adatvedelem',
          idempotency_key: idempotencyKey,
          payment_provider: payment.code,
          shipping_provider: shipping.code,
          instance_id: instance.id,
        },
      });
      await enqueueIntegrationJob({
        orderId: order.order_id,
        kind: 'email_send',
        provider: process.env.EMAIL_PROVIDER || 'resend',
        payload: { template: 'order_confirmation', instance_id: instance.id },
      }).catch(() => undefined);
    }

    const status = payment.flow === 'online_redirect' ? 'pending_payment' : payment.flow === 'bank_transfer' ? 'pending_transfer' : 'pending';
    let paymentRedirectUrl: string | undefined;

    if (payment.flow === 'online_redirect') {
      if (replayed) {
        const latest = await getLatestPaymentAttempt(order.order_id, payment.code);
        if (latest?.status === 'pending' && latest.checkoutUrl) {
          return NextResponse.json({ ok: true, replayed: true, orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, subtotal: order.subtotal_gross_huf, discount: order.discount_gross_huf, shippingFee: order.shipping_gross_huf, total: order.total_gross_huf, couponCode: order.coupon_code, status: 'pending_payment', paymentRedirectUrl: latest.checkoutUrl }, { status: 200 });
        }
        if (latest?.status === 'succeeded') {
          return NextResponse.json({ ok: true, replayed: true, orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, subtotal: order.subtotal_gross_huf, discount: order.discount_gross_huf, shippingFee: order.shipping_gross_huf, total: order.total_gross_huf, couponCode: order.coupon_code, status: confirmation.status }, { status: 200 });
        }
        if (latest && ['created', 'requires_action', 'pending'].includes(latest.status)) {
          return NextResponse.json({ error: 'A rendeléshez tartozó korábbi fizetés kimenetele még nem egyértelmű. Biztonsági okból nem indítunk automatikusan új fizetést.', orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, status: 'pending_payment' }, { status: 503 });
        }
        if (latest && ['failed', 'cancelled', 'expired', 'refunded'].includes(latest.status)) {
          return NextResponse.json({ error: 'A korábbi fizetési próbálkozás lezárult. Ugyanennek a hálózati kérésnek az ismétlése nem indít új fizetést; a rendelésnél külön újrapróbálás szükséges.', orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, status: 'pending_payment' }, { status: 409 });
        }
      }

      const attemptId = await createPaymentAttempt({
        orderId: order.order_id,
        providerCode: payment.code,
        amountHuf: order.total_gross_huf,
        status: 'created',
        metadata: { order_number: order.order_number, idempotency_key: idempotencyKey, replayed, instance_id: instance.id },
      });

      try {
        const identity = await getCommunicationIdentity();
        const callbackUrl = `${identity.siteUrl}/api/payments/${encodeURIComponent(payment.code)}/webhook`;
        const result = await getPaymentGatewayAdapter(payment.adapterKey).createPayment({
          orderId: order.order_number,
          total: { amount: order.total_gross_huf, currency: 'HUF' },
          returnUrl: `${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(confirmation.confirmation_token)}`,
          cancelUrl: `${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(confirmation.confirmation_token)}&payment=cancelled`,
          callbackUrl,
          idempotencyKey: `shoperation-${instance.id}-${payment.code}-${order.order_id}`,
          customerEmail: checkout.email,
        });
        await attachPaymentAttemptReference(attemptId, result.providerReference, { checkout_url: result.redirectUrl, instance_id: instance.id });
        paymentRedirectUrl = result.redirectUrl;
        const { error: paymentOrderError } = await admin
          .from('orders')
          .update({ external_payment_id: result.providerReference, status: 'pending_payment', updated_at: new Date().toISOString() })
          .eq('id', order.order_id)
          .eq('instance_id', instance.id);
        if (paymentOrderError) {
          await markPaymentAttemptRequiresAction(attemptId, {
            code: 'ORDER_REFERENCE_PERSISTENCE_FAILED',
            message: 'Payment session created but order reference persistence failed',
            metadata: { provider_reference: result.providerReference, checkout_url: result.redirectUrl, instance_id: instance.id },
          });
          throw paymentOrderError;
        }
        await admin.from('order_events').insert({
          order_id: order.order_id,
          event_type: replayed ? 'payment_recovered' : 'payment_started',
          metadata: { provider: payment.code, provider_reference: result.providerReference, callback_url: callbackUrl, payment_attempt_id: attemptId, instance_id: instance.id },
        });
      } catch (paymentError) {
        console.error('checkout payment provider call failed', { orderId: order.order_id, paymentProvider: payment.code, attemptId, error: paymentError });
        await markPaymentAttemptRequiresAction(attemptId, { message: paymentError instanceof Error ? paymentError.message : 'Payment provider outcome unknown', metadata: { instance_id: instance.id } }).catch(() => undefined);
        return NextResponse.json({ error: 'A rendelés rögzült, de a fizetés indítása nem fejeződött be biztonságosan. A rendelésed megmaradt; a fiókodban újrapróbálhatod a fizetést.', orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, status: 'pending_payment' }, { status: 503 });
      }
    } else {
      const { error: statusError } = await admin
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', order.order_id)
        .eq('instance_id', instance.id);
      if (statusError) throw statusError;
      if(payment.flow==='cash_on_delivery')await enqueueExternalLogisticsOrderEmail(instance.id,order.order_id,shipping.code).catch(async error=>{await admin.from('order_events').insert({instance_id:instance.id,order_id:order.order_id,event_type:'integration_enqueue_failed',from_status:status,to_status:status,metadata:{kind:'logistics_email',error:error instanceof Error?error.message:'unknown'}})});
    }

    return NextResponse.json({ ok: true, replayed, orderId: order.order_id, orderNumber: order.order_number, confirmationToken: confirmation.confirmation_token, subtotal: order.subtotal_gross_huf, discount: order.discount_gross_huf, shippingFee: order.shipping_gross_huf, total: order.total_gross_huf, couponCode: order.coupon_code, status, paymentRedirectUrl }, { status: replayed ? 200 : 201 });
  } catch (error) {
    console.error('checkout preparation failed', error);
    return NextResponse.json({ error: 'A rendelés feldolgozása átmenetileg nem sikerült. Kérlek ellenőrizd a rendeléseidet, mielőtt újra megpróbálod.' }, { status: 503 });
  }
}
