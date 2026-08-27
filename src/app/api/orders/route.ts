import { NextResponse } from 'next/server';
import { z } from 'zod';
import { shippingFee } from '@/lib/commerce/pricing';
import { createClient } from '@/lib/supabase/server';

const checkoutSchema = z.object({
  customerType: z.enum(['retail', 'company', 'reseller']), email: z.string().trim().email(),
  name: z.string().trim().min(2).max(160), phone: z.string().trim().min(5).max(40),
  companyName: z.string().trim().max(200).optional(), taxNumber: z.string().trim().max(40).optional(),
  billingAddress: z.string().trim().min(5).max(500), shippingAddress: z.string().trim().min(5).max(500),
  shippingMethod: z.enum(['foxpost', 'gls', 'mpl', 'pickup']), paymentMethod: z.enum(['kh_card', 'bank_transfer']),
  parcelPointId: z.string().trim().max(160).optional(), note: z.string().trim().max(1000).optional(),
});
const schema = z.object({ checkout: checkoutSchema, items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(999) })).min(1).max(50) });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Érvénytelen JSON kérés.' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Hiányos vagy érvénytelen rendelési adatok.' }, { status: 400 });
  const { checkout, items } = parsed.data;
  if (checkout.customerType !== 'retail' && (!checkout.companyName || !checkout.taxNumber)) return NextResponse.json({ error: 'Céges vagy viszonteladói rendeléshez cégnév és adószám szükséges.' }, { status: 400 });
  if (checkout.shippingMethod === 'foxpost' && !checkout.parcelPointId) return NextResponse.json({ error: 'Foxpost szállításhoz csomagautomata szükséges.' }, { status: 400 });

  const supabase = await createClient();
  const ids = items.map((i) => i.productId);
  const { data: productRows, error: productError } = await supabase.from('products').select('id,gross_price,stock,active,audience').in('id', ids);
  if (productError || !productRows || productRows.length !== new Set(ids).size) return NextResponse.json({ error: 'A termékadatok nem elérhetők.' }, { status: 503 });
  let subtotal = 0;
  for (const item of items) {
    const product = productRows.find((p) => p.id === item.productId);
    if (!product?.active || product.stock < item.quantity || !product.audience.includes(checkout.customerType)) return NextResponse.json({ error: 'A kosár egyik tétele nem rendelhető.' }, { status: 409 });
    subtotal += product.gross_price * item.quantity;
  }
  const delivery = shippingFee(checkout.shippingMethod, subtotal);
  const { data, error } = await supabase.rpc('create_store_order', {
    p_customer_type: checkout.customerType, p_customer_email: checkout.email, p_customer_name: checkout.name,
    p_customer_phone: checkout.phone, p_company_name: checkout.companyName ?? '', p_tax_number: checkout.taxNumber ?? '',
    p_billing_address: checkout.billingAddress, p_shipping_address: checkout.shippingAddress, p_shipping_method: checkout.shippingMethod,
    p_parcel_point_id: checkout.parcelPointId ?? '', p_payment_method: checkout.paymentMethod, p_note: checkout.note ?? '',
    p_shipping_fee: delivery, p_items: items,
  });
  if (error || !data?.[0]) return NextResponse.json({ error: 'A rendelés mentése nem sikerült. Kérjük, próbáld újra.' }, { status: 409 });
  const order = data[0];
  return NextResponse.json({ ok: true, orderId: order.order_id, orderNumber: `WK-${order.order_number}`, total: order.total_gross, status: checkout.paymentMethod === 'kh_card' ? 'pending_payment' : 'pending_transfer', next: checkout.paymentMethod === 'kh_card' ? 'payment' : 'confirmation' }, { status: 201 });
}
