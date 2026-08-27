import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf, products } from '@/lib/catalog';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();

  const alternatives = products.filter((item) => item.id !== product.id);

  return (
    <main className="section productPage">
      <div className="shell">
        <div className="productHero">
          <section className="productStage">
            <div className="productPack largePack"><small>WATER-K</small><strong>{product.size}</strong><span>vízmegtartó technológia</span></div>
            <div className="floatingFacts"><span>9% K</span><span>Akár 3 év</span><span>≤50 ciklus</span></div>
          </section>

          <section className="productInfo">
            <span className="eyebrow">Water-K · {product.audience === 'professional' ? 'professzionális' : 'lakossági'} kiszerelés</span>
            <h1 className="sectionTitle">{product.name}</h1>
            <p className="lead">{product.short}</p>
            <div className="tagRow productTags">{product.useCases.map((useCase) => <span key={useCase}>{useCase}</span>)}</div>
            <div className="productPriceBlock"><div className="price">{formatHuf(product.grossPrice)}</div><p className="muted">Nettó {formatHuf(product.netPrice)} · {product.stock > 0 ? `raktáron: ${product.stock} db` : 'jelenleg nem elérhető'}</p></div>
            <div className="actions productActions">
              <AddToCart id={product.id} slug={product.slug} name={product.name} price={product.grossPrice} />
              <Link className="btn btnGhost" href="/kosar">Kosár megnyitása</Link>
            </div>
            <div className="purchaseTrust"><span>✓ Szerveroldali árvalidáció</span><span>✓ Magyar checkout</span><span>✓ Céges vásárlás is</span></div>
          </section>
        </div>

        <section className="section productDetailsSection">
          <div className="detailGrid">
            <article className="card"><span className="stepIndex">01</span><h2>Hová való?</h2><p className="muted">{product.useCases.join(', ')}. A Water-K a gyökérzóna közelébe dolgozva fejti ki vízmegtartó funkcióját.</p></article>
            <article className="card"><span className="stepIndex">02</span><h2>Mit tud?</h2><ul className="featureList">{product.highlights.map((item) => <li key={item}>{item}</li>)}<li>9% káliumtartalom</li><li>Többszöri nedvesedési ciklus</li></ul></article>
            <article className="card"><span className="stepIndex">03</span><h2>Hogyan használd?</h2><p className="muted">Talajba dolgozás után alapos beöntözés szükséges. A pontos dózis mindig a felhasználási területhez és növényhez igazítandó.</p></article>
          </div>
        </section>

        <section className="selectionHelp productAlternatives">
          <div><span className="eyebrow">Másik méret?</span><h2>Hasonlítsd össze a kiszereléseket.</h2></div>
          <div className="alternativeRow">
            {alternatives.map((item) => (
              <Link className="alternativeCard" key={item.slug} href={`/termek/${item.slug}`}>
                <span>{item.name}</span><strong>{formatHuf(item.grossPrice)}</strong><small>{item.short}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
