import 'server-only';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getActiveStoreRoles,hasStoreRoleBindingHistory,roleHasPermission,type StorePermission,type StoreRole } from '@/lib/auth/store-rbac';
import {
  combineWorkforceSensitiveBoundaries,
  requiredWorkforceTotpFactors,
  sensitiveBoundaryForWorkforcePermission,
  sensitiveBoundaryForWorkforceStoreRoles,
  type WorkforcePlatformRole,
  type WorkforceSensitiveBoundary,
  type WorkforceStoreRole,
} from '@/lib/auth/workforce-assurance-policy';
import { getWorkforceAssuranceSnapshot,workforceAssuranceSatisfied } from '@/lib/auth/workforce-assurance';

export type WorkforceRequestContext=
  |{
      status:'authorized';
      platformRole:WorkforcePlatformRole;
      storeRoles:StoreRole[];
      instanceName:string|null;
      sensitiveBoundary:WorkforceSensitiveBoundary;
      requiredFactors:0|1|2;
    }
  |{status:'unauthenticated'|'forbidden'|'unavailable'};

export type WorkforceAdminAccess=
  |{
      status:'authorized';
      user:User;
      platformRole:WorkforcePlatformRole;
      storeRoles:StoreRole[];
      sensitiveBoundary:WorkforceSensitiveBoundary;
      requiredFactors:0|1|2;
    }
  |{
      status:'assurance-required';
      requiredFactors:1|2;
      sensitiveBoundary:WorkforceSensitiveBoundary;
    }
  |{status:'unauthenticated'|'forbidden'|'unavailable'};

type WorkforceIdentity=
  |{
      status:'authorized';
      user:User;
      platformRole:WorkforcePlatformRole;
      storeRoles:StoreRole[];
      instanceName:string|null;
    }
  |{status:'unauthenticated'|'forbidden'|'unavailable'};

function workforcePlatformRole(value:unknown):WorkforcePlatformRole{
  return value==='owner'||value==='admin'||value==='operator'?value:null;
}

async function resolveWorkforceIdentity():Promise<WorkforceIdentity>{
  try{
    const supabase=await createClient();
    const{data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return{status:'unauthenticated'};

    const admin=createAdminClient();
    const{data:platform,error:platformError}=await admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle();
    if(platformError)return{status:'unavailable'};
    const platformRole=workforcePlatformRole(platform?.role);
    if(platformRole)return{status:'authorized',user,platformRole,storeRoles:[],instanceName:null};

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
    return{status:'authorized',user,platformRole:null,storeRoles,instanceName:instance.name};
  }catch{
    return{status:'unavailable'};
  }
}

function roleBoundary(storeRoles:readonly StoreRole[]){
  return sensitiveBoundaryForWorkforceStoreRoles(storeRoles as readonly WorkforceStoreRole[]);
}

function factorsFor(
  identity:Extract<WorkforceIdentity,{status:'authorized'}>,
  sensitiveBoundary:WorkforceSensitiveBoundary,
){
  return requiredWorkforceTotpFactors({
    platformRole:identity.platformRole,
    storeRoles:identity.storeRoles as readonly WorkforceStoreRole[],
    sensitiveBoundary,
  });
}

async function rateLimit(userId:string){
  if(process.env.SECURITY_RATE_LIMIT_ENABLED!=='true')return true;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('consume_security_rate_limit',{
    p_rate_key:`admin:${userId}`,
    p_window_seconds:60,
    p_max_count:240,
  });
  return !error&&data===true;
}

async function assuranceSatisfied(requiredFactors:0|1|2){
  if(requiredFactors===0)return true;
  const snapshot=await getWorkforceAssuranceSnapshot();
  return workforceAssuranceSatisfied(snapshot,requiredFactors);
}

export async function getWorkforceRequestContext(
  requestedBoundary:WorkforceSensitiveBoundary='none',
):Promise<WorkforceRequestContext>{
  const identity=await resolveWorkforceIdentity();
  if(identity.status!=='authorized')return identity;

  const sensitiveBoundary=combineWorkforceSensitiveBoundaries(
    roleBoundary(identity.storeRoles),
    requestedBoundary,
  );
  const requiredFactors=factorsFor(identity,sensitiveBoundary);
  return{
    status:'authorized',
    platformRole:identity.platformRole,
    storeRoles:identity.storeRoles,
    instanceName:identity.instanceName,
    sensitiveBoundary,
    requiredFactors,
  };
}

export async function getAdminRequestAccess(
  permission?:StorePermission,
  requestedBoundary:WorkforceSensitiveBoundary='none',
):Promise<WorkforceAdminAccess>{
  const identity=await resolveWorkforceIdentity();
  if(identity.status!=='authorized')return identity;

  if(!identity.platformRole){
    const effectivePermission=permission??'store.read';
    if(!identity.storeRoles.some(role=>roleHasPermission(role,effectivePermission)))return{status:'forbidden'};
  }

  const sensitiveBoundary=combineWorkforceSensitiveBoundaries(
    roleBoundary(identity.storeRoles),
    sensitiveBoundaryForWorkforcePermission(permission),
    requestedBoundary,
  );
  const requiredFactors=factorsFor(identity,sensitiveBoundary);
  if(!(await assuranceSatisfied(requiredFactors))){
    return{
      status:'assurance-required',
      requiredFactors:requiredFactors as 1|2,
      sensitiveBoundary,
    };
  }
  if(!(await rateLimit(identity.user.id)))return{status:'unavailable'};

  return{
    status:'authorized',
    user:identity.user,
    platformRole:identity.platformRole,
    storeRoles:identity.storeRoles,
    sensitiveBoundary,
    requiredFactors,
  };
}

export async function getAdminRequestUser(
  permission?:StorePermission,
  sensitiveBoundary:WorkforceSensitiveBoundary='none',
){
  const access=await getAdminRequestAccess(permission,sensitiveBoundary);
  return access.status==='authorized'?access.user:null;
}

export async function isAdminRequest(permission?:StorePermission){
  return Boolean(await getAdminRequestUser(permission));
}

export async function getPlatformRequestUser(
  requestedBoundary:WorkforceSensitiveBoundary='none',
){
  const identity=await resolveWorkforceIdentity();
  if(identity.status!=='authorized'||!identity.platformRole)return null;

  const requiredFactors=requiredWorkforceTotpFactors({
    platformRole:identity.platformRole,
    sensitiveBoundary:requestedBoundary,
  });
  if(!(await assuranceSatisfied(requiredFactors)))return null;
  if(!(await rateLimit(identity.user.id)))return null;
  return identity.user;
}
