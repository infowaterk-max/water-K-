import { Suspense } from 'react';
import { ReorderLoader } from '@/components/catalog/reorder-loader';
import { ShopCatalog } from '@/components/catalog/shop-catalog';
import { NewsletterSignup } from '@/components/marketing/newsletter-signup';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceAccess } from '@/lib/commerce/access';
import { requireStorefrontAccess } from '@/lib/storefront/access';

export default async function Shop() {
  const [products, access, instance] = await Promise.all([getProducts(), getCommerceAccess(), requireStorefrontAccess()]);
  const brand=instance?.brand.name??'Webáruház';
  const selection=products.slice(0,3);
  return <main className="section shopPage"><div className="shell">
    <Suspense fallback={null}><ReorderLoader products={products.map(product => ({ id: product.id, slug: product.slug, name: product.name, grossPrice: product.grossPrice, sku: product.sku, stock: product.stock }))}/></Suspense>
    <div className="sectionIntro shopIntro"><div><span className="eyebrow">{brand}</span><h1 className="sectionTitle">Válassz egyszerűen a teljes kínálatból.</h1></div><p className="lead">Aktuális árak és készlet közvetlenül a webáruház adatbázisából.</p></div>
    <div className="shopTrustBar"><span>✓ Élő készlet</span><span>✓ Biztonságos pénztár</span><span>✓ Céges vásárlás támogatva</span><span>✓ Korszerű webshopmotor</span></div>
    <ShopCatalog products={products} signedIn={access.signedIn} resellerApproved={access.resellerApproved}/>
    {selection.length>0&&<section className="selectionHelp"><div><span className="eyebrow">Segítség a választáshoz</span><h2>Kiemelt lehetőségek</h2></div><div className="selectionGrid">{selection.map(product=><div key={product.id}><strong>{product.size||product.name}</strong><span>{product.short||product.name}</span></div>)}</div></section>}
    <NewsletterSignup/>
  </div></main>;
}
