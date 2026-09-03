import Link from'next/link';
import{getProducts}from'@/lib/catalog-server';
import{requirePlanFeature}from'@/lib/plans/access';
import{CatalogImporter}from'@/components/admin/catalog-importer';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function ProductImportExportPage(){
  await requirePlanFeature('importExport');
  await requireCurrentStoreContext('catalog.manage');
  const products=await getProducts(),preview=products.slice(0,8);

  return <section className="adminMain">
    <span className="eyebrow">Alap · Katalógusműveletek</span>
    <h1 className="sectionTitle">Termék import / export</h1>
    <p className="lead">Katalógusköltöztetéshez, mentéshez és tömeges szerkesztéshez használható, webshoponként elkülönített adatkapu.</p>
    <div className="cards">
      <section className="card"><span className="badge">Export</span><h2>Aktuális webshop katalógusa</h2><p className="muted">{products.length} termék exportálható UTF-8 CSV-be. Az export kizárólag az aktuális webshop termékeit tartalmazza.</p><a className="btn btnPrimary" href="/api/admin/catalog/export">CSV letöltése</a></section>
      <section className="card"><span className="badge">Biztonság</span><h2>Előnézet és atomi mentés</h2><p className="muted">Az exportált <code>id</code> azonosítóval készlet, nettó/bruttó ár és aktív állapot módosítható. Más webshophoz tartozó vagy ismeretlen azonosítót a rendszer elutasít.</p><Link className="btn" href="/admin/termekek/tomeges">Tömeges műveletek</Link></section>
    </div>
    <CatalogImporter/>
    <section className="card"><span className="eyebrow">Katalógus előnézet</span><h2>Első {preview.length} termék</h2><div className="integrationList">{preview.map(p=><div key={p.id}><span>{p.name}</span><strong>{p.stock} db · {p.grossPrice} Ft</strong></div>)}</div>{!preview.length&&<p className="muted">Még nincs termék az aktuális webshop katalógusában.</p>}</section>
  </section>;
}
