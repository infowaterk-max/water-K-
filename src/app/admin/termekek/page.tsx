import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';
import { InventoryEditor } from '@/components/admin/inventory-editor';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const sellingStatuses=['paid','processing','shipped','completed'];

export default async function AdminProducts() {
  const products=await getProducts(); const admin=createAdminClient(); const since=new Date(Date.now()-30*86400000).toISOString();
  const [{data:partnerRows},{data:recentOrders},{data:recentItems}]=await Promise.all([
    admin.from('product_variants').select('id,reseller_gross_price_huf,reseller_net_price_huf'),
    admin.from('orders').select('id,status').gte('created_at',since).in('status',sellingStatuses),
    admin.from('order_items').select('order_id,variant_id,quantity')
  ]);
  const partnerPrice=new Map((partnerRows??[]).map(row=>[row.id,row])); const orderIds=new Set((recentOrders??[]).map(o=>o.id)); const sold30=new Map<string,number>();
  for(const item of recentItems??[]){if(item.variant_id&&orderIds.has(item.order_id)) sold30.set(item.variant_id,(sold30.get(item.variant_id)??0)+item.quantity);}
  const forecasts=products.map(product=>{const sold=sold30.get(product.id)??0;const daily=sold/30;const days=daily>0?Math.floor(product.stock/daily):null;const reorder=daily>0?Math.ceil(daily*21):null;const level=product.stock<=0?'critical':days!==null&&days<=14?'critical':days!==null&&days<=30?'warning':'ok';return {id:product.id,name:product.name,stock:product.stock,sold,daily,days,reorder,level};}).sort((a,b)=>({critical:0,warning:1,ok:2}[a.level]-{critical:0,warning:1,ok:2}[b.level]));
  const alerts=forecasts.filter(f=>f.level!=='ok');
  return <section className="adminMain"><span className="eyebrow">Admin · Termékek</span><h1 className="sectionTitle">Termékkatalógus és készlettervezés</h1>
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Készletriasztás</span><div className="price">{alerts.length}</div><p className="muted">kiszerelés igényel figyelmet</p></div><div className="card"><span className="badge">30 napos fogyás</span><div className="price">{forecasts.reduce((s,f)=>s+f.sold,0)} db</div><p className="muted">fizetett/teljesítés alatt lévő rendelésekből</p></div></div>
    {alerts.length>0&&<section className="featurePanel"><span className="eyebrow">Utánrendelési figyelmeztetés</span><h2>Készlet, amely hamarosan beavatkozást kér</h2><div className="integrationList">{alerts.map(f=><div key={f.id}><span><strong>{f.name}</strong> · {f.stock} db készleten</span><strong>{f.days===null?'Nincs fogyási adat':`kb. ${f.days} nap`}</strong></div>)}</div></section>}
    <div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Kiszerelés</th><th>Lakossági ár</th><th>Készlet és árak</th><th>Partnerár</th><th>30 napos készlet-előrejelzés</th></tr></thead><tbody>{products.map(product=>{const partner=partnerPrice.get(product.id);const f=forecasts.find(x=>x.id===product.id)!;return <tr key={product.id}><td><strong>{product.name}</strong><br/><span className="muted">{product.slug}</span></td><td>{formatHuf(product.grossPrice)}<br/><span className="muted">nettó {formatHuf(product.netPrice)}</span></td><td><InventoryEditor id={product.id} stock={product.stock} grossPrice={product.grossPrice} netPrice={product.netPrice} resellerGrossPrice={partner?.reseller_gross_price_huf??null} resellerNetPrice={partner?.reseller_net_price_huf??null}/></td><td>{partner?.reseller_gross_price_huf!=null?<><strong>{formatHuf(partner.reseller_gross_price_huf)}</strong><br/><span className="muted">nettó {partner.reseller_net_price_huf!=null?formatHuf(partner.reseller_net_price_huf):'—'}</span></>:<span className="badge">Nincs beállítva</span>}</td><td><strong>{f.sold} db / 30 nap</strong><br/><span className="muted">{f.days===null?'Még nincs elég fogyási adat':`kb. ${f.days} napnyi készlet`}</span>{f.reorder!==null&&<><br/><span className="muted">21 napos célkészlet: {f.reorder} db</span></>}</td></tr>;})}</tbody></table></div>
    <p className="muted">Az előrejelzés az utolsó 30 nap fizetett vagy teljesítés alatt lévő rendeléseinek átlagos napi fogyásából számol. Ez operatív készletjelzés, nem szezonális értékesítési prognózis.</p>
    <p className="muted">A partnerár kizárólag jóváhagyott viszonteladói rendelésnél alkalmazódik az adatbázisban. A publikus katalógus nem kapja meg ezt az árat.</p>
  </section>;
}
