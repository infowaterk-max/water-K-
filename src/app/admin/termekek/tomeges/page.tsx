import Link from'next/link';
import{getProducts}from'@/lib/catalog-server';
import{requirePlanFeature}from'@/lib/plans/access';
import{BulkProductEditor}from'@/components/admin/bulk-product-editor';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function BulkProductPage(){
  await requirePlanFeature('bulkOperations');
  await requireCurrentStoreContext('catalog.manage');
  const result=await getProducts({includeAllChannels:true,throwOnError:true}).then(data=>({data,error:false})).catch(()=>({data:[],error:true})),products=result.data,out=products.filter(p=>p.stock<=0).length,low=products.filter(p=>p.stock>0&&p.stock<=5).length;
  return <section className="adminMain">
    <span className="eyebrow">Alap · Katalógusműveletek</span>
    <h1 className="sectionTitle">Tömeges termékműveletek</h1>
    <p className="lead">Ár-, készlet- és státuszmódosítás több terméken egyetlen, az aktuális webshopra korlátozott tranzakcióban.</p>{result.error&&<div className="errorNotice" role="alert"><strong>A katalógus most nem tölthető be.</strong> Tömeges módosítást addig nem engedünk.</div>}
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Katalógus</span><div className="price">{result.error?'—':products.length}</div><p className="muted">kezelt termék</p></div><div className="card"><span className="badge">Kifogyott</span><div className="price">{result.error?'—':out}</div><p className="muted">azonnal ellenőrzendő</p></div><div className="card"><span className="badge">Alacsony készlet</span><div className="price">{result.error?'—':low}</div><p className="muted">1–5 darabos készlet</p></div></div>
    {!result.error?<BulkProductEditor products={products}/>:<div className="adminAuditNotice"><strong>Szerkesztés átmenetileg letiltva.</strong><p>Frissítsd az oldalt a katalógus sikeres betöltése után.</p></div>}
    <div className="adminToolbar"><Link className="btn" href="/admin/termekek/import-export">CSV import / export</Link><Link className="btn btnGhost" href="/admin/termekek">Termékkezelés</Link></div>
  </section>;
}
