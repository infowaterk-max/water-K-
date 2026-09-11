import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { PredictiveOptimizationPanel } from '@/components/admin/predictive-optimization-panel';

export const dynamic='force-dynamic';

export default async function Page(){
  await requirePlanFeature('executiveAnalytics');
  await requirePlanFeature('automation');
  await requireCurrentStoreContext('analytics.read');
  return <section className="adminMain">
    <span className="eyebrow">Pro · Block 19</span>
    <h1 className="sectionTitle">Prediktív optimalizáció és autonóm guardrail-ek</h1>
    <p className="lead">Várható üzleti kimenetek, kontrollált optimalizáció és szigorúan korlátozott autonóm workflow-végrehajtás. A rendszer fail-closed: ár-, promóció-, készlet-, rendelés-, ügyfél- vagy katalógusállapotot nem írhat megkerülő úton.</p>
    <PredictiveOptimizationPanel/>
  </section>;
}
