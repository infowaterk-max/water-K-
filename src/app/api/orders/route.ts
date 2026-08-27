import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';

const checkoutSchema=z.object({
  customerType:z.enum(['retail','company','reseller']),email:z.string().trim().email(),name:z.string().trim().min(2).max(160),phone:z.string().trim().min(5).max(40),companyName:z.string().trim().max(200).optional(),taxNumber:z.string().trim().max(40).optional(),
  billingPostcode:z.string().trim().min(2).max(20),billingCity:z.string().trim().min(2).max(120),billingAddress:z.string().trim().min(2).max(300),
  sameAddress:z.enum(['true','false']).default('true'),shippingPostcode:z.string().trim().max(20).optional(),shippingCity:z.string().trim().max(120).optional(),shippingAddress:z.string().trim().max(300).optional(),
  shippingMethod:z.enum(['foxpost','gls','mpl','pickup']),paymentMethod:z.enum(['kh_card','bank_transfer']),parcelPointId:z.string().trim().max(160).optional(),note:z.string().trim().max(1000).optional(),couponCode:z.string().trim().max(32).optional(),legalAccepted:z.literal('true'),
});
const schema=z.object({checkout:checkoutSchema,items:z.array(z.object({productId:z.string().uuid(),quantity:z.number().int().positive().max(99)})).min(1).max(30)});
type PlaceOrderResult={order_id:string;order_number:string;subtotal_gross_huf:number;discount_gross_huf:number;shipping_gross_huf:number;total_gross_huf:number;coupon_code:string|null;idempotency_replayed?:boolean};

export async function POST(request:Request){
  const idempotencyKey=(request.headers.get('x-idempotency-key')??'').trim();
  if(idempotencyKey.length<16||idempotencyKey.length>120)return NextResponse.json({error:'Hiányzó vagy érvénytelen rendelési kérésazonosító.'},{status:400});
  let body:unknown; try{body=await request.json();}catch{return NextResponse.json({error:'Érvénytelen JSON kérés.'},{status:400});}
  const parsed=schema.safeParse(body); if(!parsed.success)return NextResponse.json({error:'Hiányos vagy érvénytelen rendelési adatok.'},{status:400});
  const {checkout,items}=parsed.data;
  if(checkout.customerType!=='retail'&&(!checkout.companyName||!checkout.taxNumber))return NextResponse.json({error:'Céges vagy viszonteladói rendeléshez cégnév és adószám szükséges.'},{status:400});
  if(checkout.shippingMethod==='foxpost'&&!checkout.parcelPointId)return NextResponse.json({error:'Foxpost szállításhoz csomagautomatát kell választani.'},{status:400});
  const khConfigured=Boolean(process.env.KH_MERCHANT_ID&&(process.env.KH_SECRET||process.env.KH_API_SECRET));
  if(checkout.paymentMethod==='kh_card'&&!khConfigured)return NextResponse.json({error:'A bankkártyás fizetés még nincs aktiválva. Válaszd a banki átutalást.'},{status:409});
  const homeDelivery=checkout.shippingMethod==='gls'||checkout.shippingMethod==='mpl';
  if(homeDelivery&&checkout.sameAddress==='false'&&(!checkout.shippingPostcode||!checkout.shippingCity||!checkout.shippingAddress))return NextResponse.json({error:'A szállítási cím hiányos.'},{status:400});
  const shippingPostcode=homeDelivery&&checkout.sameAddress==='false'?checkout.shippingPostcode??'':checkout.billingPostcode;
  const shippingCity=homeDelivery&&checkout.sameAddress==='false'?checkout.shippingCity??'':checkout.billingCity;
  const shippingAddress=homeDelivery&&checkout.sameAddress==='false'?checkout.shippingAddress??'':checkout.billingAddress;
  try{
    const sessionClient=await createClient(); const {data:{user}}=await sessionClient.auth.getUser(); const admin=createAdminClient();
    const {data,error}=await admin.rpc('place_order_idempotent',{p_idempotency_key:idempotencyKey,p_customer_email:checkout.email,p_billing_name:checkout.name,p_billing_company:checkout.companyName??'',p_billing_tax_number:checkout.taxNumber??'',p_billing_postcode:checkout.billingPostcode,p_billing_city:checkout.billingCity,p_billing_address:checkout.billingAddress,p_shipping_name:checkout.name,p_shipping_postcode:shippingPostcode,p_shipping_city:shippingCity,p_shipping_address:shippingAddress,p_customer_phone:checkout.phone,p_shipping_method:checkout.shippingMethod,p_parcel_point_id:checkout.parcelPointId??'',p_payment_method:checkout.paymentMethod,p_note:checkout.note??'',p_customer_id:user?.id??null,p_coupon_code:(checkout.couponCode??'').toUpperCase(),p_items:items.map(item=>({variant_id:item.productId,quantity:item.quantity}))});
    if(error||!data)return NextResponse.json({error:error?.message??'A rendelés mentése nem sikerült.'},{status:409});
    const order=data as PlaceOrderResult; const replayed=order.idempotency_replayed===true;
    if(user?.id){const recoveryResult=await admin.rpc('convert_checkout_recovery_intent',{p_user_id:user.id,p_order_id:order.order_id});if(recoveryResult.error)console.warn('checkout recovery conversion failed',recoveryResult.error.message);}
    const {data:confirmation,error:confirmationError}=await admin.from('orders').select('confirmation_token').eq('id',order.order_id).maybeSingle();
    if(confirmationError||!confirmation?.confirmation_token)return NextResponse.json({error:'A rendelés rögzült, de a visszaigazítás előkészítése nem sikerült. Ellenőrizd a Fiókom oldalt vagy a visszaigazoló e-mailt.'},{status:503});
    if(!replayed){
      await admin.from('order_events').insert({order_id:order.order_id,event_type:'legal_terms_accepted',actor_user_id:user?.id??null,metadata:{accepted_at:new Date().toISOString(),terms_path:'/aszf',privacy_path:'/adatvedelem',idempotency_key:idempotencyKey}});
      await enqueueIntegrationJob({orderId:order.order_id,kind:'email_send',provider:process.env.EMAIL_PROVIDER||'resend',payload:{template:'order_confirmation'}}).catch(async e=>{await admin.from('order_events').insert({order_id:order.order_id,event_type:'integration_enqueue_failed',metadata:{kind:'email_send',template:'order_confirmation',error:e instanceof Error?e.message:'unknown'}});});
      if(checkout.paymentMethod==='kh_card')await enqueueIntegrationJob({orderId:order.order_id,kind:'payment_create',provider:'kh',payload:{orderNumber:order.order_number,totalGrossHuf:order.total_gross_huf,returnPath:'/rendeles-sikeres'}});
    }
    return NextResponse.json({ok:true,replayed,orderId:order.order_id,orderNumber:order.order_number,confirmationToken:confirmation.confirmation_token,subtotal:order.subtotal_gross_huf,discount:order.discount_gross_huf,shippingFee:order.shipping_gross_huf,total:order.total_gross_huf,couponCode:order.coupon_code,status:checkout.paymentMethod==='kh_card'?'pending_payment':'pending_transfer',next:checkout.paymentMethod==='kh_card'?'payment':'confirmation'},{status:replayed?200:201});
  }catch{return NextResponse.json({error:'A rendelési szolgáltatás átmenetileg nem elérhető.'},{status:503});}
}
