'use server';

import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {requirePlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';

export type OfficeComposerActionState={
  status:'idle'|'success'|'blocked'|'conflict'|'error';
  message:string;
  draftId?:string;
  revision?:number;
};
export const officeComposerInitialState:OfficeComposerActionState={status:'idle',message:''};

class OfficeComposerError extends Error{
  readonly reason:string;
  constructor(reason:string){
    super('A Digitális Iroda művelete nem hajtható végre.');
    this.reason=reason.toLowerCase();
  }
}

async function access(){
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)throw new OfficeComposerError('SUPPORT_PERMISSION_REQUIRED');
  await requirePlanFeature('officeCommunication');
  const scope=await requireCurrentStoreContext('support.manage');
  return{db:createAdminClient(),userId:actor.id,instanceId:scope.instanceId};
}

function reasonFrom(error:unknown){
  if(error instanceof OfficeComposerError)return error.reason;
  return error instanceof Error?error.message.toLowerCase():'';
}

function stateForError(error:unknown):OfficeComposerActionState{
  const reason=reasonFrom(error);
  if(reason.includes('office_draft_conflict')){
    return{status:'conflict',message:'A piszkozat közben egy másik munkamenetben megváltozott. A biztonság kedvéért nem írtuk felül; frissítsd az oldalt, majd ellenőrizd a frissebb változatot.'};
  }
  if(reason.includes('office_mailbox_not_configured')||reason.includes('office_email_route_missing')){
    return{status:'blocked',message:'A Digitális Iroda e-mail-küldése még nincs aktiválva. Küldeni csak a később külön jóváhagyott Office postafiók beállítása után lehet; a jelenlegi webshopos e-mail címeket nem használjuk.'};
  }
  if(reason.includes('recipient suppressed')){
    return{status:'blocked',message:'Ez az e-mail-cím kommunikációs tiltólistán van, ezért az üzenet nem küldhető.'};
  }
  if(reason.includes('permission')||reason.includes('access_denied')){
    return{status:'blocked',message:'Ehhez a Digitális Iroda művelethez nincs jogosultságod.'};
  }
  return{status:'error',message:'A művelet most nem menthető. A beírt tartalmat nem tekintjük elküldöttnek.'};
}

function expectedRevision(formData:FormData,draftId:string|null){
  if(!draftId)return null;
  const parsed=Number(String(formData.get('revision')??''));
  return Number.isSafeInteger(parsed)&&parsed>0?parsed:null;
}

async function mutateDraft(db:ReturnType<typeof createAdminClient>,input:{instanceId:string;userId:string;action:'save'|'delete';payload:Record<string,unknown>}){
  const{data,error}=await db.rpc('admin_mutate_office_draft_v2',{
    p_instance_id:input.instanceId,p_actor:input.userId,p_action:input.action,p_payload:input.payload,
  });
  if(error)throw new OfficeComposerError([error.code,error.message,error.details,error.hint].filter(Boolean).join(' '));
  const result=(data??{})as{id?:string;draftId?:string;deleted?:boolean;revision?:number};
  if(!result.id||!result.draftId||!Number.isSafeInteger(Number(result.revision))||Number(result.revision)<1){
    throw new OfficeComposerError('OFFICE_DRAFT_EVIDENCE_MISSING');
  }
  return{...result,revision:Number(result.revision)};
}

type QueueDraftRow={id:string;draft_type:'new_email'|'reply';thread_id:string|null;to_email:string|null;subject:string;body:string};

async function validatedQueueDraftId(db:ReturnType<typeof createAdminClient>,input:{
  instanceId:string;userId:string;draftId:string|null;mode:'reply'|'new_email';threadId:string|null;
  toEmail:string|null;subject:string|null;body:string;
}){
  if(!input.draftId)return null;
  const{data,error}=await db.from('office_drafts')
    .select('id,draft_type,thread_id,to_email,subject,body')
    .eq('id',input.draftId).eq('instance_id',input.instanceId).eq('author_user_id',input.userId).maybeSingle();
  if(error)throw new OfficeComposerError([error.code,error.message,error.details,error.hint].filter(Boolean).join(' '));
  const draft=(data??null)as QueueDraftRow|null;
  if(!draft)return null;
  if(input.mode==='reply'){
    return draft.draft_type==='reply'&&draft.thread_id===input.threadId&&draft.body===input.body?draft.id:null;
  }
  const normalizedRecipient=input.toEmail?.trim().toLowerCase()??null;
  return draft.draft_type==='new_email'
    &&draft.thread_id===null
    &&draft.to_email===normalizedRecipient
    &&draft.subject===(input.subject??'')
    &&draft.body===input.body
    ?draft.id:null;
}

async function queueEmail(db:ReturnType<typeof createAdminClient>,input:{
  instanceId:string;userId:string;mode:'reply'|'new_email';threadId:string|null;mailboxKey:string|null;
  toEmail:string|null;subject:string|null;body:string;draftId:string|null;
}){
  const safeDraftId=await validatedQueueDraftId(db,input);
  const{data,error}=await db.rpc('admin_queue_office_email_v3',{
    p_instance_id:input.instanceId,
    p_actor:input.userId,
    p_mode:input.mode,
    p_thread_id:input.threadId,
    p_mailbox_key:input.mailboxKey,
    p_to_email:input.toEmail,
    p_subject:input.subject,
    p_body:input.body,
    p_idempotency_key:`office:v3:${input.instanceId}:${randomUUID()}`,
    p_draft_id:safeDraftId,
  });
  if(error)throw new OfficeComposerError([error.code,error.message,error.details,error.hint].filter(Boolean).join(' '));
  const result=(data??{})as{id?:string;threadId?:string;messageId?:string;jobId?:string};
  if(!result.id||!result.threadId||!result.messageId||!result.jobId)throw new OfficeComposerError('OFFICE_EMAIL_EVIDENCE_MISSING');
  return result;
}

