import Link from 'next/link';
import { getProducts } from '@/lib/catalog-server';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export default async function ProductImportExportPage() {
  const products = await getProducts();
  const preview = products.slice(0, 8);
  const exportCsv = [
    ['id', 'name', 'stock', 'net_price', 'gross_price'].join(','),
    ...products.map((p) => [p.id, p.name, p.stock, p.netPrice, p.grossPrice].map(csvCell).join(',')),
  ].join('\n');
  const dataHref = `data:text/csv;charset=utf-8,${encodeURIComponent(exportCsv)}`;

  return (
    <section className="adminMain">
      <span className="eyebrow">Alap · Market Ready</span>
      <h1 className="sectionTitle">Termék import / export</h1>
      <p className="lead">Katalógus költöztetéshez, biztonsági mentéshez és tömeges szerkesztéshez használható adatkapu.</p>

      <div className="cards">
        <section className="card">
          <span className="badge">Export</span>
          <h2>Aktuális katalógus CSV</h2>
          <p className="muted">{products.length} termék exportálható. Az export UTF-8 CSV formátumú és táblázatkezelőben megnyitható.</p>
          <a className="btn btnPrimary" download="termekek.csv" href={dataHref}>CSV letöltése</a>
        </section>
        <section className="card">
          <span className="badge">Import</span>
          <h2>Biztonságos import folyamat</h2>
          <p className="muted">Az import következő lépése előnézet + validáció + hibajelentés + jóváhagyás lesz. Közvetlen, ellenőrzés nélküli adatfelülírást nem engedünk.</p>
          <Link className="btn" href="/admin/termekek">Vissza a katalógushoz</Link>
        </section>
      </div>

      <section className="card">
        <span className="eyebrow">Export előnézet</span>
        <h2>Első {preview.length} termék</h2>
        <div className="integrationList">
          {preview.map((p) => <div key={p.id}><span>{p.name}</span><strong>{p.stock} db · {p.grossPrice} Ft</strong></div>)}
        </div>
      </section>
    </section>
  );
}
