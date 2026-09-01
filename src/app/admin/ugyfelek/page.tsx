import { createAdminClient } from '@/lib/supabase/admin';
import { formatHuf } from '@/lib/catalog';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

type P={id:string;email:string|null;full_name:string|null;company_name:string|null;tax_number:string|null;role:string;reseller_approved:boolean;created_at:string};
type M={instance_id:string;customer_key:string;customer_id:string|null;email_key:string;paid_orders:number;revenue_gross_huf:number;aov_gross_huf:number;first_order_at:string;last_order_at:string;days_since_last_order:number;segment:string;cogs_net_huf:number|null;cogs_to_revenue_pct:number|null};

const labels:Record<string,string>={first_time:'Első vásárló',vip:'VIP',repeat:'Visszatérő',active:'Aktív',at_risk:'Kockázatos',winback:'Visszanyerendő',dormant:'Inaktív'};
const weight:Record<string,number>={vip:7,at_risk:6,winback:5,dormant:4,repeat:3,first_time:2,active:1};
export const dynamic='force-dynamic';

export default async function Page(){
  const scope=await requireCurrentStoreContext('sales.manage');
  const a=createAdminClient();
  const {data:md,error:me}=await a.from('customer_commercial_metrics').select('*').eq('instance_id',scope.instanceId).limit(5000);
  const metrics=(md??[])as M[];
  const customerIds=[...new Set(metrics.map(x=>x.customer_id).filter((id):id is string=>Boolean(id)))];
  let pd:P[]=[];
  let pe:unknown=null;
  if(customerIds.length){
    const result=await a.from('profiles').select('id,email,full_name,company_name,tax_number,role,reseller_approved,created_at').in('id',customerIds).limit(1000);
    pd=(result.data??[])as P[];
    pe=result.error;
  }

  const customers=pd;
  const loadError=Boolean(pe||me);
  const byId=new Map(metrics.filter(x=>x.customer_id).map(x=>[x.customer_id as string,x]));
  const byEmail=new Map(metrics.map(x=>[x.email_key,x]));
  const enriched=customers.map(c=>{
    const m=byId.get(c.id)??(c.email?byEmail.get(c.email.toLowerCase()):undefined);
    return {...c,metric:m,priority:m?weight[m.segment]??1:0};
  });
  const count=(segment:string)=>metrics.filter(m=>m.segment===segment).length;
  const totalRevenue=metrics.reduce((s,m)=>s+Number(m.revenue_gross_huf||0),0);
  const totalOrders=metrics.reduce((s,m)=>s+Number(m.paid_orders||0),0);
  const avgAov=totalOrders?Math.round(totalRevenue/totalOrders):0;
  const repeatCustomers=metrics.filter(m=>m.paid_orders>=2).length;
  const repeatRate=metrics.length?Math.round(repeatCustomers/metrics.length*100):0;
  const atRiskRevenue=metrics.filter(m=>['at_risk','winback','dormant'].includes(m.segment)).reduce((s,m)=>s+Number(m.revenue_gross_huf||0),0);
  const queue=enriched.filter(c=>c.priority>=4).sort((x,y)=>y.priority-x.priority||Number(y.metric?.revenue_gross_huf||0)-Number(x.metric?.revenue_gross_huf||0)).slice(0,25);

  return <section className="adminMain">
    <span className="eyebrow">Ügyfelek</span>
    <h1 className="sectionTitle">Ügyfélérték és megtartási központ</h1>
    <p className="lead">Az aktuális webshop vásárlóinak értéke, aktivitása és megtartási prioritása. Más webshop ügyféladatai ezen a felületen nem jelennek meg.</p>
    {loadError&&<div className="errorNotice"><strong>Az ügyfélintelligencia egy része most nem tölthető be.</strong></div>}
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Ügyfélérték</span><div className="price">{formatHuf(totalRevenue)}</div><p className="muted">összes fizetett ügyfélbevétel</p></div>
      <div className="card"><span className="badge">AOV</span><div className="price">{formatHuf(avgAov)}</div><p className="muted">átlagos fizetett rendelési érték</p></div>
      <div className="card"><span className="badge">Repeat rate</span><div className="price">{repeatRate}%</div><p className="muted">legalább kétszer vásárlók aránya</p></div>
      <div className="card"><span className="badge">Kockázati érték</span><div className="price">{formatHuf(atRiskRevenue)}</div><p className="muted">30+ napja inaktív ügyfelek történeti bevétele</p></div>
    </div>
    <div className="splitFeature">
      <section className="featurePanel"><span className="eyebrow">Szegmensek</span><h2>Életciklus és érték</h2><div className="integrationList"><div><span>VIP</span><strong>{count('vip')}</strong></div><div><span>Visszatérő</span><strong>{count('repeat')}</strong></div><div><span>Első vásárló</span><strong>{count('first_time')}</strong></div><div><span>Kockázatos</span><strong>{count('at_risk')}</strong></div><div><span>Visszanyerendő</span><strong>{count('winback')}</strong></div><div><span>Inaktív</span><strong>{count('dormant')}</strong></div></div></section>
      <section className="featurePanel darkPanel"><span className="eyebrow">Partnercsatorna</span><h2>Store-szintű partnerkezelés előkészítve</h2><p>A globális profil-szerepkörök módosítása ezen a merchant felületen biztonsági okból le van tiltva. A B2B partnerjóváhagyás külön webshophoz kötött tagságként kerül bevezetésre.</p></section>
    </div>
    {queue.length>0&&<section className="featurePanel"><span className="eyebrow">Döntési munkasor</span><h2>Kikkel érdemes most foglalkozni?</h2><div className="integrationList">{queue.map(c=><div key={c.id}><span><span className="badge">{labels[c.metric?.segment??'']??'Még nem vásárolt'}</span> <strong>{c.full_name||c.email||'Névtelen ügyfél'}</strong><br/><span className="muted">{c.company_name||'magánvásárló'} · {c.metric?`${c.metric.paid_orders} rendelés · AOV ${formatHuf(c.metric.aov_gross_huf)} · ${c.metric.days_since_last_order} napja aktív`:'nincs fizetett vásárlás'}</span></span><strong>{formatHuf(c.metric?.revenue_gross_huf||0)}</strong></div>)}</div></section>}
    <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Szegmens</th><th>LTV / bevétel</th><th>AOV</th><th>Rendelések</th><th>Profil státusz</th><th>Utolsó vásárlás</th></tr></thead><tbody>{enriched.map(c=><tr key={c.id}><td><strong>{c.full_name||'Nincs név'}</strong><br/><span className="muted">{c.email||'—'}</span>{c.company_name&&<><br/><span className="muted">{c.company_name}</span></>}</td><td><span className="badge">{labels[c.metric?.segment??'']??'Még nem vásárolt'}</span></td><td><strong>{formatHuf(c.metric?.revenue_gross_huf||0)}</strong></td><td>{c.metric?formatHuf(c.metric.aov_gross_huf):'—'}</td><td>{c.metric?.paid_orders??0}</td><td><span className="badge">{c.role==='reseller'?(c.reseller_approved?'Legacy viszonteladó':'Legacy partnerjelölt'):'Vásárló'}</span></td><td>{c.metric?.last_order_at?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(c.metric.last_order_at)):<span className="muted">—</span>}{c.metric&&c.metric.days_since_last_order>=30?<><br/><span className="muted">{c.metric.days_since_last_order} napja</span></>:null}</td></tr>)}</tbody></table></div>
  </section>;
}
