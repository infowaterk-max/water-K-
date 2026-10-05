import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getActiveStoreRoles,hasStorePermission,hasStoreRoleBindingHistory,type StoreRole } from '@/lib/auth/store-rbac';
import {
  requiredWorkforceTotpFactors,
  sensitiveBoundaryForWorkforceStoreRoles,
  type WorkforcePlatformRole,
  type WorkforceSensitiveBoundary,
  type WorkforceStoreRole,
} from '@/lib/auth/workforce-assurance-policy';
import { getWorkforceAssuranceSnapshot,workforceAssuranceSatisfied } from '@/lib/auth/workforce-assurance';

function safeLoginReturn(returnTo?:string){
  if(!returnTo||!returnTo.startsWith('/')||returnTo.startsWith('//'))return null;
  return returnTo.startsWith('/admin')||returnTo.startsWith('/storefront-template-preview')?returnTo:null;
}

function workforceLoginHref(next:string|null,boundary:WorkforceSensitiveBoundary){
  const target=next??'/admin';
  const params=new URLSearchParams({next:target});
  if(boundary!=='none')params.set('boundary',boundary);
  return `/api/auth/workforce-login?${params.toString()}`;
}

function platformRoleOf(value:unknown):WorkforcePlatformRole{
  return value==='owner'||value==='admin'||value==='operator'?value:null;
}

type AuthorizedContext={
  platformRole:WorkforcePlatformRole;
  storeRoles:StoreRole[];
};

export async function requireAdmin(returnTo?:string) {
  const hasPublicKey=Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!hasPublicKey)redirect('/fiokom?reason=admin-config');

  const supabase=await createClient();
  const{data:authData,error}=await supabase.auth.getUser();
  const next=safeLoginReturn(returnTo);
  if(error||!authData.user)redirect(workforceLoginHref(next,'none'));

  let context:AuthorizedContext|null=null;
  try{
    const admin=createAdminClient();
    const{data:platformAccess,error:platformError}=await admin
      .from('platform_operators')
      .select('role')
      .eq('user_id',authData.user.id)
      .maybeSingle();

    if(!platformError){
      const platformRole=platformRoleOf(platformAccess?.role);
      if(platformRole){
        context={platformRole,storeRoles:[]};
      }else{
        const instance=await getCurrentWebshopInstance();
        if(instance&&await hasStorePermission(instance.id,'store.read')){
          const storeRoles=await getActiveStoreRoles(instance.id);
          if(storeRoles.length)context={platformRole:null,storeRoles};
        }

        if(!context&&instance&&!(await hasStoreRoleBindingHistory(instance.id,authData.user.id))){
          const[{data:profile},{data:legacy,error:legacyError}]=await Promise.all([
            supabase.from('profiles').select('role').eq('id',authData.user.id).maybeSingle(),
            admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',authData.user.id).in('role',['owner','admin']).maybeSingle(),
          ]);
          if(!legacyError&&profile?.role==='admin'&&(legacy?.role==='owner'||legacy?.role==='admin')){
            context={platformRole:null,storeRoles:[legacy.role]};
          }
        }
      }
    }
  }catch{}

  if(!context)redirect('/fiokom?reason=forbidden');

  const sensitiveBoundary=sensitiveBoundaryForWorkforceStoreRoles(
    context.storeRoles as readonly WorkforceStoreRole[],
  );
  const requiredFactors=requiredWorkforceTotpFactors({
    platformRole:context.platformRole,
    storeRoles:context.storeRoles as readonly WorkforceStoreRole[],
    sensitiveBoundary,
  });

  if(requiredFactors>0){
    const snapshot=await getWorkforceAssuranceSnapshot();
    if(!workforceAssuranceSatisfied(snapshot,requiredFactors)){
      redirect(workforceLoginHref(next,sensitiveBoundary));
    }
  }

  return authData.user;
}
