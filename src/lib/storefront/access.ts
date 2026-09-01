import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance, type WebshopInstance } from '@/lib/instances/access';

export async function requireStorefrontAccess():Promise<WebshopInstance|null>{
  const instance=await getCurrentWebshopInstance();
  if(instance?.status==='active') return instance;

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/hamarosan');

  try{
    const admin=createAdminClient();
    const [{data:profile},{data:platform}]=await Promise.all([
      admin.from('profiles').select('role').eq('id',user.id).maybeSingle(),
      admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle(),
    ]);
    if(profile?.role==='admin'||platform?.role) return instance;
    if(instance){
      const {data:membership}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle();
      if(membership?.role) return instance;
    }
  }catch{}
  redirect('/hamarosan');
}
