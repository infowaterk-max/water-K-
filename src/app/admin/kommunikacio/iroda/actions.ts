'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

type OfficeEmailActionState={status:'idle'|'success'|'blocked'|'error';message:string};
type ChatObjectType='order'|'commercial_offer'|'return_case'|'support_ticket'|'task';
const chatObjectTypes=new Set<ChatObjectType>(['order','commercial_offer','return_case','support_ticket','task']);

class OfficeMutationError extends Error{
  readonly reason:string;
  constructor(reason:string){
    super('A Digitális iroda művelete nem menthető. Az állapotot nem tekintjük módosítottnak.');
    this.name='OfficeMutationError';
    this.reason=reason.toLowerCase();
  }
}

async function access(){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)throw new Error('Nincs jogosultság.');
  await requirePlanFeature('officeCommunication');
  const scope=await requireCurrentStoreContext('support.manage');
  return{db:createAdminClient(),userId:actor.id,instanceId:scope.instanceId};
}

function errorReason(error:{code?:string|null;message?:string|null;details?:string|null;hint?:string|null}){
  return[error.code,error.message,error.details,error.hint].filter(Boolean).join(' ');
}

async function mutateOffice(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:string;payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_workspace_v2',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_action:input.action,
    p_payload:input.payload,
  });
  if(error)throw new OfficeMutationError(errorReason(error));
  const result=(data??{})as{id?:string;threadId?:string;taskId?:string;jobId?:string};
  if(!result.id&&!result.threadId&&!result.taskId&&!result.jobId)throw new Error('A Digitális iroda műveletének eredménye nem igazolható.');
  return result;
}

async function mutateOfficePrivacy(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:string;payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_privacy_v1',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_action:input.action,
    p_payload:input.payload,
  });
  if(error)throw new OfficeMutationError(errorReason(error));
  const result=(data??{})as{id?:string;threadId?:string;messageId?:string;userId?:string;participantCount?:number};
  if(!result.id&&!result.threadId&&!result.messageId)throw new Error('A Digitális iroda privacy műveletének eredménye nem igazolható.');
  return result;
}

async function mutateOfficeTeamChat(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:string;payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_team_chat_v2',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_action:input.action,
    p_payload:input.payload,
  });
  if(error)throw new OfficeMutationError(errorReason(error));
  const result=(data??{})as{
    id?:string;threadId?:string;messageId?:string;targetUserId?:string;participantCount?:number;mentionCount?:number;objectLinked?:boolean;
  };
  if(!result.id&&!result.threadId&&!result.messageId)throw new Error('A Digitális iroda Team Chat műveletének eredménye nem igazolható.');
  return result;
}

function selectedUserIds(form:FormData,name:string){
  return[...new Set(form.getAll(name).map(value=>String(value).trim()).filter(Boolean))].slice(0,25);
}

function chatObjectFrom(form:FormData){
  const raw=String(form.get('objectRef')??'').trim();
  if(!raw)return{objectType:null,objectId:null};
  const separator=raw.indexOf(':');
  if(separator<1)return null;
  const type=raw.slice(0,separator)as ChatObjectType;
  const objectId=raw.slice(separator+1).trim();
  if(!chatObjectTypes.has(type)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(objectId))return null;
  return{objectType:type,objectId};
}

