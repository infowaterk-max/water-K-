import Link from'next/link';
import{getProducts}from'@/lib/catalog-server';
import{requirePlanFeature}from'@/lib/plans/access';
import{CatalogImporter}from'@/components/admin/catalog-importer';
import{CatalogProductOnboarding}from'@/components/admin/catalog-product-onboarding';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function ProductImportExportPage(){
  await requirePlanFeature('importExport');
  await requireCurrentStoreContext('catalog.manage');
  const result=await getProducts({includeAllChannels:true,throwOnError:true}).then(data=>({data,error:false})).catch(()=>({data:[],error:true})),products=result.data,preview=products.slice(0,8);

  return <section className="adminMain">
    <span className="eyebrow">Alap · Katalógusműveletek</span>
    <h1 className="sectionTitle">Termék onboarding / import / export</h1>
    <p className="lead">Kézi termékfelvitelhez, mező-hozzárendeléses CSV/XLSX onboardinghoz, katalógusköltöztetéshez és tömeges szerkesztéshez használható, webshoponként elkülönített adatkapu.</p>{result.error&&<div className="errorNotice" role="alert"><strong>A jelenlegi katalógus most nem tölthető be.</strong> Importot addig nem engedünk; az onboarding is letiltva marad, hogy ne módosítsunk ismeretlen kiinduló állapotot.</div>}
    <div className="cards">
      <section className="card"><span className="badge">Migration Assistant</span><h2>Shopware 6 → Shoporation</h2><p className="muted">Vezetett forrásellenőrzés, checkpoint, dry-run, external-ID mapping és őrzött rollback nagyobb költöztetéshez.</p><Link className="btn btnPrimary" href="/admin/migracio">Migrációs asszisztens</Link></section>
      <section className="card"><span className="badge">Export</span><h2>Aktuális webshop katalógusa</h2><p className="muted">{result.error?'A katalógusszám most nem ellenőrizhető.':products.length+' termék exportálható UTF-8 CSV-be. Az export kizárólag az aktuális webshop termékeit tartalmazza.'}</p>{!result.error&&<a className="btn btnPrimary" href="/api/admin/catalog/export">CSV letöltése</a>}</section>
      <section className="card"><span className="badge">Biztonság</span><h2>Draft-first és atomi apply</h2><p className="muted">Új termék csak piszkozatként jön létre. A CSV/XLSX onboarding előnézete szerveroldali batchben rögzül; más webshop adata és kliensoldalon átírt apply-plan nem válhat authority-forrássá.</p><Link className="btn" href="/admin/termekek/tomeges">Tömeges műveletek</Link></section>
    </div>
    {!result.error?<><CatalogProductOnboarding/><CatalogImporter/></>:<div className="adminAuditNotice"><strong>Katalógusműveletek átmenetileg letiltva.</strong><p>Előbb a jelenlegi katalógus sikeres betöltése szükséges.</p></div>}
    <section className="card"><span className="eyebrow">Katalógus előnézet</span><h2>{result.error?'Katalógus előnézet nem elérhető':'Első '+preview.length+' termék'}</h2><div className="integrationList">{preview.map(p=><div key={p.id}><span>{p.name}</span><strong>{p.stock} db · {p.grossPrice} Ft</strong></div>)}</div>{!result.error&&!preview.length&&<p className="muted">Még nincs termék az aktuális webshop katalógusában.</p>}</section>
  </section>;
}
