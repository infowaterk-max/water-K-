import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';
import { updatePaymentAttemptFromEvent } from '@/lib/integrations/payment-attempts';

export type PaymentState='pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';
export type VerifiedPaymentEvent={providerCode:string;eventId:string;providerReference:string;eventType:string;status:PaymentState;signatureValid:boolean;rawPayload:string};

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
  if(updated){
   await admin.from('order_events').insert({order_id:order.id,event_type:'payment_confirmed',metadata});
   await enqueueIntegrationJob({orderId:order.id,kind:'email_send',provider:process.env.EMAIL_PROVIDER||'resend',payload:{template:'payment_confirmed'}}).catch(()=>undefined);
  }
 }

 if((event.status==='failed'||event.status==='cancelled')&&!duplicate&&order.status==='pending_payment'){
  await admin.from('order_events').insert({order_id:order.id,event_type:event.status==='failed'?'payment_failed':'payment_cancelled',metadata:{...metadata,order_remains_retryable:true}});
 }

 if(event.status==='refunded'){
  const {data:updated}=await admin.from('orders').update({status:'refunded',updated_at:new Date().toISOString()}).eq('id',order.id).in('status',['paid','processing','shipped','completed']).select('id').maybeSingle();
  if(updated)await admin.from('order_events').insert({order_id:order.id,event_type:'payment_refunded',metadata});
 }
 return{ok:true,duplicate,orderId:order.id};
}
