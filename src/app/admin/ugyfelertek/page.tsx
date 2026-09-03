import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
export const dynamic='force-dynamic';

type Row={customer_id:string;value_score:number;value_tier:string;lifecycle_segment:string;paid_orders:number;revenue_gross_huf:number;last_order_at:string|null;points_balance:number;lifetime_earned_points:number;lifetime_redeemed_points:number;available_benefits:number};
type Profile={id:string;email:string|null;full_name:string|null;company_name:string|null};
const tierLabels:Record<string,string>={platinum:'Platina',gold:'Arany',silver:'Ezüst',standard:'Alap'};
const lifecycleLabels:Record<string,string>={first_time:'Első vásárló',vip:'VIP',repeat:'Visszatérő',active:'Aktív',at_risk:'Kockázatos',winback:'Visszanyerendő',dormant:'Inaktív'};

export default async function CustomerValueAdmin(){
 await requirePlanFeature('crm');
 const scope=await requireCurrentStoreContext('analytics.read'),a=createAdminClient();
 const{data,error}=await a.from('customer_loyalty_summary').select('*').eq('instance_id',scope.instanceId).order('value_score',{ascending:false}).limit(250);
 const rows=(data??[])as Row[],ids=[...new Set(rows.map(r=>r.customer_id).filter(Boolean))];
 const profileResult=ids.length?await a.from('profiles').select('id,email,full_name,company_name').in('id',ids):{data:[]as Profile[],error:null};
 const profiles=(profileResult.data??[])as Profile[],profileById=new Map(profiles.map(p=>[p.id,p])),loadError=Boolean(error||profileResult.error);
 const liability=rows.reduce((s,r)=>s+Math.max(0,Number(r.points_balance||0)),0),repeat=rows.filter(r=>Number(r.paid_orders)>=2).length,high=rows.filter(r=>['gold','platinum'].includes(r.value_tier)).length;
 const tiers=['platinum','gold','silver','standard'].map(t=>({tier:t,count:rows.filter(r=>r.value_tier===t).length}));
 return <section className="adminMain">
  <span className="eyebrow">Pro · Ügyfélérték</span><h1 className="sectionTitle">Ügyfélérték és hűség</h1><p className="lead">Az aktuális webshop ügyfeleinek értékszintje, visszatérési teljesítménye, hűségpont-egyenlege és elérhető előnyei.</p>
  {loadError&&<div className="errorNotice"><strong>Az ügyfélérték-adatok egy része most nem tölthető be.</strong></div>}
  <section className="auditGuide"><div><span className="eyebrow">Hogyan olvasd?</span><h2>Az értékpontszám nem rangsor, hanem döntéstámogatás</h2></div><p>A pontszám a vásárlási előzményekből és aktivitásból képzett jelzőszám. A szint és az életciklus segít eldönteni, kit érdemes megtartani, visszanyerni vagy külön előnnyel jutalmazni.</p></section>
  <div className="cards adminMetricCards"><div className="card"><span className="badge">Értékelt ügyfelek</span><div className="price">{error?'—':rows.length}</div></div><div className="card"><span className="badge">Visszatérő ügyfél</span><div className="price">{error?'—':repeat}</div></div><div className="card"><span className="badge">Arany + Platina</span><div className="price">{error?'—':high}</div></div><div className="card"><span className="badge">Felhasználható pontok</span><div className="price">{error?'—':liability.toLocaleString('hu-HU')+' pont'}</div></div></div>
  <section className="card"><h2>Értékszintek</h2><div className="cards">{tiers.map(t=><div key={t.tier}><strong>{tierLabels[t.tier]}</strong><div className="price">{error?'—':t.count}</div></div>)}</div></section>
  <section className="card"><h2>Ügyfelek érték szerint</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Értékpont</th><th>Szint</th><th>Életciklus</th><th>Rendelés</th><th>Vásárlási érték</th><th>Pontegyenleg</th><th>Jóváírt</th><th>Beváltott</th><th>Előny</th></tr></thead><tbody>{rows.map(r=>{const p=profileById.get(r.customer_id);return <tr key={r.customer_id}><td><strong>{p?.full_name||p?.company_name||p?.email||'Ismeretlen ügyfél'}</strong>{p?.full_name&&p.email&&<><br/><span className="muted">{p.email}</span></>}</td><td><strong>{Number(r.value_score).toFixed(0)}</strong></td><td>{tierLabels[r.value_tier]??r.value_tier}</td><td>{lifecycleLabels[r.lifecycle_segment]??r.lifecycle_segment}</td><td>{r.paid_orders}</td><td>{formatHuf(Number(r.revenue_gross_huf))}</td><td>{Number(r.points_balance).toLocaleString('hu-HU')}</td><td>{Number(r.lifetime_earned_points).toLocaleString('hu-HU')}</td><td>{Number(r.lifetime_redeemed_points).toLocaleString('hu-HU')}</td><td>{r.available_benefits}</td></tr>})}</tbody></table></div>{!loadError&&!rows.length&&<p className="muted">Még nincs elegendő vásárlási előzmény ügyfélérték számításához.</p>}</section>
 </section>;
}
