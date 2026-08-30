import { getCurrentAddons, getCurrentPlan } from '@/lib/plans/access';
import { ADDONS } from '@/lib/plans/addons';
import { PLANS, type FeatureCode } from '@/lib/plans/catalog';

const FEATURE_LABELS: Record<FeatureCode, string> = {
  catalog: 'Termék-, kategória- és katalóguskezelés', inventory: 'Készletkezelés és napi készletműveletek', orders: 'Teljes rendeléskezelés', returns: 'Visszáru és elállás kezelése', customers: 'Ügyféladatbázis és vásárlói adatok', coupons: 'Kuponok, kedvezmények és akciók', basicAnalytics: 'Használható értékesítési statisztikák és dashboard', marketingBasics: 'Alap marketing- és kampányeszközök', contentMarketing: 'Blog, tartalom- és landing page képességek', importExport: 'Termék import és export', bulkOperations: 'Tömeges termék- és készletműveletek', wishlists: 'Kívánságlista', stockNotifications: 'Készlet-visszaérkezési értesítések', productRecommendations: 'Cross-sell, upsell és kapcsolódó termékajánlások', reviews: 'Natív vásárlói vélemények és moderáció', searchFiltering: 'Termékkeresés és használható szűrés', commerceIntegrations: 'Fizetés, szállítás és alap kereskedelmi integrációk', support: 'Ügyfélszolgálati eszközök', advancedAnalytics: 'Részletes üzleti elemzések és döntéstámogatás', crm: 'Fejlett CRM, ügyfélérték és utánkövetés', advancedCampaigns: 'Haladó, szegmentált és mérhető kampánykezelés', officeCommunication: 'Digitális iroda: beépített e-mail és belső üzenetkezelés', automation: 'Automatizálások és üzemi vezérlés', procurement: 'Beszerzési döntéstámogatás és előrejelzés', cashflow: 'Cash-flow és pénzügyi előrejelzés', executiveAnalytics: 'Vezetői analitika', advancedIntegrations: 'Haladó és egyedi rendszerintegrációk', apiAccess: 'API-hozzáférés külső rendszerekhez',
};

type PackageSearchParams = { reason?: string; feature?: string; addon?: string };
type PackagePageProps = { searchParams?: Promise<PackageSearchParams> };

export default async function PackagePage({ searchParams }: PackagePageProps) {
  const paramsPromise: Promise<PackageSearchParams> = searchParams ?? Promise.resolve({});
  const [current, enabledAddons, params] = await Promise.all([getCurrentPlan(), getCurrentAddons(), paramsPromise]);
  const currentPlan = PLANS[current];
  const alapFeatures = new Set<FeatureCode>(PLANS.alap.features);
  const proOnly = PLANS.pro.features.filter((feature) => !alapFeatures.has(feature));
  const addons = Object.values(ADDONS).filter((addon) => addon.compatiblePlans.includes(current));
  const requestedFeature = params.feature as FeatureCode | undefined;
  const requestedLabel = requestedFeature && FEATURE_LABELS[requestedFeature];

  return <section className="adminContent">
    <div className="adminHeader"><div><p className="eyebrow">Webshop motor</p><h1>Csomagkezelés</h1><p className="muted">Az Alap teljes értékű webshop. A Pro a napi működés fölé épülő digitális iroda és üzleti intelligencia.</p></div><div className="card"><span className="muted">Aktív csomag</span><h2>{currentPlan.name}</h2><p>{currentPlan.description}</p></div></div>
    {params.reason === 'pro-required' && <div className="card"><span className="badge">Pro funkció</span><h2>Ez a funkció a Pro csomag része</h2><p>{requestedLabel ?? 'A megnyitott üzleti modul'} a teljes értékű Alap webshop fölé épülő Pro képesség.</p></div>}
    {params.reason === 'addon-required' && <div className="card"><span className="badge">Külön extra</span><h2>Ehhez külön aktiválható kiegészítő szükséges</h2><p className="muted">Az extra nem jelent új csomagszintet; Alap vagy Pro mellé külön kapcsolható be a kompatibilitás szerint.</p></div>}
    <div className="grid2"><article className="card"><p className="eyebrow">Alap</p><h2>Versenyképes, teljes értékű webshop</h2><p>Nem korlátozott belépőverzió: a normál értékesítéshez, marketinghez, fizetéshez, szállításhoz és napi üzemeltetéshez szükséges funkciókat tartalmazza.</p><ul>{PLANS.alap.features.map((feature) => <li key={feature}>{FEATURE_LABELS[feature]}</li>)}</ul></article><article className="card"><p className="eyebrow">Pro</p><h2>Digitális iroda és üzleti növekedési rendszer</h2><p>Az Alap minden funkciója, plusz azok a képességek, amelyek munkát automatizálnak, üzleti döntést támogatnak vagy külön irodai rendszert váltanak ki.</p><ul>{proOnly.map((feature) => <li key={feature}>{FEATURE_LABELS[feature]}</li>)}</ul></article></div>
    <section className="card"><p className="eyebrow">Pro kiemelt előny</p><h2>Digitális iroda a webshop adminon belül</h2><p>Beépített e-mail-kezelés, kommunikációs előzmények és belső munkatársi üzenetváltás egy közös munkatérben. A normál webshop-értesítések az Alap részei maradnak.</p></section>
    <section className="card"><p className="eyebrow">Moduláris extrák</p><h2>Külön aktiválható kiegészítők</h2><div className="cards">{addons.map((addon) => <article className="card" key={addon.code}><span className="badge">{enabledAddons.includes(addon.code) ? 'Aktív' : 'Elérhető extra'}</span><h3>{addon.name}</h3><p>{addon.description}</p></article>)}</div></section>
    {current === 'alap' ? <div className="card"><h2>Pro bővítés</h2><p>A meglévő webshop és adatai megmaradnak; a digitális iroda és a fejlett üzleti modulok nyílnak meg.</p></div> : <div className="card"><h2>Minden Pro funkció aktív</h2><p>A külön extrák ettől függetlenül kapcsolhatók be.</p></div>}
  </section>;
}
