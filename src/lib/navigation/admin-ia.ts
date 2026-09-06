import { hasPlanFeature, type FeatureCode, type PlanCode } from '@/lib/plans/catalog';
import type { StorePermission } from '@/lib/auth/store-rbac';

export type AdminReportFamily='overview'|'sales'|'customer'|'inventory'|'growth'|'finance'|'executive';
export type AdminEvidenceKind='fact'|'calculation'|'recommendation';
export type AdminInstanceStatus='pilot'|'active'|'suspended'|'archived';

export type AdminNavItem={
  id:string;
  href:string;
  label:string;
  description:string;
  feature?:FeatureCode;
  permission?:StorePermission;
  group?:string;
  reportFamily?:AdminReportFamily;
  evidenceKinds?:readonly AdminEvidenceKind[];
  audience?:'all'|'pilot';
};

export type AdminNavSection={id:string;label:string;items:readonly AdminNavItem[]};
export type ResolvedAdminNavItem=Pick<AdminNavItem,'id'|'href'|'label'|'description'|'group'|'reportFamily'|'evidenceKinds'>;
export type ResolvedAdminNavSection={id:string;label:string;items:ResolvedAdminNavItem[]};

export const MERCHANT_NAVIGATION:readonly AdminNavSection[]=[
  {id:'overview',label:'Vezetői áttekintés',items:[
    {id:'overview-home',href:'/admin',label:'Áttekintés',description:'A webshop napi állapota, legfontosabb mutatói és rövid műveleti összképe.',permission:'store.read',reportFamily:'overview',evidenceKinds:['fact','calculation']},
    {id:'analytics',href:'/admin/elemzes',label:'Értékesítési és fedezeti elemzés',description:'Forgalom, fedezet, rendelési érték és termékszintű jövedelmezőség.',feature:'advancedAnalytics',permission:'analytics.read',group:'Teljesítmény',reportFamily:'sales',evidenceKinds:['calculation']},
    {id:'growth',href:'/admin/novekedes',label:'Növekedési döntési központ',description:'Növekedési és megtartási mutatók, valamint üzleti beavatkozási javaslatok.',feature:'advancedAnalytics',permission:'analytics.read',group:'Teljesítmény',reportFamily:'growth',evidenceKinds:['calculation','recommendation']},
    {id:'executive',href:'/admin/vezetoi',label:'Vezetői analitika',description:'Vezetői szintű összesített üzleti mutatók és kockázati jelzések.',feature:'executiveAnalytics',permission:'analytics.read',group:'Vezetői nézetek',reportFamily:'executive',evidenceKinds:['calculation','recommendation']},
    {id:'cashflow',href:'/admin/cashflow',label:'Cash-flow előrejelzés',description:'Pénzáramlási és likviditási döntéstámogató nézet.',feature:'cashflow',permission:'analytics.read',group:'Vezetői nézetek',reportFamily:'finance',evidenceKinds:['fact','calculation']},
  ]},
  {id:'sales',label:'Értékesítés',items:[
    {id:'orders',href:'/admin/rendelesek',label:'Rendelések',description:'Rendelések feldolgozása, státuszai és részletes rendelési műveletei.',feature:'orders',permission:'orders.manage',group:'Rendeléskezelés'},
    {id:'returns',href:'/admin/visszaru',label:'Visszáru',description:'Visszaküldési esetek, jóváhagyások és visszatérítési folyamatok.',feature:'returns',permission:'orders.manage',group:'Rendeléskezelés'},
  ]},
  {id:'products',label:'Termékek',items:[
    {id:'products',href:'/admin/termekek',label:'Termékek',description:'Termékek, variánsok, árak, csatornaszabályok és készlet alapadatai.',feature:'catalog',permission:'catalog.manage',group:'Katalóguskezelés'},
    {id:'recommendations',href:'/admin/termekajanlasok',label:'Termékajánlások',description:'Kapcsolódó és ajánlott termékek konfigurációja.',feature:'productRecommendations',permission:'catalog.manage',group:'Katalóguskezelés'},
    {id:'import-export',href:'/admin/termekek/import-export',label:'Import / export',description:'Katalógusadatok ellenőrzött importja és exportja.',feature:'importExport',permission:'catalog.manage',group:'Adatműveletek'},
    {id:'bulk',href:'/admin/termekek/tomeges',label:'Tömeges műveletek',description:'Több termék vagy variáns együttes módosítása.',feature:'bulkOperations',permission:'catalog.manage',group:'Adatműveletek'},
  ]},
  {id:'customers',label:'Ügyfelek',items:[
    {id:'customers',href:'/admin/ugyfelek',label:'Ügyfelek',description:'Vásárlói és céges ügyféladatok az aktuális webshopon belül.',feature:'customers',permission:'sales.manage',group:'Ügyfélmunka'},
    {id:'crm',href:'/admin/ertekesites',label:'CRM és értékesítés',description:'Értékesítési kapcsolatok, ügyfélmunka és Pro CRM-folyamatok.',feature:'crm',permission:'sales.manage',group:'Ügyfélmunka'},
    {id:'customer-value',href:'/admin/ugyfelertek',label:'Ügyfélérték',description:'Ügyfélérték, aktivitás és megtartási mutatók döntéstámogatáshoz.',feature:'crm',permission:'analytics.read',group:'Ügyfélmunka',reportFamily:'customer',evidenceKinds:['calculation']},
    {id:'follow-up',href:'/admin/utanakovetes',label:'Utánkövetés',description:'Ügyfél- és értékesítési utánkövetési feladatok.',feature:'crm',permission:'sales.manage',group:'Ügyfélmunka'},
  ]},
  {id:'inventory-logistics',label:'Készlet & Logisztika',items:[
    {id:'inventory-analysis',href:'/admin/keszlet-elemzes',label:'Készletelemzés',description:'Készletkockázatok és készletmozgások elemzése.',feature:'advancedAnalytics',permission:'analytics.read',group:'Készletintelligencia',reportFamily:'inventory',evidenceKinds:['calculation']},
    {id:'procurement',href:'/admin/beszerzes',label:'Készlet és beszerzés',description:'Beszerzési és utánpótlási munkafolyamatok.',feature:'procurement',permission:'procurement.manage',group:'Készletintelligencia'},
  ]},
  {id:'marketing',label:'Marketing',items:[
    {id:'marketing-basics',href:'/admin/marketing',label:'Marketing alapok',description:'Alap marketingeszközök és hozzájárulási állapotok.',feature:'marketingBasics',permission:'marketing.manage',group:'Marketing'},
    {id:'campaigns',href:'/admin/kampanyok',label:'Kampányközpont',description:'Kampányok, célközönség, jóváhagyás és kiküldési életciklus.',feature:'advancedCampaigns',permission:'marketing.manage',group:'Marketing'},
    {id:'coupons',href:'/admin/kuponok',label:'Kuponok és akciók',description:'Kuponok, kedvezmények és promóciós szabályok.',feature:'coupons',permission:'sales.manage',group:'Marketing'},
    {id:'reviews',href:'/admin/velemenyek',label:'Vásárlói vélemények',description:'Vélemények és moderációs műveletek.',feature:'reviews',permission:'marketing.manage',group:'Marketing'},
    {id:'automation',href:'/admin/automatizalas',label:'Automatizálási központ',description:'Automatizált üzleti és kommunikációs munkafolyamatok.',feature:'automation',permission:'store.manage',group:'Automatizálás'},
  ]},
  {id:'digital-office',label:'Digitális Iroda',items:[
    {id:'office',href:'/admin/kommunikacio',label:'Digitális iroda',description:'Tenant-szintű kommunikációs munkafolyamatok és üzenetek.',feature:'officeCommunication',permission:'support.manage',group:'Kommunikáció'},
    {id:'blocklist',href:'/admin/kommunikacio/tiltolista',label:'Kommunikációs tiltólista',description:'Kommunikációból kizárt címzettek és tiltási állapotok.',feature:'officeCommunication',permission:'support.manage',group:'Kommunikáció'},
    {id:'support',href:'/admin/ugyfelszolgalat',label:'Ügyfélszolgálat',description:'Ügyfélszolgálati esetek és támogatási munkafolyamatok.',feature:'support',permission:'support.manage',group:'Kiszolgálás'},
  ]},
  {id:'content-appearance',label:'Tartalom & Megjelenés',items:[
    {id:'content',href:'/admin/tartalom',label:'Tartalom és SEO',description:'Oldalak, tartalmak és keresőoptimalizálási alapadatok.',feature:'contentMarketing',permission:'marketing.manage',group:'Tartalom'},
  ]},
  {id:'settings',label:'Beállítások',items:[
    {id:'launch',href:'/admin/indulas',label:'Indítási központ',description:'A webshop indulásához és üzemeltetési készültségéhez tartozó ellenőrzések.',permission:'store.manage',group:'Indítás és konfiguráció'},
    {id:'commerce-settings',href:'/admin/beallitasok/fizetes-szallitas',label:'Fizetés, szállítás és számlázás',description:'Kereskedelmi szolgáltatók és üzleti integrációk beállításai.',feature:'commerceIntegrations',permission:'store.manage',group:'Szolgáltatók'},
    {id:'integrations',href:'/admin/integraciok',label:'Integrációk és rendszerállapot',description:'Haladó integrációk állapota és technikai kapcsolatai.',feature:'advancedIntegrations',permission:'integrations.manage',group:'Szolgáltatók'},
    {id:'team',href:'/admin/csapat',label:'Csapat és jogosultságok',description:'Felhasználói szerepkörök és jogosultságok kezelése.',permission:'store.manage',group:'Bizonyíték és hozzáférés'},
    {id:'audit',href:'/admin/audit',label:'Audit és műveleti napló',description:'Tenant-szintű műveleti bizonyítékok és audit események.',permission:'store.manage',group:'Bizonyíték és hozzáférés'},
    {id:'plan',href:'/admin/csomag',label:'Csomagkezelés',description:'Alap / Pro csomag és elérhető képességek áttekintése.',permission:'store.manage',group:'Konfiguráció'},
    {id:'settings',href:'/admin/beallitasok',label:'Beállítások',description:'Webshop- és tenant-szintű működési beállítások.',permission:'store.manage',group:'Konfiguráció'},
    {id:'pilot',href:'/admin/pilot-acceptance',label:'Pilot acceptance',description:'A pilot elfogadási bizonyítékai és ellenőrzési állapotai.',permission:'store.manage',audience:'pilot',group:'Bizonyíték és hozzáférés'},
  ]},
] as const;

