import { getCurrentAddons, getCurrentPlan } from '@/lib/plans/access';
import { ADDONS } from '@/lib/plans/addons';
import { PLANNED_PRO_FEATURES, PLANS, type FeatureCode } from '@/lib/plans/catalog';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getFeatureEntitlementDecisions } from '@/lib/entitlements/access';

const FEATURE_LABELS: Record<FeatureCode,string>={catalog:'Termék-, kategória- és katalóguskezelés',inventory:'Készletkezelés és napi készletműveletek',orders:'Teljes rendeléskezelés',returns:'Visszáru és elállás kezelése',customers:'Ügyféladatbázis és vásárlói adatok',coupons:'Kuponok, kedvezmények és akciók',basicAnalytics:'Értékesítési statisztikák és dashboard',marketingBasics:'Alap marketingeszközök',contentMarketing:'Tartalomkezelés, blog és SEO',importExport:'Termék import és export',bulkOperations:'Tömeges termék- és készletműveletek',wishlists:'Kívánságlista',stockNotifications:'Készlet-visszaérkezési értesítések',productRecommendations:'Cross-sell, upsell és termékajánlások',reviews:'Vásárlói vélemények és moderáció',searchFiltering:'Termékkeresés és szűrés',commerceIntegrations:'Fizetés, szállítás és számlázási integrációk',support:'Ügyfélszolgálati eszközök',advancedAnalytics:'Részletes üzleti elemzések',crm:'Fejlett CRM, ügyfélérték és utánkövetés',advancedCampaigns:'Kampányközpont, attribúció és megtérülés',officeCommunication:'Ügyfél-e-mail levelezés',officeCommunicationAdvanced:'Haladó ügyféllevelezési csapatfunkciók',teamChat:'Team Chat belső munkatársi kommunikáció',teamChatSecureAttachments:'Team Chat biztonságos csatolmányok',automation:'Automatizálások és üzemi vezérlés',procurement:'Készlet- és beszerzéstervezés',cashflow:'Cash-flow és pénzügyi előrejelzés',executiveAnalytics:'Vezetői analitika és döntéstámogatás',advancedIntegrations:'Haladó rendszerintegrációk',apiAccess:'Külső API-hozzáférés',interactiveSceneCommerce:'Interaktív commerce jelenetek (Shop the Look / Room)',recipeCommerce:'Recipe Commerce (receptből kosárba + allergén/étrendi adatok)'};
type SearchParams={reason?:string;feature?:string;addon?:string};
type Props={searchParams?:Promise<SearchParams>};

const SOURCE_LABELS:Record<string,string>={plan:'Csomag',trial:'Trial',addon:'Add-on',manual:'Egyedi kivétel',platform:'Platform engedély'};

