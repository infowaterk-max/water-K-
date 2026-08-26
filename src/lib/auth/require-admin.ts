import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/fiokom?reason=admin-config');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/fiokom?reason=login');

  const role = data.user.app_metadata?.role;
  if (role !== 'admin') redirect('/fiokom?reason=forbidden');

  return data.user;
}
