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

async function mutateOffice(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:string;payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_workspace_v2',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_action:input.action,
    p_payload:input.payload,
  });
  if(error)throw new Error('A Digitális iroda művelete nem menthető. Az állapotot nem tekintjük módosítottnak.');
  const result=(data??{})as{id?:string;threadId?:string;taskId?:string;jobId?:string};
  if(!result.id&&!result.threadId&&!result.taskId&&!result.jobId)throw new Error('A Digitális iroda műveletének eredménye nem igazolható.');
  return result;
}

export async function createThreadAction(form:FormData){
 const{db,userId,instanceId}=await access(),subject=String(form.get('subject')??'').trim().slice(0,180);
 const email=String(form.get('email')??'').trim().toLowerCase().slice(0,320);
 const orderId=String(form.get('orderId')??'').trim(),body=String(form.get('body')??'').trim().slice(0,10000);if(!subject||!body)return;
 await mutateOffice(db,{instanceId,userId,action:'create_thread',payload:{subject,email:email||null,orderId:orderId||null,body}});
 revalidatePath('/admin/kommunikacio/iroda');
}

export async function addMessageAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),body=String(form.get('body')??'').trim().slice(0,10000),kind=String(form.get('kind')??'internal');
 if(!threadId||!body||!['internal','note'].includes(kind))return;
 await mutateOffice(db,{instanceId,userId,action:'add_message',payload:{threadId,body,kind}});
 revalidatePath('/admin/kommunikacio/iroda');
}

export async function updateThreadAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),status=String(form.get('status')??'open'),priority=String(form.get('priority')??'normal'),owner=String(form.get('owner')??'self');
 if(!threadId||!['open','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority))return;
 await mutateOffice(db,{instanceId,userId,action:'update_thread',payload:{threadId,status,priority,ownerSelf:owner==='self'}});
 revalidatePath('/admin/kommunikacio/iroda');
}

export async function markThreadReadAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??'');if(!threadId)return;
 await mutateOffice(db,{instanceId,userId,action:'mark_read',payload:{threadId}});
 revalidatePath('/admin/kommunikacio/iroda');
}

export async function sendCustomerEmailAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),body=String(form.get('body')??'').trim().slice(0,4000);if(!threadId||!body)return;
 await mutateOffice(db,{instanceId,userId,action:'send_email',payload:{threadId,body,idempotencyKey:`office:${instanceId}:${threadId}:${randomUUID()}`}});
 revalidatePath('/admin/kommunikacio/iroda');revalidatePath('/admin/kommunikacio');
}

export async function createTaskAction(form:FormData){
 const{db,userId,instanceId}=await access(),threadId=String(form.get('threadId')??''),title=String(form.get('title')??'').trim().slice(0,240),due=String(form.get('due')??'');if(!title)return;
 let dueAt:string|null=null;if(due){const parsed=new Date(due);if(Number.isNaN(parsed.getTime()))return;dueAt=parsed.toISOString();}
 await mutateOffice(db,{instanceId,userId,action:'create_task',payload:{threadId:threadId||null,title,dueAt}});
 revalidatePath('/admin/kommunikacio/iroda');
}

export async function completeTaskAction(form:FormData){
 const{db,userId,instanceId}=await access(),id=String(form.get('id')??'');if(!id)return;
 await mutateOffice(db,{instanceId,userId,action:'complete_task',payload:{id}});
 revalidatePath('/admin/kommunikacio/iroda');
}
