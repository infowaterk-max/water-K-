import { getCurrentPlan } from '@/lib/plans/access';
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
  const current = await getCurrentPlan();
  const currentPlan = PLANS[current];
  const proOnly = PLANS.pro.features.filter((feature) => !PLANS.alap.features.includes(feature as never));

  return (
    <section className="adminContent">
      <div className="adminHeader">
        <div>
          <p className="eyebrow">Webshop motor</p>
          <h1>Csomagkezelés</h1>
          <p className="muted">A webshop jelenlegi tudásszintje és az elérhető bővítési lehetőségek.</p>
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

      {current === 'alap' ? (
        <div className="card">
          <h2>Pro bővítés</h2>
          <p>A Pro aktiválásakor a meglévő webshop, termékek, rendelések és ügyféladatok változatlanul megmaradnak; csak az új üzleti modulok nyílnak meg.</p>
          <p className="muted">Az előfizetés és számlázás bekötése külön kereskedelmi modulban történik, ezért innen jelenleg nem indul automatikus terhelés.</p>
        </div>
      ) : (
        <div className="card">
          <h2>Minden Pro funkció aktív</h2>
          <p>A webshop a teljes üzleti eszköztárat használhatja.</p>
        </div>
      )}
    </section>
  );
}
