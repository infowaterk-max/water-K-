import type { ReactNode } from 'react';
import { requirePlanFeature } from '@/lib/plans/access';

export default async function FollowupLayout({ children }: { children: ReactNode }) {
  await requirePlanFeature('crm');
  return children;
}
