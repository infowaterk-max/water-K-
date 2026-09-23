import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { hasStorePermission,hasStoreRoleBindingHistory } from '@/lib/auth/store-rbac';

function safeLoginReturn(returnTo?:string){
  if(!returnTo||!returnTo.startsWith('/')||returnTo.startsWith('//'))return null;
  return returnTo.startsWith('/admin')||returnTo.startsWith('/storefront-template-preview')?returnTo:null;
}

function previewLoginHref(next:string){
  if(!next.startsWith('/storefront-template-preview'))return null;
  try{
    const parsed=new URL(next,'https://shoporation.invalid');
    const template=parsed.searchParams.get('template')??'';
    const version=parsed.searchParams.get('version')??'';
    const page=parsed.searchParams.get('page')??'home';
    const viewport=parsed.searchParams.get('viewport')??'desktop';
    if(!template)return null;
    const params=new URLSearchParams({template,page,viewport,next});
    if(version)params.set('version',version);
    return `/storefront-template-preview-login?${params.toString()}`;
  }catch{return null}
}

export async function requireAdmin(returnTo?:string) {
  const hasPublicKey=Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!hasPublicKey)redirect('/fiokom?reason=admin-config');
  const supabase=await createClient();
  const{data:authData,error}=await supabase.auth.getUser();
  if(error||!authData.user){
    const next=safeLoginReturn(returnTo);
    const previewLogin=next?previewLoginHref(next):null;
    redirect(previewLogin??(next?`/fiokom?reason=login&next=${encodeURIComponent(next)}`:'/fiokom?reason=login'));
  }

  try{
    const admin=createAdminClient();
    const{data:platformAccess}=await admin.from('platform_operators').select('role').eq('user_id',authData.user.id).in('role',['owner','admin','operator']).maybeSingle();
    if(platformAccess)return authData.user;

    const instance=await getCurrentWebshopInstance();
    if(instance&&await hasStorePermission(instance.id,'store.read'))return authData.user;

    // Transitional compatibility is allowed only before this user/store has RBAC history.
    // Once role_bindings exists, revocation/expiry is authoritative and cannot fall back.
    if(instance&&!(await hasStoreRoleBindingHistory(instance.id,authData.user.id))){
      const{data:profile}=await supabase.from('profiles').select('role').eq('id',authData.user.id).maybeSingle();
      if(profile?.role==='admin'){
        const{data:legacy}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',authData.user.id).in('role',['owner','admin']).maybeSingle();
        if(legacy)return authData.user;
      }
    }
  }catch{}

  redirect('/fiokom?reason=forbidden');
}
