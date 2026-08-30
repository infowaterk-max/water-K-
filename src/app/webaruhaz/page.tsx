import { Suspense } from 'react';
import { ReorderLoader } from '@/components/catalog/reorder-loader';
import { ShopCatalog } from '@/components/catalog/shop-catalog';
import { NewsletterSignup } from '@/components/marketing/newsletter-signup';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceAccess } from '@/lib/commerce/access';

export default async function Shop() {
  const [products, access] = await Promise.all([getProducts(), getCommerceAccess()]);
  return <main className="section shopPage"><div className="shell">
    <Suspense fallback={null}><ReorderLoader products={products.map(product => ({ id: product.id, slug: product.slug, name: product.name, grossPrice: product.grossPrice, sku: product.sku, stock: product.stock }))}/></Suspense>
    <div className="sectionIntro shopIntro"><div><span className="eyebrow">Water-K webáruház</span><h1 className="sectionTitle">A megfelelő kiszerelés, felesleges körök nélkül.</h1></div><p className="lead">Aktuális árak és készlet közvetlenül a Water-K adatbázisából.</p></div>
    <div className="shopTrustBar"><span>✓ Élő készlet</span><span>✓ Biztonságos checkout</span><span>✓ Céges vásárlás támogatva</span><span>✓ Saját webshopmotor</span></div>
    <ShopCatalog products={products} signedIn={access.signedIn} resellerApproved={access.resellerApproved}/>
    <section className="selectionHelp"><div><span className="eyebrow">Nem tudod, melyik kell?</span><h2>Gyors választási segítség</h2></div><div className="selectionGrid"><div><strong>40 g</strong><span>Kipróbálás, cserepes növény</span></div><div><strong>750 g</strong><span>Kert, gyep, ágyás</span></div><div><strong>25 kg</strong><span>Jóváhagyott viszonteladóknak</span></div></div></section>
    <NewsletterSignup/>
  </div></main>;
}
