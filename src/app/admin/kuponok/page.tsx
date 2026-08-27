import { createAdminClient } from '@/lib/supabase/admin';
import { CouponCreateForm,CouponToggle,type CouponRow } from '@/components/admin/coupon-manager';
import { formatHuf } from '@/lib/catalog';

export const dynamic='force-dynamic';

export default async function CouponsAdmin(){
  const admin=createAdminClient(); const {data}=await admin.from('coupons').select('id,code,description,discount_type,discount_value,min_subtotal_huf,max_discount_huf,usage_limit,usage_count,starts_at,ends_at,active').order('created_at',{ascending:false}); const coupons=(data??[]) as CouponRow[];
  const active=coupons.filter(c=>c.active).length; const uses=coupons.reduce((s,c)=>s+c.usage_count,0);
  return <section className="adminMain"><span className="eyebrow">Admin · Kuponok</span><h1 className="sectionTitle">Kedvezmények</h1><p className="lead">A kupon csak előnézetben számolódik a kliensen; a végleges kedvezményt a rendelési adatbázis-tranzakció validálja.</p>
    <div className="cards"><div className="card"><span className="badge">Aktív</span><h2>{active}</h2><p className="muted">jelenleg használható kupon</p></div><div className="card"><span className="badge">Felhasználás</span><h2>{uses}</h2><p className="muted">összes kuponhasználat</p></div></div>
    <CouponCreateForm/>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Kód</th><th>Kedvezmény</th><th>Minimum</th><th>Használat</th><th>Időablak</th><th>Állapot</th><th>Művelet</th></tr></thead><tbody>{coupons.map(c=><tr key={c.id}><td><strong>{c.code}</strong><br/><span className="muted">{c.description??'—'}</span></td><td>{c.discount_type==='percent'?`${c.discount_value}%`:formatHuf(c.discount_value)}{c.max_discount_huf&&<><br/><span className="muted">max {formatHuf(c.max_discount_huf)}</span></>}</td><td>{formatHuf(c.min_subtotal_huf)}</td><td>{c.usage_count} / {c.usage_limit??'∞'}</td><td><span className="muted">{c.starts_at?new Intl.DateTimeFormat('hu-HU').format(new Date(c.starts_at)):'azonnal'} → {c.ends_at?new Intl.DateTimeFormat('hu-HU').format(new Date(c.ends_at)):'nincs lejárat'}</span></td><td><span className="badge">{c.active?'Aktív':'Inaktív'}</span></td><td><CouponToggle coupon={c}/></td></tr>)}</tbody></table>{coupons.length===0&&<p className="muted" style={{padding:20}}>Még nincs kupon.</p>}</div>
  </section>;
}
