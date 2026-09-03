import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
export type IntegrationJobKind='payment_create'|'payment_callback'|'shipment_create'|'invoice_create'|'email_send'|'logistics_email';
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
    const{data:existing,error:existingError}=await admin.from('integration_jobs').select('id,status,payload').eq('instance_id',instanceId).eq('order_id',row.order_id).eq('kind',row.kind).eq('provider',row.provider).in('status',['pending','processing']).order('created_at',{ascending:false}).limit(20);
    if(existingError)throw existingError;
    if(row.kind==='email_send'){
      const template=String((row.payload as {template?:unknown}).template??'');
      const match=(existing??[]).find(job=>String((job.payload as {template?:unknown}|null)?.template??'')===template);
      if(match)return{id:match.id,status:match.status};
    }else if(existing?.[0])return{id:existing[0].id,status:existing[0].status};
  }
  throw error;
}

export async function recordWebhookEvent(input:{instanceId?:string|null;provider:string;externalEventId?:string|null;signatureValid:boolean;payloadHash?:string|null;status:'received'|'processed'|'ignored'|'rejected'|'failed';errorMessage?:string|null}){
  const admin=createAdminClient();
  const row={instance_id:input.instanceId??null,provider:input.provider,external_event_id:input.externalEventId??null,signature_valid:input.signatureValid,payload_hash:input.payloadHash??null,status:input.status,error_message:input.errorMessage??null,processed_at:['processed','ignored','rejected','failed'].includes(input.status)?new Date().toISOString():null};
  const{data,error}=await admin.from('webhook_events').insert(row).select('id,instance_id').single();
  if(!error)return data;
  if(error.code==='23505'&&input.externalEventId){
    let query=admin.from('webhook_events').select('id,instance_id')
      .eq('provider',input.provider)
      .eq('external_event_id',input.externalEventId);
    query=input.instanceId?query.eq('instance_id',input.instanceId):query.is('instance_id',null);
    const{data:existing,error:existingError}=await query.maybeSingle();
    if(existingError||!existing)throw existingError??error;
    return existing;
  }
  throw error;
}
