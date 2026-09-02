'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

async function access(){
  const actor=await getAdminRequestUser('support.manage');if(!actor)throw new Error('Nincs jogosultság.');
  await requirePlanFeature('officeCommunication');
  const scope=await requireCurrentStoreContext('support.manage');
  return{db:createAdminClient(),userId:actor.id,instanceId:scope.instanceId};
}

export async function createThreadAction(form:FormData){
 const{db,userId,instanceId}=await access(),subject=String(form.get('subject')??'').trim().slice(0,180);
 let email=String(form.get('email')??'').trim().toLowerCase().slice(0,320);
 const orderId=String(form.get('orderId')??'').trim(),body=String(form.get('body')??'').trim().slice(0,10000);if(!subject||!body)return;
 if(orderId){
  const{data:order}=await db.from('orders').select('customer_email').eq('id',orderId).eq('instance_id',instanceId).maybeSingle();
  if(!order)return;if(!email)email=order.customer_email?.trim().toLowerCase()??'';
 }
 const{data}=await db.from('office_threads').insert({instance_id:instanceId,subject,customer_email:email||null,order_id:orderId||null,created_by:userId,assigned_to:userId,last_read_at:new Date().toISOString()}).select('id').single();
 if(data?.id)await db.from('office_messages').insert({instance_id:instanceId,thread_id:data.id,author_id:userId,kind:'internal',body});
 revalidatePath('/admin/kommunikacio/iroda');
}
export async function addMessageAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),body=String(form.get('body')??'').trim().slice(0,10000),kind=String(form.get('kind')??'internal');
 if(!threadId||!body||!['internal','note'].includes(kind))return;
 const{data:thread}=await db.from('office_threads').select('id').eq('id',threadId).eq('instance_id',instanceId).maybeSingle();if(!thread)return;
 await db.from('office_messages').insert({instance_id:instanceId,thread_id:threadId,author_id:userId,kind,body});
 await db.from('office_threads').update({updated_at:new Date().toISOString(),last_read_at:new Date().toISOString()}).eq('id',threadId).eq('instance_id',instanceId);
 revalidatePath('/admin/kommunikacio/iroda');
}
export async function updateThreadAction(form:FormData){
 const{db,userId,instanceId}=await access(),id=String(form.get('threadId')??''),status=String(form.get('status')??'open'),priority=String(form.get('priority')??'normal'),owner=String(form.get('owner')??'self');
 if(!id||!['open','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority))return;
 await db.from('office_threads').update({status,priority,assigned_to:owner==='self'?userId:null,last_read_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('instance_id',instanceId);
 revalidatePath('/admin/kommunikacio/iroda');
}
export async function markThreadReadAction(form:FormData){
 const{db,instanceId}=await access(),id=String(form.get('threadId')??'');if(!id)return;
 await db.from('office_threads').update({last_read_at:new Date().toISOString()}).eq('id',id).eq('instance_id',instanceId);
 revalidatePath('/admin/kommunikacio/iroda');
}
export async function sendCustomerEmailAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),body=String(form.get('body')??'').trim().slice(0,4000);if(!threadId||!body)return;
 const{data:thread}=await db.from('office_threads').select('id,subject,customer_email,order_id').eq('id',threadId).eq('instance_id',instanceId).maybeSingle();if(!thread?.customer_email)return;
 const email=thread.customer_email.trim().toLowerCase();
 const[{data:profile},{data:order}]=await Promise.all([
   db.from('profiles').select('id,full_name').eq('email',email).maybeSingle(),
   thread.order_id?db.from('orders').select('order_number').eq('id',thread.order_id).eq('instance_id',instanceId).maybeSingle():Promise.resolve({data:null}),
 ]);
 const payload={name:profile?.full_name||'Vásárlónk',ticketId:threadId,ticketNumber:order?.order_number||thread.subject,replyPreview:body,orderNumber:order?.order_number||null,officeThreadId:threadId};
 const{data:job,error}=await db.rpc('enqueue_communication_v2',{p_instance_id:instanceId,p_email:email,p_user_id:profile?.id??null,p_purpose:'transactional',p_template_key:'support_reply',p_payload:payload,p_idempotency_key:`office:${instanceId}:${threadId}:${randomUUID()}`,p_scheduled_at:new Date().toISOString()});
 if(error||!job)return;
 await db.from('office_messages').insert({instance_id:instanceId,thread_id:threadId,author_id:userId,kind:'email_out',body,communication_job_id:job,recipient_email:email,subject:`Re: ${thread.subject}`});
 await db.from('office_threads').update({updated_at:new Date().toISOString(),last_read_at:new Date().toISOString()}).eq('id',threadId).eq('instance_id',instanceId);
 revalidatePath('/admin/kommunikacio/iroda');revalidatePath('/admin/kommunikacio');
}
export async function createTaskAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),title=String(form.get('title')??'').trim().slice(0,240),due=String(form.get('due')??'');if(!title)return;
 if(threadId){const{data:thread}=await db.from('office_threads').select('id').eq('id',threadId).eq('instance_id',instanceId).maybeSingle();if(!thread)return}
 await db.from('office_tasks').insert({instance_id:instanceId,thread_id:threadId||null,title,created_by:userId,assigned_to:userId,due_at:due?new Date(due).toISOString():null});
 revalidatePath('/admin/kommunikacio/iroda');
}
export async function completeTaskAction(form:FormData){
 const{db,instanceId}=await access(),id=String(form.get('id')??'');if(!id)return;
 await db.from('office_tasks').update({status:'done',completed_at:new Date().toISOString()}).eq('id',id).eq('instance_id',instanceId);
 revalidatePath('/admin/kommunikacio/iroda');
}
