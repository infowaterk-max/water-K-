import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';
import { OrderStatusControl } from '@/components/admin/order-status-control';

const labels: Record<string,string> = { draft:'Piszkozat', pending:'Függőben', paid:'Fizetve', processing:'Feldolgozás', shipped:'Átadva', completed:'Teljesítve', cancelled:'Törölve', refunded:'Visszatérítve' };
const shippingLabels:Record<string,string>={foxpost:'Foxpost',gls:'GLS',mpl:'MPL',pickup:'Személyes átvétel'};
const paymentLabels:Record<string,string>={kh_card:'K&H bankkártya',bank_transfer:'Banki átutalás'};
type OrderRow = { id:string; order_number:string; billing_name:string; customer_email:string; status:string; total_gross_huf:number; discount_gross_huf:number; coupon_code:string|null; shipping_method:string|null; payment_method:string|null; tracking_number:string|null; created_at:string };
type Props={searchParams:Promise<{q?:string;status?:string}>};

export default async function OrdersAdmin({searchParams}:Props) {
  const params=await searchParams; const q=(params.q??'').trim().slice(0,120); const status=(params.status??'').trim();
  let orders: OrderRow[]=[]; let loadError=false;
  try {
    const supabase=await createClient();
    let query=supabase.from('orders').select('id,order_number,billing_name,customer_email,status,total_gross_huf,discount_gross_huf,coupon_code,shipping_method,payment_method,tracking_number,created_at').order('created_at',{ascending:false}).limit(200);
    if(status&&Object.prototype.hasOwnProperty.call(labels,status)) query=query.eq('status',status);
    if(q){const safe=q.replaceAll(',','').replaceAll('%','').replaceAll('_','');query=query.or(`order_number.ilike.%${safe}%,customer_email.ilike.%${safe}%,billing_name.ilike.%${safe}%`);}
    const result=await query; if(result.error) loadError=true; else if(result.data) orders=result.data as OrderRow[];
  } catch {loadError=true;}
  const revenue=orders.filter(o=>['paid','processing','shipped','completed'].includes(o.status)).reduce((sum,o)=>sum+o.total_gross_huf,0);
  const discounts=orders.reduce((sum,o)=>sum+(o.discount_gross_huf??0),0); const active=orders.filter(o=>['pending','paid','processing'].includes(o.status)).length;
  const awaitingPayment=orders.filter(o=>o.status==='pending').length; const processing=orders.filter(o=>o.status==='processing').length; const readyToClose=orders.filter(o=>o.status==='shipped').length;
  return <section className="adminMain"><span className="eyebrow">Admin · Rendelések</span><h1 className="sectionTitle">Rendelési központ</h1><p className="lead">A napi rendelésfeldolgozás egy helyen: fizetés, teljesítés, szállítás és ügyfélkeresés.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A rendelési lista most nem tölthető be.</strong> Frissítsd az oldalt; állapotot addig ne módosíts.</div>}
    <div className="cards"><div className="card"><strong>{orders.length}</strong><p className="muted">találat az aktuális szűrésben</p></div><div className="card"><strong>{active}</strong><p className="muted">aktív rendelés</p></div><div className="card"><strong>{formatHuf(revenue)}</strong><p className="muted">fizetett forgalom</p></div><div className="card"><strong>{formatHuf(discounts)}</strong><p className="muted">adott kedvezmény</p></div></div>
    <div className="cards" aria-label="Munkasor"><Link className="card textLink" href="/admin/rendelesek?status=pending"><strong>{awaitingPayment}</strong><p className="muted">fizetésre vár</p></Link><Link className="card textLink" href="/admin/rendelesek?status=processing"><strong>{processing}</strong><p className="muted">feldolgozás alatt</p></Link><Link className="card textLink" href="/admin/rendelesek?status=shipped"><strong>{readyToClose}</strong><p className="muted">átadva, lezárható</p></Link><Link className="card textLink" href="/admin/rendelesek"><strong>Összes</strong><p className="muted">teljes rendelési lista</p></Link></div>
    <form className="card adminToolbar" method="get" role="search"><label><span className="srOnly">Rendelés keresése</span><input name="q" defaultValue={q} placeholder="Rendelésszám, név vagy e-mail" autoComplete="off"/></label><label><span className="srOnly">Állapot szűrése</span><select name="status" defaultValue={status}><option value="">Minden állapot</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button className="btn btnPrimary" type="submit">Szűrés</button>{(q||status)&&<Link className="btn" href="/admin/rendelesek">Szűrés törlése</Link>}</form>
    <div className="tableCard"><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Rendelések listája</caption><thead><tr><th scope="col">Rendelés</th><th scope="col">Vásárló</th><th scope="col">Állapot</th><th scope="col">Szállítás / fizetés</th><th scope="col">Kedvezmény</th><th scope="col">Összeg</th><th scope="col">Dátum</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><Link className="textLink" href={`/admin/rendelesek/${o.id}`} aria-label={`${o.order_number} rendelés megnyitása`}><strong>{o.order_number}</strong></Link>{o.tracking_number&&<><br/><span className="muted">Nyomkövetés: {o.tracking_number}</span></>}</td><td>{o.billing_name}<br/><span className="muted">{o.customer_email}</span></td><td><span className="badge">{labels[o.status]??o.status}</span><div style={{marginTop:8}}><OrderStatusControl id={o.id} status={o.status}/></div></td><td>{o.shipping_method?(shippingLabels[o.shipping_method]??o.shipping_method):'—'}<br/><span className="muted">{o.payment_method?(paymentLabels[o.payment_method]??o.payment_method):'—'}</span></td><td>{o.discount_gross_huf>0?<><strong>−{formatHuf(o.discount_gross_huf)}</strong><br/><span className="muted">{o.coupon_code??'kupon'}</span></>:'—'}</td><td><strong>{formatHuf(o.total_gross_huf)}</strong></td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(o.created_at))}</td></tr>)}</tbody></table></div>{!loadError&&orders.length===0&&<p className="muted" style={{padding:20}}>Nincs a szűrésnek megfelelő rendelés.</p>}</div>
  </section>;
}
