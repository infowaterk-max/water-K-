import { createClient } from '@/lib/supabase/server';

export async function isAdminRequest() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'admin';
  } catch {
    return false;
  }
}
