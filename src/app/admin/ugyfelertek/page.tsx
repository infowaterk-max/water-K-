import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { hasStorePermission } from '@/lib/auth/store-rbac';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import { AdminSubmitButton } from '@/components/admin/admin-submit-button';
import { updateLoyaltyProgramSettingsAction } from './actions';
export const dynamic='force-dynamic';

type Row={customer_id:string;value_score:number;value_tier:string;lifecycle_segment:string;paid_orders:number;revenue_gross_huf:number;last_order_at:string|null;points_balance:number;lifetime_earned_points:number;lifetime_redeemed_points:number;lifetime_expired_points:number;lifetime_reversed_points:number;available_benefits:number};
type Profile={id:string;email:string|null;full_name:string|null;company_name:string|null};
type LoyaltySettings={enabled:boolean;accrual_enabled:boolean;points_expire_days:number|null};
type Props={searchParams:Promise<{loyalty?:string}>};
const tierLabels:Record<string,string>={platinum:'Platina',gold:'Arany',silver:'Ezüst',standard:'Alap'};
const lifecycleLabels:Record<string,string>={new:'Új',first_time:'Első vásárló',vip:'VIP',repeat:'Visszatérő',active:'Aktív',at_risk:'Kockázatos',winback:'Visszanyerendő',dormant:'Inaktív'};

function settingsText(settings:LoyaltySettings){
 if(!settings.enabled)return 'A hűségprogram ki van kapcsolva. Az ügyfélérték-elemzés ettől még tovább működik.';
 const accrual=settings.accrual_enabled?'Automatikus pontgyűjtés bekapcsolva.':'Automatikus pontgyűjtés kikapcsolva.';
 const expiry=settings.points_expire_days===null?'A pontok nem járnak le.':`A pontok ${settings.points_expire_days} nap után járnak le.`;
 return `${accrual} ${expiry}`;
}