export async function saveNewEmailDraftAction(_previous:OfficeComposerActionState,formData:FormData):Promise<OfficeComposerActionState>{
  try{
    const{db,userId,instanceId}=await access();
    const draftId=String(formData.get('draftId')??'').trim()||null;
    const revision=expectedRevision(formData,draftId);
    if(draftId&&!revision)return{status:'error',message:'A meglévő piszkozat mentési verziója hiányzik. Frissítsd az oldalt a biztonságos folytatáshoz.'};
    const toEmail=String(formData.get('toEmail')??'').trim().toLowerCase().slice(0,320)||null;
    const subject=String(formData.get('subject')??'').trim().slice(0,300);
    const body=String(formData.get('body')??'').slice(0,10000);
    const result=await mutateDraft(db,{instanceId,userId,action:'save',payload:{draftId,expectedRevision:revision,draftType:'new_email',threadId:null,toEmail,subject,body}});
    revalidatePath('/admin/kommunikacio/iroda');
    revalidatePath('/admin/kommunikacio/iroda/uj');
    return{status:'success',message:'Piszkozat mentve.',draftId:result.draftId,revision:result.revision};
  }catch(error){return stateForError(error)}
}

export async function saveReplyDraftAction(_previous:OfficeComposerActionState,formData:FormData):Promise<OfficeComposerActionState>{
  try{
    const{db,userId,instanceId}=await access();
    const draftId=String(formData.get('draftId')??'').trim()||null;
    const revision=expectedRevision(formData,draftId);
    if(draftId&&!revision)return{status:'error',message:'A meglévő válaszpiszkozat mentési verziója hiányzik. Frissítsd az oldalt a biztonságos folytatáshoz.'};
    const threadId=String(formData.get('threadId')??'').trim();
    const body=String(formData.get('body')??'').slice(0,10000);
    if(!threadId)return{status:'error',message:'A válaszpiszkozathoz beszélgetés szükséges.'};
    const result=await mutateDraft(db,{instanceId,userId,action:'save',payload:{draftId,expectedRevision:revision,draftType:'reply',threadId,toEmail:null,subject:'',body}});
    revalidatePath('/admin/kommunikacio/iroda');
    return{status:'success',message:'Válaszpiszkozat mentve.',draftId:result.draftId,revision:result.revision};
  }catch(error){return stateForError(error)}
}

export async function deleteOfficeDraftAction(formData:FormData):Promise<OfficeComposerActionState>{
  try{
    const{db,userId,instanceId}=await access();
    const draftId=String(formData.get('draftId')??'').trim();
    if(!draftId)return{status:'error',message:'A piszkozat törléséhez azonosító szükséges.'};
    const revision=expectedRevision(formData,draftId);
    if(!revision)return{status:'error',message:'A piszkozat törléséhez a mentési verzió is szükséges. Frissítsd az oldalt.'};
    const result=await mutateDraft(db,{instanceId,userId,action:'delete',payload:{draftId,expectedRevision:revision}});
    if(result.deleted!==true)throw new OfficeComposerError('OFFICE_DRAFT_DELETE_EVIDENCE_MISSING');
    revalidatePath('/admin/kommunikacio/iroda');
    revalidatePath('/admin/kommunikacio/iroda/uj');
    return{status:'success',message:'Piszkozat törölve.',draftId:result.draftId,revision:result.revision};
  }catch(error){return stateForError(error)}
}

export async function sendCustomerEmailV3Action(_previous:OfficeComposerActionState,formData:FormData):Promise<OfficeComposerActionState>{
  try{
    const{db,userId,instanceId}=await access();
    const threadId=String(formData.get('threadId')??'').trim();
    const draftId=String(formData.get('draftId')??'').trim()||null;
    const body=String(formData.get('body')??'').trim().slice(0,10000);
    if(!threadId||!body)return{status:'error',message:'Az e-mail válaszhoz üzenetszöveg szükséges.'};
    await queueEmail(db,{instanceId,userId,mode:'reply',threadId,mailboxKey:null,toEmail:null,subject:null,body,draftId});
    revalidatePath('/admin/kommunikacio/iroda');
    revalidatePath('/admin/kommunikacio');
    return{status:'success',message:'Az e-mail válasz küldési sorba került.'};
  }catch(error){return stateForError(error)}
}

export async function sendNewEmailAction(_previous:OfficeComposerActionState,formData:FormData):Promise<OfficeComposerActionState>{
  try{
    const{db,userId,instanceId}=await access();
    const draftId=String(formData.get('draftId')??'').trim()||null;
    const mailboxKey=String(formData.get('mailboxKey')??'').trim()||null;
    const toEmail=String(formData.get('toEmail')??'').trim().toLowerCase().slice(0,320)||null;
    const subject=String(formData.get('subject')??'').trim().slice(0,300);
    const body=String(formData.get('body')??'').trim().slice(0,10000);
    if(!toEmail||!subject||!body)return{status:'error',message:'Küldéshez címzett, tárgy és üzenetszöveg szükséges.'};
    await queueEmail(db,{instanceId,userId,mode:'new_email',threadId:null,mailboxKey,toEmail,subject,body,draftId});
    revalidatePath('/admin/kommunikacio/iroda');
    revalidatePath('/admin/kommunikacio/iroda/uj');
    revalidatePath('/admin/kommunikacio');
    return{status:'success',message:'Az új e-mail küldési sorba került.'};
  }catch(error){return stateForError(error)}
}
