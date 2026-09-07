import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance, type WebshopInstance } from '@/lib/instances/access';
import { getPilotAcceptanceInstanceId } from '@/lib/storefront/pilot-access';
import { hasStorePermission,hasStoreRoleBindingHistory } from '@/lib/auth/store-rbac';

export async function requireStorefrontAccess():Promise<WebshopInstance|null>{
  const instance=await getCurrentWebshopInstance();
  if(instance?.status==='active') return instance;
  if(instance?.status==='pilot'&&await getPilotAcceptanceInstanceId()===instance.id)return instance;

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/hamarosan');

  try{
    const admin=createAdminClient();
    const {data:platform}=await admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle();
    if(platform?.role)return instance;
    if(instance&&await hasStorePermission(instance.id,'store.read'))return instance;
    if(instance&&!(await hasStoreRoleBindingHistory(instance.id,user.id))){
      const {data:membership}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle();
      if(membership?.role)return instance;
    }
  }catch{}
  redirect('/hamarosan');
}
