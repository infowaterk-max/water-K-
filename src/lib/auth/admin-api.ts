import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getActiveStoreRoles,hasStorePermission,hasStoreRoleBindingHistory,type StorePermission,type StoreRole } from '@/lib/auth/store-rbac';
import type { WorkforcePlatformRole } from '@/lib/auth/workforce-assurance-policy';

export type WorkforceRequestContext=
  |{status:'authorized';platformRole:WorkforcePlatformRole;storeRoles:StoreRole[];instanceName:string|null}
  |{status:'unauthenticated'|'forbidden'|'unavailable'};

function workforcePlatformRole(value:unknown):WorkforcePlatformRole{
  return value==='owner'||value==='admin'||value==='operator'?value:null;
}

export async function getWorkforceRequestContext():Promise<WorkforceRequestContext>{
  try{
    const supabase=await createClient();
    const{data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return{status:'unauthenticated'};

    const admin=createAdminClient();
    const{data:platform,error:platformError}=await admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle();
    if(platformError)return{status:'unavailable'};
    const platformRole=workforcePlatformRole(platform?.role);
    if(platformRole)return{status:'authorized',platformRole,storeRoles:[],instanceName:null};

    const instance=await getCurrentWebshopInstance();
    if(!instance)return{status:'forbidden'};
    let storeRoles=await getActiveStoreRoles(instance.id);

    if(!storeRoles.length&&!(await hasStoreRoleBindingHistory(instance.id,user.id))){
      const[{data:profile,error:profileError},{data:legacy,error:legacyError}]=await Promise.all([
        supabase.from('profiles').select('role').eq('id',user.id).maybeSingle(),
        admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).in('role',['owner','admin']).maybeSingle(),
      ]);
      if(profileError||legacyError)return{status:'unavailable'};
      if(profile?.role==='admin'&&(legacy?.role==='owner'||legacy?.role==='admin'))storeRoles=[legacy.role];
    }

    if(!storeRoles.length)return{status:'forbidden'};
    return{status:'authorized',platformRole:null,storeRoles,instanceName:instance.name};
  }catch{
    return{status:'unavailable'};
  }
}

export async function getAdminRequestUser(permission?:StorePermission){
  try{
    const supabase=await createClient();
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return null;
    const admin=createAdminClient();
    const[{data:profile},{data:platform}]=await Promise.all([
      supabase.from('profiles').select('role').eq('id',user.id).maybeSingle(),
      admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle(),
    ]);
    const isPlatform=['owner','admin','operator'].includes(String(platform?.role??''));
    let authorized=isPlatform;
    if(!authorized){
      const instance=await getCurrentWebshopInstance();
      if(instance){
        if(permission)authorized=await hasStorePermission(instance.id,permission);
        else authorized=await hasStorePermission(instance.id,'store.read');
        if(!authorized&&profile?.role==='admin'&&!(await hasStoreRoleBindingHistory(instance.id,user.id))){
          const{data:legacy}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).in('role',['owner','admin']).maybeSingle();
          authorized=Boolean(legacy);
        }
      }
    }
    if(!authorized)return null;
    if(process.env.SECURITY_RATE_LIMIT_ENABLED==='true'){
      const{data,error}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`admin:${user.id}`,p_window_seconds:60,p_max_count:240});
      if(error||data!==true)return null;
    }
    return user;
  }catch{return null}
}

export async function isAdminRequest(permission?:StorePermission){return Boolean(await getAdminRequestUser(permission))}

export async function getPlatformRequestUser(){
  try{
    const supabase=await createClient();
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return null;
    const admin=createAdminClient();
    const{data:platform}=await admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle();
    if(!['owner','admin','operator'].includes(String(platform?.role??'')))return null;
    if(process.env.SECURITY_RATE_LIMIT_ENABLED==='true'){
      const{data,error}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`admin:${user.id}`,p_window_seconds:60,p_max_count:240});
      if(error||data!==true)return null;
    }
    return user;
  }catch{return null}
}
