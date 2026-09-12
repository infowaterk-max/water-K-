import 'server-only';
import {createHash} from 'node:crypto';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {parseStorefrontSavedBlockFragment} from '@/lib/builder/storefront-saved-blocks';
import {assertStorefrontReusableSymbolSource,type StorefrontGlobalSymbolSlot,type StorefrontReusableSymbol} from '@/lib/builder/storefront-linked-symbols';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const OPERATION_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME_PATTERN=/^\S(?:[\s\S]{0,78}\S)?$/;
const PREVIEW_TOKEN_PATTERN=/^[A-Za-z0-9_-]{40,128}$/;

const requireActor=async()=>{
  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('STOREFRONT_AUTH_REQUIRED');
  return user.id;
};
const assertOperationKey=(value:string)=>{if(!OPERATION_KEY_PATTERN.test(value))throw new Error('STOREFRONT_OPERATION_KEY_INVALID');};
const assertSymbolId=(value:string)=>{if(!UUID_PATTERN.test(value))throw new Error('STOREFRONT_SYMBOL_ID_INVALID');};
const normalizeName=(value:string)=>{const name=value.trim();if(!NAME_PATTERN.test(name))throw new Error('STOREFRONT_SYMBOL_NAME_INVALID');return name;};
const parseGlobalSlot=(value:unknown):StorefrontGlobalSymbolSlot|null=>value==='header'||value==='footer'?value:null;

const parseSymbol=(row:Record<string,unknown>):StorefrontReusableSymbol=>{
  if(typeof row.id!=='string'||typeof row.name!=='string'||typeof row.component_key!=='string'||typeof row.component_version!=='number'||typeof row.revision!=='number'||typeof row.created_at!=='string'||typeof row.updated_at!=='string')throw new Error('STOREFRONT_SYMBOL_ROW_INVALID');
  const fragment=parseStorefrontSavedBlockFragment(row.fragment);
  assertStorefrontReusableSymbolSource(fragment,parseGlobalSlot(row.global_slot));
  return{
    id:row.id,
    name:row.name,
    componentKey:row.component_key,
    componentVersion:row.component_version,
    fragment,
    revision:row.revision,
    globalSlot:parseGlobalSlot(row.global_slot),
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  };
};

export async function listStorefrontReusableSymbolsForInstance(instanceId:string):Promise<StorefrontReusableSymbol[]>{
  if(!UUID_PATTERN.test(instanceId))throw new Error('STOREFRONT_INSTANCE_ID_INVALID');
  const admin=createAdminClient();
  const{data,error}=await admin.from('storefront_reusable_symbols')
    .select('id,name,component_key,component_version,fragment,revision,global_slot,created_at,updated_at')
    .eq('instance_id',instanceId).order('updated_at',{ascending:false}).limit(100);
  if(error)throw new Error(`STOREFRONT_SYMBOL_LIST_FAILED:${error.message}`);
  return(data??[]).map(row=>parseSymbol(row as Record<string,unknown>));
}

export async function resolveStorefrontReusableSymbolsForPreviewToken(token:string):Promise<{instanceId:string;symbols:StorefrontReusableSymbol[]}|null>{
  if(!PREVIEW_TOKEN_PATTERN.test(token))return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const admin=createAdminClient();
  const{data,error}=await admin.from('storefront_preview_sessions')
    .select('instance_id').eq('token_hash',tokenHash).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!data||typeof data.instance_id!=='string')return null;
  return{instanceId:data.instance_id,symbols:await listStorefrontReusableSymbolsForInstance(data.instance_id)};
}

export async function listCurrentStorefrontReusableSymbols():Promise<StorefrontReusableSymbol[]>{
  const scope=await requireCurrentStoreContext('store.manage');
  return listStorefrontReusableSymbolsForInstance(scope.instanceId);
}

