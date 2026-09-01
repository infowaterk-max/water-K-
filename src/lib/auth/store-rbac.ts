import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getPlatformRole } from '@/lib/auth/platform-operator';

export type StoreRole='owner'|'admin'|'catalog_manager'|'order_manager'|'marketing_manager'|'support'|'analyst'|'viewer';
export type StorePermission='store.manage'|'catalog.manage'|'procurement.manage'|'orders.manage'|'sales.manage'|'marketing.manage'|'support.manage'|'integrations.manage'|'analytics.read'|'store.read';

const ROLE_PERMISSIONS:Record<StoreRole,StorePermission[]>={
  owner:['store.manage','catalog.manage','procurement.manage','orders.manage','sales.manage','marketing.manage','support.manage','integrations.manage','analytics.read','store.read'],
  admin:['store.manage','catalog.manage','procurement.manage','orders.manage','sales.manage','marketing.manage','support.manage','integrations.manage','analytics.read','store.read'],
  catalog_manager:['catalog.manage','procurement.manage','analytics.read','store.read'],
  order_manager:['orders.manage','support.manage','analytics.read','store.read'],
  marketing_manager:['sales.manage','marketing.manage','analytics.read','store.read'],
  support:['support.manage','store.read'],
  analyst:['analytics.read','store.read'],
  viewer:['store.read'],
};

export const roleHasPermission=(role:StoreRole,permission:StorePermission)=>ROLE_PERMISSIONS[role].includes(permission);

export async function getActiveStoreRoles(instanceId:string):Promise<StoreRole[]>{
  if(await getPlatformRole())return['owner'];
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return[];
  const admin=createAdminClient();const{data:instance}=await admin.from('webshop_instances').select('organization_id').eq('id',instanceId).maybeSingle();
  if(!instance?.organization_id)return[];
  const now=new Date().toISOString();
  const{data}=await admin.from('role_bindings').select('role_code,valid_from,valid_until,revoked_at,organization_id,instance_id').eq('user_id',user.id).eq('organization_id',instance.organization_id).or(`instance_id.eq.${instanceId},instance_id.is.null`).is('revoked_at',null).lte('valid_from',now);
  return(data??[]).filter(row=>(row.instance_id===instanceId||row.instance_id===null)&&(!row.valid_until||row.valid_until>now)).map(row=>row.role_code).filter((role):role is StoreRole=>role in ROLE_PERMISSIONS);
}

export async function hasStorePermission(instanceId:string,permission:StorePermission){const roles=await getActiveStoreRoles(instanceId);return roles.some(role=>roleHasPermission(role,permission));}
