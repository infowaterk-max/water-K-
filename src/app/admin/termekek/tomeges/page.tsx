import Link from'next/link';
import{getProducts}from'@/lib/catalog-server';
import{requirePlanFeature}from'@/lib/plans/access';
import{BulkProductEditor}from'@/components/admin/bulk-product-editor';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function BulkProductPage(){
  await requirePlanFeature('bulkOperations');
  await requireCurrentStoreContext('catalog.manage');
  const products=await getProducts({includeAllChannels:true}),out=products.filter(p=>p.stock<=0).length,low=products.filter(p=>p.stock>0&&p.stock<=5).length;
  return <section className="adminMain">
    <span className="eyebrow">Alap · Katalógusműveletek</span>
    <h1 className="sectionTitle">Tömeges termékműveletek</h1>
    <p className="lead">Ár-, készlet- és státuszmódosítás több terméken egyetlen, az aktuális webshopra korlátozott tranzakcióban.</p>
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Katalógus</span><div className="price">{products.length}</div><p className="muted">kezelt termék</p></div><div className="card"><span className="badge">Kifogyott</span><div className="price">{out}</div><p className="muted">azonnal ellenőrzendő</p></div><div className="card"><span className="badge">Alacsony készlet</span><div className="price">{low}</div><p className="muted">1–5 darabos készlet</p></div></div>
    <BulkProductEditor products={products}/>
    <div className="adminToolbar"><Link className="btn" href="/admin/termekek/import-export">CSV import / export</Link><Link className="btn btnGhost" href="/admin/termekek">Termékkezelés</Link></div>
  </section>;
}
