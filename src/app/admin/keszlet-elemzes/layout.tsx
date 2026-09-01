import type { ReactNode } from 'react';
import { requirePlanFeature } from '@/lib/plans/access';

export default async function InventoryAnalyticsLayout({ children }: { children: ReactNode }) {
  await requirePlanFeature('advancedAnalytics');
  return children;
}