export const PLATFORM_NAVIGATION:readonly ResolvedAdminNavItem[]=[
  {id:'platform-stores',href:'/admin/platform/webaruhazak',label:'Ügyfél-webshopok',description:'Tenantok és webshop-példányok platformszintű kezelése.'},
  {id:'platform-home',href:'/admin/platform',label:'Platform irányítóközpont',description:'A Shoperation platform összesített állapota.'},
  {id:'platform-actions',href:'/admin/intezkedesek',label:'Intézkedési központ',description:'Platformszintű intézkedési javaslatok és döntések.'},
  {id:'platform-safeguards',href:'/admin/biztositekok',label:'Biztosítékok',description:'Kockázatcsökkentő platformkontrollok.'},
  {id:'platform-releases',href:'/admin/kiadasok',label:'Kiadási központ',description:'Kiadási jelöltek és release-folyamatok.'},
  {id:'platform-rollout',href:'/admin/rollout',label:'Rollout központ',description:'Fokozatos kiadási és rollout folyamatok.'},
  {id:'platform-postcheck',href:'/admin/utoellenorzes',label:'Utóellenőrzés',description:'Release utáni ellenőrzések és bizonyítékok.'},
  {id:'platform-recovery',href:'/admin/helyreallitas',label:'Helyreállítás',description:'Helyreállítási és visszaállítási műveletek.'},
  {id:'platform-observability',href:'/admin/megfigyeles',label:'Megfigyelés',description:'Platform megfigyelhetőség és működési jelek.'},
  {id:'platform-operations',href:'/admin/muveletek',label:'Platform műveletek',description:'Platformszintű operációs műveletek.'},
  {id:'platform-log',href:'/admin/naplo',label:'Platform napló',description:'Platformszintű esemény- és műveleti napló.'},
] as const;

