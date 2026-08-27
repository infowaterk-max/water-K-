import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAdminRequestUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if(profile?.role!=='admin')return null;
    if(process.env.SECURITY_RATE_LIMIT_ENABLED==='true'){
      const admin=createAdminClient();
      const{data,error}=await admin.rpc('consume_security_rate_limit',{p_rate_key:`admin:${user.id}`,p_window_seconds:60,p_max_count:240});
      if(error||data!==true)return null;
    }
    return user;
  } catch {
    return null;
  }
}

export async function isAdminRequest() {
  return Boolean(await getAdminRequestUser());
}
