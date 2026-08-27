import { createClient } from '@/lib/supabase/server';

export async function getAdminRequestUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    return profile?.role === 'admin' ? user : null;
  } catch {
    return null;
  }
}

export async function isAdminRequest() {
  return Boolean(await getAdminRequestUser());
}
