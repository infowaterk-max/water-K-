import type { ReactNode } from 'react';
import { requirePlanFeature } from '@/lib/plans/access';

export default async function CommunicationSupervisionLayout({children}:{children:ReactNode}){
  await requirePlanFeature('officeCommunicationAdvanced');
  return children;
}
