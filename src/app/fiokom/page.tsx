import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { LogoutButton } from '@/components/auth/logout-button';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';
import { orderStatusLabel, paymentMethodLabel, shippingMethodLabel } from '@/lib/order-display';

export default async function AccountPage(){
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  if(!configured)return <main className="section accountPage"><div className="shell"><span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">A saját vásárlói központod.</h1><div className="card"><h2>A hitelesítés még nincs konfigurálva.</h2><p className="muted">A publikus webshop ettől függetlenül használható.</p><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás</Link></div></div></main>;
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return <main className="section accountPage"><div className="shell"><span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">Belépés vagy regisztráció</h1><AuthForm/></div></main>;
  const [{data:profile},{data:orders}]=await Promise.all([
    supabase.from('profiles').select('full_name,company_name,tax_number,role,reseller_approved').eq('id',user.id).maybeSingle(),
    supabase.from('orders').select('id,order_number,status,total_gross_huf,created_at,shipping_method,payment_method,tracking_number,invoice_number').order('created_at',{ascending:false}).limit(20),
  ]);
  const roleLabel=profile?.role==='reseller'?(profile.reseller_approved?'Jóváhagyott viszonteladó':'Viszonteladó – jóváhagyás alatt'):'Vásárló';
  const orderList=orders??[]; const activeOrders=orderList.filter(order=>!['completed','cancelled','refunded'].includes(order.status)).length; const completedOrders=orderList.filter(order=>order.status==='completed').length;
  return <main className="section accountPage"><div className="shell">
    <span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">Üdv újra a Water-K-ban.</h1>
    <div className="accountWelcome card"><div><span className="badge">{roleLabel}</span><h2>{profile?.full_name||user.email}</h2><p className="muted">{profile?.company_name?`${profile.company_name}${profile.tax_number?` · ${profile.tax_number}`:''}`:user.email}</p></div><div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Új rendelés</Link><LogoutButton/></div></div>
    <div className="cards accountFeatureGrid"><article className="card"><h3>Aktív rendelések</h3><div className="price">{activeOrders}</div><p className="muted">Folyamatban lévő rendeléseid.</p></article><article className="card"><h3>Teljesített</h3><div className="price">{completedOrders}</div><p className="muted">A legutóbbi 20 rendelésből.</p></article><article className="card"><h3>Fióktípus</h3><div className="price">{roleLabel}</div><p className="muted">A partnerkiszerelések elérhetősége a jogosultságodhoz igazodik.</p></article></div>
    <section className="tableCard"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Állapot</th><th>Összeg</th><th>Szállítás / fizetés</th><th>Dokumentum</th><th>Dátum</th></tr></thead><tbody>{orderList.map(order=><tr key={order.id}><td><Link className="textLink" href={`/fiokom/rendeles/${order.id}`}>{order.order_number}</Link></td><td><span className="badge">{orderStatusLabel(order.status)}</span></td><td>{formatHuf(order.total_gross_huf)}</td><td>{shippingMethodLabel(order.shipping_method)} / {paymentMethodLabel(order.payment_method)}{order.tracking_number?<><br/><span className="muted">Nyomkövetés: {order.tracking_number}</span></>:null}</td><td>{order.invoice_number?<span className="badge">Számla: {order.invoice_number}</span>:<span className="muted">Folyamatban</span>}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(order.created_at))}</td></tr>)}</tbody></table>{!orderList.length&&<div style={{padding:28}}><h3>Még nincs rendelésed.</h3><p className="muted">Az első rendelésed után itt követheted majd az állapotát, a számlát és a szállítást.</p><Link className="btn btnPrimary" href="/webaruhaz">Irány a webáruház</Link></div>}</section>
  </div></main>;
}
