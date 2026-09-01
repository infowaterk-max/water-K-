import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
export type PaymentAttemptStatus='created'|'pending'|'requires_action'|'succeeded'|'failed'|'cancelled'|'expired'|'refunded';
type CreatePaymentAttemptInput={instanceId?:string|null;orderId:string;providerCode:string;providerReference?:string|null;amountHuf:number;status?:PaymentAttemptStatus;metadata?:Record<string,unknown>};
export type LatestPaymentAttempt={id:string;status:PaymentAttemptStatus;providerReference:string|null;checkoutUrl:string|null;createdAt:string};
function objectMeta(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function sanitizeFailure(message?:string|null){if(!message)return null;return message.replace(/[\r\n\t]+/g,' ').replace(/(?:sk|pk|secret|token|password|key)[=:]\s*[^\s,;]+/gi,'[redacted]').slice(0,500)}

async function resolveOrderTenant(orderId:string){
  const admin=createAdminClient();
  const{data,error}=await admin.from('orders').select('instance_id').eq('id',orderId).maybeSingle();
  if(error||!data?.instance_id)throw error??new Error('A fizetési próbálkozás rendelési tenantja nem oldható fel.');
  return data.instance_id as string;
}

export async function createPaymentAttempt(input:CreatePaymentAttemptInput){
  const admin=createAdminClient(),now=new Date().toISOString(),instanceId=input.instanceId??await resolveOrderTenant(input.orderId);
  const{data:order,error:orderError}=await admin.from('orders').select('instance_id').eq('id',input.orderId).maybeSingle();
  if(orderError||!order?.instance_id||order.instance_id!==instanceId)throw orderError??new Error('Cross-store payment attempt is not allowed.');
  const payload={instance_id:instanceId,order_id:input.orderId,provider_code:input.providerCode,provider_reference:input.providerReference??null,status:input.status??'created',amount_huf:input.amountHuf,currency:'HUF',metadata:input.metadata??{},updated_at:now};
  const{data,error}=await admin.from('payment_attempts').insert(payload).select('id').single();
  if(!error)return data.id;
  if(error.code==='23505'&&input.providerReference){
    const{data:existing,error:existingError}=await admin.from('payment_attempts').select('id').eq('instance_id',instanceId).eq('provider_code',input.providerCode).eq('provider_reference',input.providerReference).maybeSingle();
    if(existingError)throw existingError;if(existing)return existing.id;
  }
  throw error;
}

export async function getLatestPaymentAttempt(orderId:string,providerCode:string):Promise<LatestPaymentAttempt|null>{
  const admin=createAdminClient(),instanceId=await resolveOrderTenant(orderId);
  const{data,error}=await admin.from('payment_attempts').select('id,status,provider_reference,metadata,created_at').eq('instance_id',instanceId).eq('order_id',orderId).eq('provider_code',providerCode).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error)throw error;if(!data)return null;
  const metadata=objectMeta(data.metadata),checkoutUrl=typeof metadata.checkout_url==='string'&&/^https?:\/\//i.test(metadata.checkout_url)?metadata.checkout_url:null;
  return{id:data.id,status:data.status as PaymentAttemptStatus,providerReference:data.provider_reference,checkoutUrl,createdAt:data.created_at};
}

export async function attachPaymentAttemptReference(attemptId:string,providerReference:string,extraMetadata?:Record<string,unknown>){
  const admin=createAdminClient(),now=new Date().toISOString(),{data:current,error:readError}=await admin.from('payment_attempts').select('metadata').eq('id',attemptId).maybeSingle();
  if(readError)throw readError;const metadata={...objectMeta(current?.metadata),...(extraMetadata??{})};
  const{data,error}=await admin.from('payment_attempts').update({provider_reference:providerReference,status:'pending',metadata,updated_at:now,completed_at:null,failure_code:null,failure_message:null}).eq('id',attemptId).in('status',['created','requires_action']).select('id').maybeSingle();
  if(error)throw error;if(!data){const{data:existing,error:existingError}=await admin.from('payment_attempts').select('provider_reference').eq('id',attemptId).maybeSingle();if(existingError)throw existingError;if(existing?.provider_reference===providerReference)return;throw new Error('Payment attempt reference persistence conflict')}
}

export async function markPaymentAttemptRequiresAction(attemptId:string,input?:{code?:string;message?:string;metadata?:Record<string,unknown>}){
  const admin=createAdminClient(),{data:current}=await admin.from('payment_attempts').select('metadata').eq('id',attemptId).maybeSingle(),metadata=objectMeta(current?.metadata);
  const{error}=await admin.from('payment_attempts').update({status:'requires_action',failure_code:input?.code?.slice(0,120)??'PAYMENT_OUTCOME_UNKNOWN',failure_message:sanitizeFailure(input?.message),metadata:{...metadata,...(input?.metadata??{})},updated_at:new Date().toISOString(),completed_at:null}).eq('id',attemptId).in('status',['created','pending','requires_action']);if(error)throw error;
}

export async function updatePaymentAttemptFromEvent(input:{instanceId:string;providerCode:string;providerReference:string;status:'pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';eventId:string;eventType:string}){
  const mapped:PaymentAttemptStatus|null=input.status==='paid'?'succeeded':input.status==='failed'?'failed':input.status==='cancelled'?'cancelled':input.status==='refunded'?'refunded':input.status==='pending'?'pending':null;if(!mapped)return;
  const admin=createAdminClient(),now=new Date().toISOString(),terminal=['succeeded','failed','cancelled','expired','refunded'].includes(mapped);
  const{data:attempt,error:readError}=await admin.from('payment_attempts').select('id,metadata').eq('instance_id',input.instanceId).eq('provider_code',input.providerCode).eq('provider_reference',input.providerReference).maybeSingle();
  if(readError)throw readError;if(!attempt)return;
  const metadata=objectMeta(attempt.metadata),{error}=await admin.from('payment_attempts').update({status:mapped,updated_at:now,completed_at:terminal?now:null,failure_code:null,failure_message:null,metadata:{...metadata,last_event_id:input.eventId,last_event_type:input.eventType}}).eq('id',attempt.id).eq('instance_id',input.instanceId);if(error)throw error;
}
