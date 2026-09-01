'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function moderateReviewAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['approved', 'rejected'].includes(status)) return;

  const admin = createAdminClient();
  await admin.from('product_reviews').update({ status, moderated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin/velemenyek');
}
