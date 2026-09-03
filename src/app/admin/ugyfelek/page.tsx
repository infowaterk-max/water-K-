import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import{CustomerRoleControl}from'@/components/admin/customer-role-control';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

type P={id:string;email:string|null;full_name:string|null;company_name:string|null;tax_number:string|null;created_at:string};
type R={user_id:string;role:string;reseller_approved:boolean;reseller_requested_at:string|null;approved_at:string|null;created_at:string};
type M={customer_key:string;customer_id:string|null;email_key:string;paid_orders:number;revenue_gross_huf:number;aov_gross_huf:number;first_order_at:string;last_order_at:string;days_since_last_order:number;segment:string;cogs_net_huf:number|null;cogs_to_revenue_pct:number|null};
type CustomerRow={id:string;userId:string|null;email:string|null;full_name:string|null;company_name:string|null;tax_number:string|null;created_at:string;role:string;reseller_approved:boolean;reseller_requested_at:string|null;approved_at:string|null;metric:M|undefined;priority:number;guest:boolean};

const labels:Record<string,string>={first_time:'Első vásárló',vip:'VIP',repeat:'Visszatérő',active:'Aktív',at_risk:'Kockázatos',winback:'Visszanyerendő',dormant:'Inaktív'};
const weight:Record<string,number>={vip:7,at_risk:6,winback:5,dormant:4,repeat:3,first_time:2,active:1};
export const dynamic='force-dynamic';

