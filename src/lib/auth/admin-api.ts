import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { hasStorePermission, type StorePermission } from '@/lib/auth/store-rbac';

export async function getAdminRequestUser(permission:StorePermission='store.manage'){
  try{
    const supabase=await createClient();
    const{data:{user}}=await supabase.auth.getUser();
    if(!user)return null;
    const admin=createAdminClient();
    const[{data:profile},{data:platform}]=await Promise.all([
      supabase.from('profiles').select('role').eq('id',user.id).maybeSingle(),
      admin.from('platform_operators').select('role').eq('user_id',user.id).maybeSingle(),
    ]);
    let authorized=profile?.role==='admin'||['owner','admin','operator'].includes(String(platform?.role??''));
    if(!authorized){
      const instance=await getCurrentWebshopInstance();
      if(instance)authorized=await hasStorePermission(instance.id,permission);
      if(!authorized&&instance){
        const{data:legacy}=await admin.from('webshop_instance_members').select('role').eq('instance_id',instance.id).eq('user_id',user.id).in('role',['owner','admin']).maybeSingle();
        authorized=Boolean(legacy);
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
