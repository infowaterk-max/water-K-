'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const roleSchema=z.enum(['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']);
const uuidSchema=z.string().uuid();
const emailSchema=z.string().trim().toLowerCase().email().max(254);

export type TeamActionState={status:'idle'|'success'|'error';message:string};

function messageFromError(error:unknown){
  const message=error instanceof Error?error.message:String((error as {message?:string}|null)?.message??'');
  if(message.includes('LAST_WEBSHOP_OWNER'))return 'Az utolsó webshop-tulajdonos jogosultsága nem távolítható el és nem fokozható le.';
  if(message.includes('OWNER_ROLE_ASSIGNMENT_REQUIRES_OWNER'))return 'Tulajdonosi szerepkört csak egy másik tulajdonos adhat.';
  if(message.includes('STORE_ROLE_PROFILE_NOT_FOUND'))return 'Ehhez az e-mail-címhez még nincs regisztrált felhasználói profil.';
  if(message.includes('STORE_MANAGE_PERMISSION_REQUIRED'))return 'Nincs jogosultságod a csapattagok kezeléséhez.';
  if(message.includes('STORE_ROLE_NOT_FOUND'))return 'A csapattagnak nincs eltávolítható webshop-jogosultsága.';
  return 'A jogosultság módosítása nem sikerült. Az előző állapot változatlan maradt.';
}

async function context(){
  const actor=await getAdminRequestUser('store.manage');
  if(!actor)throw new Error('STORE_MANAGE_PERMISSION_REQUIRED');
  const scope=await requireCurrentStoreContext('store.manage');
  return{actor,scope,admin:createAdminClient()};
}

function refresh(){
  revalidatePath('/admin/csapat');
  revalidatePath('/admin/audit');
  revalidatePath('/admin');
}

export async function addTeamMemberAction(_:TeamActionState,formData:FormData):Promise<TeamActionState>{
  try{
    const email=emailSchema.safeParse(String(formData.get('email')??''));
    const role=roleSchema.safeParse(String(formData.get('role')??''));
    if(!email.success)return{status:'error',message:'Adj meg érvényes e-mail-címet.'};
    if(!role.success)return{status:'error',message:'Válassz érvényes szerepkört.'};
    const{actor,scope,admin}=await context();
    const{data:profile,error:profileError}=await admin.from('profiles').select('id,email').ilike('email',email.data).maybeSingle();
    if(profileError)throw profileError;
    if(!profile?.id)return{status:'error',message:'Ehhez az e-mail-címhez még nincs regisztrált felhasználói profil. Előbb a felhasználónak létre kell hoznia a fiókját.'};
    const{data,error}=await admin.rpc('merchant_set_store_role_v1',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:profile.id,p_role_code:role.data});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;roleCode?:string};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==profile.id||evidence.roleCode!==role.data)throw new Error('STORE_ROLE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:`Hozzáférés mentve: ${profile.email??email.data}.`};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function updateTeamMemberRoleAction(_:TeamActionState,formData:FormData):Promise<TeamActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    const role=roleSchema.safeParse(String(formData.get('role')??''));
    if(!target.success||!role.success)return{status:'error',message:'Érvénytelen csapattag vagy szerepkör.'};
    const{actor,scope,admin}=await context();
    const{data,error}=await admin.rpc('merchant_set_store_role_v1',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:target.data,p_role_code:role.data});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;roleCode?:string};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==target.data||evidence.roleCode!==role.data)throw new Error('STORE_ROLE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:'Szerepkör mentve.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function removeTeamMemberAction(_:TeamActionState,formData:FormData):Promise<TeamActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    if(!target.success)return{status:'error',message:'Érvénytelen csapattag.'};
    const{actor,scope,admin}=await context();
    if(actor.id===target.data)return{status:'error',message:'A saját hozzáférésedet ezen a felületen nem távolíthatod el.'};
    const{data,error}=await admin.rpc('merchant_remove_store_role_v1',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:target.data});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;removed?:boolean};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==target.data||evidence.removed!==true)throw new Error('STORE_ROLE_REMOVE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:'Webshop-hozzáférés eltávolítva.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}