export default async function CustomerValueAdmin({searchParams}:Props){
 await requirePlanFeature('crm');
 const scope=await requireCurrentStoreContext('analytics.read'),a=createAdminClient(),params=await searchParams;
 const[{data,error},settingsResult,canManage]=await Promise.all([
   a.from('customer_loyalty_summary').select('*').eq('instance_id',scope.instanceId).order('value_score',{ascending:false}).limit(250),
   a.from('loyalty_program_settings').select('enabled,accrual_enabled,points_expire_days').eq('instance_id',scope.instanceId).maybeSingle(),
   hasStorePermission(scope.instanceId,'store.manage'),
 ]);
 const rows=(data??[])as Row[],ids=[...new Set(rows.map(r=>r.customer_id).filter(Boolean))];
 const profileResult=ids.length?await a.from('profiles').select('id,email,full_name,company_name').in('id',ids):{data:[]as Profile[],error:null};
 const profiles=(profileResult.data??[])as Profile[],profileById=new Map(profiles.map(p=>[p.id,p]));
 const settings=(settingsResult.data??{enabled:false,accrual_enabled:false,points_expire_days:null})as LoyaltySettings;
 const loadError=Boolean(error||profileResult.error||settingsResult.error);
 const liability=settings.enabled?rows.reduce((s,r)=>s+Math.max(0,Number(r.points_balance||0)),0):0,repeat=rows.filter(r=>Number(r.paid_orders)>=2).length,high=rows.filter(r=>['gold','platinum'].includes(r.value_tier)).length;
 const tiers=['platinum','gold','silver','standard'].map(t=>({tier:t,count:rows.filter(r=>r.value_tier===t).length}));
 return <section className="adminMain">
  <span className="eyebrow">Pro · Ügyfélérték</span><h1 className="sectionTitle">Ügyfélérték és hűség</h1><p className="lead">Az aktuális webshop ügyfeleinek értékszintje, visszatérési teljesítménye és — ha bekapcsolod — hűségpont-egyenlege és előnyei.</p>
  {params.loyalty==='saved'&&<div className="adminSuccessNotice" role="status"><strong>Hűségprogram beállításai mentve.</strong></div>}
  {params.loyalty==='invalid'&&<div className="errorNotice" role="alert"><strong>A lejárati idő 0–3650 nap lehet.</strong><p>A 0 azt jelenti, hogy a pontok nem járnak le.</p></div>}
  {params.loyalty==='forbidden'&&<div className="errorNotice" role="alert"><strong>Nincs jogosultságod a hűségprogram beállításainak módosításához.</strong></div>}
  {params.loyalty==='error'&&<div className="errorNotice" role="alert"><strong>A hűségprogram beállításainak mentése nem igazolható.</strong><p>Az előző állapotot tekintjük érvényesnek.</p></div>}
  {loadError&&<div className="errorNotice"><strong>Az ügyfélérték-adatok egy része most nem tölthető be.</strong></div>}

  <section className="card">
    <div className="sectionHeading"><div><span className="eyebrow">Hűségprogram</span><h2>Hűségprogram beállításai</h2></div><span className={`adminStatePill ${settings.enabled?'success':'neutral'}`}>{settings.enabled?'Bekapcsolva':'Kikapcsolva'}</span></div>
    <p className="muted">{settingsText(settings)}</p>
    {canManage?<form action={updateLoyaltyProgramSettingsAction} className="formGrid">
      <label><span>Hűségprogram</span><select name="enabled" defaultValue={settings.enabled?'on':'off'}><option value="off">Kikapcsolva</option><option value="on">Bekapcsolva</option></select><small className="helperText">Kikapcsolva nem keletkezik új pont és a vásárlói hűségoldal sem jelenik meg.</small></label>
      <label><span>Automatikus pontgyűjtés</span><select name="accrualEnabled" defaultValue={settings.accrual_enabled?'on':'off'}><option value="off">Kikapcsolva</option><option value="on">Bekapcsolva</option></select><small className="helperText">A meglévő pontok megmaradnak; csak az új automatikus jóváírás áll le.</small></label>
      <label><span>Pontok lejárata</span><input name="pointsExpireDays" type="number" min="0" max="3650" step="1" defaultValue={settings.points_expire_days??0}/><small className="helperText">Napok száma. 0 = soha nem jár le.</small></label>
      <div className="actions"><AdminSubmitButton pendingLabel="Mentés…">Hűségbeállítások mentése</AdminSubmitButton></div>
    </form>:<div className="adminAuditNotice"><strong>Csak tulajdonos vagy adminisztrátor módosíthatja.</strong><p>Az elemzési jogosultság a beállítások megtekintésére elegendő.</p></div>}
  </section>

  <section className="auditGuide"><div><span className="eyebrow">Hogyan olvasd?</span><h2>Az értékpontszám nem rangsor, hanem döntéstámogatás</h2></div><p>A pontszám a vásárlási előzményekből és aktivitásból képzett jelzőszám. A szint és az életciklus akkor is működik, ha a hűségprogramot nem használod.</p></section>
  <div className="cards adminMetricCards"><div className="card"><span className="badge">Értékelt ügyfelek</span><div className="price">{error?'—':rows.length}</div></div><div className="card"><span className="badge">Visszatérő ügyfél</span><div className="price">{error?'—':repeat}</div></div><div className="card"><span className="badge">Arany + Platina</span><div className="price">{error?'—':high}</div></div><div className="card"><span className="badge">Felhasználható pontok</span><div className="price">{error?'—':liability.toLocaleString('hu-HU')+' pont'}</div></div></div>
  <section className="card"><h2>Értékszintek</h2><div className="cards">{tiers.map(t=><div key={t.tier}><strong>{tierLabels[t.tier]}</strong><div className="price">{error?'—':t.count}</div></div>)}</div></section>
  <section className="card"><h2>Ügyfelek érték szerint</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Ügyfél</th><th>Értékpont</th><th>Szint</th><th>Életciklus</th><th>Rendelés</th><th>Vásárlási érték</th><th>Pontegyenleg</th><th>Összes jóváírt</th><th>Beváltott</th><th>Lejárt</th><th>Visszavont</th><th>Előny</th></tr></thead><tbody>{rows.map(r=>{const p=profileById.get(r.customer_id);return <tr key={r.customer_id}><td><strong>{p?.full_name||p?.company_name||p?.email||'Ismeretlen ügyfél'}</strong>{p?.full_name&&p.email&&<><br/><span className="muted">{p.email}</span></>}</td><td><strong>{Number(r.value_score).toFixed(0)}</strong></td><td>{tierLabels[r.value_tier]??r.value_tier}</td><td>{lifecycleLabels[r.lifecycle_segment]??r.lifecycle_segment}</td><td>{r.paid_orders}</td><td>{formatHuf(Number(r.revenue_gross_huf))}</td><td>{settings.enabled?Number(r.points_balance).toLocaleString('hu-HU'):'—'}</td><td>{Number(r.lifetime_earned_points).toLocaleString('hu-HU')}</td><td>{Number(r.lifetime_redeemed_points).toLocaleString('hu-HU')}</td><td>{Number(r.lifetime_expired_points??0).toLocaleString('hu-HU')}</td><td>{Number(r.lifetime_reversed_points??0).toLocaleString('hu-HU')}</td><td>{settings.enabled?r.available_benefits:'—'}</td></tr>})}</tbody></table></div>{!loadError&&!rows.length&&<p className="muted">Még nincs elegendő vásárlási előzmény ügyfélérték számításához.</p>}</section>
 </section>;
}
