import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordWebhookEvent } from '@/lib/integrations/outbox';
import { getConfiguredInvoiceProviderCodeForInstance } from '@/lib/integrations/invoicing';

export type PaymentState='pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';
export type VerifiedPaymentEvent={providerCode:string;eventId:string;providerReference:string;eventType:string;status:PaymentState;signatureValid:boolean;rawPayload:string};
type ResolvedOrder={id:string;instance_id:string;status:string;external_payment_id:string|null};
type PaymentEventEvidence={
  ok?:boolean;
  duplicate?:boolean;
  orderId?:string;
  orderStatus?:string;
  webhookEventId?:string;
  paymentEventId?:string;
  orderEventId?:string|null;
  emailJobId?:string|null;
  invoiceJobId?:string|null;
  manualInvoiceEventId?:string|null;
  logisticsJobId?:string|null;
  sideEffectsComplete?:boolean;
};

async function resolveOrder(providerCode:string,providerReference:string):Promise<ResolvedOrder|null>{
  const admin=createAdminClient();
  const{data:attempts,error:attemptError}=await admin.from('payment_attempts')
    .select('order_id,instance_id')
    .eq('provider_code',providerCode)
    .eq('provider_reference',providerReference)
    .limit(2);
  if(attemptError)throw attemptError;
  if((attempts??[]).length>1)throw new Error('Ambiguous payment tenant reference.');
  const attempt=attempts?.[0];
  if(attempt?.order_id&&attempt.instance_id){
    const{data:order,error}=await admin.from('orders')
      .select('id,instance_id,status,external_payment_id')
      .eq('id',attempt.order_id)
      .eq('instance_id',attempt.instance_id)
      .maybeSingle();
    if(error)throw error;
    if(order)return order as ResolvedOrder;
  }

  const{data:legacy,error:legacyError}=await admin.from('orders')
    .select('id,instance_id,status,external_payment_id')
    .eq('external_payment_id',providerReference)
    .limit(2);
  if(legacyError)throw legacyError;
  if((legacy??[]).length>1)throw new Error('Ambiguous legacy payment tenant reference.');
  return (legacy?.[0] as ResolvedOrder|undefined)??null;
}

export async function applyVerifiedPaymentEvent(event:VerifiedPaymentEvent){
  const admin=createAdminClient();
  const payloadHash=createHash('sha256').update(event.rawPayload).digest('hex');
  const order=await resolveOrder(event.providerCode,event.providerReference);

  if(!order){
    await recordWebhookEvent({
      provider:event.providerCode,
      externalEventId:event.eventId,
      signatureValid:event.signatureValid,
      payloadHash,
      status:event.signatureValid?'ignored':'rejected',
      errorMessage:'Verified callback could not be mapped to a webshop order.',
    }).catch(()=>undefined);
    return{ok:event.signatureValid,duplicate:false,orderId:null};
  }

  let invoiceProvider:string|null=null;
  if(event.signatureValid&&event.status==='paid'){
    invoiceProvider=await getConfiguredInvoiceProviderCodeForInstance(order.instance_id,{strict:true});
  }

  const{data,error}=await admin.rpc('apply_verified_payment_event_v3',{
    p_instance_id:order.instance_id,
    p_order_id:order.id,
    p_provider_code:event.providerCode,
    p_provider_event_id:event.eventId,
    p_provider_reference:event.providerReference,
    p_event_type:event.eventType,
    p_payment_status:event.status,
    p_signature_valid:event.signatureValid,
    p_payload_hash:payloadHash,
    p_email_provider:process.env.EMAIL_PROVIDER?.trim()||'resend',
    p_invoice_provider:invoiceProvider,
  });
  if(error)throw error;

  const evidence=(data??{}) as PaymentEventEvidence;
  if(
    evidence.orderId!==order.id||
    !evidence.webhookEventId||
    !evidence.paymentEventId||
    evidence.ok!==event.signatureValid
  ){
    throw new Error('PAYMENT_EVENT_EVIDENCE_MISMATCH');
  }
  if(event.signatureValid&&evidence.sideEffectsComplete!==true){
    throw new Error('PAYMENT_EVENT_SIDE_EFFECT_EVIDENCE_MISSING');
  }

  return{
    ok:evidence.ok===true,
    duplicate:evidence.duplicate===true,
    orderId:order.id,
    status:evidence.orderStatus??order.status,
  };
}
