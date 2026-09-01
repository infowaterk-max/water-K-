import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
export type IntegrationJobKind='payment_create'|'payment_callback'|'shipment_create'|'invoice_create'|'email_send';
export type IntegrationJobStatus='pending'|'processing'|'succeeded'|'failed'|'blocked';

export async function enqueueIntegrationJob(input:{instanceId?:string|null;orderId?:string|null;kind:IntegrationJobKind;provider:string;payload?:Record<string,unknown>;status?:IntegrationJobStatus;lastError?:string}){
  const admin=createAdminClient();
  let instanceId=input.instanceId??null;
  if(input.orderId){
    const{data:order,error:orderError}=await admin.from('orders').select('instance_id').eq('id',input.orderId).maybeSingle();
    if(orderError||!order?.instance_id)throw orderError??new Error('A rendelés webshopja nem oldható fel.');
    if(instanceId&&instanceId!==order.instance_id)throw new Error('Cross-store integration job is not allowed.');
    instanceId=order.instance_id;
  }
  if(!instanceId)throw new Error('Integration job requires tenant instance.');
  const row={instance_id:instanceId,order_id:input.orderId??null,kind:input.kind,provider:input.provider,status:input.status??'pending',payload:input.payload??{},last_error:input.lastError??null};
  const{data,error}=await admin.from('integration_jobs').insert(row).select('id,status').single();
  if(!error)return data;
  if(error.code==='23505'&&row.order_id&&['pending','processing'].includes(row.status)){
    const{data:existing,error:existingError}=await admin.from('integration_jobs').select('id,status').eq('instance_id',instanceId).eq('order_id',row.order_id).eq('kind',row.kind).eq('provider',row.provider).in('status',['pending','processing']).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(existingError)throw existingError;
    if(existing)return existing;
  }
  throw error;
}

export async function recordWebhookEvent(input:{provider:string;externalEventId?:string|null;signatureValid:boolean;payloadHash?:string|null;status:'received'|'processed'|'ignored'|'rejected'|'failed';errorMessage?:string|null}){
  const admin=createAdminClient();
  const{data,error}=await admin.from('webhook_events').insert({provider:input.provider,external_event_id:input.externalEventId??null,signature_valid:input.signatureValid,payload_hash:input.payloadHash??null,status:input.status,error_message:input.errorMessage??null,processed_at:['processed','ignored','rejected','failed'].includes(input.status)?new Date().toISOString():null}).select('id').single();
  if(error)throw error;
  return data;
}