export async function getCurrentStorefrontReusableSymbol(symbolId:string):Promise<StorefrontReusableSymbol>{
  assertSymbolId(symbolId);
  const scope=await requireCurrentStoreContext('store.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('storefront_reusable_symbols')
    .select('id,name,component_key,component_version,fragment,revision,global_slot,created_at,updated_at')
    .eq('instance_id',scope.instanceId).eq('id',symbolId).maybeSingle();
  if(error)throw new Error(`STOREFRONT_SYMBOL_READ_FAILED:${error.message}`);
  if(!data)throw new Error('STOREFRONT_SYMBOL_NOT_FOUND');
  return parseSymbol(data as Record<string,unknown>);
}

const parseRpcSymbol=(data:unknown,code:string):StorefrontReusableSymbol&{replayed:boolean}=>{
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(code);
  const row=data as Record<string,unknown>;
  return{...parseSymbol({id:row.id,name:row.name,component_key:row.componentKey,component_version:row.componentVersion,fragment:row.fragment,revision:row.revision,global_slot:row.globalSlot,created_at:row.createdAt,updated_at:row.updatedAt}),replayed:row.replayed===true};
};

export async function createCurrentStorefrontReusableSymbol(input:{name:string;fragment:StorefrontComponentNode;operationKey:string}):Promise<StorefrontReusableSymbol&{replayed:boolean}>{
  assertOperationKey(input.operationKey);
  const name=normalizeName(input.name);
  const fragment=parseStorefrontSavedBlockFragment(input.fragment);
  assertStorefrontReusableSymbolSource(fragment);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('create_storefront_reusable_symbol_v1',{
    p_instance_id:scope.instanceId,p_actor_user_id:actorUserId,p_name:name,p_component_key:fragment.componentKey,p_component_version:fragment.componentVersion,p_fragment:fragment,p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SYMBOL_CREATE_FAILED:${error.message}`);
  return parseRpcSymbol(data,'STOREFRONT_SYMBOL_RESULT_INVALID');
}

export async function updateCurrentStorefrontReusableSymbol(input:{symbolId:string;name:string;fragment:StorefrontComponentNode;operationKey:string}):Promise<StorefrontReusableSymbol&{replayed:boolean}>{
  assertSymbolId(input.symbolId);assertOperationKey(input.operationKey);
  const name=normalizeName(input.name);const fragment=parseStorefrontSavedBlockFragment(input.fragment);
  assertStorefrontReusableSymbolSource(fragment);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('update_storefront_reusable_symbol_v1',{
    p_instance_id:scope.instanceId,p_actor_user_id:actorUserId,p_symbol_id:input.symbolId,p_name:name,p_component_key:fragment.componentKey,p_component_version:fragment.componentVersion,p_fragment:fragment,p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SYMBOL_UPDATE_FAILED:${error.message}`);
  return parseRpcSymbol(data,'STOREFRONT_SYMBOL_UPDATE_RESULT_INVALID');
}

export async function setCurrentStorefrontReusableSymbolGlobalSlot(input:{symbolId:string;globalSlot:StorefrontGlobalSymbolSlot|null;operationKey:string}):Promise<StorefrontReusableSymbol&{replayed:boolean}>{
  assertSymbolId(input.symbolId);assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('set_storefront_reusable_symbol_global_slot_v1',{
    p_instance_id:scope.instanceId,p_actor_user_id:actorUserId,p_symbol_id:input.symbolId,p_global_slot:input.globalSlot,p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SYMBOL_GLOBAL_SLOT_FAILED:${error.message}`);
  return parseRpcSymbol(data,'STOREFRONT_SYMBOL_GLOBAL_SLOT_RESULT_INVALID');
}

export async function deleteCurrentStorefrontReusableSymbol(input:{symbolId:string;operationKey:string}):Promise<{id:string;replayed:boolean}>{
  assertSymbolId(input.symbolId);assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('delete_storefront_reusable_symbol_v1',{
    p_instance_id:scope.instanceId,p_actor_user_id:actorUserId,p_symbol_id:input.symbolId,p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SYMBOL_DELETE_FAILED:${error.message}`);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('STOREFRONT_SYMBOL_DELETE_RESULT_INVALID');
  const row=data as Record<string,unknown>;
  return{id:String(row.id??input.symbolId),replayed:row.replayed===true};
}
