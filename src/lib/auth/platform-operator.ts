import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from './require-admin';

export type PlatformRole = 'owner' | 'admin' | 'operator';

export async function getPlatformRole(): Promise<PlatformRole | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('platform_operators')
    .select('role')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (data?.role === 'owner' || data?.role === 'admin' || data?.role === 'operator') return data.role;
  return null;
}

export async function isPlatformOperator(): Promise<boolean> {
  return (await getPlatformRole()) !== null;
}

export async function isPlatformOwner(): Promise<boolean> {
  return (await getPlatformRole()) === 'owner';
}

export async function requirePlatformOperator() {
  const user = await requireAdmin();
  if (!(await isPlatformOperator())) redirect('/admin?reason=operator-required');
  return user;
}

export async function requirePlatformOwner() {
  const user = await requireAdmin();
  if (!(await isPlatformOwner())) redirect('/admin?reason=owner-required');
  return user;
}
