import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasStorePermission}from'@/lib/auth/store-rbac';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import{GrowthRefreshButton}from'@/components/admin/growth-refresh-button';

export const dynamic='force-dynamic';
type Dashboard={paying_customers:number;vip_customers:number;at_risk_customers:number;winback_customers:number;customer_lifetime_revenue_gross_huf:number;open_checkout_recoveries:number;active_journeys:number;due_journey_steps:number;overdue_resellers:number;due_soon_resellers:number;calculated_at:string};
type Reseller={customer_key:string;email:string|null;full_name:string|null;company_name:string|null;paid_orders:number;revenue_gross_huf:number;last_order_at:string;avg_reorder_days:number|null;days_since_last_order:number;reorder_signal:string;avg_order_value_gross_huf:number;estimated_reorder_value_gross_huf:number;priority_score:number;priority_band:string;recommended_action:string;inactivity_risk:string};
type Customer={customer_key:string;email_key:string;paid_orders:number;revenue_gross_huf:number;aov_gross_huf:number;days_since_last_order:number;segment:string};
const segmentLabel:Record<string,string>={vip:'VIP',repeat:'Visszatérő',first_time:'Első vásárló',active:'Aktív',at_risk:'Kockázatban',winback:'Visszanyerendő',dormant:'Inaktív'};
const priorityLabel:Record<string,string>={critical:'Kritikus',high:'Magas',medium:'Közepes',low:'Alacsony'};
const riskLabel:Record<string,string>={dormant:'Hosszú ideje inaktív',inactive:'Inaktív',late:'Késésben',active:'Aktív'};

