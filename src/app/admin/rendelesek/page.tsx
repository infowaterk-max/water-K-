import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';

const labels: Record<string,string> = { draft:'Piszkozat', pending_payment:'Fizetésre vár', pending_transfer:'Átutalásra vár', paid:'Fizetve', processing:'Feldolgozás', shipped:'Átadva', completed:'Teljesítve', cancelled:'Törölve', refunded:'Visszatérítve' };

export default async function OrdersAdmin() {
  let orders: Array<{id:string;order_number:number;customer_name:string;customer_email:string;status:string;total_gross:number;shipping_method:string;payment_method:string;created_at:string}> = [];
  try {
    const supabase = await createClient();
    const result = await supabase.from('orders').select('id,order_number,customer_name,customer_email,status,total_gross,shipping_method,payment_method,created_at').order('created_at',{ascending:false}).limit(100);
    if (!result.error && result.data) orders = result.data;
  } catch {}
  const revenue = orders.filter(o => ['paid','processing','shipped','completed'].includes(o.status)).reduce((sum,o)=>sum+o.total_gross,0);
  return <section className="adminMain">
    <span className="eyebrow">Admin · Rendelések</span><h1 className="sectionTitle">Rendelési központ</h1>
    <div className="cards"><div className="card"><strong>{orders.length}</strong><p className="muted">legutóbbi rendelés</p></div><div className="card"><strong>{formatHuf(revenue)}</strong><p className="muted">fizetett forgalom</p></div></div>
    <div className="card"><div className="adminToolbar"><strong>Beérkezett rendelések</strong><span className="badge">Élő adatbázis</span></div>
      {orders.length === 0 ? <p className="muted">Még nincs megjeleníthető rendelés, vagy az admin jogosultság nincs beállítva.</p> :
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Rendelés</th><th>Vásárló</th><th>Állapot</th><th>Összeg</th><th>Dátum</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>WK-{o.order_number}</td><td><strong>{o.customer_name}</strong><br/><small>{o.customer_email}</small></td><td><span className="badge">{labels[o.status] ?? o.status}</span></td><td>{formatHuf(o.total_gross)}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(o.created_at))}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
