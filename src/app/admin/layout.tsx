import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { isPlatformOperator } from '@/lib/auth/platform-operator';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCurrentPlan } from '@/lib/plans/access';
import { hasPlanFeature, PLANS, type FeatureCode } from '@/lib/plans/catalog';

type NavItem={href:string;label:string;feature?:FeatureCode};
const MERCHANT_NAV:NavItem[]=[
 {href:'/admin',label:'Áttekintés'},{href:'/admin/marketing',label:'Marketing alapok',feature:'marketingBasics'},{href:'/admin/automatizalas',label:'Automatizálási központ',feature:'automation'},{href:'/admin/ertekesites',label:'Értékesítés',feature:'crm'},{href:'/admin/ugyfelertek',label:'Ügyfélérték',feature:'crm'},{href:'/admin/novekedes',label:'Növekedés',feature:'advancedAnalytics'},{href:'/admin/vezetoi',label:'Vezetői analitika',feature:'executiveAnalytics'},{href:'/admin/elemzes',label:'Elemzés',feature:'advancedAnalytics'},{href:'/admin/keszlet-elemzes',label:'Készletelemzés',feature:'advancedAnalytics'},{href:'/admin/beszerzes',label:'Beszerzés',feature:'procurement'},{href:'/admin/cashflow',label:'Cash-flow',feature:'cashflow'},{href:'/admin/utanakovetes',label:'Utánkövetés',feature:'crm'},{href:'/admin/kampanyok',label:'Haladó kampányok',feature:'advancedCampaigns'},{href:'/admin/kommunikacio',label:'Digitális iroda',feature:'officeCommunication'},{href:'/admin/kommunikacio/tiltolista',label:'Kommunikációs tiltólista',feature:'officeCommunication'},{href:'/admin/ugyfelszolgalat',label:'Ügyfélszolgálat',feature:'support'},{href:'/admin/termekek',label:'Termékek',feature:'catalog'},{href:'/admin/termekajanlasok',label:'Termékajánlások',feature:'productRecommendations'},{href:'/admin/tartalom',label:'Tartalom és SEO',feature:'contentMarketing'},{href:'/admin/termekek/import-export',label:'Import / export',feature:'importExport'},{href:'/admin/termekek/tomeges',label:'Tömeges műveletek',feature:'bulkOperations'},{href:'/admin/velemenyek',label:'Vásárlói vélemények',feature:'reviews'},{href:'/admin/rendelesek',label:'Rendelések',feature:'orders'},{href:'/admin/visszaru',label:'Visszáru',feature:'returns'},{href:'/admin/integraciok',label:'Fizetés és szállítás',feature:'commerceIntegrations'},{href:'/admin/kuponok',label:'Kuponok és akciók',feature:'coupons'},{href:'/admin/ugyfelek',label:'Ügyfelek',feature:'customers'},{href:'/admin/beallitasok',label:'Beállítások'}
];
const OPERATOR_NAV=[
 {href:'/admin/platform/webaruhazak',label:'Ügyfél-webshopok'},
 {href:'/admin/iranyitokozpont',label:'Platform irányítóközpont'},{href:'/admin/intezkedesek',label:'Intézkedési központ'},{href:'/admin/biztositekok',label:'Biztosítékok'},{href:'/admin/kiadasok',label:'Kiadási központ'},{href:'/admin/rollout',label:'Rollout központ'},{href:'/admin/utoellenorzes',label:'Utóellenőrzés'},{href:'/admin/helyreallitas',label:'Helyreállítás'},{href:'/admin/megfigyeles',label:'Megfigyelés'},{href:'/admin/muveletek',label:'Platform műveletek'},{href:'/admin/naplo',label:'Platform napló'}
];

export default async function AdminLayout({children}:{children:React.ReactNode}){
 await requireAdmin();
 const [plan,operator,instance]=await Promise.all([getCurrentPlan(),isPlatformOperator(),getCurrentWebshopInstance()]);
 const definition=PLANS[plan];
 const merchantName=instance?.name??'Webáruház';
 return <main className="adminGrid"><aside className="adminSide"><strong>{merchantName} Admin</strong><span className="muted">Shoperation · {definition.name} csomag{instance?` · ${instance.status==='pilot'?'pilot':instance.status}`:''}</span>
 {MERCHANT_NAV.filter(item=>!item.feature||hasPlanFeature(plan,item.feature)).map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}
 {plan==='alap'&&<Link href="/admin/csomag">Pro csomag funkciói</Link>}<Link href="/admin/csomag">Csomagkezelés</Link>
 {operator&&<><span className="muted">Shoperation · platform üzemeltetés</span>{OPERATOR_NAV.map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</>}
 <Link href="/">Webshop megnyitása</Link></aside>{children}</main>;
}