export const FREQUENT_TASKS:readonly AdminNavItem[]=[
  {id:'quick-orders',href:'/admin/rendelesek',label:'Rendelések feldolgozása',description:'Ugrás a rendelési munkasorhoz.',feature:'orders',permission:'orders.manage'},
  {id:'quick-products',href:'/admin/termekek',label:'Termék módosítása',description:'Ugrás a katalóguskezeléshez.',feature:'catalog',permission:'catalog.manage'},
  {id:'quick-customers',href:'/admin/ugyfelek',label:'Ügyfél megnyitása',description:'Ugrás az ügyféladatbázishoz.',feature:'customers',permission:'sales.manage'},
  {id:'quick-campaigns',href:'/admin/kampanyok',label:'Kampány kezelése',description:'Ugrás a Pro kampányközponthoz.',feature:'advancedCampaigns',permission:'marketing.manage'},
] as const;

const audienceAllowed=(item:AdminNavItem,status?:AdminInstanceStatus)=>item.audience!=='pilot'||status==='pilot';
const allowed=(item:AdminNavItem,plan:PlanCode,can:(permission?:StorePermission)=>boolean,status?:AdminInstanceStatus)=>
  (!item.feature||hasPlanFeature(plan,item.feature))&&can(item.permission)&&audienceAllowed(item,status);

const resolveItem=(item:AdminNavItem):ResolvedAdminNavItem=>({
  id:item.id,href:item.href,label:item.label,description:item.description,group:item.group,reportFamily:item.reportFamily,evidenceKinds:item.evidenceKinds,
});

export function resolveMerchantNavigation(plan:PlanCode,can:(permission?:StorePermission)=>boolean,status?:AdminInstanceStatus):ResolvedAdminNavSection[]{
  return MERCHANT_NAVIGATION.map(section=>({
    id:section.id,label:section.label,items:section.items.filter(item=>allowed(item,plan,can,status)).map(resolveItem),
  })).filter(section=>section.items.length>0);
}

export function resolveFrequentTasks(plan:PlanCode,can:(permission?:StorePermission)=>boolean):ResolvedAdminNavItem[]{
  return FREQUENT_TASKS.filter(item=>allowed(item,plan,can)).map(resolveItem).slice(0,4);
}

export const ADMIN_REPORTING_DESTINATIONS=MERCHANT_NAVIGATION.flatMap(section=>section.items)
  .filter(item=>Boolean(item.reportFamily))
  .map(item=>({id:item.id,href:item.href,label:item.label,feature:item.feature,permission:item.permission,reportFamily:item.reportFamily as AdminReportFamily,evidenceKinds:item.evidenceKinds??[]}));
