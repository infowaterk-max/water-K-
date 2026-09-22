import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { resolveB2BAccountContext } from '@/lib/commerce/b2b-account';
import { formatHuf } from '@/lib/catalog';
import { orderEventLabel,orderStatusLabel,paymentMethodLabel,shippingMethodLabel } from '@/lib/order-display';

export default async function B2BOrderPage({params}:{params:Promise<{id:string}>}){
  const{id}=await params,session=await createClient(),{data:{user}}=await session.auth.getUser();
  if(!user)redirect('/fiokom');
  const instance=await getCurrentWebshopInstance();if(!instance)notFound();
  const context=await resolveB2BAccountContext(instance.id,user.id);if(!context)notFound();

  const admin=createAdminClient();
  const{data:order,error}=await admin.from('orders')
    .select('id,order_number,status,customer_email,billing_name,billing_company,billing_tax_number,billing_postcode,billing_city,billing_address,shipping_name,shipping_postcode,shipping_city,shipping_address,subtotal_gross_huf,discount_gross_huf,shipping_gross_huf,total_gross_huf,shipping_method,payment_method,note,created_at,b2b_account_id')
    .eq('id',id).eq('instance_id',instance.id).eq('b2b_account_id',context.accountId).maybeSingle();
  if(error||!order)notFound();

  const[{data:items,error:itemsError},{data:events,error:eventsError}]=await Promise.all([
    admin.from('order_items').select('id,product_name,variant_label,sku,quantity,unit_gross_huf,line_total_gross_huf').eq('order_id',id).eq('instance_id',instance.id),
    admin.from('order_events').select('id,event_type,from_status,to_status,metadata,created_at').eq('order_id',id).eq('instance_id',instance.id).order('created_at',{ascending:true}),
  ]);

  return <main className="section"><div className="shell">
    <div className="sectionIntro"><div><span className="eyebrow">B2B szervezeti rendelés</span><h1 className="sectionTitle">{order.order_number}</h1><p className="lead">{context.accountName} · {orderStatusLabel(order.status)}</p></div><div className="actions"><Link className="btn btnGhost" href="/fiokom/b2b">Vissza a B2B fiókhoz</Link><Link className="btn btnPrimary" href="/webaruhaz">Új rendelés</Link></div></div>
    {(itemsError||eventsError)&&<div className="errorNotice" role="alert">A rendelés tételei vagy eseményei közül valamelyik most nem tölthető be.</div>}
    <div className="cards"><article className="card"><span className="badge">Állapot</span><h3>{orderStatusLabel(order.status)}</h3></article><article className="card"><span className="badge">Fizetendő</span><div className="price">{formatHuf(order.total_gross_huf)}</div></article><article className="card"><span className="badge">Fizetés</span><h3>{paymentMethodLabel(order.payment_method)}</h3></article><article className="card"><span className="badge">Szállítás</span><h3>{shippingMethodLabel(order.shipping_method)}</h3></article></div>
    <section className="tableCard" style={{marginTop:28}}><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Termék</th><th>Mennyiség</th><th>Egységár</th><th>Összesen</th></tr></thead><tbody>{(items??[]).map(item=><tr key={item.id}><td><strong>{item.product_name}</strong><br/><span className="muted">{item.variant_label} · {item.sku}</span></td><td>{item.quantity}</td><td>{formatHuf(item.unit_gross_huf)}</td><td>{formatHuf(item.line_total_gross_huf)}</td></tr>)}</tbody></table></div></section>
    <div className="splitFeature" style={{marginTop:28}}><section className="featurePanel"><span className="eyebrow">Számlázás</span><h2>{order.billing_name}</h2><p className="muted">{order.billing_company&&<>{order.billing_company}<br/></>}{order.billing_tax_number&&<>Adószám: {order.billing_tax_number}<br/></>}{order.billing_postcode} {order.billing_city}, {order.billing_address}<br/>{order.customer_email}</p></section><section className="featurePanel"><span className="eyebrow">Szállítás</span><h2>{order.shipping_name||order.billing_name}</h2><p className="muted">{order.shipping_postcode} {order.shipping_city}, {order.shipping_address}</p></section></div>
    {order.note&&<section className="card" style={{marginTop:28}}><span className="eyebrow">Megjegyzés</span><p>{order.note}</p></section>}
    <section className="card" style={{marginTop:28}}><span className="eyebrow">Eseménytörténet</span><div className="timeline">{(events??[]).map(event=><div key={event.id} className="timelineItem"><strong>{orderEventLabel(event.event_type,event.from_status,event.to_status,event.metadata as Record<string,unknown>|null)}</strong><span className="muted">{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(event.created_at))}</span></div>)}</div></section>
    <p className="muted">Szervezeti rendelés megtekintése nem ad fizetési újrapróbálási jogosultságot. Fizetést csak a rendelést eredetileg leadó felhasználó indíthat a saját rendelési oldaláról.</p>
  </div></main>;
}
