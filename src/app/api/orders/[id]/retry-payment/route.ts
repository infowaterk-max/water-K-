import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getPaymentGatewayAdapter } from '@/lib/integrations/adapters';
import { createPaymentAttempt,getLatestPaymentAttempt } from '@/lib/integrations/payment-attempts';
import { getCommunicationIdentityForInstance } from '@/lib/communication/identity';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

const idSchema=z.string().uuid(),UNCERTAIN_WINDOW_MS=15*60*1000;

type RetryEvidence={
  orderId?:string;
  orderStatus?:string;
  attemptId?:string;
  attemptStatus?:string;
  providerReference?:string;
  eventId?:string;
};

export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){
  const{id}=await params,parsed=idSchema.safeParse(id);
  if(!parsed.success)return NextResponse.json({error:'Érvénytelen rendelésazonosító.'},{status:400});

  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'A fizetés újraindításához jelentkezz be.'},{status:401});

  const instance=await getCurrentWebshopInstance();
  if(!instance)return NextResponse.json({error:'A rendelés nem található.'},{status:404});

  const admin=createAdminClient();
  const{data:order,error}=await admin.from('orders')
    .select('id,order_number,status,total_gross_huf,payment_method,customer_email,customer_id,confirmation_token')
    .eq('id',parsed.data)
    .eq('instance_id',instance.id)
    .eq('customer_id',user.id)
    .maybeSingle();
  if(error||!order)return NextResponse.json({error:'A rendelés nem található.'},{status:404});
  if(order.status!=='pending_payment')return NextResponse.json({error:'Ez a rendelés jelenleg nem fizethető újra.'},{status:409});

  const commerce=await getCommerceSettings();
  const payment=commerce.paymentOptions.find(option=>option.code===order.payment_method&&option.flow==='online_redirect');
  if(!payment)return NextResponse.json({error:'A rendeléshez tartozó online fizetési mód jelenleg nem érhető el.'},{status:409});
  if(!order.confirmation_token)return NextResponse.json({error:'A rendelés visszaigazolási azonosítója hiányzik.'},{status:409});

  const latest=await getLatestPaymentAttempt(order.id,payment.code);
  if(latest?.status==='pending'){
    if(latest.checkoutUrl)return NextResponse.json({ok:true,redirectUrl:latest.checkoutUrl,reused:true});
    return NextResponse.json({error:'Ehhez a rendeléshez már tartozik folyamatban lévő fizetési próbálkozás. Ellenőrizd a fizetés állapotát, mielőtt újat indítasz.'},{status:409});
  }
  if(latest?.status==='succeeded')return NextResponse.json({error:'A legutóbbi fizetési próbálkozás már sikeres. Frissítsd a rendelés állapotát.'},{status:409});
  if(latest&&['created','requires_action'].includes(latest.status)&&Date.now()-new Date(latest.createdAt).getTime()<UNCERTAIN_WINDOW_MS){
    return NextResponse.json({error:'Az előző fizetési próbálkozás kimenetele még nem egyértelmű. Biztonsági okból rövid ideig nem indítunk új fizetést.'},{status:409});
  }

  const nonce=crypto.randomUUID();
  const attemptId=await createPaymentAttempt({
    instanceId:instance.id,
    orderId:order.id,
    providerCode:payment.code,
    amountHuf:Number(order.total_gross_huf),
    status:'created',
    metadata:{order_number:order.order_number,retry:true,retry_nonce:nonce,instance_id:instance.id},
  });

  let recoveryReference:string|undefined;
  let recoveryCheckoutUrl:string|undefined;

  try{
    const identity=await getCommunicationIdentityForInstance(instance.id);
    const callbackUrl=`${identity.siteUrl}/api/payments/${encodeURIComponent(payment.code)}/webhook`;
    const result=await getPaymentGatewayAdapter(payment.adapterKey).createPayment({
      orderId:order.order_number,
      total:{amount:Number(order.total_gross_huf),currency:'HUF'},
      returnUrl:`${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(order.confirmation_token)}`,
      cancelUrl:`${identity.siteUrl}/rendeles-sikeres?token=${encodeURIComponent(order.confirmation_token)}&payment=cancelled`,
      callbackUrl,
      idempotencyKey:`shoperation-retry-${instance.id}-${payment.code}-${order.id}-${nonce}`,
      customerEmail:order.customer_email,
    });
    recoveryReference=result.providerReference;
    recoveryCheckoutUrl=result.redirectUrl;

    const{data,error:reconcileError}=await admin.rpc('reconcile_retry_payment_session_v2',{
      p_instance_id:instance.id,
      p_order_id:order.id,
      p_attempt_id:attemptId,
      p_actor:user.id,
      p_provider_code:payment.code,
      p_provider_reference:result.providerReference,
      p_checkout_url:result.redirectUrl,
      p_callback_url:callbackUrl,
    });
    if(reconcileError)throw reconcileError;

    const evidence=(data??{}) as RetryEvidence;
    if(
      evidence.orderId!==order.id||
      evidence.orderStatus!=='pending_payment'||
      evidence.attemptId!==attemptId||
      evidence.providerReference!==result.providerReference||
      !['pending','succeeded'].includes(String(evidence.attemptStatus??''))||
      !evidence.eventId
    ){
      throw new Error('PAYMENT_RETRY_EVIDENCE_MISMATCH');
    }

    return NextResponse.json({ok:true,redirectUrl:result.redirectUrl});
  }catch(error){
    console.error('payment retry failed',{orderId:order.id,paymentMethod:order.payment_method,attemptId,error});

    const{data:recoveryData,error:recoveryError}=await admin.rpc('mark_payment_attempt_reconciliation_required_v2',{
      p_instance_id:instance.id,
      p_order_id:order.id,
      p_attempt_id:attemptId,
      p_provider_code:payment.code,
      p_provider_reference:recoveryReference??null,
      p_checkout_url:recoveryCheckoutUrl??null,
      p_failure_code:recoveryReference?'PAYMENT_RETRY_RECONCILIATION_REQUIRED':'PAYMENT_OUTCOME_UNKNOWN',
      p_failure_message:error instanceof Error?error.message:'Payment provider outcome unknown',
      p_metadata:{source:'customer_retry',retry_nonce:nonce},
    });
    const recoveryEvidence=(recoveryData??{}) as {attemptId?:string;evidenceSaved?:boolean};
    if(recoveryError||recoveryEvidence.attemptId!==attemptId||recoveryEvidence.evidenceSaved!==true){
      console.error('payment retry reconciliation evidence failed',{instanceId:instance.id,orderId:order.id,attemptId,error:recoveryError});
    }

    return NextResponse.json({
      error:'A fizetés újraindítása nem fejeződött be biztonságosan. A rendelésed megmaradt; ellenőrizd a rendelés állapotát, mielőtt újra próbálod.'
    },{status:503});
  }
}