export default async function Page(){
 const scope=await requireCurrentStoreContext('sales.manage'),a=createAdminClient();
 const[{data:rd,error:re},{data:md,error:me}]=await Promise.all([
  a.from('customer_instance_roles').select('user_id,role,reseller_approved,reseller_requested_at,approved_at,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(5000),
  a.from('customer_commercial_metrics').select('*').eq('instance_id',scope.instanceId).limit(5000),
 ]);
 const roles=(rd??[])as R[],metrics=(md??[])as M[],ids=[...new Set(roles.map(r=>r.user_id))];
 const profileResult=ids.length?await a.from('profiles').select('id,email,full_name,company_name,tax_number,created_at').in('id',ids).limit(5000):{data:[] as P[],error:null};
 const profiles=(profileResult.data??[])as P[],profileById=new Map(profiles.map(p=>[p.id,p])),byId=new Map(metrics.filter(x=>x.customer_id).map(x=>[x.customer_id as string,x])),byEmail=new Map(metrics.map(x=>[x.email_key,x])),loadError=Boolean(re||me||profileResult.error);

 const registered:CustomerRow[]=roles.map(r=>{const p=profileById.get(r.user_id),m=byId.get(r.user_id)??(p?.email?byEmail.get(p.email.toLowerCase()):undefined);return{id:r.user_id,userId:r.user_id,email:p?.email??null,full_name:p?.full_name??null,company_name:p?.company_name??null,tax_number:p?.tax_number??null,created_at:p?.created_at??r.created_at,role:r.role,reseller_approved:r.reseller_approved,reseller_requested_at:r.reseller_requested_at,approved_at:r.approved_at,metric:m,priority:(m?weight[m.segment]??1:0)+(r.role==='reseller'&&!r.reseller_approved?8:0),guest:false}});
 const registeredEmails=new Set(registered.map(c=>c.email?.trim().toLowerCase()).filter((value):value is string=>Boolean(value)));
 const guests:CustomerRow[]=metrics.filter(m=>!m.customer_id&&!registeredEmails.has(m.email_key)).map(m=>({id:`guest:${m.email_key}`,userId:null,email:m.email_key,full_name:null,company_name:null,tax_number:null,created_at:m.first_order_at,role:'guest',reseller_approved:false,reseller_requested_at:null,approved_at:null,metric:m,priority:weight[m.segment]??1,guest:true}));
 const customers=[...registered,...guests];

 const count=(segment:string)=>metrics.filter(m=>m.segment===segment).length,totalRevenue=metrics.reduce((s,m)=>s+Number(m.revenue_gross_huf||0),0),totalOrders=metrics.reduce((s,m)=>s+Number(m.paid_orders||0),0),avgOrderValue=totalOrders?Math.round(totalRevenue/totalOrders):0,repeatCustomers=metrics.filter(m=>m.paid_orders>=2).length,repeatRate=metrics.length?Math.round(repeatCustomers/metrics.length*100):0,pending=registered.filter(c=>c.role==='reseller'&&!c.reseller_approved).length,atRiskRevenue=metrics.filter(m=>['at_risk','winback','dormant'].includes(m.segment)).reduce((s,m)=>s+Number(m.revenue_gross_huf||0),0),queue=customers.filter(c=>c.priority>=4||(c.role==='reseller'&&!c.reseller_approved)).sort((x,y)=>y.priority-x.priority||Number(y.metric?.revenue_gross_huf||0)-Number(x.metric?.revenue_gross_huf||0)).slice(0,25);

 return <section className="adminMain">
  <span className="eyebrow">Admin · Ügyfélkezelés</span><h1 className="sectionTitle">Ügyfelek és partnerek</h1>
  <p className="lead">Itt látod az aktuális webshop regisztrált ügyfeleit, vendégként vásárló vevőit, vásárlási értékét és B2B partnerkérelmeit. A partnerstátusz kizárólag ebben a Shoperation webshopban érvényes.</p>
  {loadError&&<div className="errorNotice"><strong>Az ügyféladatok egy része most nem tölthető be.</strong></div>}
  <section className="auditGuide"><div><span className="eyebrow">Mit tartalmaz a lista?</span><h2>Minden ismert vásárlói kapcsolat egy helyen</h2></div><p>A regisztrált ügyfelek mellett a vendégként vásárlók is megjelennek, ha már van fizetett rendelési előzményük. B2B jogosultságot csak regisztrált ügyfél kaphat.</p></section>
  <div className="cards adminMetricCards">
   <div className="card"><span className="badge">Ismert ügyfél</span><div className="price">{customers.length}</div><p className="muted">Regisztrált és vendégvásárlók</p></div>
   <div className="card"><span className="badge">Összes vásárlási érték</span><div className="price">{formatHuf(totalRevenue)}</div></div>
   <div className="card"><span className="badge">Átlagos rendelési érték</span><div className="price">{formatHuf(avgOrderValue)}</div></div>
   <div className="card"><span className="badge">Visszatérő vásárlók aránya</span><div className="price">{repeatRate}%</div></div>
   <div className="card"><span className="badge">Partnerkérelem</span><div className="price">{pending}</div></div>
  </div>
  <div className="splitFeature"><section className="featurePanel"><span className="eyebrow">Vásárlói életciklus</span><h2>Ügyfélszegmensek</h2><div className="integrationList"><div><span>VIP</span><strong>{count('vip')}</strong></div><div><span>Visszatérő</span><strong>{count('repeat')}</strong></div><div><span>Kockázatos</span><strong>{count('at_risk')}</strong></div><div><span>Visszanyerendő</span><strong>{count('winback')}</strong></div><div><span>Inaktív</span><strong>{count('dormant')}</strong></div></div></section><section className="featurePanel darkPanel"><span className="eyebrow">B2B partnerkezelés</span><h2>{pending} jóváhagyásra váró partner</h2><p>A jóváhagyás csak ebben a webshopban aktivál partnerárat és B2B termék-hozzáférést.</p></section></div>
  {queue.length>0&&<section className="featurePanel"><span className="eyebrow">Döntési munkasor</span><h2>Kikkel érdemes most foglalkozni?</h2><div className="integrationList">{queue.map(c=><div key={c.id}><span><span className="badge">{c.role==='reseller'&&!c.reseller_approved?'Partnerjóváhagyás':labels[c.metric?.segment??'']??'Új kapcsolat'}</span> <strong>{c.full_name||c.email||'Névtelen ügyfél'}</strong><br/><span className="muted">{c.company_name|| (c.guest?'vendégvásárló':'magánvásárló')} · {c.metric?`${c.metric.paid_orders} rendelés · átlag ${formatHuf(c.metric.aov_gross_huf)} · ${c.metric.days_since_last_order} napja vásárolt`:'még nincs fizetett vásárlás'}</span></span><strong>{formatHuf(c.metric?.revenue_gross_huf||0)}</strong></div>)}</div></section>}
  <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Szegmens</th><th>Vásárlási érték</th><th>Rendelések</th><th>Kapcsolat típusa</th><th>Partnerkezelés</th><th>Utolsó vásárlás</th></tr></thead><tbody>{customers.map(c=><tr key={c.id}><td><strong>{c.full_name||c.email||'Névtelen ügyfél'}</strong>{c.full_name&&<><br/><span className="muted">{c.email||'—'}</span></>}{c.company_name&&<><br/><span className="muted">{c.company_name}</span></>}</td><td><span className="badge">{labels[c.metric?.segment??'']??'Még nem vásárolt'}</span></td><td><strong>{formatHuf(c.metric?.revenue_gross_huf||0)}</strong></td><td>{c.metric?.paid_orders??0}</td><td><span className="badge">{c.guest?'Vendégvásárló':c.role==='reseller'?(c.reseller_approved?'Viszonteladó':'Partnerkérelem'):'Regisztrált vásárló'}</span></td><td>{c.userId?<CustomerRoleControl id={c.userId} role={c.role} approved={c.reseller_approved}/>:<span className="muted">Regisztráció után állítható</span>}</td><td>{c.metric?.last_order_at?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(c.metric.last_order_at)):<span className="muted">—</span>}</td></tr>)}</tbody></table></div>
  {!loadError&&customers.length===0&&<section className="card"><h2>Még nincs ügyfél.</h2><p className="muted">Az első regisztráció vagy sikeres vásárlás után az ügyfél automatikusan megjelenik itt.</p></section>}
  <p className="muted">Kockázatos vagy inaktív ügyfelek történeti vásárlási értéke: {formatHuf(atRiskRevenue)}.</p>
 </section>;
}
