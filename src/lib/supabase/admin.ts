import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseServerKey } from '@/lib/supabase/server-credentials';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = resolveSupabaseServerKey();
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
