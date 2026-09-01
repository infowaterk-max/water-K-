import './admin-shell.css';
import './launch-readiness.css';
import './workspace.css';
import './business-modules.css';
import './concept-ui.css';
import './admin-final-polish.css';
import './admin-responsive-final.css';
import './admin-audit-remediation.css';
import Link from 'next/link';
import { AdminNavigation } from '@/components/navigation/admin-navigation';
import { AdminFontScale } from '@/components/admin/admin-font-scale';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getPlatformRole } from '@/lib/auth/platform-operator';
import { getActiveStoreRoles,roleHasPermission,type StorePermission } from '@/lib/auth/store-rbac';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCurrentPlan } from '@/lib/plans/access';
import { hasPlanFeature,PLANS,type FeatureCode } from '@/lib/plans/catalog';

type NavItem={href:string;label:string;feature?:FeatureCode;permission:StorePermission};
type NavSection={label:string;items:NavItem[]};

const MERCHANT_NAV:NavSection[]=[
  {label:'Kezdőlap',items:[
    {href:'/admin',label:'Áttekintés',permission:'store.read'},
    {href:'/admin/indulas',label:'Indítási központ',permission:'store.manage'},
  ]},
  {label:'Értékesítés',items:[
    {href:'/admin/rendelesek',label:'Rendelések',feature:'orders',permission:'orders.manage'},
    {href:'/admin/visszaru',label:'Visszáru',feature:'returns',permission:'orders.manage'},
    {href:'/admin/ugyfelek',label:'Ügyfelek',feature:'customers',permission:'sales.manage'},
    {href:'/admin/ertekesites',label:'CRM és értékesítés',feature:'crm',permission:'sales.manage'},
    {href:'/admin/ugyfelertek',label:'Ügyfélérték',feature:'crm',permission:'analytics.read'},
    {href:'/admin/utanakovetes',label:'Utánkövetés',feature:'crm',permission:'marketing.manage'},
  ]},
  {label:'Katalógus',items:[
    {href:'/admin/termekek',label:'Termékek',feature:'catalog',permission:'catalog.manage'},
    {href:'/admin/termekajanlasok',label:'Termékajánlások',feature:'productRecommendations',permission:'catalog.manage'},
    {href:'/admin/keszlet-elemzes',label:'Készletelemzés',feature:'advancedAnalytics',permission:'analytics.read'},
    {href:'/admin/beszerzes',label:'Készlet és beszerzés',feature:'procurement',permission:'procurement.manage'},
    {href:'/admin/termekek/import-export',label:'Import / export',feature:'importExport',permission:'catalog.manage'},
    {href:'/admin/termekek/tomeges',label:'Tömeges műveletek',feature:'bulkOperations',permission:'catalog.manage'},
  ]},
  {label:'Marketing és tartalom',items:[
    {href:'/admin/marketing',label:'Marketing alapok',feature:'marketingBasics',permission:'marketing.manage'},
    {href:'/admin/kampanyok',label:'Kampányközpont',feature:'advancedCampaigns',permission:'marketing.manage'},
    {href:'/admin/tartalom',label:'Tartalom és SEO',feature:'contentMarketing',permission:'marketing.manage'},
    {href:'/admin/kuponok',label:'Kuponok és akciók',feature:'coupons',permission:'marketing.manage'},
    {href:'/admin/velemenyek',label:'Vásárlói vélemények',feature:'reviews',permission:'marketing.manage'},
  ]},
  {label:'Működés',items:[
    {href:'/admin/automatizalas',label:'Automatizálási központ',feature:'automation',permission:'store.manage'},
    {href:'/admin/kommunikacio',label:'Digitális iroda',feature:'officeCommunication',permission:'marketing.manage'},
    {href:'/admin/kommunikacio/tiltolista',label:'Kommunikációs tiltólista',feature:'officeCommunication',permission:'marketing.manage'},
    {href:'/admin/ugyfelszolgalat',label:'Ügyfélszolgálat',feature:'support',permission:'support.manage'},
    {href:'/admin/beallitasok/fizetes-szallitas',label:'Fizetés, szállítás és számlázás',feature:'commerceIntegrations',permission:'integrations.manage'},
    {href:'/admin/integraciok',label:'Integrációk és rendszerállapot',feature:'advancedIntegrations',permission:'integrations.manage'},
  ]},
  {label:'Elemzés és pénzügy',items:[
    {href:'/admin/elemzes',label:'Elemzés',feature:'advancedAnalytics',permission:'analytics.read'},
    {href:'/admin/novekedes',label:'Növekedés',feature:'advancedAnalytics',permission:'analytics.read'},
    {href:'/admin/vezetoi',label:'Vezetői analitika',feature:'executiveAnalytics',permission:'analytics.read'},
    {href:'/admin/cashflow',label:'Cash-flow',feature:'cashflow',permission:'analytics.read'},
  ]},
  {label:'Rendszer',items:[
    {href:'/admin/csomag',label:'Csomagkezelés',permission:'store.manage'},
    {href:'/admin/beallitasok',label:'Beállítások',permission:'store.manage'},
  ]},
];

