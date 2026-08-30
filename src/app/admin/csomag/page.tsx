import { getCurrentAddons, getCurrentPlan } from '@/lib/plans/access';
import { ADDONS } from '@/lib/plans/addons';
import { PLANS, type FeatureCode } from '@/lib/plans/catalog';

const FEATURE_LABELS: Record<FeatureCode, string> = {
  catalog: 'Termék- és katalóguskezelés',
  inventory: 'Készletkezelés',
  orders: 'Rendeléskezelés',
  customers: 'Ügyféladatbázis',
  coupons: 'Kuponok és kedvezmények',
  basicAnalytics: 'Alap statisztikák',
  integrations: 'Alap integrációk',
  support: 'Ügyfélszolgálati eszközök',
  advancedAnalytics: 'Részletes üzleti elemzések',
  crm: 'Fejlett CRM és ügyfélérték-kezelés',
  campaigns: 'Kampánykezelés',
  communication: 'Kommunikációs központ',
  automation: 'Automatizálások és üzemi vezérlés',
  procurement: 'Beszerzés',
  cashflow: 'Cash-flow és pénzügyi elemzés',
  executiveAnalytics: 'Vezetői analitika',
  apiAccess: 'API és külső rendszerek',
};

export default async function PackagePage() {
  const [current, enabledAddons] = await Promise.all([getCurrentPlan(), getCurrentAddons()]);
  const currentPlan = PLANS[current];
  const proOnly = PLANS.pro.features.filter((feature) => !PLANS.alap.features.includes(feature as never));
  const addons = Object.values(ADDONS).filter((addon) => addon.compatiblePlans.includes(current));

  return (
    <section className="adminContent">
      <div className="adminHeader">
        <div>
          <p className="eyebrow">Webshop motor</p>
          <h1>Csomagkezelés</h1>
          <p className="muted">A webshop jelenlegi tudásszintje, bővítési lehetőségei és külön aktiválható extrái.</p>
        </div>
        <div className="card">
          <span className="muted">Aktív csomag</span>
          <h2>{currentPlan.name}</h2>
          <p>{currentPlan.description}</p>
        </div>
      </div>

      <div className="grid2">
        <article className="card">
          <p className="eyebrow">Alap</p>
          <h2>Teljes webshop alapfunkciók</h2>
          <p>Nem próbaverzió: minden szükséges napi kereskedelmi funkciót tartalmaz.</p>
          <ul>{PLANS.alap.features.map((feature) => <li key={feature}>{FEATURE_LABELS[feature]}</li>)}</ul>
        </article>

        <article className="card">
          <p className="eyebrow">Pro</p>
          <h2>Üzleti növekedési rendszer</h2>
          <p>Az Alap minden funkciója, kiegészítve fejlett üzleti és automatizálási eszközökkel.</p>
          <ul>{proOnly.map((feature) => <li key={feature}>{FEATURE_LABELS[feature]}</li>)}</ul>
        </article>
      </div>

      <section className="card">
        <p className="eyebrow">Moduláris extrák</p>
        <h2>Külön aktiválható kiegészítők</h2>
        <p className="muted">Ezek nem új csomagszintek. Az adott webshophoz külön rendelhetők és külön jogosultsággal kapcsolhatók be.</p>
        <div className="cards">
          {addons.map((addon) => {
            const active = enabledAddons.includes(addon.code);
            return (
              <article className="card" key={addon.code}>
                <span className="badge">{active ? 'Aktív' : 'Elérhető extra'}</span>
                <h3>{addon.name}</h3>
                <p>{addon.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {current === 'alap' ? (
        <div className="card">
          <h2>Pro bővítés</h2>
          <p>A Pro aktiválásakor a meglévő webshop, termékek, rendelések és ügyféladatok változatlanul megmaradnak; csak az új üzleti modulok nyílnak meg.</p>
          <p className="muted">Az előfizetés és számlázás bekötése külön kereskedelmi modulban történik, ezért innen jelenleg nem indul automatikus terhelés.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Minden Pro funkció aktív</h2>
          <p>A webshop a teljes Pro üzleti eszköztárat használhatja; a külön extrák ettől függetlenül kapcsolhatók be.</p>
        </div>
      )}
    </section>
  );
}
