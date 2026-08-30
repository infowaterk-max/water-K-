import Link from 'next/link';
import { getProducts } from '@/lib/catalog-server';

export default async function BulkProductPage() {
  const products = await getProducts();
  const out = products.filter((p) => p.stock <= 0).length;
  const low = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  return (
    <section className="adminMain">
      <span className="eyebrow">Alap · Market Ready</span>
      <h1 className="sectionTitle">Tömeges termékműveletek</h1>
      <p className="lead">Nagy katalógusok gyors kezelésének biztonságos munkaterülete.</p>

      <div className="cards adminMetricCards">
        <div className="card"><span className="badge">Katalógus</span><div className="price">{products.length}</div><p className="muted">kezelt termék</p></div>
        <div className="card"><span className="badge">Kifogyott</span><div className="price">{out}</div><p className="muted">azonnal ellenőrzendő</p></div>
        <div className="card"><span className="badge">Alacsony készlet</span><div className="price">{low}</div><p className="muted">1–5 darabos készlet</p></div>
      </div>

      <section className="card">
        <h2>Market Ready tömeges műveletek</h2>
        <div className="integrationList">
          <div><span>Ár módosítása több terméken</span><strong>előkészítve</strong></div>
          <div><span>Készlet korrekció</span><strong>előkészítve</strong></div>
          <div><span>Kategória / státusz módosítás</span><strong>előkészítve</strong></div>
          <div><span>CSV-alapú tömeges frissítés</span><strong>import validációval</strong></div>
        </div>
        <p className="muted">A végleges írási műveletek naplózott, előnézetes és visszaellenőrizhető tranzakcióként készülnek el; nem építünk veszélyes „egy kattintásos” vak felülírást.</p>
        <div className="adminToolbar"><Link className="btn" href="/admin/termekek/import-export">Import / export</Link><Link className="btn btnPrimary" href="/admin/termekek">Termékkezelés</Link></div>
      </section>
    </section>
  );
}
