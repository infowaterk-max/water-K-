'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { getActiveStoreRoles } from '@/lib/auth/store-rbac';
import { STORE_CAPABILITY_CODES,type StoreCapability } from '@/lib/auth/store-capabilities';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { createAdminClient } from '@/lib/supabase/admin';

const uuidSchema=z.string().uuid();
const effectSchema=z.enum(['allow','deny']);
const scopeSchema=z.enum(['all','own','assigned','own_or_assigned','topic','mailbox']);
const delegationScopeSchema=z.enum(['all','topic','mailbox']);
const validitySchema=z.enum(['indefinite','24h','7d','14d','30d','90d']);
type Validity=z.infer<typeof validitySchema>;
const durationMs:Record<Exclude<Validity,'indefinite'>,number>={
  '24h':24*60*60*1000,
  '7d':7*24*60*60*1000,
  '14d':14*24*60*60*1000,
  '30d':30*24*60*60*1000,
  '90d':90*24*60*60*1000,
};

export type AdvancedPermissionActionState={status:'idle'|'success'|'error';message:string};
export const advancedPermissionInitialState:AdvancedPermissionActionState={status:'idle',message:''};

type OverrideRow={
  id:string;
  permission_code:string;
  effect:'allow'|'deny';
  scope_type:'all'|'own'|'assigned'|'own_or_assigned'|'topic'|'mailbox';
  scope_value:string|null;
  valid_until:string|null;
};

function parseCapability(value:FormDataEntryValue|null):StoreCapability|null{
  const candidate=String(value??'');
  return (STORE_CAPABILITY_CODES as readonly string[]).includes(candidate)?candidate as StoreCapability:null;
}

function validUntilFor(value:Validity){
  if(value==='indefinite')return null;
  return new Date(Date.now()+durationMs[value]).toISOString();
}

function messageFromError(error:unknown){
  const message=error instanceof Error?error.message:String((error as {message?:string}|null)?.message??'');
  if(message.includes('STORE_PERMISSION_OWNER_REQUIRED'))return 'Az egyedi jogosultságokat és helyettesítéseket csak a webshop tulajdonosa kezelheti.';
  if(message.includes('SELF_PERMISSION_MUTATION_FORBIDDEN'))return 'A saját egyedi jogosultságaidat ezen a felületen nem módosíthatod.';
  if(message.includes('STORE_PERMISSION_TARGET_OWNER_FORBIDDEN'))return 'Tulajdonosi fiókhoz nem adható személyes permission override.';
  if(message.includes('STORE_PERMISSION_TARGET_BINDING_REQUIRED'))return 'Ehhez a csapattaghoz nincs módosítható webshop-szintű szerepkör.';
  if(message.includes('STORE_DELEGATION_SELF_FORBIDDEN'))return 'Egy munkatárs nem helyettesítheti saját magát.';
  if(message.includes('STORE_DELEGATION_PERMISSION_NOT_DELEGABLE'))return 'A kiválasztott jogosultságok között nem delegálható, biztonságkritikus művelet van.';
  if(message.includes('STORE_DELEGATION_SOURCE_PERMISSION_REQUIRED'))return 'Csak olyan jogosultság adható át, amely az eredeti munkatársnak közvetlenül is megvan az adott adatkörben.';
  if(message.includes('STORE_DELEGATION_SCOPE_VALUE_REQUIRED'))return 'Témakör- vagy postafiók-szűréshez meg kell adni a konkrét scope kulcsát.';
  if(message.includes('STORE_DELEGATION_SCOPE_INVALID'))return 'Érvénytelen helyettesítési adatkör.';
  if(message.includes('STORE_DELEGATION_OVERLAP'))return 'Erre a két munkatársra és adatkörre már van átfedő, aktív helyettesítés.';
  if(message.includes('STORE_DELEGATION_ACTIVE_BINDINGS_REQUIRED'))return 'A helyettesítés mindkét résztvevőjének aktív webshop-szintű szerepkörrel kell rendelkeznie.';
  if(message.includes('STORE_DELEGATION_EXPIRY_REQUIRED'))return 'A helyettesítéshez kötelező jövőbeni lejáratot megadni.';
  if(message.includes('STORE_DELEGATION_NOT_FOUND'))return 'A helyettesítés már nem aktív vagy nem található.';
  if(message.includes('STORE_PERMISSION_EXPIRY_REQUIRED_FUTURE'))return 'A jogosultság lejáratának a jövőben kell lennie.';
  return 'A jogosultsági művelet nem sikerült. Az előző állapot változatlan maradt.';
}