export async function createThreadAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const subject=String(form.get('subject')??'').trim().slice(0,180);
  const email=String(form.get('email')??'').trim().toLowerCase().slice(0,320);
  const orderId=String(form.get('orderId')??'').trim();
  const body=String(form.get('body')??'').trim().slice(0,10000);
  if(!subject||!body)return;
  await mutateOffice(db,{instanceId,userId,action:'create_thread',payload:{subject,email:email||null,orderId:orderId||null,body}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function createPrivateThreadAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const subject=String(form.get('subject')??'').trim().slice(0,180);
  const body=String(form.get('body')??'').trim().slice(0,10000);
  const participantUserIds=selectedUserIds(form,'participantUserId');
  const mentionUserIds=selectedUserIds(form,'mentionUserId').slice(0,10);
  const object=chatObjectFrom(form);
  if(!subject||!body||participantUserIds.length===0||!object)return;
  await mutateOfficeTeamChat(db,{instanceId,userId,action:'create_internal_thread',payload:{subject,body,participantUserIds,mentionUserIds,...object}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function addMessageAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  const body=String(form.get('body')??'').trim().slice(0,10000);
  const kind=String(form.get('kind')??'internal');
  if(!threadId||!body||!['internal','note'].includes(kind))return;
  await mutateOffice(db,{instanceId,userId,action:'add_message',payload:{threadId,body,kind}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function addPrivateMessageAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  const body=String(form.get('body')??'').trim().slice(0,10000);
  const mentionUserIds=selectedUserIds(form,'mentionUserId').slice(0,10);
  const object=chatObjectFrom(form);
  if(!threadId||!body||!object)return;
  await mutateOfficeTeamChat(db,{instanceId,userId,action:'add_internal_message',payload:{threadId,body,mentionUserIds,...object}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function managePrivateParticipantAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'').trim();
  const targetUserId=String(form.get('targetUserId')??'').trim();
  const operation=String(form.get('operation')??'').trim();
  if(!threadId||!targetUserId||!['add','remove'].includes(operation))return;
  await mutateOfficeTeamChat(db,{instanceId,userId,action:'manage_participant',payload:{threadId,targetUserId,operation}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function transferPrivateThreadOwnerAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'').trim();
  const targetUserId=String(form.get('targetUserId')??'').trim();
  if(!threadId||!targetUserId)return;
  const{data,error}=await db.rpc('admin_transfer_office_thread_owner_v1',{
    p_instance_id:instanceId,
    p_actor:userId,
    p_thread_id:threadId,
    p_target_user_id:targetUserId,
  });
  if(error)throw new OfficeMutationError(errorReason(error));
  const result=(data??{})as{id?:string;threadId?:string;ownerUserId?:string;transferred?:boolean};
  if(result.id!==threadId||result.threadId!==threadId||result.ownerUserId!==targetUserId||result.transferred!==true){
    throw new Error('A Digitális iroda tulajdonjog-átadásának eredménye nem igazolható.');
  }
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function updateThreadAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  const status=String(form.get('status')??'open');
  const priority=String(form.get('priority')??'normal');
  const assigneeUserId=String(form.get('assigneeUserId')??'').trim()||null;
  if(!threadId||!['open','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority))return;
  await mutateOfficePrivacy(db,{instanceId,userId,action:'update_customer_thread',payload:{threadId,status,priority,assigneeUserId}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function markThreadReadAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  if(!threadId)return;
  await mutateOfficeTeamChat(db,{instanceId,userId,action:'mark_read',payload:{threadId}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function sendCustomerEmailAction(_previous:OfficeEmailActionState,form:FormData):Promise<OfficeEmailActionState>{
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  const body=String(form.get('body')??'').trim().slice(0,4000);
  if(!threadId||!body)return{status:'error',message:'Az e-mail válaszhoz üzenetszöveg szükséges.'};
  try{
    await mutateOffice(db,{instanceId,userId,action:'send_email',payload:{threadId,body,idempotencyKey:`office:${instanceId}:${threadId}:${randomUUID()}`}});
  }catch(error){
    if(error instanceof OfficeMutationError&&error.reason.includes('recipient suppressed')){
      return{status:'blocked',message:'Ez az e-mail-cím kommunikációs tiltólistán van, ezért az üzenet nem küldhető.'};
    }
    return{status:'error',message:'Az e-mail válasz most nem küldhető el. A szöveg megmaradt, ezért javítás vagy újrapróbálás után nem kell újra begépelni.'};
  }
  revalidatePath('/admin/kommunikacio/iroda');
  revalidatePath('/admin/kommunikacio');
  return{status:'success',message:'Az e-mail válasz küldési sorba került.'};
}

export async function createTaskAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const threadId=String(form.get('threadId')??'');
  const title=String(form.get('title')??'').trim().slice(0,240);
  const due=String(form.get('due')??'');
  if(!title)return;
  let dueAt:string|null=null;
  if(due){
    const parsed=new Date(due);
    if(Number.isNaN(parsed.getTime()))return;
    dueAt=parsed.toISOString();
  }
  await mutateOffice(db,{instanceId,userId,action:'create_task',payload:{threadId:threadId||null,title,dueAt}});
  revalidatePath('/admin/kommunikacio/iroda');
}

export async function completeTaskAction(form:FormData){
  const{db,userId,instanceId}=await access();
  const id=String(form.get('id')??'');
  if(!id)return;
  await mutateOffice(db,{instanceId,userId,action:'complete_task',payload:{id}});
  revalidatePath('/admin/kommunikacio/iroda');
}
