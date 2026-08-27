import { products, formatHuf } from '@/lib/catalog';

export default function AdminPage() {
  const catalogValue = products.reduce((sum, product) => sum + product.grossPrice * product.stock, 0);
  const lowStock = products.filter((product) => product.stock <= 10).length;
  const supabaseReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  const khReady = Boolean(process.env.KH_MERCHANT_ID && (process.env.KH_API_SECRET || process.env.KH_SECRET));

  return (
    <section className="adminMain">
      <span className="eyebrow">Water-K saját admin</span>
      <h1 className="sectionTitle">Irányítópult</h1>
      <p className="lead">A központi admin szerveroldali jogosultsági kapu mögött fut. Itt fog összeérni a rendelés, készlet, partnerkezelés és az összes külső integráció.</p>

      <div className="cards adminMetricCards">
        <div className="card"><span className="badge">Katalógus</span><h3>Aktív termékek</h3><div className="price">{products.length}</div><p className="muted">Induló Water-K kínálat.</p></div>
        <div className="card"><span className="badge">Készletérték</span><h3>Bruttó listaérték</h3><div className="price">{formatHuf(catalogValue)}</div><p className="muted">A staging katalógus jelenlegi készletével számolva.</p></div>
        <div className="card"><span className="badge">Figyelmeztetés</span><h3>Alacsony készlet</h3><div className="price">{lowStock}</div><p className="muted">10 darab vagy kevesebb készlettel rendelkező termék.</p></div>
      </div>

      <div className="splitFeature adminReadiness">
        <section className="featurePanel">
          <span className="eyebrow">Rendszerállapot</span>
          <h2>Integrációs readiness</h2>
          <div className="integrationList">
            <div><span>Supabase adatbázis és Auth</span><strong>{supabaseReady ? 'Konfigurálva' : 'Bekötésre vár'}</strong></div>
            <div><span>K&H bankkártyás fizetés</span><strong>{khReady ? 'Kulcsok érzékelve' : 'Sandbox adatokra vár'}</strong></div>
            <div><span>Foxpost / GLS / MPL</span><strong>Adapterréteg kész</strong></div>
            <div><span>Vercel production</span><strong>Aktív</strong></div>
          </div>
        </section>
        <section className="featurePanel darkPanel">
          <span className="eyebrow">Következő admin szint</span>
          <h2>Élő rendelési központ.</h2>
          <ul className="featureList"><li>Rendelés státuszváltás és eseménynapló</li><li>Készletmozgás automatikus könyvelése</li><li>Viszonteladói jóváhagyási workflow</li><li>Futárcímke és tracking egy helyen</li><li>Banki tranzakció egyeztetés</li></ul>
        </section>
      </div>
    </section>
  );
}
