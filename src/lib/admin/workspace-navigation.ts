import type { StorePermission } from '@/lib/auth/store-rbac';
import type { FeatureCode } from '@/lib/plans/catalog';

export type MerchantWorkspaceId =
  | 'overview'
  | 'sales'
  | 'products'
  | 'customers'
  | 'inventory-logistics'
  | 'marketing'
  | 'digital-office'
  | 'content-appearance'
  | 'settings';

export type MerchantNavItem = {
  href: string;
  label: string;
  feature?: FeatureCode;
  permission?: StorePermission;
  audience?: 'all' | 'pilot';
};

export type MerchantWorkspace = {
  id: MerchantWorkspaceId;
  label: string;
  summary: string;
  items: readonly MerchantNavItem[];
};

export type VisibleAdminNavItem = { href: string; label: string };
export type VisibleAdminNavSection = {
  id: string;
  label: string;
  summary: string;
  items: VisibleAdminNavItem[];
};

export const MERCHANT_WORKSPACES: readonly MerchantWorkspace[] = [
  {
    id: 'overview',
    label: 'Vezetői áttekintés',
    summary: 'Forgalom, eredmény, növekedés és pénzügyi döntéstámogatás.',
    items: [
      { href: '/admin', label: 'Áttekintés', permission: 'store.read' },
      { href: '/admin/elemzes', label: 'Értékesítési és fedezeti elemzés', feature: 'advancedAnalytics', permission: 'analytics.read' },
      { href: '/admin/novekedes', label: 'Növekedési döntési központ', feature: 'advancedAnalytics', permission: 'analytics.read' },
      { href: '/admin/vezetoi', label: 'Vezetői analitika', feature: 'executiveAnalytics', permission: 'analytics.read' },
      { href: '/admin/cashflow', label: 'Cash-flow előrejelzés', feature: 'cashflow', permission: 'analytics.read' },
    ],
  },
  {
    id: 'sales',
    label: 'Értékesítés',
    summary: 'Rendelések, visszáru és teljesítési folyamatok.',
    items: [
      { href: '/admin/rendelesek', label: 'Rendelések', feature: 'orders', permission: 'orders.manage' },
      { href: '/admin/visszaru', label: 'Visszáru', feature: 'returns', permission: 'orders.manage' },
    ],
  },
  {
    id: 'products',
    label: 'Termékek',
    summary: 'Katalógus, árak, ajánlások és tömeges műveletek.',
    items: [
      { href: '/admin/termekek', label: 'Termékek', feature: 'catalog', permission: 'catalog.manage' },
      { href: '/admin/termekajanlasok', label: 'Termékajánlások', feature: 'productRecommendations', permission: 'catalog.manage' },
      { href: '/admin/termekek/import-export', label: 'Import / export', feature: 'importExport', permission: 'catalog.manage' },
      { href: '/admin/termekek/tomeges', label: 'Tömeges műveletek', feature: 'bulkOperations', permission: 'catalog.manage' },
    ],
  },
  {
    id: 'customers',
    label: 'Ügyfelek',
    summary: 'Ügyféladatok, CRM, ügyfélérték és utánkövetés.',
    items: [
      { href: '/admin/ugyfelek', label: 'Ügyfelek', feature: 'customers', permission: 'sales.manage' },
      { href: '/admin/ertekesites', label: 'CRM és értékesítés', feature: 'crm', permission: 'sales.manage' },
      { href: '/admin/ugyfelertek', label: 'Ügyfélérték', feature: 'crm', permission: 'analytics.read' },
      { href: '/admin/utanakovetes', label: 'Utánkövetés', feature: 'crm', permission: 'sales.manage' },
    ],
  },
  {
    id: 'inventory-logistics',
    label: 'Készlet & Logisztika',
    summary: 'Készletszint, készlettőke, beszerzés és logisztikai működés.',
    items: [
      { href: '/admin/keszlet-elemzes', label: 'Készletelemzés', feature: 'advancedAnalytics', permission: 'analytics.read' },
      { href: '/admin/beszerzes', label: 'Készlet és beszerzés', feature: 'procurement', permission: 'procurement.manage' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    summary: 'Kampányok, kuponok, vélemények és automatizálás.',
    items: [
      { href: '/admin/marketing', label: 'Marketing alapok', feature: 'marketingBasics', permission: 'marketing.manage' },
      { href: '/admin/kampanyok', label: 'Kampányközpont', feature: 'advancedCampaigns', permission: 'marketing.manage' },
      { href: '/admin/kuponok', label: 'Kuponok és akciók', feature: 'coupons', permission: 'sales.manage' },
      { href: '/admin/velemenyek', label: 'Vásárlói vélemények', feature: 'reviews', permission: 'marketing.manage' },
      { href: '/admin/automatizalas', label: 'Automatizálási központ', feature: 'automation', permission: 'store.manage' },
    ],
  },
  {
    id: 'digital-office',
    label: 'Digitális Iroda',
    summary: 'Kommunikáció, ügyfélszolgálat és tiltólista.',
    items: [
      { href: '/admin/kommunikacio', label: 'Digitális iroda', feature: 'officeCommunication', permission: 'support.manage' },
      { href: '/admin/kommunikacio/tiltolista', label: 'Kommunikációs tiltólista', feature: 'officeCommunication', permission: 'support.manage' },
      { href: '/admin/ugyfelszolgalat', label: 'Ügyfélszolgálat', feature: 'support', permission: 'support.manage' },
    ],
  },
  {
    id: 'content-appearance',
    label: 'Tartalom & Megjelenés',
    summary: 'Tartalom, SEO és a későbbi builder-kompatibilis megjelenési felületek.',
    items: [
      { href: '/admin/tartalom', label: 'Tartalom és SEO', feature: 'contentMarketing', permission: 'marketing.manage' },
    ],
  },
  {
    id: 'settings',
    label: 'Beállítások',
    summary: 'Indítás, integrációk, csapat, audit, csomag és webshopbeállítások.',
    items: [
      { href: '/admin/indulas', label: 'Indítási központ', permission: 'store.manage' },
      { href: '/admin/beallitasok/fizetes-szallitas', label: 'Fizetés, szállítás és számlázás', feature: 'commerceIntegrations', permission: 'store.manage' },
      { href: '/admin/integraciok', label: 'Integrációk és rendszerállapot', feature: 'advancedIntegrations', permission: 'integrations.manage' },
      { href: '/admin/csapat', label: 'Csapat és jogosultságok', permission: 'store.manage' },
      { href: '/admin/audit', label: 'Audit és műveleti napló', permission: 'store.manage' },
      { href: '/admin/csomag', label: 'Csomagkezelés', permission: 'store.manage' },
      { href: '/admin/beallitasok', label: 'Webshop beállítások', permission: 'store.manage' },
      { href: '/admin/pilot-acceptance', label: 'Pilot acceptance', permission: 'store.manage', audience: 'pilot' },
    ],
  },
];

export const OPERATOR_NAV: readonly VisibleAdminNavItem[] = [
  { href: '/admin/platform/webaruhazak', label: 'Ügyfél-webshopok' },
  { href: '/admin/platform', label: 'Platform irányítóközpont' },
  { href: '/admin/intezkedesek', label: 'Intézkedési központ' },
  { href: '/admin/biztositekok', label: 'Biztosítékok' },
  { href: '/admin/kiadasok', label: 'Kiadási központ' },
  { href: '/admin/rollout', label: 'Rollout központ' },
  { href: '/admin/utoellenorzes', label: 'Utóellenőrzés' },
  { href: '/admin/helyreallitas', label: 'Helyreállítás' },
  { href: '/admin/megfigyeles', label: 'Megfigyelés' },
  { href: '/admin/muveletek', label: 'Platform műveletek' },
  { href: '/admin/naplo', label: 'Platform napló' },
];