export default async function PackagePage({searchParams}:Props){
  const [current,enabledAddons,instance]=await Promise.all([getCurrentPlan(),getCurrentAddons(),getCurrentWebshopInstance()]);
  const params:SearchParams=searchParams?await searchParams:{};
  const alap=new Set<FeatureCode>(PLANS.alap.features),pro=new Set<FeatureCode>(PLANS.pro.features);
  const releasedRows=[...new Set<FeatureCode>([...PLANS.alap.features,...PLANS.pro.features])];
  const reservedRows=[...PLANNED_PRO_FEATURES] as FeatureCode[];
  const decisions=instance?await getFeatureEntitlementDecisions(instance.id,[...releasedRows,...reservedRows]):new Map();
  const requested=params.feature as FeatureCode|undefined;
  const requestedLabel=requested&&FEATURE_LABELS[requested]?FEATURE_LABELS[requested]:'A megnyitott funkció';
  const accessLabel=(feature:FeatureCode)=>{
    if(reservedRows.includes(feature))return'Még nem elérhető';
    const decision=decisions.get(feature);
    if(instance){
      if(decision?.enabled)return SOURCE_LABELS[decision.source]??'Engedélyezve';
      return'Zárolt';
    }
    return (current==='alap'?alap:pro).has(feature)?'Csomag':'Zárolt';
  };

  return <section className="adminMain">
    <span className="eyebrow">Shoperation csomagok</span><h1 className="sectionTitle">Csomagkezelés</h1><p className="lead">Az Alap és Pro csomag, a külön Add-onok, az ideiglenes Trial-hozzáférések és a platform által engedélyezett kivételek ugyanazon entitlement-szabályrendszer szerint működnek.</p>
    <div className="cards adminMetricCards"><article className="card"><span className="badge">Aktív csomag</span><div className="price">Shoperation {PLANS[current].name}</div><p className="muted">A tartós csomagszint nem változik meg attól, hogy egy funkció Trialból vagy külön entitlementből átmenetileg elérhető.</p></article><article className="card"><span className="badge">Aktív Add-on</span><div className="price">{enabledAddons.length}</div><p className="muted">A csomagtól külön megvásárolható, kompatibilis kiegészítők.</p></article></div>

    {params.reason==='pro-required'&&<div className="adminAuditNotice"><strong>Ehhez Pro csomag szükséges.</strong><p>{requestedLabel} nincs benne az Alap csomag tartós jogosultságaiban.</p></div>}
    {params.reason==='addon-required'&&<div className="adminAuditNotice"><strong>Külön Add-on szükséges.</strong><p>Ez a képesség nem automatikus Pro jogosultság: külön kiegészítő entitlement kell hozzá.</p></div>}
    {params.reason==='not-released'&&<div className="adminAuditNotice"><strong>Ez a képesség még nincs kiadva.</strong><p>{requestedLabel} reserved állapotú, ezért sem csomag, sem Trial, sem platform-kivétel nem kapcsolhatja be.</p></div>}
    {params.reason==='feature-disabled'&&<div className="adminAuditNotice"><strong>A funkció jelenleg zárolt.</strong><p>{requestedLabel} effektív entitlementje nem aktív. A meglévő adat és konfiguráció ettől nem törlődik.</p></div>}

    <section className="card"><div className="adminToolbar"><div><span className="eyebrow">Funkciómátrix</span><h2>Alap / Pro / effektív hozzáférés</h2></div></div><div className="packageLegend"><span className="badge">✓ csomag része</span><span className="badge">— nem része</span><span className="badge">Zárolt = adatmegőrzés, új művelet nélkül</span></div><div className="adminTableScroll"><table className="adminTable packageMatrix"><thead><tr><th>Funkció</th><th>Shoperation Alap</th><th>Shoperation Pro</th><th>Jelenlegi hozzáférés</th></tr></thead><tbody>{releasedRows.map(feature=><tr key={feature}><td><strong>{FEATURE_LABELS[feature]}</strong></td><td className={alap.has(feature)?'yes':'no'}>{alap.has(feature)?'✓':'—'}</td><td className={pro.has(feature)?'yes':'no'}>{pro.has(feature)?'✓':'—'}</td><td><span className="badge">{accessLabel(feature)}</span></td></tr>)}</tbody></table></div></section>

    <section className="card"><span className="eyebrow">Reserved capability</span><h2>Technikailag létező, de még nem release-elt funkciók</h2><p className="muted">Ezek nem részei automatikusan a Pro csomagnak. Kiadásukhoz külön termék- és biztonsági döntés szükséges.</p><div className="cards">{reservedRows.map(feature=><article className="card" key={feature}><span className="badge">Fail-closed · reserved</span><h3>{FEATURE_LABELS[feature]}</h3><p className="muted">Jelenleg sem Alap, sem Pro, sem Trial nem engedélyezi.</p></article>)}</div></section>

    <section className="card"><span className="eyebrow">Külön aktiválható kiegészítők</span><h2>Add-onok Alap és Pro mellé</h2><p className="muted">Az Add-on külön entitlement: nem válik automatikusan Pro funkcióvá, és kikapcsoláskor a konfigurációját nem töröljük.</p><div className="cards">{Object.values(ADDONS).map(addon=>{const compatible=addon.compatiblePlans.includes(current);const active=enabledAddons.includes(addon.code);return <article className="card" key={addon.code}><span className="badge">{active?'Aktív':compatible?'Külön Add-on':`${PLANS[addon.compatiblePlans[0]].name} szükséges`}</span><h3>{addon.name}</h3><p>{addon.description}</p><p className="muted">Kompatibilis: {addon.compatiblePlans.map(plan=>PLANS[plan].name).join(' + ')}</p>{!compatible&&<p className="muted">Csomagváltáskor a korábbi Add-on konfiguráció megmarad, de új Add-on művelet nem futtatható.</p>}</article>})}</div></section>
  </section>;
}
