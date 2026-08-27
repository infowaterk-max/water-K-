import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { LogoutButton } from '@/components/auth/logout-button';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';

export default async function AccountPage(){
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  if(!configured)return <main className="section accountPage"><div className="shell"><span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">A saját vásárlói központod.</h1><div className="card"><h2>A hitelesítés még nincs konfigurálva.</h2><p className="muted">A publikus webshop ettől függetlenül használható.</p><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás</Link></div></div></main>;
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return <main className="section accountPage"><div className="shell"><span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">Belépés vagy regisztráció</h1><AuthForm/></div></main>;
  const [{data:profile},{data:orders}]=await Promise.all([
    supabase.from('profiles').select('full_name,company_name,tax_number,role,reseller_approved').eq('id',user.id).maybeSingle(),
    supabase.from('orders').select('id,order_number,status,total_gross_huf,created_at,shipping_method,payment_method').order('created_at',{ascending:false}).limit(20),
  ]);
  const roleLabel=profile?.role==='reseller'?(profile.reseller_approved?'Jóváhagyott viszonteladó':'Viszonteladó – jóváhagyás alatt'):'Vásárló';
  return <main className="section accountPage"><div className="shell">
    <span className="eyebrow">Water-K fiók</span><h1 className="sectionTitle">Üdv újra a Water-K-ban.</h1>
    <div className="accountWelcome card"><div><span className="badge">{roleLabel}</span><h2>{profile?.full_name||user.email}</h2><p className="muted">{profile?.company_name?`${profile.company_name}${profile.tax_number?` · ${profile.tax_number}`:''}`:user.email}</p></div><div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Új rendelés</Link><LogoutButton/></div></div>
    <div className="cards accountFeatureGrid"><article className="card"><h3>Rendelések</h3><div className="price">{orders?.length??0}</div><p className="muted">A legutóbbi 20 rendelésedből.</p></article><article className="card"><h3>Fióktípus</h3><div className="price">{roleLabel}</div><p className="muted">A 25 kg-os partnerkiszereléshez jóváhagyott viszonteladói fiók szükséges.</p></article><article className="card"><h3>Kapcsolat</h3><div className="price">{user.email}</div><p className="muted">A rendelési visszaigazolások ehhez a címhez kapcsolódnak.</p></article></div>
    <section className="tableCard"><table className="adminTable"><thead><tr><th>Rendelés</th><th>Állapot</th><th>Összeg</th><th>Szállítás / fizetés</th><th>Dátum</th></tr></thead><tbody>{(orders??[]).map(order=><tr key={order.id}><td><Link className="textLink" href={`/fiokom/rendeles/${order.id}`}>{order.order_number}</Link></td><td><span className="badge">{order.status}</span></td><td>{formatHuf(order.total_gross_huf)}</td><td>{order.shipping_method??'—'} / {order.payment_method??'—'}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short'}).format(new Date(order.created_at))}</td></tr>)}</tbody></table>{!orders?.length&&<p className="muted" style={{padding:20}}>Még nincs rendelésed.</p>}</section>
  </div></main>;
}