const OPERATOR_NAV=[
  {href:'/admin/platform/webaruhazak',label:'Ügyfél-webshopok'},
  {href:'/admin/iranyitokozpont',label:'Platform irányítóközpont'},
  {href:'/admin/intezkedesek',label:'Intézkedési központ'},
  {href:'/admin/biztositekok',label:'Biztosítékok'},
  {href:'/admin/kiadasok',label:'Kiadási központ'},
  {href:'/admin/rollout',label:'Rollout központ'},
  {href:'/admin/utoellenorzes',label:'Utóellenőrzés'},
  {href:'/admin/helyreallitas',label:'Helyreállítás'},
  {href:'/admin/megfigyeles',label:'Megfigyelés'},
  {href:'/admin/muveletek',label:'Platform műveletek'},
  {href:'/admin/naplo',label:'Platform napló'},
];

export default async function AdminLayout({children}:{children:React.ReactNode}){
  await requireAdmin();
  const [plan,platformRole,instance]=await Promise.all([
    getCurrentPlan(),
    getPlatformRole(),
    getCurrentWebshopInstance(),
  ]);

  const isPlatform=Boolean(platformRole);
  const effectivePlan=isPlatform?'pro':plan;
  const definition=PLANS[effectivePlan];
  const merchantName=instance?.name??'Webáruház';
  const platformLabel=platformRole==='owner'?'Rendszertulajdonos':platformRole==='admin'?'Platform admin':'Platform operátor';
  const roles=!isPlatform&&instance?await getActiveStoreRoles(instance.id):[];
  const can=(permission:StorePermission)=>roles.some(role=>roleHasPermission(role,permission));

  // Platform Workbench and merchant Admin are intentionally separate navigation worlds.
  const sections=isPlatform?[]:MERCHANT_NAV.map(section=>({
    label:section.label,
    items:section.items
      .filter(item=>(!item.feature||hasPlanFeature(effectivePlan,item.feature))&&can(item.permission))
      .map(({href,label})=>({href,label})),
  })).filter(section=>section.items.length>0);
  const operatorItems=isPlatform?OPERATOR_NAV:[];

  return <main className="adminGrid">
    <aside className="adminSide">
      <div className="adminBrand">
        {isPlatform?<>
          <div className="adminBrandWordmark"><strong>SHOPERATION</strong><span>WEBSHOP, AMI VELED GONDOLKODIK.</span></div>
          <span className="adminRoleBadge">{platformLabel}</span>
        </>:<>
          <div className="adminBrandWordmark"><strong>{merchantName}</strong><span>Shoperation {definition.name}</span></div>
        </>}
      </div>
      <AdminNavigation sections={sections} operatorItems={operatorItems} showUpgrade={!isPlatform&&plan==='alap'}/>
      <AdminFontScale/>
      {!isPlatform&&<Link className="adminStoreLink" href="/">← Webshop előnézet</Link>}
    </aside>
    {children}
  </main>;
}
