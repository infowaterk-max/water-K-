import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';
import { OrderStatusControl } from '@/components/admin/order-status-control';

const labels:Record<string,string>={draft:'Piszkozat',pending:'Függőben',paid:'Fizetve',processing:'Feldolgozás',shipped:'Átadva',completed:'Teljesítve',cancelled:'Törölve',refunded:'Visszatérítve'};
const eventLabels:Record<string,string>={order_created:'Rendelés létrehozva',status_changed:'Állapot módosítva',shipment_created:'Szállítás létrehozva',invoice_created:'Számla létrehozva',legal_terms_accepted:'ÁSZF és adatkezelés elfogadva',integration_enqueue_failed:'Integrációs feladat sikertelen',order_updated:'Rendelés frissítve'};

export default async function AdminOrderPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const supabase=await createClient();
 const [{data:order},{data:items},{data:events},{data:jobs}]=await Promise.all([
  supabase.from('orders').select('*').eq('id',id).maybeSingle(),
  supabase.from('order_items').select('id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf').eq('order_id',id),
  supabase.from('order_events').select('id,event_type,from_status,to_status,metadata,created_at').eq('order_id',id).order('created_at',{ascending:false}),
  supabase.from('integration_jobs').select('id,kind,provider,status,attempt_count,last_error,created_at,updated_at').eq('order_id',id).order('created_at',{ascending:false}),
 ]);
 if(!order)notFound();
 return <section className="adminMain"><div className="sectionIntro"><div><span className="eyebrow">Admin · Rendelés</span><h1 className="sectionTitle">{order.order_number}</h1></div><Link className="btn btnGhost" href="/admin/rendelesek">Vissza a rendelésekhez</Link></div>
  <div className="cards"><article className="card"><h3>Állapot</h3><div className="price">{labels[order.status]??order.status}</div><OrderStatusControl id={order.id} status={order.status}/></article><article className="card"><h3>Végösszeg</h3><div className="price">{formatHuf(order.total_gross_huf)}</div><p className="muted">Kedvezmény: {formatHuf(order.discount_gross_huf??0)}{order.coupon_code?` · ${order.coupon_code}`:''}</p></article><article className="card"><h3>Logisztika</h3><div className="price">{order.shipping_method??'—'}</div><p className="muted">{order.tracking_number?`Tracking: ${order.tracking_number}`:'Nincs tracking azonosító'}</p></article></div>
  <div className="splitFeature" style={{marginTop:28}}><section className="featurePanel"><span className="eyebrow">Vásárló és számlázás</span><h2>{order.billing_name}</h2><p className="muted">{order.customer_email}<br/>{order.customer_phone??''}<br/>{order.billing_company&&<>{order.billing_company}<br/></>}{order.billing_tax_number&&<>Adószám: {order.billing_tax_number}<br/></>}{order.billing_postcode} {order.billing_city}, {order.billing_address}</p></section><section className="featurePanel"><span className="eyebrow">Szállítás és fizetés</span><h2>{order.shipping_name||order.billing_name}</h2><p className="muted">{order.shipping_postcode} {order.shipping_city}, {order.shipping_address}<br/>Fizetés: {order.payment_method??'—'}<br/>{order.parcel_point_id?`Csomagpont: ${order.parcel_point_id}`:''}</p>{order.invoice_url&&<a className="btn btnGhost" href={order.invoice_url} target="_blank" rel="noreferrer">Számla megnyitása</a>}</section></div>
  <section className="tableCard" style={{marginTop:28}}><table className="adminTable"><thead><tr><th>Termék</th><th>SKU</th><th>Mennyiség</th><th>Egységár</th><th>Összesen</th></tr></thead><tbody>{(items??[]).map(i=><tr key={i.id}><td><strong>{i.product_name}</strong><br/><span className="muted">{i.variant_label}</span></td><td>{i.sku}</td><td>{i.quantity}</td><td>{formatHuf(i.unit_gross_huf)}</td><td>{formatHuf(i.line_total_gross_huf)}</td></tr>)}</tbody></table></section>
  <div className="splitFeature" style={{marginTop:28}}><section className="card"><span className="eyebrow">Rendelési audit</span><h2>Eseménytörténet</h2><div className="timeline">{(events??[]).map(e=><div key={e.id} className="timelineItem"><strong>{eventLabels[e.event_type]??e.event_type}{e.event_type==='status_changed'?` · ${labels[e.from_status]??e.from_status} → ${labels[e.to_status]??e.to_status}`:''}</strong><span className="muted">{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(e.created_at))}</span></div>)}</div></section><section className="card"><span className="eyebrow">Automatizmusok</span><h2>Integrációs feladatok</h2><div className="timeline">{(jobs??[]).map(j=><div key={j.id} className="timelineItem"><strong>{j.kind} · {j.provider}</strong><span className="muted">{j.status} · próbálkozás: {j.attempt_count??0}{j.last_error?` · ${j.last_error}`:''}</span></div>)}</div>{!jobs?.length&&<p className="muted">Ehhez a rendeléshez még nincs integrációs feladat.</p>}</section></div>
  {order.note&&<section className="card" style={{marginTop:28}}><span className="eyebrow">Vásárlói megjegyzés</span><p>{order.note}</p></section>}
 </section>;
}
