import { redirect } from 'next/navigation';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function CommunicationEntry(){
  await requirePlanFeature('officeCommunication');
  await requireCurrentStoreContext('support.manage');
  redirect('/admin/kommunikacio/iroda');
}
