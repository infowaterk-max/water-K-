import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './require-admin';

export async function isPlatformOperator(): Promise<boolean> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from('platform_operators')
    .select('user_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  return data?.user_id === authData.user.id;
}

export async function requirePlatformOperator() {
  const user = await requireAdmin();
  if (!(await isPlatformOperator())) redirect('/admin?reason=operator-required');
  return user;
}
