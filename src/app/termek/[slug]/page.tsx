import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf, products } from '@/lib/catalog';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  return (
    <main className="section">
      <div className="shell heroGrid">
        <section className="glass">
          <span className="eyebrow">Water-K {product.size}</span>
          <h1 className="sectionTitle">{product.name}</h1>
          <p className="lead">{product.short}</p>
          <div className="price">{formatHuf(product.grossPrice)}</div>
          <p className="muted">Nettó {formatHuf(product.netPrice)} · {product.stock > 0 ? `raktáron: ${product.stock} db` : 'jelenleg nem elérhető'}</p>
          <div className="actions">
            <AddToCart id={product.slug} name={product.name} price={product.grossPrice} />
            <Link className="btn btnGhost" href="/webaruhaz">Másik kiszerelés</Link>
          </div>
        </section>
        <aside className="card">
          <span className="badge">Használat</span>
          <h2>Gyökérzónába dolgozva</h2>
          <p className="muted">A Water-K a gyökérzóna közelében fejti ki a vízmegtartó hatását. Talajba dolgozás után alapos beöntözés szükséges.</p>
          <div className="trustGrid"><span>9% K</span><span>Akár 3 év</span><span>Többszöri ciklus</span></div>
        </aside>
      </div>
    </main>
  );
}
