import Link from 'next/link';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf, products } from '@/lib/catalog';

export default function Shop() {
  return (
    <main className="section">
      <div className="shell">
        <span className="eyebrow">Water-K webáruház</span>
        <h1 className="sectionTitle">Találd meg a megfelelő kiszerelést</h1>
        <p className="lead">Átlátható kínálat, gyors vásárlás, közvetlenül a Water-K rendszeréből.</p>
        <div className="cards">
          {products.map((product) => (
            <article className="card" key={product.slug}>
              <span className="badge">{product.stock > 0 ? 'Raktáron' : 'Elfogyott'}</span>
              <h2>{product.name}</h2>
              <p className="muted">{product.short}</p>
              <div className="price">{formatHuf(product.grossPrice)}</div>
              <div className="actions">
                <AddToCart id={product.id} slug={product.slug} name={product.name} price={product.grossPrice} />
                <Link className="btn" href={`/termek/${product.slug}`}>Részletek</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
