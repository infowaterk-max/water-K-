import Link from 'next/link';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { formatHuf } from '@/lib/catalog';
import { getProducts } from '@/lib/catalog-server';

export default async function Shop() {
  const products = await getProducts();
  return (
    <main className="section shopPage">
      <div className="shell">
        <div className="sectionIntro shopIntro"><div><span className="eyebrow">Water-K webáruház</span><h1 className="sectionTitle">A megfelelő kiszerelés, felesleges körök nélkül.</h1></div><p className="lead">Aktuális árak és készlet közvetlenül a Water-K adatbázisából.</p></div>
        <div className="shopTrustBar"><span>✓ Élő készlet</span><span>✓ Biztonságos checkout</span><span>✓ Céges vásárlás támogatva</span><span>✓ Saját webshopmotor</span></div>
        <div className="cards productCards shopCards">
          {products.map((product) => <article className={`card productCard ${product.featured ? 'isFeatured' : ''}`} key={product.id}>
            <div className="productCardTop"><span className="badge">{product.featured ? 'Ajánlott' : product.audience === 'professional' ? 'Viszonteladói' : 'Water-K'}</span><span className={`stockDot ${product.stock === 0 ? 'outOfStock' : ''}`}>{product.stock > 0 ? `${product.stock} db raktáron` : 'Elfogyott'}</span></div>
            <div className="productVisual"><div className="productPack"><small>WATER-K</small><strong>{product.size}</strong></div></div>
            <h2>{product.name}</h2><p className="muted">{product.short}</p>
            <div className="tagRow">{product.useCases.slice(0,3).map((useCase)=><span key={useCase}>{useCase}</span>)}</div>
            <div className="price">{formatHuf(product.grossPrice)}</div><p className="muted priceMeta">Bruttó · nettó {formatHuf(product.netPrice)}</p>
            <div className="actions shopActions"><AddToCart id={product.id} slug={product.slug} name={product.name} price={product.grossPrice}/><Link className="btn btnGhost" href={`/termek/${product.slug}`}>Részletek</Link></div>
          </article>)}
        </div>
        <section className="selectionHelp"><div><span className="eyebrow">Nem tudod, melyik kell?</span><h2>Gyors választási segítség</h2></div><div className="selectionGrid"><div><strong>40 g</strong><span>Kipróbálás, cserepes növény</span></div><div><strong>750 g</strong><span>Kert, gyep, ágyás</span></div><div><strong>25 kg</strong><span>Jóváhagyott viszonteladóknak</span></div></div></section>
      </div>
    </main>
  );
}
