import SuppressionsPage from '@/app/admin/kommunikacio/tiltolista/page';
import {requirePlanFeature} from '@/lib/plans/access';

export const dynamic='force-dynamic';

/** Alap-safe suppression management, separate from the Pro-only Digital Office layout. */
export default async function MarketingSuppressionsPage(){
  await requirePlanFeature('officeCommunication');
  return <SuppressionsPage/>;
}
