import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentGatewayAdapter } from '@/lib/integrations/adapters';
import { applyVerifiedPaymentEvent,type PaymentState } from '@/lib/integrations/payment-events';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';

const payIdRx=/^[A-Za-z0-9._-]{4,128}$/;

async function readPayId(request:Request){
  const url=new URL(request.url);
  let payId=url.searchParams.get('payId')??'';
  if(request.method==='POST'){
    const raw=await request.text();
    const type=request.headers.get('content-type')??'';
    if(type.includes('application/json')){try{const body=JSON.parse(raw) as Record<string,unknown>;if(typeof body.payId==='string')payId=body.payId}catch{}}
    else{const body=new URLSearchParams(raw);payId=body.get('payId')??payId}
  }
  return payId.trim();
}
function paymentQuery(status:PaymentState){
  if(status==='paid')return'paid';
  if(status==='cancelled')return'cancelled';
  if(status==='failed')return'failed';
  if(status==='refunded')return'refunded';
  return'pending';
}

async function handle(request:Request){
  const payId=await readPayId(request);
  if(!payIdRx.test(payId))return NextResponse.json({error:'Érvénytelen K&H fizetési hivatkozás.'},{status:400});
  const admin=createAdminClient();
  const{data:attempts,error}=await admin.from('payment_attempts').select('instance_id,order_id').eq('provider_code','kh_card').eq('provider_reference',payId).limit(2);
  if(error||(attempts??[]).length!==1)return NextResponse.json({error:'A K&H fizetés nem rendelhető egyértelműen webshop-rendeléshez.'},{status:409});
  const attempt=attempts![0];
  const{data:order,error:orderError}=await admin.from('orders').select('confirmation_token').eq('id',attempt.order_id).eq('instance_id',attempt.instance_id).maybeSingle();
  if(orderError||!order?.confirmation_token)return NextResponse.json({error:'A rendelés visszaigazolási hivatkozása nem található.'},{status:409});
  try{
    const verified=await getPaymentGatewayAdapter('kh').verifyCallback({payId});
    if(verified.providerReference!==payId)throw new Error('K&H payment reference mismatch');
    const status=(verified.status??(verified.paid?'paid':'unknown')) as PaymentState;
    await applyVerifiedPaymentEvent({
      providerCode:'kh_card',
      eventId:verified.eventId??`kh-${payId}-${status}`,
      providerReference:payId,
      eventType:verified.eventType??'kh.payment.return',
      status,
      signatureValid:true,
      rawPayload:`payId=${payId}`
    });
    const identity=await getCommunicationIdentityForInstance(attempt.instance_id);
    const target=new URL('/rendeles-sikeres',identity.siteUrl);
    target.searchParams.set('token',order.confirmation_token);
    target.searchParams.set('payment',paymentQuery(status));
    return NextResponse.redirect(target,303);
  }catch(error){
    console.error('K&H return verification failed',{payId,error});
    return NextResponse.json({error:'A K&H fizetés eredménye nem ellenőrizhető biztonságosan. A rendelés állapota nem változott.'},{status:503});
  }
}
export async function GET(request:Request){return handle(request)}
export async function POST(request:Request){return handle(request)}
