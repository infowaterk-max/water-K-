import Link from'next/link';
import{notFound}from'next/navigation';
import{ProductDocumentManager}from'@/components/admin/product-document-manager';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';

export const dynamic='force-dynamic';

type VariantRow={id:string;label:string;sku:string;active:boolean};

export default async function ProductDocumentsPage({params}:{params:Promise<{id:string}>}){
  const scope=await requireCurrentStorePageContext('catalog.manage'),{id}=await params,admin=createAdminClient();
  const[productResult,variantResult]=await Promise.all([
    admin.from('products').select('id,name,active').eq('instance_id',scope.instanceId).eq('id',id).maybeSingle(),
    admin.from('product_variants').select('id,label,sku,active').eq('instance_id',scope.instanceId).eq('product_id',id).order('label'),
  ]);
  if(productResult.error||variantResult.error||!productResult.data)notFound();
  const product=productResult.data,variants=(variantResult.data??[])as VariantRow[];
  return <section className="adminMain" data-product-scoped-documents><span className="eyebrow">Katalógus · Termék · Dokumentumok</span><h1 className="sectionTitle">{product.name} · Dokumentumok</h1><p className="lead">A dokumentumok ehhez a termékhez tartoznak. Itt állíthatod be, hogy melyik változatra érvényesek, megjelenjenek-e a termékoldalon, és fizetés után automatikusan megkapja-e őket a vásárló. A számla külön a számlázóintegráció authorityja.</p><div className="actions"><Link className="btn btnGhost" href="/admin/termekek">Vissza a termékhez</Link><Link className="btn btnGhost" href="/admin/termekek/dokumentumok">Dokumentumáttekintő</Link></div><section className="card" style={{marginTop:18}}><div className="adminToolbar"><div><span className="eyebrow">{product.active?'Aktív termék':'Piszkozat / inaktív termék'}</span><h2>{product.name}</h2></div><span className="badge">{variants.length} változat</span></div><ProductDocumentManager productId={product.id} variants={variants.filter(item=>item.active).map(item=>({id:item.id,label:`${item.label} · ${item.sku}`}))}/></section></section>;
}
