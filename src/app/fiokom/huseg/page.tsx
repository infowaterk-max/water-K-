import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export const dynamic='force-dynamic';

type Summary={
  value_score?:number;
  value_tier?:string;
  lifecycle_segment?:string;
  paid_orders?:number;
  revenue_gross_huf?:number;
  points_balance?:number;
  lifetime_earned_points?:number;
  lifetime_redeemed_points?:number;
  lifetime_expired_points?:number;
  lifetime_reversed_points?:number;
  available_benefits?:number;
};
type Benefit={rule_key:string;benefit_type:string;benefit_value:number|null;metadata:Record<string,unknown>};
type Ledger={id:string;entry_type:string;points:number;reason:string;occurred_at:string};
type Settings={enabled:boolean;accrual_enabled:boolean;points_expire_days:number|null};

const entryTypeLabels:Record<string,string>={
  earn:'Jóváírás',
  redeem:'Beváltás',
  expire:'Lejárat',
  reversal:'Visszavonás',
  adjust:'Korrekció',
};

export default async function LoyaltyPage(){
  const supabase=await createClient();
  const{data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/fiokom');

  const instance=await getCurrentWebshopInstance();
  if(!instance)redirect('/fiokom');

  const brandName=instance.brand.name??'Webáruház',admin=createAdminClient();
  const settingsResult=await admin.from('loyalty_program_settings')
    .select('enabled,accrual_enabled,points_expire_days')
    .eq('instance_id',instance.id)
    .maybeSingle();
  const settings=(settingsResult.data??{enabled:false,accrual_enabled:false,points_expire_days:null})as Settings;

  if(settingsResult.error){
    return <main className="section"><div className="shell"><h1 className="sectionTitle">Hűségprogram</h1><div className="card"><p className="muted">A hűségprogram állapota jelenleg nem ellenőrizhető.</p><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div></div></main>;
  }

  if(!settings.enabled){
    return <main className="section accountPage"><div className="shell"><span className="eyebrow">{brandName}</span><h1 className="sectionTitle">A hűségprogram jelenleg nincs bekapcsolva.</h1><p className="lead">A webshop most nem gyűjt és nem használ hűségpontokat. A vásárlási előzményeid ettől függetlenül a fiókodban megmaradnak.</p><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div></main>;
  }

  const{data,error}=await admin.rpc('get_customer_loyalty_snapshot_v2',{p_instance_id:instance.id,p_customer_id:user.id});
  if(error)return <main className="section"><div className="shell"><h1 className="sectionTitle">Hűségprogram</h1><div className="card"><p className="muted">A hűségadatok jelenleg nem érhetők el.</p><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div></div></main>;

  const snap=(data??{})as{summary?:Summary;benefits?:Benefit[];ledger?:Ledger[]};
  const s=snap.summary??{},benefits=snap.benefits??[],ledger=snap.ledger??[];
  const expiryText=settings.points_expire_days===null?'A pontjaid nem járnak le.':`A pontok ${settings.points_expire_days} nap után járnak le.`;
  const accrualText=settings.accrual_enabled?'Az automatikus pontgyűjtés aktív.':'Az automatikus pontgyűjtés jelenleg szünetel.';

  return <main className="section accountPage"><div className="shell">
    <span className="eyebrow">{brandName} hűségprogram</span>
    <h1 className="sectionTitle">Az értéked nálunk számít.</h1>
    <p className="lead">A hűségpontok és előnyök a tényleges vásárlási előzményeid alapján, átlátható szabályok szerint épülnek. {accrualText} {expiryText}</p>
    <div className="cards accountQuickGrid">
      <article className="card"><span className="badge">Pontegyenleg</span><div className="price">{Number(s.points_balance??0).toLocaleString('hu-HU')}</div><p className="muted">Aktuálisan rendelkezésre álló pont.</p></article>
      <article className="card"><span className="badge">Szinted</span><h2>{String(s.value_tier??'standard').toUpperCase()}</h2><p className="muted">Értékpontszám: {Number(s.value_score??0).toFixed(0)}/100</p></article>
      <article className="card"><span className="badge">Elérhető előny</span><div className="price">{s.available_benefits??0}</div><p className="muted">A jelenlegi szinted alapján.</p></article>
      <article className="card"><span className="badge">Összes jóváírás</span><div className="price">{Number(s.lifetime_earned_points??0).toLocaleString('hu-HU')}</div><p className="muted">Beváltva: {Number(s.lifetime_redeemed_points??0).toLocaleString('hu-HU')} · Lejárt: {Number(s.lifetime_expired_points??0).toLocaleString('hu-HU')} · Visszavont: {Number(s.lifetime_reversed_points??0).toLocaleString('hu-HU')} pont.</p></article>
    </div>
    <section className="featurePanel"><span className="eyebrow">Aktív előnyök</span><h2>A jelenlegi szintedhez tartozó előnyök</h2>{benefits.length?<div className="cards">{benefits.map(b=><article className="card" key={b.rule_key}><strong>{String(b.metadata?.description??b.rule_key)}</strong><p className="muted">{b.benefit_type==='points_multiplier'&&b.benefit_value?`${Math.round((Number(b.benefit_value)-1)*100)}% extra pont a jogosult vásárlásoknál.`:'Jogosultság a szabály feltételei szerint.'}</p></article>)}</div>:<p className="muted">Jelenleg nincs külön aktiválható előnyöd. A vásárlási előzményeiddel automatikusan magasabb szintre kerülhetsz.</p>}</section>
    <section className="card"><h2>Legutóbbi pontmozgások</h2><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Dátum</th><th>Típus</th><th>Pont</th><th>Indok</th></tr></thead><tbody>{ledger.map(l=><tr key={l.id}><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(l.occurred_at))}</td><td>{entryTypeLabels[l.entry_type]??l.entry_type}</td><td><strong>{l.points>0?'+':''}{l.points}</strong></td><td>{l.reason}</td></tr>)}</tbody></table></div>{!ledger.length&&<p className="muted">Még nincs pontmozgásod.</p>}</section>
  </div></main>;
}
