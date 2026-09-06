import './admin-shell.css';
import './launch-readiness.css';
import './workspace.css';
import './business-modules.css';
import './concept-ui.css';
import './admin-final-polish.css';
import './admin-responsive-final.css';
import './admin-audit-remediation.css';
import './communication-pilot-fixes.css';
import './block3-pilot-batch.css';
import './block3-order-detail-hotfix.css';
import './block4-ia-reporting.css';
import Link from 'next/link';
import { AdminNavigation } from '@/components/navigation/admin-navigation';
import { AdminRouteContext } from '@/components/navigation/admin-route-context';
import { AdminFontScale } from '@/components/admin/admin-font-scale';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getPlatformRole } from '@/lib/auth/platform-operator';
import { getActiveStoreRoles, roleHasPermission, type StorePermission } from '@/lib/auth/store-rbac';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCurrentPlan } from '@/lib/plans/access';
import { hasPlanFeature, PLANS } from '@/lib/plans/catalog';
import { MERCHANT_WORKSPACES, OPERATOR_NAV, type VisibleAdminNavSection } from '@/lib/admin/workspace-navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [plan, platformRole, instance] = await Promise.all([getCurrentPlan(), getPlatformRole(), getCurrentWebshopInstance()]);
  const effectivePlan = platformRole ? 'pro' : plan;
  const definition = PLANS[effectivePlan];
  const merchantName = instance?.name ?? 'Webáruház';
  const isPlatform = Boolean(platformRole);
  const platformLabel = platformRole === 'owner' ? 'Rendszertulajdonos' : platformRole === 'admin' ? 'Platform admin' : 'Platform operátor';
  const roles = !isPlatform && instance ? await getActiveStoreRoles(instance.id) : [];
  const can = (permission?: StorePermission) => !permission || isPlatform || roles.some((role) => roleHasPermission(role, permission));

  const merchantSections: VisibleAdminNavSection[] = MERCHANT_WORKSPACES.map((workspace) => ({
    id: workspace.id,
    label: workspace.label,
    summary: workspace.summary,
    items: workspace.items
      .filter((item) => (!item.feature || hasPlanFeature(effectivePlan, item.feature)) && can(item.permission) && (item.audience !== 'pilot' || instance?.status === 'pilot'))
      .map(({ href, label }) => ({ href, label })),
  })).filter((section) => section.items.length > 0);

  const sections = isPlatform && !instance ? [] : merchantSections;
  const operatorItems = isPlatform ? OPERATOR_NAV.map(({ href, label }) => ({ href, label })) : [];

  return <main className="adminGrid">
    <aside className="adminSide">
      <div className="adminBrand">{isPlatform ? <><div className="adminBrandWordmark"><strong>SHOPERATION</strong><span>WEBSHOP, AMI VELED GONDOLKODIK.</span></div><span className="adminRoleBadge">{platformLabel}</span></> : <><div className="adminBrandWordmark"><strong>{merchantName}</strong><span>Shoperation {definition.name}</span></div></>}</div>
      <AdminNavigation sections={sections} operatorItems={operatorItems} showUpgrade={!isPlatform && plan === 'alap'} />
      <AdminFontScale />
      <Link className="adminStoreLink" href="/">← Webshop előnézet</Link>
    </aside>
    <div className="adminContentShell">
      <AdminRouteContext sections={sections} operatorItems={operatorItems} />
      {children}
    </div>
  </main>;
}
