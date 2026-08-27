import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';
import { OrderStatusControl } from '@/components/admin/order-status-control';

const labels: Record<string,string> = { draft:'Piszkozat', pending:'Függőben', paid:'Fizetve', processing:'Feldolgozás', shipped:'Átadva', completed:'Teljesítve', cancelled:'Törölve', refunded:'Visszatérítve' };
type OrderRow = { id:string; order_number:string; billing_name:string; customer_email:string; status:string; total_gross_huf:number; discount_gross_huf:number; coupon_code:string|null; shipping_method:string|null; payment_method:string|null; tracking_number:string|null; created_at:string };
type Props={searchParams:Promise<{q?:string;status?:string}>};

export default async function OrdersAdmin({searchParams}:Props) {
  const params=await searchParams; const q=(params.q??'').trim().slice(0,120); const status=(params.status??'').trim();
  let orders: OrderRow[]=[];
  try {
    const supabase=await createClient();
    let query=supabase.from('orders').select('id,order_number,billing_name,customer_email,status,total_gross_huf,discount_gross_huf,coupon_code,shipping_method,payment_method,tracking_number,created_at').order('created_at',{ascending:false}).limit(200);
    if(status&&Object.prototype.hasOwnProperty.call(labels,status)) query=query.eq('status',status);
    if(q) query=query.or(`order_number.ilike.%${q.replaceAll(',','')}%,customer_email.ilike.%${q.replaceAll(',','')}%,billing_name.ilike.%${q.replaceAll(',','')}%`);
    const result=await query; if(!result.error&&result.data) orders=result.data as OrderRow[];
  } catch {}
  const revenue=orders.filter(o=>['paid','processing','shipped','completed'].includes(o.status)).reduce((sum,o)=>sum+o.total_gross_huf,0);
  const discounts=orders.reduce((sum,o)=>sum+(o.discount_gross_huf??0),0); const active=orders.filter(o=>['pending','paid','processing'].includes(o.status)).length;
  return <section className="adminMain"><span className="eyebrow">Admin · Rendelések</span><h1 className="sectionTitle">Rendelési központ</h1>
    <div className="cards"><div className="card"><strong>{orders.length}</strong><p className="muted">találat az aktuális szűrésben</p></div><div className="card"><strong>{active}</strong><p className="muted">aktív rendelés</p></div><div className="card"><strong>{formatHuf(revenue)}</strong><p className="muted">fizetett forgalom</p></div><div className="card"><strong>{formatHuf(discounts)}</strong><p className="muted">adott kedvezmény</p></div></div>
    <form className="card adminToolbar" method="get"><input name="q" defaultValue={q} placeholder="Rendelésszám, név vagy e-mail"/><select name="status" defaultValue={status}><option value="">Minden állapot</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="btn btnPrimary" type="submit">Szűrés</button>{(q||status)&&<Link className="btn" href="/admin/rendelesek">Szűrés törlése</Link>}</form>
    <div className="tableCard"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Vásárló</th><th>Állapot</th><th>Szállítás / fizetés</th><th>Kedvezmény</th><th>Összeg</th><th>Dátum</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>{o.order_number}</strong>{o.tracking_number&&<><br/><span className="muted">{o.tracking_number}</span></>}</td><td>{o.billing_name}<br/><span className="muted">{o.customer_email}</span></td><td><span className="badge">{labels[o.status]??o.status}</span><div style={{marginTop:8}}><OrderStatusControl id={o.id} status={o.status}/></div></td><td>{o.shipping_method??'—'} / {o.payment_method??'—'}</td><td>{o.discount_gross_huf>0?<><strong>−{formatHuf(o.discount_gross_huf)}</strong><br/><span className="muted">{o.coupon_code??'kupon'}</span></>:'—'}</td><td>{formatHuf(o.total_gross_huf)}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(o.created_at))}</td></tr>)}</tbody></table>{orders.length===0&&<p className="muted" style={{padding:20}}>Nincs a szűrésnek megfelelő rendelés.</p>}</div>
  </section>;
}
