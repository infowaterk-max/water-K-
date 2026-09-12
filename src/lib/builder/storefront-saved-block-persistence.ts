import 'server-only';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';
import {parseStorefrontSavedBlockFragment} from '@/lib/builder/storefront-saved-blocks';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';

const OPERATION_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME_PATTERN=/^\S(?:[\s\S]{0,78}\S)?$/;

export type StorefrontSavedBlockSummary={
  id:string;
  name:string;
  componentKey:string;
  componentVersion:number;
  createdAt:string;
  updatedAt:string;
};

export type StorefrontSavedBlock=StorefrontSavedBlockSummary&{
  fragment:StorefrontComponentNode;
};

const requireActor=async()=>{
  const supabase=await createClient();
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('STOREFRONT_AUTH_REQUIRED');
  return user.id;
};

const assertOperationKey=(value:string)=>{
  if(!OPERATION_KEY_PATTERN.test(value))throw new Error('STOREFRONT_OPERATION_KEY_INVALID');
};
const assertBlockId=(value:string)=>{
  if(!UUID_PATTERN.test(value))throw new Error('STOREFRONT_SAVED_BLOCK_ID_INVALID');
};
const normalizeName=(value:string)=>{
  const name=value.trim();
  if(!NAME_PATTERN.test(name))throw new Error('STOREFRONT_SAVED_BLOCK_NAME_INVALID');
  return name;
};

const parseSummary=(row:Record<string,unknown>):StorefrontSavedBlockSummary=>{
  if(typeof row.id!=='string'||typeof row.name!=='string'||typeof row.component_key!=='string'||typeof row.component_version!=='number'||typeof row.created_at!=='string'||typeof row.updated_at!=='string')throw new Error('STOREFRONT_SAVED_BLOCK_ROW_INVALID');
  return{id:row.id,name:row.name,componentKey:row.component_key,componentVersion:row.component_version,createdAt:row.created_at,updatedAt:row.updated_at};
};

export async function listCurrentStorefrontSavedBlocks():Promise<StorefrontSavedBlockSummary[]>{
  const scope=await requireCurrentStoreContext('store.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('storefront_saved_blocks')
    .select('id,name,component_key,component_version,created_at,updated_at')
    .eq('instance_id',scope.instanceId).order('updated_at',{ascending:false}).limit(100);
  if(error)throw new Error(`STOREFRONT_SAVED_BLOCK_LIST_FAILED:${error.message}`);
  return(data??[]).map(row=>parseSummary(row as Record<string,unknown>));
}

export async function getCurrentStorefrontSavedBlock(blockId:string):Promise<StorefrontSavedBlock>{
  assertBlockId(blockId);
  const scope=await requireCurrentStoreContext('store.manage');
  const admin=createAdminClient();
  const{data,error}=await admin.from('storefront_saved_blocks')
    .select('id,name,component_key,component_version,fragment,created_at,updated_at')
    .eq('instance_id',scope.instanceId).eq('id',blockId).maybeSingle();
  if(error)throw new Error(`STOREFRONT_SAVED_BLOCK_READ_FAILED:${error.message}`);
  if(!data)throw new Error('STOREFRONT_SAVED_BLOCK_NOT_FOUND');
  return{...parseSummary(data as Record<string,unknown>),fragment:parseStorefrontSavedBlockFragment(data.fragment)};
}

export async function createCurrentStorefrontSavedBlock(input:{name:string;fragment:StorefrontComponentNode;operationKey:string}):Promise<StorefrontSavedBlockSummary&{replayed:boolean}>{
  assertOperationKey(input.operationKey);
  const name=normalizeName(input.name);
  const fragment=parseStorefrontSavedBlockFragment(input.fragment);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('save_storefront_saved_block_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_name:name,
    p_component_key:fragment.componentKey,
    p_component_version:fragment.componentVersion,
    p_fragment:fragment,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SAVED_BLOCK_SAVE_FAILED:${error.message}`);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('STOREFRONT_SAVED_BLOCK_RESULT_INVALID');
  const row=data as Record<string,unknown>;
  return{
    id:String(row.id??''),
    name:String(row.name??''),
    componentKey:String(row.componentKey??''),
    componentVersion:Number(row.componentVersion),
    createdAt:String(row.createdAt??''),
    updatedAt:String(row.updatedAt??''),
    replayed:row.replayed===true,
  };
}

export async function deleteCurrentStorefrontSavedBlock(input:{blockId:string;operationKey:string}):Promise<{id:string;replayed:boolean}>{
  assertBlockId(input.blockId);
  assertOperationKey(input.operationKey);
  const[scope,actorUserId]=await Promise.all([requireCurrentStoreContext('store.manage'),requireActor()]);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('delete_storefront_saved_block_v1',{
    p_instance_id:scope.instanceId,
    p_actor_user_id:actorUserId,
    p_block_id:input.blockId,
    p_operation_key:input.operationKey,
  });
  if(error)throw new Error(`STOREFRONT_SAVED_BLOCK_DELETE_FAILED:${error.message}`);
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('STOREFRONT_SAVED_BLOCK_DELETE_RESULT_INVALID');
  const row=data as Record<string,unknown>;
  return{id:String(row.id??input.blockId),replayed:row.replayed===true};
}