async function context(){
  const actor=await getAdminRequestUser('store.manage');
  if(!actor)throw new Error('STORE_PERMISSION_OWNER_REQUIRED');
  const scope=await requireCurrentStoreContext('store.manage');
  const roles=await getActiveStoreRoles(scope.instanceId);
  if(!scope.isPlatform&&!roles.includes('owner'))throw new Error('STORE_PERMISSION_OWNER_REQUIRED');
  return{actor,scope,admin:createAdminClient()};
}

function refresh(targetUserId:string){
  revalidatePath('/admin/csapat');
  revalidatePath(`/admin/csapat/${targetUserId}`);
  revalidatePath('/admin/audit');
}

function entryFromRow(row:OverrideRow){
  return{
    permissionCode:row.permission_code,
    effect:row.effect,
    scopeType:row.scope_type,
    scopeValue:row.scope_value,
    validUntil:row.valid_until,
  };
}

async function activeOverrides(admin:ReturnType<typeof createAdminClient>,instanceId:string,targetUserId:string){
  const{data,error}=await admin.from('store_permission_overrides')
    .select('id,permission_code,effect,scope_type,scope_value,valid_until')
    .eq('instance_id',instanceId).eq('user_id',targetUserId).is('revoked_at',null)
    .lte('valid_from',new Date().toISOString());
  if(error)throw error;
  return((data??[]) as OverrideRow[]).filter(row=>!row.valid_until||Date.parse(row.valid_until)>Date.now());
}

async function replaceOverrides(
  admin:ReturnType<typeof createAdminClient>,instanceId:string,actorId:string,targetUserId:string,entries:ReturnType<typeof entryFromRow>[]
){
  const{data,error}=await admin.rpc('merchant_replace_permission_overrides_v1',{
    p_instance_id:instanceId,p_actor_user_id:actorId,p_target_user_id:targetUserId,p_entries:entries,
  });
  if(error)throw error;
  const evidence=(data??{}) as {instanceId?:string;userId?:string;overrideCount?:number};
  if(evidence.instanceId!==instanceId||evidence.userId!==targetUserId||evidence.overrideCount!==entries.length)throw new Error('STORE_PERMISSION_EVIDENCE_MISSING');
}

