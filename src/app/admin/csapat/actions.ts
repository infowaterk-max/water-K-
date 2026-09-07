'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const roleSchema=z.enum(['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']);
const validitySchema=z.enum(['keep','indefinite','24h','7d','30d','90d']);
const uuidSchema=z.string().uuid();
const emailSchema=z.string().trim().toLowerCase().email().max(254);
type TeamValidity=z.infer<typeof validitySchema>;
const durationMs:Record<Exclude<TeamValidity,'keep'|'indefinite'>,number>={
  '24h':24*60*60*1000,
  '7d':7*24*60*60*1000,
  '30d':30*24*60*60*1000,
  '90d':90*24*60*60*1000,
};

export type TeamActionState={status:'idle'|'success'|'error';message:string};

function messageFromError(error:unknown){
  const message=error instanceof Error?error.message:String((error as {message?:string}|null)?.message??'');
  if(message.includes('SELF_ROLE_MUTATION_FORBIDDEN'))return 'A saját webshop-szerepkörödet ezen a felületen nem módosíthatod vagy távolíthatod el.';
  if(message.includes('LAST_WEBSHOP_OWNER'))return 'Az utolsó webshop-tulajdonos jogosultsága nem távolítható el és nem fokozható le.';
  if(message.includes('OWNER_ROLE_ASSIGNMENT_REQUIRES_OWNER'))return 'Tulajdonosi szerepkört csak egy másik tulajdonos adhat.';
  if(message.includes('OWNER_ROLE_MUTATION_REQUIRES_OWNER'))return 'Tulajdonos jogosultságát csak egy másik tulajdonos módosíthatja.';
  if(message.includes('OWNER_ROLE_CANNOT_EXPIRE'))return 'Tulajdonosi hozzáférés nem állítható automatikus lejáratra.';
  if(message.includes('STORE_ROLE_EXPIRY_REQUIRED_FUTURE'))return 'A hozzáférés lejáratának a jövőben kell lennie.';
  if(message.includes('ORGANIZATION_ROLE_BINDING_READ_ONLY'))return 'A felhasználónak szervezeti szintű jogosultsága van; ezt ezen a webshop-oldalon nem lehet felülírni.';
  if(message.includes('STORE_ROLE_PROFILE_NOT_FOUND'))return 'Ehhez az e-mail-címhez még nincs regisztrált felhasználói profil.';
  if(message.includes('STORE_MANAGE_PERMISSION_REQUIRED'))return 'Nincs jogosultságod a csapattagok kezeléséhez.';
  if(message.includes('STORE_ROLE_NOT_FOUND'))return 'A csapattagnak nincs eltávolítható webshop-jogosultsága.';
  return 'A jogosultság módosítása nem sikerült. Az előző állapot változatlan maradt.';
}

function resolveValidUntil(validity:TeamValidity,currentValue=''):string|null{
  if(validity==='indefinite')return null;
  if(validity==='keep'){
    const value=currentValue.trim();
    if(!value)return null;
    const time=Date.parse(value);
    if(!Number.isFinite(time))throw new Error('STORE_ROLE_EXPIRY_INVALID');
    return new Date(time).toISOString();
  }
  return new Date(Date.now()+durationMs[validity]).toISOString();
}

function validityEvidenceMatches(actual:string|null|undefined,expected:string|null){
  if(expected===null)return actual===null||actual===undefined;
  if(!actual)return false;
  return Date.parse(actual)===Date.parse(expected);
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
    const validity=validitySchema.safeParse(String(formData.get('validity')??'indefinite'));
    if(!email.success)return{status:'error',message:'Adj meg érvényes e-mail-címet.'};
    if(!role.success)return{status:'error',message:'Válassz érvényes szerepkört.'};
    if(!validity.success||validity.data==='keep')return{status:'error',message:'Válassz érvényes hozzáférési időt.'};
    const validUntil=resolveValidUntil(validity.data);
    const{actor,scope,admin}=await context();
    const{data:profile,error:profileError}=await admin.from('profiles').select('id,email').ilike('email',email.data).maybeSingle();
    if(profileError)throw profileError;
    if(!profile?.id)return{status:'error',message:'Ehhez az e-mail-címhez még nincs regisztrált felhasználói profil. Előbb a felhasználónak létre kell hoznia a fiókját.'};
    const{data,error}=await admin.rpc('merchant_set_store_role_v2',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:profile.id,p_role_code:role.data,p_valid_until:validUntil});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;roleCode?:string;validUntil?:string|null};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==profile.id||evidence.roleCode!==role.data||!validityEvidenceMatches(evidence.validUntil,validUntil))throw new Error('STORE_ROLE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:`Hozzáférés mentve: ${profile.email??email.data}.`};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function updateTeamMemberRoleAction(_:TeamActionState,formData:FormData):Promise<TeamActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    const role=roleSchema.safeParse(String(formData.get('role')??''));
    const validity=validitySchema.safeParse(String(formData.get('validity')??'keep'));
    if(!target.success||!role.success)return{status:'error',message:'Érvénytelen csapattag vagy szerepkör.'};
    if(!validity.success)return{status:'error',message:'Érvénytelen hozzáférési idő.'};
    const validUntil=resolveValidUntil(validity.data,String(formData.get('currentValidUntil')??''));
    const{actor,scope,admin}=await context();
    const{data,error}=await admin.rpc('merchant_set_store_role_v2',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:target.data,p_role_code:role.data,p_valid_until:validUntil});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;roleCode?:string;validUntil?:string|null};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==target.data||evidence.roleCode!==role.data||!validityEvidenceMatches(evidence.validUntil,validUntil))throw new Error('STORE_ROLE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:'Szerepkör és hozzáférési idő mentve.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function removeTeamMemberAction(_:TeamActionState,formData:FormData):Promise<TeamActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    if(!target.success)return{status:'error',message:'Érvénytelen csapattag.'};
    const{actor,scope,admin}=await context();
    const{data,error}=await admin.rpc('merchant_remove_store_role_v2',{p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_target_user_id:target.data});
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;userId?:string;removed?:boolean};
    if(evidence.instanceId!==scope.instanceId||evidence.userId!==target.data||evidence.removed!==true)throw new Error('STORE_ROLE_REMOVE_EVIDENCE_MISSING');
    refresh();
    return{status:'success',message:'Webshop-hozzáférés eltávolítva.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}
