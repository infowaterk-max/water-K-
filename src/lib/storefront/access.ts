import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance, type WebshopInstance } from '@/lib/instances/access';
import { getPilotAcceptanceInstanceId } from '@/lib/storefront/pilot-access';
import { hasStorePermission,hasStoreRoleBindingHistory } from '@/lib/auth/store-rbac';
import {isBusinessPulseStorefrontPaused} from '@/lib/business-pulse/access';

export async function requireStorefrontAccess():Promise<WebshopInstance|null>{
  const instance=await getCurrentWebshopInstance();
  let trialPaused=false;
  if(instance){
    try{trialPaused=await isBusinessPulseStorefrontPaused(instance.id)}
    catch{redirect('/hamarosan')}
  }
  if(!trialPaused&&instance?.status==='active') return instance;
  if(!trialPaused&&instance?.status==='pilot'&&await getPilotAcceptanceInstanceId()===instance.id)return instance;

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/hamarosan');

  let platform=false,merchant=false;
  try{
    const admin=createAdminClient();
    const {data:platformRow}=await admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle();
    platform=Boolean(platformRow?.role);
    if(instance&&!platform){
      merchant=await hasStorePermission(instance.id,'store.read');
      if(!merchant&&!(await hasStoreRoleBindingHistory(instance.id,user.id))){
        const {data:membership}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).maybeSingle();
        merchant=Boolean(membership?.role);
      }
    }
  }catch{redirect('/hamarosan')}

  if(platform)return instance;
  if(trialPaused&&merchant)redirect('/admin/business-pulse');
  if(merchant)return instance;
  redirect('/hamarosan');
}