export default async function Page(){
  await requirePlanFeature('advancedAnalytics');
  const scope=await requireCurrentStoreContext('analytics.read');
  const canRefresh=scope.isPlatform||await hasStorePermission(scope.instanceId,'marketing.manage');
  const a=createAdminClient();
  const[{data:summary,error:se},{data:resellers,error:re},{data:customers,error:ce}]=await Promise.all([
    a.from('v9_growth_dashboard_v2').select('*').eq('instance_id',scope.instanceId).maybeSingle(),
    a.from('reseller_growth_priorities_v2').select('*').eq('instance_id',scope.instanceId).order('priority_score',{ascending:false}).order('revenue_gross_huf',{ascending:false}).limit(30),
    a.from('customer_commercial_metrics').select('customer_key,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,days_since_last_order,segment').eq('instance_id',scope.instanceId).in('segment',['vip','at_risk','winback','dormant']).order('revenue_gross_huf',{ascending:false}).limit(30),
  ]);
  const s=(summary??null)as Dashboard|null,rs=(resellers??[])as Reseller[],cs=(customers??[])as Customer[],loadError=Boolean(se||re||ce);
  const priorityResellers=rs.filter(r=>r.priority_score>=50),estimatedOpportunity=priorityResellers.reduce((sum,r)=>sum+Number(r.estimated_reorder_value_gross_huf||0),0),criticalPartners=rs.filter(r=>r.priority_band==='critical').length,dormantPartners=rs.filter(r=>r.inactivity_risk==='dormant').length;

  return <section className="adminMain">
    <span className="eyebrow">Pro · Növekedési intelligencia</span>
    <h1 className="sectionTitle">Növekedési döntési központ</h1>
    <p className="lead">Az aktuális webshop B2C/B2B ügyfélértékét, lemorzsolódási kockázatát és jóváhagyott partneri újrarendelési lehetőségeit mutatja.</p>
    {canRefresh?<GrowthRefreshButton/>:<div className="adminAuditNotice"><strong>Csak olvasási jogosultság.</strong><p>A növekedési elemzéseket megtekintheted, de ügyfélutakat újratervezni és kiküldési lépéseket sorba állítani csak marketing-kezelési jogosultsággal lehet.</p></div>}
    {loadError&&<div className="errorNotice" role="alert"><strong>A növekedési adatok egy része most nem tölthető be.</strong> A hiányzó mutatók helyén nem feltételezünk nulla értéket.</div>}

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Történeti ügyfélbevétel</span><div className="price">{se?'—':formatHuf(Number(s?.customer_lifetime_revenue_gross_huf??0))}</div><p className="muted">{se?'Az összesítés most nem elérhető.':`${s?.paying_customers??0} fizető ügyfél`}</p></div>
      <div className="card"><span className="badge">Megtartási kockázat</span><div className="price">{se?'—':Number(s?.at_risk_customers??0)+Number(s?.winback_customers??0)}</div><p className="muted">kockázatban lévő vagy visszanyerendő ügyfél</p></div>
      <div className="card"><span className="badge">B2B bevételi lehetőség</span><div className="price">{re?'—':formatHuf(estimatedOpportunity)}</div><p className="muted">{re?'A partnerlista most nem elérhető.':`${priorityResellers.length} jóváhagyott partner`}</p></div>
      <div className="card"><span className="badge">Kritikus B2B</span><div className="price">{re?'—':criticalPartners}</div><p className="muted">{re?'—':`${dormantPartners} hosszú ideje inaktív partner`}</p></div>
    </div>

    <div className="splitFeature">
      <section className="featurePanel">
        <span className="eyebrow">Ügyfélút automatizálás</span><h2>{se?'—':`${s?.active_journeys??0} aktív ügyfélút`}</h2>
        <div className="integrationList">
          <div><span>Most esedékes lépések</span><strong>{se?'—':s?.due_journey_steps??0}</strong></div>
          <div><span>VIP ügyfelek</span><strong>{se?'—':s?.vip_customers??0}</strong></div>
          <div><span>Nyitott mentett kosarak</span><strong>{se?'—':s?.open_checkout_recoveries??0}</strong></div>
        </div>
      </section>
      <section className="featurePanel darkPanel">
        <span className="eyebrow">B2B prioritás</span><h2>Csak jóváhagyott partner kap újrarendelési jelzést</h2>
        <p>A prioritási modell kizárólag az aktuális webshop saját, jóváhagyott partnerkapcsolataiból dolgozik.</p>
      </section>
    </div>

    {rs.length>0&&<section className="featurePanel">
      <span className="eyebrow">B2B újrarendelés</span><h2>Prioritásos viszonteladói lehetőségek</h2>
      <div className="integrationList">{rs.map(r=><div key={r.customer_key}><span><span className="badge">{priorityLabel[r.priority_band]??r.priority_band}</span> <strong>{r.company_name||r.full_name||r.email||'Viszonteladó'}</strong><br/><span className="muted">{riskLabel[r.inactivity_risk]??r.inactivity_risk} · {r.days_since_last_order} nap · átlagos újrarendelési ciklus: {r.avg_reorder_days??'—'} nap · prioritás {r.priority_score}/100</span><br/><span className="muted">Javaslat: {r.recommended_action}</span></span><span><strong>{formatHuf(r.estimated_reorder_value_gross_huf)}</strong><br/><span className="muted">becsült következő rendelés · történeti partnerbevétel {formatHuf(r.revenue_gross_huf)}</span></span></div>)}</div>
    </section>}

    <section className="featurePanel">
      <span className="eyebrow">Ügyfélérték</span><h2>Legfontosabb megtartási célpontok</h2>
      <div className="integrationList">{cs.map(c=><div key={c.customer_key}><span><span className="badge">{segmentLabel[c.segment]??c.segment}</span> <strong>{c.email_key}</strong><br/><span className="muted">{c.paid_orders} rendelés · átlagos rendelési érték {formatHuf(c.aov_gross_huf)} · {c.days_since_last_order} napja vásárolt</span></span><strong>{formatHuf(c.revenue_gross_huf)}</strong></div>)}</div>
      {!ce&&cs.length===0&&<p className="muted">Még nincs kiemelt megtartási célpont.</p>}
    </section>
  </section>;
}
