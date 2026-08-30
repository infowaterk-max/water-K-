import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatHuf } from '@/lib/catalog';

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/fiokom?next=/fiokom/kivansaglista');

  const { data } = await supabase
    .from('wishlists')
    .select('id,created_at,product_variants!inner(id,label,gross_price_huf,stock_quantity,products!inner(slug,name))')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  const items = data ?? [];

  return <main className="section accountPage"><div className="shell">
    <div className="sectionIntro"><div><span className="eyebrow">Saját fiók</span><h1 className="sectionTitle">Kívánságlistám</h1><p className="lead">Az elmentett termékek egy helyen, aktuális árral és készletinformációval.</p></div><Link className="btn" href="/fiokom">Vissza a fiókhoz</Link></div>
    <div className="cards">{items.map((item) => {
      const variant = item.product_variants as unknown as { id:string; label:string; gross_price_huf:number; stock_quantity:number; products:{slug:string;name:string} };
      const slug = `${variant.products.slug}-${variant.label.toLowerCase().replace(/\s+/g,'-')}`;
      return <article className="card" key={item.id}><span className="badge">{variant.stock_quantity > 0 ? 'Raktáron' : 'Nincs készleten'}</span><h2>{variant.products.name} {variant.label}</h2><div className="price">{formatHuf(variant.gross_price_huf)}</div><p className="muted">Készlet: {variant.stock_quantity} db</p><Link className="btn btnPrimary" href={`/termek/${slug}`}>Termék megnyitása</Link></article>;
    })}</div>
    {!items.length && <section className="card"><h2>Még nincs mentett terméked.</h2><p className="muted">A termékoldalakon a Kívánságlistára gombbal tudsz későbbre elmenteni termékeket.</p><Link className="btn btnPrimary" href="/webaruhaz">Termékek böngészése</Link></section>}
  </div></main>;
}
