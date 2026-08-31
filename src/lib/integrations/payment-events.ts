import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { enqueueIntegrationJob } from '@/lib/integrations/outbox';

export type PaymentState='pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';
export type VerifiedPaymentEvent={providerCode:string;eventId:string;providerReference:string;eventType:string;status:PaymentState;signatureValid:boolean;rawPayload:string};
export async function applyVerifiedPaymentEvent(event:VerifiedPaymentEvent){
 const admin=createAdminClient();const payloadHash=createHash('sha256').update(event.rawPayload).digest('hex');
 const {data:order}=await admin.from('orders').select('id,status,external_payment_id').eq('external_payment_id',event.providerReference).maybeSingle();
 const {error:insertError}=await admin.from('payment_events').insert({provider_code:event.providerCode,provider_event_id:event.eventId,provider_reference:event.providerReference,order_id:order?.id??null,event_type:event.eventType,payment_status:event.status,signature_valid:event.signatureValid,payload_hash:payloadHash});
 if(insertError){if(insertError.code==='23505')return{ok:true,duplicate:true,orderId:order?.id??null};throw insertError}
 if(!event.signatureValid)return{ok:false,duplicate:false,orderId:order?.id??null};
 if(!order)return{ok:true,duplicate:false,orderId:null};
 if(event.status==='paid'){
  const {data:updated}=await admin.from('orders').update({status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',order.id).neq('status','paid').select('id').maybeSingle();
  if(updated){await admin.from('order_events').insert({order_id:order.id,event_type:'payment_confirmed',metadata:{provider:event.providerCode,provider_reference:event.providerReference,event_id:event.eventId}});await enqueueIntegrationJob({orderId:order.id,kind:'email_send',provider:process.env.EMAIL_PROVIDER||'resend',payload:{template:'payment_confirmed'}}).catch(()=>undefined);}
 }
 return{ok:true,duplicate:false,orderId:order.id};
}
