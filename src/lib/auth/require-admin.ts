import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { hasStorePermission } from '@/lib/auth/store-rbac';

export async function requireAdmin() {
  const hasPublicKey=Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!hasPublicKey)redirect('/fiokom?reason=admin-config');
  const supabase=await createClient();
  const{data:authData,error}=await supabase.auth.getUser();
  if(error||!authData.user)redirect('/fiokom?reason=login');

  try{
    const admin=createAdminClient();
    const{data:platformAccess}=await admin.from('platform_operators').select('role').eq('user_id',authData.user.id).in('role',['owner','admin','operator']).maybeSingle();
    if(platformAccess)return authData.user;

    const instance=await getCurrentWebshopInstance();
    if(instance&&await hasStorePermission(instance.id,'store.read'))return authData.user;

    // Transitional compatibility is tenant-bound: a legacy global profile role alone is never enough.
    if(instance){
      const{data:profile}=await supabase.from('profiles').select('role').eq('id',authData.user.id).maybeSingle();
      if(profile?.role==='admin'){
        const{data:legacy}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',authData.user.id).in('role',['owner','admin']).maybeSingle();
        if(legacy)return authData.user;
      }
    }
  }catch{}

  redirect('/fiokom?reason=forbidden');
}
