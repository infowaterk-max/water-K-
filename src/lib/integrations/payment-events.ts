import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob,recordWebhookEvent } from '@/lib/integrations/outbox';
import { updatePaymentAttemptFromEvent } from '@/lib/integrations/payment-attempts';
import { getConfiguredInvoiceProviderCode } from '@/lib/integrations/invoicing';
export type PaymentState='pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';
export type VerifiedPaymentEvent={providerCode:string;eventId:string;providerReference:string;eventType:string;status:PaymentState;signatureValid:boolean;rawPayload:string};
type ResolvedOrder={id:string;instance_id:string;status:string;external_payment_id:string|null};

async function enqueueEmailOnce(instanceId:string,orderId:string,template:'payment_confirmed'){
  const admin=createAdminClient(),provider=process.env.EMAIL_PROVIDER||'resend';
  const{data:existing}=await admin.from('integration_jobs').select('id,payload').eq('instance_id',instanceId).eq('order_id',orderId).eq('kind','email_send').eq('provider',provider).in('status',['pending','processing','succeeded']).limit(20);
  if((existing??[]).some(job=>(job.payload as {template?:string}|null)?.template===template))return;
  await enqueueIntegrationJob({instanceId,orderId,kind:'email_send',provider,payload:{template}});
}
async function enqueueInvoiceOrFallback(instanceId:string,orderId:string){
  const admin=createAdminClient(),provider=getConfiguredInvoiceProviderCode();
  if(provider){await enqueueIntegrationJob({instanceId,orderId,kind:'invoice_create',provider,payload:{source:'payment_confirmed'}});return}
  await admin.from('order_events').insert({instance_id:instanceId,order_id:orderId,event_type:'invoice_manual_required',from_status:'paid',to_status:'paid',metadata:{reason:'Automatikus számlázó adapter nincs aktiválva vagy ellenőrizve.'}});
}

async function resolveOrder(providerCode:string,providerReference:string):Promise<ResolvedOrder|null>{
  const admin=createAdminClient();
  const{data:attempts,error:attemptError}=await admin.from('payment_attempts').select('order_id,instance_id').eq('provider_code',providerCode).eq('provider_reference',providerReference).limit(2);
  if(attemptError)throw attemptError;
  if((attempts??[]).length>1)throw new Error('Ambiguous payment tenant reference.');
  const attempt=attempts?.[0];
  if(attempt?.order_id&&attempt.instance_id){
    const{data:order,error}=await admin.from('orders').select('id,instance_id,status,external_payment_id').eq('id',attempt.order_id).eq('instance_id',attempt.instance_id).maybeSingle();
    if(error)throw error;if(order)return order as ResolvedOrder;
  }
  const{data:legacy,error:legacyError}=await admin.from('orders').select('id,instance_id,status,external_payment_id').eq('external_payment_id',providerReference).limit(2);
  if(legacyError)throw legacyError;
  if((legacy??[]).length>1)throw new Error('Ambiguous legacy payment tenant reference.');
  return (legacy?.[0] as ResolvedOrder|undefined)??null;
}

export async function applyVerifiedPaymentEvent(event:VerifiedPaymentEvent){
  const admin=createAdminClient(),payloadHash=createHash('sha256').update(event.rawPayload).digest('hex'),order=await resolveOrder(event.providerCode,event.providerReference);
  if(!order){
    await recordWebhookEvent({provider:event.providerCode,externalEventId:event.eventId,signatureValid:event.signatureValid,payloadHash,status:event.signatureValid?'ignored':'rejected',errorMessage:'Verified callback could not be mapped to a webshop order.'}).catch(()=>undefined);
    return{ok:event.signatureValid,duplicate:false,orderId:null};
  }
  await recordWebhookEvent({instanceId:order.instance_id,provider:event.providerCode,externalEventId:event.eventId,signatureValid:event.signatureValid,payloadHash,status:event.signatureValid?'processed':'rejected',errorMessage:null}).catch(()=>undefined);
  const{error:insertError}=await admin.from('payment_events').insert({instance_id:order.instance_id,provider_code:event.providerCode,provider_event_id:event.eventId,provider_reference:event.providerReference,order_id:order.id,event_type:event.eventType,payment_status:event.status,signature_valid:event.signatureValid,payload_hash:payloadHash});
  const duplicate=insertError?.code==='23505';if(insertError&&!duplicate)throw insertError;
  if(!event.signatureValid)return{ok:false,duplicate,orderId:order.id};
  await updatePaymentAttemptFromEvent({instanceId:order.instance_id,providerCode:event.providerCode,providerReference:event.providerReference,status:event.status,eventId:event.eventId,eventType:event.eventType});
  const metadata={provider:event.providerCode,provider_reference:event.providerReference,event_id:event.eventId,event_type:event.eventType};
  if(event.status==='paid'){
    const now=new Date().toISOString(),{data:updated}=await admin.from('orders').update({status:'paid',paid_at:now,external_payment_id:event.providerReference,updated_at:now}).eq('id',order.id).eq('instance_id',order.instance_id).in('status',['pending_payment','pending_transfer','processing']).select('id').maybeSingle();
    if(updated){
      await admin.from('order_events').insert({instance_id:order.instance_id,order_id:order.id,event_type:'payment_confirmed',metadata});
      await enqueueEmailOnce(order.instance_id,order.id,'payment_confirmed').catch(async error=>{await admin.from('order_events').insert({instance_id:order.instance_id,order_id:order.id,event_type:'integration_enqueue_failed',from_status:'paid',to_status:'paid',metadata:{kind:'email_send',template:'payment_confirmed',error:error instanceof Error?error.message:'unknown'}})});
      await enqueueInvoiceOrFallback(order.instance_id,order.id).catch(async error=>{await admin.from('order_events').insert({instance_id:order.instance_id,order_id:order.id,event_type:'integration_enqueue_failed',from_status:'paid',to_status:'paid',metadata:{kind:'invoice_create',error:error instanceof Error?error.message:'unknown'}})});
    }
  }
  if((event.status==='failed'||event.status==='cancelled')&&!duplicate&&order.status==='pending_payment')await admin.from('order_events').insert({instance_id:order.instance_id,order_id:order.id,event_type:event.status==='failed'?'payment_failed':'payment_cancelled',metadata:{...metadata,order_remains_retryable:true}});
  if(event.status==='refunded'){
    const{data:updated}=await admin.from('orders').update({status:'refunded',updated_at:new Date().toISOString()}).eq('id',order.id).eq('instance_id',order.instance_id).in('status',['paid','processing','shipped','completed']).select('id').maybeSingle();
    if(updated)await admin.from('order_events').insert({instance_id:order.instance_id,order_id:order.id,event_type:'payment_refunded',metadata});
  }
  return{ok:true,duplicate,orderId:order.id};
}
