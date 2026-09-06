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
import './block4-ia-navigation.css';
import './block4-reporting-context.css';
import Link from 'next/link';
import { AdminNavigation } from '@/components/navigation/admin-navigation';
import { AdminRouteContext } from '@/components/navigation/admin-route-context';
import { AdminFontScale } from '@/components/admin/admin-font-scale';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getPlatformRole } from '@/lib/auth/platform-operator';
import { getActiveStoreRoles,roleHasPermission,type StorePermission } from '@/lib/auth/store-rbac';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCurrentPlan } from '@/lib/plans/access';
import { PLANS } from '@/lib/plans/catalog';
import { PLATFORM_NAVIGATION,resolveFrequentTasks,resolveMerchantNavigation } from '@/lib/navigation/admin-ia';

export default async function AdminLayout({children}:{children:React.ReactNode}){
  await requireAdmin();
  const[plan,platformRole,instance]=await Promise.all([getCurrentPlan(),getPlatformRole(),getCurrentWebshopInstance()]);
  const effectivePlan=platformRole?'pro':plan,definition=PLANS[effectivePlan],merchantName=instance?.name??'Webáruház',isPlatform=Boolean(platformRole),platformLabel=platformRole==='owner'?'Rendszertulajdonos':platformRole==='admin'?'Platform admin':'Platform operátor';
  const roles=!isPlatform&&instance?await getActiveStoreRoles(instance.id):[];
  const can=(permission?:StorePermission)=>!permission||isPlatform||roles.some(role=>roleHasPermission(role,permission));
  const sections=isPlatform&&!instance?[]:resolveMerchantNavigation(effectivePlan,can,instance?.status);
  const operatorItems=isPlatform?PLATFORM_NAVIGATION.map(item=>({...item})):[];
  const quickItems=(!isPlatform||Boolean(instance))?resolveFrequentTasks(effectivePlan,can):[];
  return <main className="adminGrid"><aside className="adminSide"><div className="adminBrand">{isPlatform?<><div className="adminBrandWordmark"><strong>SHOPERATION</strong><span>WEBSHOP, AMI VELED GONDOLKODIK.</span></div><span className="adminRoleBadge">{platformLabel}</span></>:<><div className="adminBrandWordmark"><strong>{merchantName}</strong><span>Shoperation {definition.name}</span></div></>}</div><AdminNavigation sections={sections} operatorItems={operatorItems} quickItems={quickItems} showUpgrade={!isPlatform&&plan==='alap'}/><AdminFontScale/><Link className="adminStoreLink" href="/">← Webshop előnézet</Link></aside><div className="adminContentShell"><AdminRouteContext sections={sections} operatorItems={operatorItems}/>{children}</div></main>;
}
