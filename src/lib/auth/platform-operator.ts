import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from './require-admin';

export async function isPlatformOperator(): Promise<boolean> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;
  const { data } = await supabase
    .from('profiles')
    .select('platform_operator')
    .eq('id', authData.user.id)
    .maybeSingle();
  return data?.platform_operator === true;
}

export async function requirePlatformOperator() {
  const user = await requireAdmin();
  if (!(await isPlatformOperator())) redirect('/admin?reason=operator-required');
  return user;
}
