import Link from 'next/link';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminPage() {
  const products=await getProducts();
  const catalogValue=products.reduce((sum,p)=>sum+p.grossPrice*p.stock,0);
  const lowStockProducts=products.filter(p=>p.stock<=10).sort((a,b)=>a.stock-b.stock);
  const outOfStock=products.filter(p=>p.stock<=0);
  const now=Date.now(); const day=24*60*60*1000; const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  let orders=0;let pending=0;let paidRevenue=0;let paidOrders=0;let stalePending=0;let staleProcessing=0;let staleShipped=0;let todayOrders=0;let todayRevenue=0;let weekOrders=0;let weekRevenue=0;let openOrderValue=0;let orderLoadError=false;
  try{
    const supabase=await createClient();
    const {data,error}=await supabase.from('orders').select('status,total_gross_huf,created_at').order('created_at',{ascending:false}).limit(1000);
    if(error)orderLoadError=true;else if(data){
      orders=data.length; pending=data.filter(o=>o.status==='pending').length;
      const paid=data.filter(o=>['paid','processing','shipped','completed'].includes(o.status)); paidOrders=paid.length; paidRevenue=paid.reduce((s,o)=>s+Number(o.total_gross_huf||0),0);
      stalePending=data.filter(o=>o.status==='pending'&&new Date(o.created_at).getTime()<now-day).length;
      staleProcessing=data.filter(o=>o.status==='processing'&&new Date(o.created_at).getTime()<now-2*day).length;
      staleShipped=data.filter(o=>o.status==='shipped'&&new Date(o.created_at).getTime()<now-3*day).length;
      todayOrders=data.filter(o=>new Date(o.created_at).getTime()>=todayStart.getTime()).length;
      todayRevenue=data.filter(o=>['paid','processing','shipped','completed'].includes(o.status)&&new Date(o.created_at).getTime()>=todayStart.getTime()).reduce((s,o)=>s+Number(o.total_gross_huf||0),0);
      weekOrders=data.filter(o=>new Date(o.created_at).getTime()>=now-7*day).length;
      weekRevenue=data.filter(o=>['paid','processing','shipped','completed'].includes(o.status)&&new Date(o.created_at).getTime()>=now-7*day).reduce((s,o)=>s+Number(o.total_gross_huf||0),0);
      openOrderValue=data.filter(o=>['pending','paid','processing','shipped'].includes(o.status)).reduce((s,o)=>s+Number(o.total_gross_huf||0),0);
    }
  }catch{orderLoadError=true;}
  let integrationFailed=0;let integrationBlocked=0;let integrationPending=0;let integrationStuck=0;let integrationLoadError=false;
  try{const admin=createAdminClient();const {data,error}=await admin.from('integration_jobs').select('status,updated_at').limit(1000);if(error)integrationLoadError=true;else if(data){integrationFailed=data.filter(j=>j.status==='failed').length;integrationBlocked=data.filter(j=>j.status==='blocked').length;integrationPending=data.filter(j=>j.status==='pending').length;const stuckCutoff=now-30*60*1000;integrationStuck=data.filter(j=>j.status==='processing'&&new Date(j.updated_at).getTime()<stuckCutoff).length;}}catch{integrationLoadError=true;}
  const averageOrder=paidOrders?Math.round(paidRevenue/paidOrders):0;
  const operationalIssues=stalePending+staleProcessing+staleShipped+integrationFailed+integrationBlocked+integrationStuck+outOfStock.length;
  const supabaseReady=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  const serverKeyReady=Boolean(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const khReady=Boolean(process.env.KH_MERCHANT_ID&&(process.env.KH_API_SECRET||process.env.KH_SECRET));
  return <section className="adminMain"><span className="eyebrow">Water-K saját admin</span><h1 className="sectionTitle">Kereskedelmi irányítópult</h1><p className="lead">Napi forgalom, munkasor, készlet és integrációs állapot egyetlen döntési felületen.</p>
    {(orderLoadError||integrationLoadError)&&<div className="errorNotice" role="alert"><strong>Az irányítópult egyes élő adatai most nem érhetők el.</strong> A hiányzó mutatókat ne tekintsd nullának.</div>}
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Ma</span><h3>{todayOrders} rendelés</h3><div className="price">{formatHuf(todayRevenue)}</div><p className="muted">Mai fizetett forgalom.</p></div><div className="card"><span className="badge">Utolsó 7 nap</span><h3>{weekOrders} rendelés</h3><div className="price">{formatHuf(weekRevenue)}</div><p className="muted">Heti fizetett forgalom.</p></div><div className="card"><span className="badge">Nyitott állomány</span><h3>{pending} fizetésre vár</h3><div className="price">{formatHuf(openOrderValue)}</div><p className="muted">Még le nem zárt rendelések bruttó értéke.</p></div><div className="card"><span className="badge">Kosárérték</span><h3>Fizetett átlag</h3><div className="price">{formatHuf(averageOrder)}</div><p className="muted">{paidOrders} fizetett vagy teljesített rendelés alapján.</p></div></div>
    <section className="card"><div className="adminToolbar"><div><span className="eyebrow">Mai munkasor</span><h2>{operationalIssues?`${operationalIssues} tétel igényel figyelmet`:'Nincs kritikus teendő'}</h2><p className="muted">A rendszer a késedelmes rendeléseket, készlethiányt és integrációs hibákat együtt priorizálja.</p></div><Link className="btn btnPrimary" href="/admin/rendelesek">Rendelési központ</Link></div><div className="cards"><Link className="card textLink" href="/admin/rendelesek?status=pending"><strong>{stalePending}</strong><p className="muted">24+ órája fizetésre vár</p></Link><Link className="card textLink" href="/admin/rendelesek?status=processing"><strong>{staleProcessing}</strong><p className="muted">48+ órája feldolgozás alatt</p></Link><Link className="card textLink" href="/admin/rendelesek?status=shipped"><strong>{staleShipped}</strong><p className="muted">3+ napja feladva, még nincs lezárva</p></Link><Link className="card textLink" href="/admin/integraciok"><strong>{integrationFailed+integrationBlocked+integrationStuck}</strong><p className="muted">integrációs beavatkozás</p></Link><Link className="card textLink" href="/admin/termekek"><strong>{outOfStock.length}</strong><p className="muted">elfogyott kiszerelés</p></Link></div></section>
    {lowStockProducts.length>0&&<section className="card"><div className="adminToolbar"><div><span className="eyebrow">Készletfigyelés</span><h2>{lowStockProducts.length} kiszerelés utánrendelést igényel</h2><p className="muted">Becsült aktuális listaérték: {formatHuf(catalogValue)}.</p></div><Link className="btn" href="/admin/termekek">Készletkezelés</Link></div><div className="cards">{lowStockProducts.map(product=><article className="card" key={product.id}><span className="badge">{product.stock===0?'Elfogyott':'Alacsony készlet'}</span><h3>{product.name}</h3><div className="price">{product.stock} db</div><p className="muted">Bruttó listaár: {formatHuf(product.grossPrice)}</p></article>)}</div></section>}
    <div className="splitFeature adminReadiness"><section className="featurePanel"><span className="eyebrow">Rendszerállapot</span><h2>Integrációs readiness</h2><div className="integrationList"><div><span>Supabase adatbázis és Auth</span><strong>{supabaseReady?'Konfigurálva':'Bekötésre vár'}</strong></div><div><span>Szerveroldali Supabase kulcs</span><strong>{serverKeyReady?'Aktív':'Hiányzik'}</strong></div><div><span>K&H bankkártyás fizetés</span><strong>{khReady?'Kulcsok érzékelve':'Sandbox adatokra vár'}</strong></div><div><span>Foxpost / GLS / MPL</span><strong>Adapterréteg kész</strong></div><div><span>Integrációs műveleti sor</span><strong>{integrationLoadError?'Nem ellenőrizhető':integrationFailed+integrationBlocked+integrationStuck?'Figyelmet igényel':'Rendben'}</strong></div></div></section><section className="featurePanel darkPanel"><span className="eyebrow">Kereskedelmi állapot</span><h2>{orders} rendelés az adatbázisban.</h2><ul className="featureList"><li>{formatHuf(paidRevenue)} összes fizetett forgalom</li><li>{integrationPending} integrációs feladat vár feldolgozásra</li><li>{lowStockProducts.length} alacsony készletű kiszerelés</li><li>{operationalIssues} jelenlegi beavatkozási jelzés</li></ul></section></div>
  </section>;
}
