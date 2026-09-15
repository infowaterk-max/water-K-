import Link from'next/link';
import{ProductDocumentManager}from'@/components/admin/product-document-manager';
import{requireCurrentStorePageContext}from'@/lib/instances/scope';
import{createAdminClient}from'@/lib/supabase/admin';
export const dynamic='force-dynamic';

type ProductRow={id:string;name:string;active:boolean};
type VariantRow={id:string;product_id:string;label:string;sku:string;active:boolean};

export default async function ProductDocumentsAdminPage(){
  const scope=await requireCurrentStorePageContext('catalog.manage'),admin=createAdminClient();
  const[productResult,variantResult]=await Promise.all([
    admin.from('products').select('id,name,active').eq('instance_id',scope.instanceId).order('name'),
    admin.from('product_variants').select('id,product_id,label,sku,active').eq('instance_id',scope.instanceId).order('label'),
  ]);
  const loadError=Boolean(productResult.error||variantResult.error),products=(productResult.data??[])as ProductRow[],variants=(variantResult.data??[])as VariantRow[],byProduct=new Map<string,VariantRow[]>();
  for(const variant of variants){const list=byProduct.get(variant.product_id)??[];list.push(variant);byProduct.set(variant.product_id,list)}
  return <section className="adminMain"><span className="eyebrow">Katalógus · Dokumentumáttekintő</span><h1 className="sectionTitle">Termékdokumentumok</h1><p className="lead">Ez a központi áttekintő és karbantartó nézet. Az elsődleges munkafolyamat a termék feltöltése/szerkesztése → Dokumentumok rész: ott kösd a használati útmutatót, adatlapot és általános garanciális dokumentumot közvetlenül a termékhez. A fájlok privát tárhelyen maradnak; a nyilvános és rendelés utáni letöltés is szerver által engedélyezett rövid életű fájllinken történik.</p><div className="actions"><Link className="btn btnGhost" href="/admin/termekek">Vissza a termékekhez</Link><Link className="btn btnPrimary" href="/admin/termekek/feltoltes">Termékfeltöltő Központ</Link></div>{loadError&&<div className="errorNotice" role="alert">A katalógus nem tölthető be teljesen. Hiányos állapotból dokumentumot nem módosítunk.</div>}{!loadError&&products.map(product=><section className="card" key={product.id} style={{marginTop:18}}><div className="adminToolbar"><div><span className="eyebrow">{product.active?'Aktív termék':'Inaktív termék'}</span><h2>{product.name}</h2></div><span className="badge">{(byProduct.get(product.id)??[]).length} változat</span></div><ProductDocumentManager productId={product.id} variants={(byProduct.get(product.id)??[]).filter(item=>item.active).map(item=>({id:item.id,label:`${item.label} · ${item.sku}`}))}/></section>)}{!loadError&&!products.length&&<div className="adminAuditNotice"><strong>Még nincs termék a katalógusban.</strong><p>Termékdokumentum csak létező termékhez tölthető fel.</p></div>}</section>;
}
