import { createAdminClient } from '@/lib/supabase/admin';
import { formatHuf } from '@/lib/catalog';
import { CustomerRoleControl } from '@/components/admin/customer-role-control';

type ProfileRow={id:string;email:string|null;full_name:string|null;company_name:string|null;tax_number:string|null;role:string;reseller_approved:boolean;created_at:string};
type OrderRow={customer_id:string|null;customer_email:string;status:string;total_gross_huf:number;created_at:string};
const paidStatuses=['paid','processing','shipped','completed'];

export const dynamic='force-dynamic';

export default async function AdminCustomersPage(){
  const admin=createAdminClient();
  const [{data:profileData,error:profileError},{data:orderData,error:orderError}]=await Promise.all([
    admin.from('profiles').select('id,email,full_name,company_name,tax_number,role,reseller_approved,created_at').order('created_at',{ascending:false}).limit(1000),
    admin.from('orders').select('customer_id,customer_email,status,total_gross_huf,created_at').order('created_at',{ascending:false}).limit(5000)
  ]);
  const customers=(profileData??[]) as ProfileRow[]; const orders=(orderData??[]) as OrderRow[]; const loadError=Boolean(profileError||orderError); const now=Date.now(); const day=86400000;
  const stats=new Map<string,{orders:number;revenue:number;last:string|null}>();
  for(const order of orders.filter(o=>paidStatuses.includes(o.status))){const key=order.customer_id??order.customer_email.toLowerCase();const current=stats.get(key)??{orders:0,revenue:0,last:null};current.orders++;current.revenue+=Number(order.total_gross_huf||0);if(!current.last||new Date(order.created_at)>new Date(current.last))current.last=order.created_at;stats.set(key,current);}
  const enriched=customers.map(c=>{const key=c.id;const byId=stats.get(key);const byEmail=c.email?stats.get(c.email.toLowerCase()):undefined;const s=byId??byEmail??{orders:0,revenue:0,last:null};const inactiveDays=s.last?Math.floor((now-new Date(s.last).getTime())/day):null;const value=s.revenue>=100000?'high':s.orders>=2?'repeat':'standard';return {...c,...s,inactiveDays,value};});
  const pending=enriched.filter(c=>c.role==='reseller'&&!c.reseller_approved).length; const highValue=enriched.filter(c=>c.value==='high').length; const repeat=enriched.filter(c=>c.orders>=2).length; const dormant=enriched.filter(c=>c.orders>0&&c.inactiveDays!==null&&c.inactiveDays>=90).length;
  const followups=enriched.filter(c=>c.role!=='admin'&&(c.value==='high'||(c.inactiveDays!==null&&c.inactiveDays>=90)||(c.role==='reseller'&&!c.reseller_approved))).sort((a,b)=>b.revenue-a.revenue).slice(0,12);
  return <section className="adminMain"><span className="eyebrow">Admin · Ügyfelek</span><h1 className="sectionTitle">Ügyfélérték és partnerközpont</h1><p className="lead">Nemcsak profilok: vásárlási érték, visszatérés és utánkövetési prioritás egy helyen.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>Az ügyfélérték-adatok egy része most nem tölthető be.</strong> A hiányzó mutatókat ne tekintsd nullának.</div>}
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Regisztrált</span><div className="price">{customers.length}</div><p className="muted">ügyfélprofil</p></div><div className="card"><span className="badge">Visszatérő</span><div className="price">{repeat}</div><p className="muted">legalább 2 fizetett rendelés</p></div><div className="card"><span className="badge">Nagy értékű</span><div className="price">{highValue}</div><p className="muted">legalább {formatHuf(100000)} fizetett forgalom</p></div><div className="card"><span className="badge">Utánkövetés</span><div className="price">{dormant+pending}</div><p className="muted">90+ napja inaktív vagy partnerjóváhagyásra vár</p></div></div>
    {followups.length>0&&<section className="featurePanel"><span className="eyebrow">Prioritásos ügyfélmunkasor</span><h2>Kikkel érdemes foglalkozni?</h2><div className="integrationList">{followups.map(c=><div key={c.id}><span><strong>{c.full_name||c.email||'Névtelen ügyfél'}</strong> · {c.company_name||'magánvásárló'}<br/><small>{c.role==='reseller'&&!c.reseller_approved?'Partnerjóváhagyásra vár':c.inactiveDays!==null&&c.inactiveDays>=90?`${c.inactiveDays} napja nem vásárol`:c.value==='high'?'Nagy értékű ügyfél':'Visszatérő ügyfél'}</small></span><strong>{formatHuf(c.revenue)}</strong></div>)}</div></section>}
    <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Cég</th><th>Ügyfélérték</th><th>Szerepkör</th><th>Partnerkezelés</th><th>Utolsó vásárlás</th></tr></thead><tbody>{enriched.map(c=><tr key={c.id}><td><strong>{c.full_name||'Nincs név'}</strong><br/><span className="muted">{c.email||'—'}</span></td><td>{c.company_name||'—'}{c.tax_number&&<><br/><span className="muted">{c.tax_number}</span></>}</td><td><strong>{formatHuf(c.revenue)}</strong><br/><span className="muted">{c.orders} fizetett rendelés · {c.value==='high'?'Nagy értékű':c.value==='repeat'?'Visszatérő':'Standard'}</span></td><td><span className="badge">{c.role==='admin'?'Admin':c.role==='reseller'?(c.reseller_approved?'Viszonteladó':'Jóváhagyásra vár'):'Vásárló'}</span></td><td><CustomerRoleControl id={c.id} role={c.role} approved={c.reseller_approved}/></td><td>{c.last?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(c.last)):<span className="muted">Még nincs fizetett rendelés</span>}{c.inactiveDays!==null&&c.inactiveDays>=90?<><br/><span className="badge">{c.inactiveDays} napja inaktív</span></>:null}</td></tr>)}</tbody></table>{customers.length===0&&<p className="muted" style={{padding:20}}>Még nincs megjeleníthető ügyfél.</p>}</div>
  </section>;
}
