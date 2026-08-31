import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getPaymentGatewayAdapter } from '@/lib/integrations/adapters';
import { createPaymentAttempt } from '@/lib/integrations/payment-attempts';
import { getCommunicationIdentity } from '@/lib/communication/identity';

const idSchema=z.string().uuid();

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const parsed=idSchema.safeParse(id);if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'A fizetés újraindításához jelentkezz be.'},{status:401});
 const admin=createAdminClient();const{data:order,error}=await admin.from('orders').select('id,order_number,status,total_gross_huf,payment_method,customer_email,customer_id,confirmation_token').eq('id',parsed.data).eq('customer_id',user.id).maybeSingle();
 if(error||!order)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
 if(order.status!=='pending_payment')return NextResponse.json({error:'Ez a rendelés jelenleg nem fizethető újra.'},{status:409});
 const commerce=await getCommerceSettings(),payment=commerce.paymentOptions.find(option=>option.code===order.payment_method&&option.flow==='online_redirect');if(!payment)return NextResponse.json({error:'A rendeléshez tartozó online fizetési mód jelenleg nem érhető el.'},{status:409});
 if(!order.confirmation_token)return NextResponse.json({error:'A rendelés visszaigazolási azonosítója hiányzik.'},{status:409});
 try{
  const identity=await getCommunicationIdentity(),callbackUrl=`${identity.siteUrl}/api/payments/${encodeURIComponent(payment.code)}/webhook`,nonce=crypto.randomUUID();
  const result=await getPaymentGatewayAdapter(payment.adapterKey).createPayment({orderId:order.order_number,total:{amount:Number(order.total_gross_huf),currency:'HUF'},returnUrl:`${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(order.confirmation_token)}`,cancelUrl:`${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(order.confirmation_token)}&payment=cancelled`,callbackUrl,idempotencyKey:`shoperation-retry-${payment.code}-${order.id}-${nonce}`,customerEmail:order.customer_email});
  await createPaymentAttempt({orderId:order.id,providerCode:payment.code,providerReference:result.providerReference,amountHuf:Number(order.total_gross_huf),status:'pending',metadata:{order_number:order.order_number,retry:true,retry_nonce:nonce}});
  const{error:updateError}=await admin.from('orders').update({external_payment_id:result.providerReference,updated_at:new Date().toISOString()}).eq('id',order.id).eq('status','pending_payment');if(updateError)throw updateError;
  await admin.from('order_events').insert({order_id:order.id,event_type:'payment_retried',actor_user_id:user.id,metadata:{provider:payment.code,provider_reference:result.providerReference}});
  return NextResponse.json({ok:true,redirectUrl:result.redirectUrl});
 }catch(error){console.error('payment retry failed',{orderId:order.id,paymentMethod:order.payment_method,error});return NextResponse.json({error:'A fizetés újraindítása átmenetileg nem sikerült. Kérlek próbáld újra később.'},{status:503})}
}
