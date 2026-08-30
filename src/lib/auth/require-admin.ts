import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function requireAdmin() {
  const hasPublicKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !hasPublicKey) redirect('/fiokom?reason=admin-config');

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.getUser();
  if (error || !authData.user) redirect('/fiokom?reason=login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id',authData.user.id).maybeSingle();
  if (profile?.role === 'admin') return authData.user;

  try {
    const admin = createAdminClient();
    const instanceSlug = process.env.WEBSHOP_INSTANCE_SLUG?.trim().toLowerCase();
    let instanceId: string | null = null;
    if (instanceSlug) {
      const { data: instance } = await admin.from('webshop_instances').select('id').eq('slug',instanceSlug).in('status',['pilot','active']).maybeSingle();
      instanceId = instance?.id ?? null;
    } else {
      const { data: memberships } = await admin.from('webshop_instance_members').select('instance_id,role').eq('user_id',authData.user.id).in('role',['owner','admin']).limit(2);
      if (memberships?.length === 1) instanceId = memberships[0].instance_id;
    }
    if (instanceId) {
      const { data: membership } = await admin.from('webshop_instance_members').select('role').eq('instance_id',instanceId).eq('user_id',authData.user.id).in('role',['owner','admin']).maybeSingle();
      if (membership) return authData.user;
    }
  } catch {}

  redirect('/fiokom?reason=forbidden');
}
