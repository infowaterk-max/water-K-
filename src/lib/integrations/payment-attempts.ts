import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type PaymentAttemptStatus='created'|'pending'|'requires_action'|'succeeded'|'failed'|'cancelled'|'expired'|'refunded';

type CreatePaymentAttemptInput={
 orderId:string;
 providerCode:string;
 providerReference:string;
 amountHuf:number;
 status?:PaymentAttemptStatus;
 metadata?:Record<string,unknown>;
};

export async function createPaymentAttempt(input:CreatePaymentAttemptInput){
 const admin=createAdminClient();
 const now=new Date().toISOString();
 const payload={order_id:input.orderId,provider_code:input.providerCode,provider_reference:input.providerReference,status:input.status??'pending',amount_huf:input.amountHuf,currency:'HUF',metadata:input.metadata??{},updated_at:now};
 const {data,error}=await admin.from('payment_attempts').insert(payload).select('id').maybeSingle();
 if(!error)return data?.id??null;
 if(error.code!=='23505')throw error;
 const {data:existing,error:updateError}=await admin.from('payment_attempts').update({status:payload.status,amount_huf:payload.amount_huf,metadata:payload.metadata,updated_at:now}).eq('provider_code',input.providerCode).eq('provider_reference',input.providerReference).select('id').maybeSingle();
 if(updateError)throw updateError;
 return existing?.id??null;
}

export async function updatePaymentAttemptFromEvent(input:{providerCode:string;providerReference:string;status:'pending'|'paid'|'failed'|'cancelled'|'refunded'|'unknown';eventId:string;eventType:string}){
 const mapped:PaymentAttemptStatus|null=input.status==='paid'?'succeeded':input.status==='failed'?'failed':input.status==='cancelled'?'cancelled':input.status==='refunded'?'refunded':input.status==='pending'?'pending':null;
 if(!mapped)return;
 const admin=createAdminClient();
 const now=new Date().toISOString();
 const terminal=mapped==='succeeded'||mapped==='failed'||mapped==='cancelled'||mapped==='expired'||mapped==='refunded';
 const {error}=await admin.from('payment_attempts').update({status:mapped,updated_at:now,completed_at:terminal?now:null,metadata:{last_event_id:input.eventId,last_event_type:input.eventType}}).eq('provider_code',input.providerCode).eq('provider_reference',input.providerReference);
 if(error)throw error;
}
