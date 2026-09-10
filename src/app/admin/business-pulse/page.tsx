import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {createAdminClient} from '@/lib/supabase/admin';
import {formatHuf} from '@/lib/catalog';

export const dynamic='force-dynamic';

type Trial={
  id:string;
  status:'active'|'completed'|'cancelled';
  starts_at:string;
  ends_at:string;
  completed_at:string|null;
};

type ProductPerformance={product_name?:unknown;units?:unknown;recognized_revenue_gross_huf?:unknown};
type CapabilitySignal={featureCode?:unknown;evidenceCount?:unknown;reasonCode?:unknown};

type Facts={
  revenue?:{recognizedGrossHuf?:unknown};
  orders?:{recognizedOrders?:unknown};
  customers?:{distinctCustomers?:unknown};
  productPerformance?:unknown;
  categoryDataAvailable?:unknown;
  inventory?:{stockoutEvents?:unknown};
  campaigns?:{campaignCount?:unknown;configuredBudgetHuf?:unknown;attributedRevenueGrossHuf?:unknown;actualSpendAvailable?:unknown;roasAvailable?:unknown};
  checkoutRecovery?:{created?:unknown;converted?:unknown;open?:unknown};
  proCapabilityUsage?:unknown;
};

type Calculations={
  averageOrderValueGrossHuf?:unknown;
  checkoutRecoveryConversionRate?:unknown;
  configuredBudgetRevenueRatio?:unknown;
  configuredBudgetRevenueRatioIsRoas?:unknown;
  relevantUnusedProCapabilities?:unknown;
  dataQuality?:unknown;
};

type Recommendation={
  plan?:{recommendedPlan?:unknown;confidence?:unknown;reasonCodes?:unknown;revenueThresholdUsed?:unknown};
  opportunities?:unknown;
  limitations?:unknown;
};

type Report={
  id:string;
  period_start:string;
  period_end:string;
  facts:Facts;
  calculations:Calculations;
  recommendations:Recommendation;
  recommended_plan:'alap'|'pro';
  confidence:'low'|'medium'|'high';
  generated_at:string;
};

const capabilityLabel:Record<string,string>={
  advancedCampaigns:'Fejlett kampányok',
  crm:'CRM',
  automation:'Automatizálás',
  procurement:'Beszerzés',
};

function integer(value:unknown){const n=Number(value);return Number.isFinite(n)?Math.round(n):0}
function decimal(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}
function array<T>(value:unknown){return Array.isArray(value)?value as T[]:[]}
function date(value:string){return new Date(value).toLocaleDateString('hu-HU')}
function confidenceLabel(value:string){return value==='high'?'Magas':value==='medium'?'Közepes':'Alacsony'}

