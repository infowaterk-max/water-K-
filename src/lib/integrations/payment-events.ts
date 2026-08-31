import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';
import { updatePaymentAttemptFromEvent } from '@/lib/integrations/payment-attempts';

export type PaymentState='pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';
export type VerifiedPaymentEvent={providerCode:string;eventId:string;providerReference:string;eventType:string;status:PaymentState;signatureValid:boolean;rawPayload:string};
async function enqueueEmailOnce(orderId:string,template:'payment_confirmed'){const admin=createAdminClient(),provider=process.env.EMAIL_PROVIDER||'resend';const{data:existing}=await admin.from('integration_jobs').select('id,payload').eq('order_id',orderId).eq('kind','email_send').eq('provider',provider).in('status',['pending','processing','succeeded']).limit(20);if((existing??[]).some(job=>(job.payload as {template?:string}|null)?.template===template))return;await enqueueIntegrationJob({orderId,kind:'email_send',provider,payload:{template}})}

export async function applyVerifiedPaymentEvent(event:VerifiedPaymentEvent){
 const admin=createAdminClient();
 const payloadHash=createHash('sha256').update(event.rawPayload).digest('hex');
 const {data:order}=await admin.from('orders').select('id,status,external_payment_id').eq('external_payment_id',event.providerReference).maybeSingle();
 const {error:insertError}=await admin.from('payment_events').insert({provider_code:event.providerCode,provider_event_id:event.eventId,provider_reference:event.providerReference,order_id:order?.id??null,event_type:event.eventType,payment_status:event.status,signature_valid:event.signatureValid,payload_hash:payloadHash});
 const duplicate=insertError?.code==='23505';
 if(insertError&&!duplicate)throw insertError;
 if(!event.signatureValid)return{ok:false,duplicate,orderId:order?.id??null};
 await updatePaymentAttemptFromEvent({providerCode:event.providerCode,providerReference:event.providerReference,status:event.status,eventId:event.eventId,eventType:event.eventType});
 if(!order)return{ok:true,duplicate,orderId:null};
 const metadata={provider:event.providerCode,provider_reference:event.providerReference,event_id:event.eventId,event_type:event.eventType};
 if(event.status==='paid'){
  const {data:updated}=await admin.from('orders').update({status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',order.id).in('status',['pending_payment','pending_transfer','processing']).select('id').maybeSingle();
  if(updated){await admin.from('order_events').insert({order_id:order.id,event_type:'payment_confirmed',metadata});await enqueueEmailOnce(order.id,'payment_confirmed').catch(async error=>{await admin.from('order_events').insert({order_id:order.id,event_type:'integration_enqueue_failed',from_status:'paid',to_status:'paid',metadata:{kind:'email_send',template:'payment_confirmed',error:error instanceof Error?error.message:'unknown'}})});await admin.from('order_events').insert({order_id:order.id,event_type:'invoice_manual_required',from_status:'paid',to_status:'paid',metadata:{reason:'Automatikus számlázó adapter még nincs aktiválva.'}});}
 }
 if((event.status==='failed'||event.status==='cancelled')&&!duplicate&&order.status==='pending_payment')await admin.from('order_events').insert({order_id:order.id,event_type:event.status==='failed'?'payment_failed':'payment_cancelled',metadata:{...metadata,order_remains_retryable:true}});
 if(event.status==='refunded'){const {data:updated}=await admin.from('orders').update({status:'refunded',updated_at:new Date().toISOString()}).eq('id',order.id).in('status',['paid','processing','shipped','completed']).select('id').maybeSingle();if(updated)await admin.from('order_events').insert({order_id:order.id,event_type:'payment_refunded',metadata});}
 return{ok:true,duplicate,orderId:order.id};
}
