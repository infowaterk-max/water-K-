'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { hasStoreCapability } from '@/lib/auth/store-capabilities';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

type ChatObjectType='order'|'commercial_offer'|'return_case'|'support_ticket'|'task';
const chatObjectTypes=new Set<ChatObjectType>(['order','commercial_offer','return_case','support_ticket','task']);

class TeamChatMutationError extends Error{
  readonly reason:string;
  constructor(reason:string){
    super('A Team Chat művelet nem menthető. Az állapotot nem tekintjük módosítottnak.');
    this.name='TeamChatMutationError';
    this.reason=reason.toLowerCase();
  }
}

async function privateChatAccess(){
  const actor=await getAdminRequestUser();
  if(!actor)throw new Error('Nincs jogosultság.');
  await requirePlanFeature('teamChat');
  const scope=await requireCurrentStoreContext();
  const allowed=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{
    resourceOwnerUserId:actor.id,
    resourceAssignedUserId:actor.id,
  });
  if(!allowed)throw new Error('Nincs jogosultság a belső chat használatához.');
  return{db:createAdminClient(),userId:actor.id,instanceId:scope.instanceId};
}

function errorReason(error:{code?:string|null;message?:string|null;details?:string|null;hint?:string|null}){
  return[error.code,error.message,error.details,error.hint].filter(Boolean).join(' ');
}

async function mutateTeamChat(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:string;payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_team_chat_v2',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_action:input.action,
    p_payload:input.payload,
  });
  if(error)throw new TeamChatMutationError(errorReason(error));
  const result=(data??{})as{
    id?:string;threadId?:string;messageId?:string;targetUserId?:string;participantCount?:number;mentionCount?:number;objectLinked?:boolean;
  };
  if(!result.id&&!result.threadId&&!result.messageId)throw new Error('A Team Chat műveletének eredménye nem igazolható.');
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

async function directThreadBetween(db:ReturnType<typeof createAdminClient>,instanceId:string,userId:string,targetUserId:string){
  const{data,error}=await db.from('office_thread_participants')
    .select('thread_id,user_id')
    .eq('instance_id',instanceId)
    .in('user_id',[userId,targetUserId])
    .is('left_at',null);
  if(error)throw new TeamChatMutationError(errorReason(error));
  const membership=new Map<string,Set<string>>();
  for(const row of data??[]){
    const threadId=String(row.thread_id),memberId=String(row.user_id);
    const members=membership.get(threadId)??new Set<string>();
    members.add(memberId);membership.set(threadId,members);
  }
  const candidateIds=[...membership.entries()].filter(([,members])=>members.has(userId)&&members.has(targetUserId)).map(([threadId])=>threadId);
  if(!candidateIds.length)return null;
  const{data:threads,error:threadError}=await db.from('office_threads')
    .select('id')
    .eq('instance_id',instanceId)
    .in('id',candidateIds)
    .eq('conversation_type','internal_private')
    .is('archived_at',null)
    .order('updated_at',{ascending:false})
    .limit(1);
  if(threadError)throw new TeamChatMutationError(errorReason(threadError));
  return threads?.[0]?.id?String(threads[0].id):null;
}

export async function sendDirectMessageAction(form:FormData){
  const{db,userId,instanceId}=await privateChatAccess();
  const targetUserId=String(form.get('targetUserId')??'').trim();
  const body=String(form.get('body')??'').trim().slice(0,10000);
  const object=chatObjectFrom(form);
  if(!targetUserId||targetUserId===userId||!body||!object)return;
  const existingThreadId=await directThreadBetween(db,instanceId,userId,targetUserId);
  const result=existingThreadId
    ?await mutateTeamChat(db,{instanceId,userId,action:'add_internal_message',payload:{threadId:existingThreadId,body,mentionUserIds:[],...object}})
    :await mutateTeamChat(db,{instanceId,userId,action:'create_internal_thread',payload:{subject:'Közvetlen beszélgetés',body,participantUserIds:[targetUserId],mentionUserIds:[],...object}});
  const threadId=result.threadId??result.id;
  if(!threadId)throw new Error('A közvetlen beszélgetés azonosítója nem igazolható.');
  revalidatePath('/admin/kommunikacio/chat');
  redirect(`/admin/kommunikacio/chat?thread=${threadId}`);
}

export async function createPrivateThreadAction(form:FormData){
  const{db,userId,instanceId}=await privateChatAccess();
  const subject=String(form.get('subject')??'').trim().slice(0,180);
  const body=String(form.get('body')??'').trim().slice(0,10000);
  const participantUserIds=selectedUserIds(form,'participantUserId');
  const mentionUserIds=selectedUserIds(form,'mentionUserId').slice(0,10);
  const object=chatObjectFrom(form);
  if(!subject||!body||participantUserIds.length===0||!object)return;
  const result=await mutateTeamChat(db,{instanceId,userId,action:'create_internal_thread',payload:{subject,body,participantUserIds,mentionUserIds,...object}});
  revalidatePath('/admin/kommunikacio/chat');
  if(result.threadId)redirect(`/admin/kommunikacio/chat?thread=${result.threadId}`);
}

export async function managePrivateParticipantAction(form:FormData){
  const{db,userId,instanceId}=await privateChatAccess();
  const threadId=String(form.get('threadId')??'').trim();
  const targetUserId=String(form.get('targetUserId')??'').trim();
  const operation=String(form.get('operation')??'').trim();
  if(!threadId||!targetUserId||!['add','remove'].includes(operation))return;
  await mutateTeamChat(db,{instanceId,userId,action:'manage_participant',payload:{threadId,targetUserId,operation}});
  revalidatePath('/admin/kommunikacio/chat');
}

export async function transferPrivateThreadOwnerAction(form:FormData){
  const{db,userId,instanceId}=await privateChatAccess();
  const threadId=String(form.get('threadId')??'').trim();
  const targetUserId=String(form.get('targetUserId')??'').trim();
  if(!threadId||!targetUserId)return;
  const{data,error}=await db.rpc('admin_transfer_office_thread_owner_v1',{
    p_instance_id:instanceId,
    p_actor:userId,
    p_thread_id:threadId,
    p_target_user_id:targetUserId,
  });
  if(error)throw new TeamChatMutationError(errorReason(error));
  const result=(data??{})as{id?:string;threadId?:string;ownerUserId?:string;transferred?:boolean};
  if(result.id!==threadId||result.threadId!==threadId||result.ownerUserId!==targetUserId||result.transferred!==true){
    throw new Error('A Team Chat tulajdonjog-átadásának eredménye nem igazolható.');
  }
  revalidatePath('/admin/kommunikacio/chat');
}

export async function markThreadReadAction(form:FormData){
  const{db,userId,instanceId}=await privateChatAccess();
  const threadId=String(form.get('threadId')??'').trim();
  if(!threadId)return;
  await mutateTeamChat(db,{instanceId,userId,action:'mark_read',payload:{threadId}});
  revalidatePath('/admin/kommunikacio/chat');
}