export default async function BusinessPulsePage(){
  const scope=await requireCurrentStoreContext('analytics.read');
  const db=createAdminClient();

  const[{data:trial,error:trialError},{data:report,error:reportError}]=await Promise.all([
    db.from('business_pulse_trials').select('id,status,starts_at,ends_at,completed_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    db.from('business_pulse_reports').select('id,period_start,period_end,facts,calculations,recommendations,recommended_plan,confidence,generated_at').eq('instance_id',scope.instanceId).order('generated_at',{ascending:false}).limit(1).maybeSingle(),
  ]);

  const t=(trial??null) as Trial|null;
  const r=(report??null) as Report|null;
  const loadError=Boolean(trialError||reportError);
  const facts=r?.facts??{};
  const calculations=r?.calculations??{};
  const campaigns=facts.campaigns??{};
  const recovery=facts.checkoutRecovery??{};
  const products=array<ProductPerformance>(facts.productPerformance);
  const used=array<CapabilitySignal>(facts.proCapabilityUsage);
  const opportunities=array<CapabilitySignal>(calculations.relevantUnusedProCapabilities);
  const recoveryRate=decimal(calculations.checkoutRecoveryConversionRate);

  return <section className="adminMain">
    <span className="eyebrow">Business Pulse · Trial Intelligence</span>
    <h1 className="sectionTitle">30 napos üzleti értékelés</h1>
    <p className="lead">A próbaidőszak megfigyelhető üzleti eredményeit külön kezeli a számított mutatóktól és a csomagajánlástól. A cél nem a Pro automatikus értékesítése, hanem annak eldöntése, melyik csomag indokolt a tényleges használat alapján.</p>

    {loadError&&<div className="errorNotice" role="alert"><strong>A Business Pulse adatai most nem igazolhatók teljesen.</strong><p>Hiányzó adatot nem kezelünk nulla értékként, és ilyen állapotból nem képzünk új ajánlást a felületen.</p></div>}

    {!loadError&&!t&&<section className="card">
      <span className="badge">Nincs trial</span>
      <h2>Ehhez a webshophoz még nincs Business Pulse próbaidőszak.</h2>
      <p className="muted">A 30 napos teljes Pro trial platformoldali, explicit művelettel indul. A webshop csomagja és státusza ettől nem változik meg.</p>
    </section>}

    {t&&<section className="auditGuide">
      <div><span className="eyebrow">Próbaidőszak</span><h2>{date(t.starts_at)} – {date(t.ends_at)}</h2></div>
      <p>Állapot: <strong>{t.status==='active'?'Fut':t.status==='completed'?'Lezárt':'Megszakított'}</strong>. A Pro entitlementek pontosan a trial időablakára érvényesek, utána automatikusan lejárnak.</p>
    </section>}

    {!loadError&&t?.status==='active'&&!r&&<section className="card">
      <span className="badge">Adatgyűjtés</span>
      <h2>A Business Pulse még készül.</h2>
      <p className="muted">A lezáró riport csak a teljes 30 napos időablak után generálható. Korai, részleges adatokból nem adunk csomagajánlást.</p>
    </section>}

    {r&&<>
      <div className="cards adminMetricCards">
        <div className="card"><span className="badge">Tény · realizált árbevétel</span><div className="price">{formatHuf(integer(facts.revenue?.recognizedGrossHuf))}</div><p className="muted">{integer(facts.orders?.recognizedOrders)} elismert rendelés</p></div>
        <div className="card"><span className="badge">Számítás · átlagos kosárérték</span><div className="price">{formatHuf(integer(calculations.averageOrderValueGrossHuf))}</div><p className="muted">{integer(facts.customers?.distinctCustomers)} különböző vásárló</p></div>
        <div className="card"><span className="badge">Tény · készlethiány</span><div className="price">{integer(facts.inventory?.stockoutEvents)}</div><p className="muted">trial alatti készlet-kifogyási esemény</p></div>
        <div className="card"><span className="badge">Ajánlás</span><div className="price">Shoperation {r.recommended_plan==='pro'?'Pro':'Alap'}</div><p className="muted">{confidenceLabel(r.confidence)} bizonyosság</p></div>
      </div>

      <section className="featurePanel">
        <span className="eyebrow">Tények</span><h2>Termék- és értékesítési teljesítmény</h2>
        <div className="integrationList">
          {products.map((item,index)=><div key={`${String(item.product_name)}-${index}`}><span><strong>{String(item.product_name??'Termék')}</strong><br/><span className="muted">{integer(item.units)} értékesített egység</span></span><strong>{formatHuf(integer(item.recognized_revenue_gross_huf))}</strong></div>)}
          {products.length===0&&<p className="muted">A trial időszakban nincs igazolt termékszintű értékesítés.</p>}
        </div>
        {facts.categoryDataAvailable!==true&&<p className="muted"><strong>Kategóriateljesítmény:</strong> jelenleg nem mérhető hitelesen, mert a katalógusban nincs külön, autoritatív termékkategória-adatmodell. A rendszer nem gyárt helyette becsült kategóriákat.</p>}
      </section>

      <div className="splitFeature">
        <section className="featurePanel">
          <span className="eyebrow">Kampányok</span><h2>{integer(campaigns.campaignCount)} kampány a trial alatt</h2>
          <div className="integrationList">
            <div><span>Beállított kampánybudget</span><strong>{formatHuf(integer(campaigns.configuredBudgetHuf))}</strong></div>
            <div><span>Attribútált árbevétel</span><strong>{formatHuf(integer(campaigns.attributedRevenueGrossHuf))}</strong></div>
          </div>
          <p className="muted">A tényleges kampányköltés nincs perzisztálva, ezért valódi ROAS-t nem állítunk. A budget/attribútált bevétel arány csak diagnosztikai számítás, nem ROAS.</p>
        </section>
        <section className="featurePanel">
          <span className="eyebrow">Mentett kosarak</span><h2>{integer(recovery.created)} recovery intent</h2>
          <div className="integrationList">
            <div><span>Konvertált</span><strong>{integer(recovery.converted)}</strong></div>
            <div><span>Nyitott</span><strong>{integer(recovery.open)}</strong></div>
            <div><span>Számított konverzió</span><strong>{recoveryRate===null?'—':`${recoveryRate.toFixed(2)}%`}</strong></div>
          </div>
        </section>
      </div>

      <section className="featurePanel">
        <span className="eyebrow">Pro használati bizonyíték</span><h2>Használt és releváns, de kihagyott képességek</h2>
        <div className="integrationList">
          {used.map((signal,index)=><div key={`used-${index}`}><span><strong>{capabilityLabel[String(signal.featureCode)]??String(signal.featureCode)}</strong><br/><span className="muted">Igazolt használat</span></span><strong>{integer(signal.evidenceCount)} jel</strong></div>)}
          {opportunities.map((signal,index)=><div key={`opportunity-${index}`}><span><strong>{capabilityLabel[String(signal.featureCode)]??String(signal.featureCode)}</strong><br/><span className="muted">Releváns, de a trial alatt nem használt lehetőség</span></span><span className="badge">{String(signal.reasonCode??'EVIDENCE')}</span></div>)}
          {used.length===0&&opportunities.length===0&&<p className="muted">A mérhető Pro képességeknél nincs elég használati vagy üzleti szükségletre utaló bizonyíték.</p>}
        </div>
      </section>

      <section className="featurePanel darkPanel">
        <span className="eyebrow">Csomagajánlás · külön következtetési réteg</span>
        <h2>Shoperation {r.recommended_plan==='pro'?'Pro':'Alap'}</h2>
        <p>Bizonyosság: {confidenceLabel(r.confidence)}. A döntési szabály nem árbevételi küszöb alapján választ csomagot: a mérhető Pro használatot és az igazolt, releváns kihagyott lehetőségeket értékeli.</p>
        <p className="muted">Riport időszaka: {date(r.period_start)} – {date(r.period_end)} · generálva: {date(r.generated_at)}</p>
      </section>
    </>}
  </section>;
}