export async function addPermissionOverrideAction(_:AdvancedPermissionActionState,formData:FormData):Promise<AdvancedPermissionActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    const capability=parseCapability(formData.get('permissionCode'));
    const effect=effectSchema.safeParse(String(formData.get('effect')??''));
    const scopeChoice=scopeSchema.safeParse(String(formData.get('scopeType')??'all'));
    const validity=validitySchema.safeParse(String(formData.get('validity')??'indefinite'));
    const scopeValue=String(formData.get('scopeValue')??'').trim()||null;
    if(!target.success||!capability||!effect.success||!scopeChoice.success||!validity.success)return{status:'error',message:'Érvénytelen jogosultsági beállítás.'};
    if((scopeChoice.data==='topic'||scopeChoice.data==='mailbox')&&!scopeValue)return{status:'error',message:'Ehhez a scope-hoz meg kell adni a témakört vagy postafiókot.'};

    const{actor,scope:storeScope,admin}=await context();
    const rows=await activeOverrides(admin,storeScope.instanceId,target.data);
    const filtered=rows.filter(row=>!(row.permission_code===capability&&row.effect===effect.data&&row.scope_type===scopeChoice.data&&(row.scope_value??null)===scopeValue));
    const entries=[...filtered.map(entryFromRow),{
      permissionCode:capability,effect:effect.data,scopeType:scopeChoice.data,
      scopeValue:(scopeChoice.data==='topic'||scopeChoice.data==='mailbox')?scopeValue:null,
      validUntil:validUntilFor(validity.data),
    }];
    await replaceOverrides(admin,storeScope.instanceId,actor.id,target.data,entries);
    refresh(target.data);
    return{status:'success',message:'Egyedi jogosultság mentve.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function removePermissionOverrideAction(_:AdvancedPermissionActionState,formData:FormData):Promise<AdvancedPermissionActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    const overrideId=uuidSchema.safeParse(String(formData.get('overrideId')??''));
    if(!target.success||!overrideId.success)return{status:'error',message:'Érvénytelen jogosultsági tétel.'};
    const{actor,scope,admin}=await context();
    const rows=await activeOverrides(admin,scope.instanceId,target.data);
    if(!rows.some(row=>row.id===overrideId.data))return{status:'error',message:'A jogosultsági tétel már nem aktív.'};
    const entries=rows.filter(row=>row.id!==overrideId.data).map(entryFromRow);
    await replaceOverrides(admin,scope.instanceId,actor.id,target.data,entries);
    refresh(target.data);
    return{status:'success',message:'Egyedi eltérés eltávolítva.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function createDelegationAction(_:AdvancedPermissionActionState,formData:FormData):Promise<AdvancedPermissionActionState>{
  try{
    const delegate=uuidSchema.safeParse(String(formData.get('userId')??''));
    const source=uuidSchema.safeParse(String(formData.get('sourceUserId')??''));
    const validity=validitySchema.safeParse(String(formData.get('validity')??'7d'));
    const delegationScope=delegationScopeSchema.safeParse(String(formData.get('delegationScopeType')??'all'));
    const delegationScopeValue=String(formData.get('delegationScopeValue')??'').trim()||null;
    const permissions=formData.getAll('permissionCode').map(value=>parseCapability(value)).filter((value):value is StoreCapability=>value!==null);
    const reason=String(formData.get('reason')??'').trim().slice(0,500)||null;
    if(!delegate.success||!source.success||!validity.success||validity.data==='indefinite'||!delegationScope.success||permissions.length===0)return{status:'error',message:'Válassz forrásszemélyt, legalább egy delegálható jogot, adatkört és lejáratot.'};
    if((delegationScope.data==='topic'||delegationScope.data==='mailbox')&&!delegationScopeValue)return{status:'error',message:'A kiválasztott helyettesítési adatkörhöz meg kell adni a témakört vagy postafiókot.'};
    const normalizedScopeValue=delegationScope.data==='all'?null:delegationScopeValue;

    const{actor,scope,admin}=await context();
    const validFrom=new Date().toISOString(),validUntil=validUntilFor(validity.data);
    if(!validUntil)throw new Error('STORE_DELEGATION_EXPIRY_REQUIRED');
    const uniquePermissions=[...new Set(permissions)];
    const{data,error}=await admin.rpc('merchant_create_store_delegation_v2',{
      p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_source_user_id:source.data,p_delegate_user_id:delegate.data,
      p_permission_codes:uniquePermissions,p_scope_type:delegationScope.data,p_scope_value:normalizedScopeValue,
      p_valid_from:validFrom,p_valid_until:validUntil,p_reason:reason,
    });
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;delegateUserId?:string;sourceUserId?:string;scopeType?:string;scopeValue?:string|null;permissionCount?:number};
    if(evidence.instanceId!==scope.instanceId||evidence.delegateUserId!==delegate.data||evidence.sourceUserId!==source.data||evidence.scopeType!==delegationScope.data||(evidence.scopeValue??null)!==normalizedScopeValue||evidence.permissionCount!==uniquePermissions.length)throw new Error('STORE_DELEGATION_EVIDENCE_MISSING');
    refresh(delegate.data);
    return{status:'success',message:'Időszakos, szűrt helyettesítés létrehozva.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}

export async function revokeDelegationAction(_:AdvancedPermissionActionState,formData:FormData):Promise<AdvancedPermissionActionState>{
  try{
    const target=uuidSchema.safeParse(String(formData.get('userId')??''));
    const delegation=uuidSchema.safeParse(String(formData.get('delegationId')??''));
    if(!target.success||!delegation.success)return{status:'error',message:'Érvénytelen helyettesítés.'};
    const{actor,scope,admin}=await context();
    const{data,error}=await admin.rpc('merchant_revoke_store_delegation_v1',{
      p_instance_id:scope.instanceId,p_actor_user_id:actor.id,p_delegation_id:delegation.data,
    });
    if(error)throw error;
    const evidence=(data??{}) as {instanceId?:string;delegationId?:string;revoked?:boolean};
    if(evidence.instanceId!==scope.instanceId||evidence.delegationId!==delegation.data||evidence.revoked!==true)throw new Error('STORE_DELEGATION_REVOKE_EVIDENCE_MISSING');
    refresh(target.data);
    return{status:'success',message:'Helyettesítés visszavonva.'};
  }catch(error){return{status:'error',message:messageFromError(error)}}
}
