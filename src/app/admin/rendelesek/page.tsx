import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';

const labels: Record<string,string> = { draft:'Piszkozat', pending:'Függőben', paid:'Fizetve', processing:'Feldolgozás', shipped:'Átadva', completed:'Teljesítve', cancelled:'Törölve', refunded:'Visszatérítve' };

type OrderRow = { id:string; order_number:string; billing_name:string; customer_email:string; status:string; total_gross_huf:number; shipping_method:string|null; payment_method:string|null; created_at:string };

export default async function OrdersAdmin() {
  let orders: OrderRow[] = [];
  try {
    const supabase = await createClient();
    const result = await supabase.from('orders').select('id,order_number,billing_name,customer_email,status,total_gross_huf,shipping_method,payment_method,created_at').order('created_at',{ascending:false}).limit(100);
    if (!result.error && result.data) orders = result.data as OrderRow[];
  } catch {}
  const revenue = orders.filter(o=>['paid','processing','shipped','completed'].includes(o.status)).reduce((sum,o)=>sum+o.total_gross_huf,0);
  return <section className="adminMain">
    <span className="eyebrow">Admin · Rendelések</span><h1 className="sectionTitle">Rendelési központ</h1>
    <div className="cards"><div className="card"><strong>{orders.length}</strong><p className="muted">legutóbbi rendelés</p></div><div className="card"><strong>{formatHuf(revenue)}</strong><p className="muted">fizetett forgalom</p></div></div>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Vásárló</th><th>Állapot</th><th>Szállítás / fizetés</th><th>Összeg</th><th>Dátum</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.order_number}</strong></td><td>{o.billing_name}<br/><span className="muted">{o.customer_email}</span></td><td><span className="badge">{labels[o.status] ?? o.status}</span></td><td>{o.shipping_method ?? '—'} / {o.payment_method ?? '—'}</td><td>{formatHuf(o.total_gross_huf)}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(o.created_at))}</td></tr>)}</tbody></table>{orders.length===0&&<p className="muted" style={{padding:20}}>Még nincs megjeleníthető rendelés.</p>}</div>
  </section>;
}
