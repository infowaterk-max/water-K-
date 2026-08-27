import { createAdminClient } from '@/lib/supabase/admin';

export type IntegrationJobKind='payment_create'|'payment_callback'|'shipment_create'|'invoice_create'|'email_send';
export type IntegrationJobStatus='pending'|'processing'|'succeeded'|'failed'|'blocked';

export async function enqueueIntegrationJob(input:{orderId?:string|null;kind:IntegrationJobKind;provider:string;payload?:Record<string,unknown>;status?:IntegrationJobStatus;lastError?:string}){
  const admin=createAdminClient();
  const {data,error}=await admin.from('integration_jobs').insert({order_id:input.orderId??null,kind:input.kind,provider:input.provider,status:input.status??'pending',payload:input.payload??{},last_error:input.lastError??null}).select('id,status').single();
  if(error) throw error;
  return data;
}

export async function recordWebhookEvent(input:{provider:string;externalEventId?:string|null;signatureValid:boolean;payloadHash?:string|null;status:'received'|'processed'|'ignored'|'rejected'|'failed';errorMessage?:string|null}){
  const admin=createAdminClient();
  const {data,error}=await admin.from('webhook_events').insert({provider:input.provider,external_event_id:input.externalEventId??null,signature_valid:input.signatureValid,payload_hash:input.payloadHash??null,status:input.status,error_message:input.errorMessage??null,processed_at:['processed','ignored','rejected','failed'].includes(input.status)?new Date().toISOString():null}).select('id').single();
  if(error) throw error;
  return data;
}
