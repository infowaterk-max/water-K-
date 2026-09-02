'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export async function moderateReviewAction(formData: FormData) {
  const scope=await requireCurrentStoreContext('marketing.manage');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['approved', 'rejected'].includes(status)) return;

  const admin = createAdminClient();
  await admin.from('product_reviews').update({ status, moderated_at: new Date().toISOString() }).eq('id', id).eq('instance_id',scope.instanceId);
  revalidatePath('/admin/velemenyek');
}
