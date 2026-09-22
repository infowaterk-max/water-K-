import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{formatHuf}from'@/lib/catalog';
import{createAdminClient}from'@/lib/supabase/admin';

export const dynamic='force-dynamic';
const paid=['paid','processing','shipped','completed'],DAY=86400000;
const monthKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

export default async function Cashflow(){
  await requirePlanFeature('cashflow');
  const scope=await requireCurrentStoreContext('analytics.read');
  const a=createAdminClient(),now=Date.now(),since90=new Date(now-90*DAY).toISOString(),future90=new Date(now+90*DAY).toISOString().slice(0,10);
  const[{data:o,error:oe},{data:po,error:pe}]=await Promise.all([
    a.from('orders').select('total_gross_huf,created_at,status').eq('instance_id',scope.instanceId).gte('created_at',since90).in('status',paid),
    a.from('purchase_orders').select('status,payment_due_at,net_total_huf').eq('instance_id',scope.instanceId).not('status','in','(received,cancelled)').lte('payment_due_at',future90),
  ]);

  const revenue90=(o??[]).reduce((s,x)=>s+Number(x.total_gross_huf||0),0),dailyRevenue=revenue90/90;
  const forecastRevenue30=dailyRevenue*30,forecastRevenue60=dailyRevenue*60,forecastRevenue90=dailyRevenue*90,due=(po??[]).filter(x=>x.payment_due_at);
  const overdue=due.filter(x=>+new Date(x.payment_due_at)<now).reduce((s,x)=>s+Number(x.net_total_huf||0),0);
  const due30=due.filter(x=>+new Date(x.payment_due_at)>=now&&+new Date(x.payment_due_at)<=now+30*DAY).reduce((s,x)=>s+Number(x.net_total_huf||0),0);
  const due60=due.filter(x=>+new Date(x.payment_due_at)>now+30*DAY&&+new Date(x.payment_due_at)<=now+60*DAY).reduce((s,x)=>s+Number(x.net_total_huf||0),0);
  const due90=due.filter(x=>+new Date(x.payment_due_at)>now+60*DAY&&+new Date(x.payment_due_at)<=now+90*DAY).reduce((s,x)=>s+Number(x.net_total_huf||0),0);
  const net30=forecastRevenue30-overdue-due30,net60=forecastRevenue60-overdue-due30-due60,net90=forecastRevenue90-overdue-due30-due60-due90;

  const months=new Map<string,{revenue:number;orders:number}>();
  for(const x of o??[]){const k=monthKey(new Date(x.created_at)),m=months.get(k)??{revenue:0,orders:0};m.revenue+=Number(x.total_gross_huf||0);m.orders++;months.set(k,m)}
  const history=[...months.entries()].sort((a,b)=>a[0].localeCompare(b[0])),loadError=Boolean(oe||pe);

  return <section className="adminMain">
    <span className="eyebrow">Pro · Pénzáram-tervezés</span>
    <h1 className="sectionTitle">90 napos működési pénzáram-előrejelzés</h1>
    <p className="lead">A bevételi oldal az utolsó 90 nap fizetett rendeléseinek napi átlagából becsül, a kiadási oldal pedig a rögzített beszerzési fizetési határidőket használja.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A pénzáram-adatok egy része most nem tölthető be.</strong> Hiányos adatok mellett az előrejelzett egyenleget ne használd döntésre.</div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Fontos értelmezés</span><h2>Működési előrejelzés, nem bankszámla-egyenleg</h2></div>
      <p>A becslés nem tartalmaz minden adót, bért, rezsit és egyéb pénzmozgást. A rendelési forgalom bruttó, a rögzített beszerzési kötelezettség a beszerzési adatokból jön, ezért ez korai figyelmeztető üzleti mutató, nem könyvelési cash-flow kimutatás.</p>
    </section>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">30 nap</span><div className="price">{loadError?'—':formatHuf(Math.round(net30))}</div><p className="muted">{loadError?'A részletes 30 napos bontás most nem használható.':<>becsült forgalom {formatHuf(Math.round(forecastRevenue30))} · lejárt + 30 napon belüli beszerzés {formatHuf(Math.round(overdue+due30))}</>}</p></div>
      <div className="card"><span className="badge">60 nap</span><div className="price">{loadError?'—':formatHuf(Math.round(net60))}</div></div>
      <div className="card"><span className="badge">90 nap</span><div className="price">{loadError?'—':formatHuf(Math.round(net90))}</div></div>
      <div className="card"><span className="badge">90 napig ismert beszerzési kifizetés</span><div className="price">{pe?'—':formatHuf(Math.round(overdue+due30+due60+due90))}</div></div>
    </div>

    <section className="card">
      <h2>Kifizetési időablakok</h2>
      <div className="integrationList">
        <div><span>Lejárt</span><strong>{pe?'—':formatHuf(Math.round(overdue))}</strong></div>
        <div><span>0–30 nap</span><strong>{pe?'—':formatHuf(Math.round(due30))}</strong></div>
        <div><span>31–60 nap</span><strong>{pe?'—':formatHuf(Math.round(due60))}</strong></div>
        <div><span>61–90 nap</span><strong>{pe?'—':formatHuf(Math.round(due90))}</strong></div>
      </div>
    </section>

    <section className="card">
      <h2>Utolsó 90 nap fizetett forgalma</h2>
      <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Hónap</th><th>Rendelés</th><th>Bruttó forgalom</th></tr></thead><tbody>{history.map(([m,v])=><tr key={m}><td><strong>{m}</strong></td><td>{v.orders}</td><td><strong>{formatHuf(Math.round(v.revenue))}</strong></td></tr>)}</tbody></table></div>
      {!oe&&history.length===0&&<p className="muted">Még nincs fizetett rendelési előzmény az elmúlt 90 napból.</p>}
    </section>
  </section>;
}
