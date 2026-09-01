import Link from 'next/link';
import { RecoveryRestorer } from '@/components/cart/recovery-restorer';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import type { CartItem } from '@/lib/cart/types';

export const dynamic='force-dynamic';
type SavedItem={productId:string;quantity:number};
type VariantRow={id:string;label:string;gross_price_huf:number;active:boolean;products:{slug:string;name:string;active:boolean}|null};

export default async function RecoveryPage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const {token}=await searchParams;
  const validToken=typeof token==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
  if(!validToken)return <main className="section"><div className="shell"><div className="card"><h1>Ez a helyreállító link nem érvényes.</h1><p className="muted">Nyisd meg a webáruházat, és állítsd össze újra a kosarad.</p><Link className="btn btnPrimary" href="/webaruhaz">Webáruház</Link></div></div></main>;
  const admin=createAdminClient();
  const {data:intent}=await admin.from('checkout_recovery_intents').select('cart,status,expires_at').eq('recovery_token',token).maybeSingle();
  if(!intent||intent.status!=='open'||new Date(intent.expires_at).getTime()<=Date.now())return <main className="section"><div className="shell"><div className="card"><h1>A helyreállító link lejárt vagy már nem használható.</h1><p className="muted">A webáruházban az aktuális kínálatból új kosarat állíthatsz össze.</p><Link className="btn btnPrimary" href="/webaruhaz">Webáruház</Link></div></div></main>;
  const saved=(Array.isArray(intent.cart)?intent.cart:[]) as SavedItem[];
  const ids=[...new Set(saved.map(x=>x.productId).filter(Boolean))];
  if(!ids.length)return <main className="section"><div className="shell"><div className="card"><h1>A mentett kosár üres.</h1><Link className="btn btnPrimary" href="/webaruhaz">Webáruház</Link></div></div></main>;
  const {data:variants}=await admin.from('product_variants').select('id,label,gross_price_huf,active,products!inner(slug,name,active)').in('id',ids).eq('active',true).eq('products.active',true);
  const rows=(variants??[]) as unknown as VariantRow[];
  const byId=new Map(rows.map(row=>[row.id,row]));
  const items:CartItem[]=saved.flatMap(savedItem=>{const row=byId.get(savedItem.productId);if(!row?.products)return[];return[{productId:row.id,slug:row.products.slug,name:`${row.products.name} – ${row.label}`,unitPrice:Number(row.gross_price_huf),quantity:Math.max(1,Math.min(99,Math.floor(Number(savedItem.quantity)||1)))}];});
  if(!items.length)return <main className="section"><div className="shell"><div className="card"><h1>A mentett termékek jelenleg nem elérhetők.</h1><Link className="btn btnPrimary" href="/webaruhaz">Aktuális kínálat</Link></div></div></main>;
  const instance=await getCurrentWebshopInstance();
  const brandName=instance?.brand.name??'Webáruház';
  return <main className="section"><div className="shell confirmationShell"><span className="eyebrow">{brandName} kosármentés</span><h1 className="sectionTitle">Folytathatod a rendelésed.</h1><RecoveryRestorer items={items}/></div></main>;
}
