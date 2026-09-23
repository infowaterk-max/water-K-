import { Suspense } from 'react';
import { ReorderLoader } from '@/components/catalog/reorder-loader';
import { ShopCatalog } from '@/components/catalog/shop-catalog';
import { NewsletterSignup } from '@/components/marketing/newsletter-signup';
import { StorefrontContentShell } from '@/components/content/storefront-content-shell';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceAccess } from '@/lib/commerce/access';
import { requireStorefrontBrowseAccess } from '@/lib/storefront/access';

export default async function Shop({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [instance,params]=await Promise.all([requireStorefrontBrowseAccess(),searchParams]);
  const [products, access] = await Promise.all([getProducts(), getCommerceAccess()]);
  const brand=instance?.brand.name??'Webáruház';
  const first=(value:string|string[]|undefined)=>typeof value==='string'?value:Array.isArray(value)?value[0]??'':'';
  const sort=first(params.sort);
  const newDiscovery=sort==='new';
  const categoryLabels:Record<string,string>={
    console:'Konzolok',accessory:'Kiegészítők',merch:'Rajongói termékek',
    setup:'Játékos felszerelés',gift:'Ajándékötletek',sale:'Akciók',
  };
  const semanticValue=first(params.category)||first(params.collection)||first(params.filter);
  const categoryTitle=categoryLabels[semanticValue]??'';
  const selection=[...products].sort((a,b)=>new Date(b.createdAt??0).getTime()-new Date(a.createdAt??0).getTime()).slice(0,3);
  const eyebrow=newDiscovery?brand+' · friss kínálat':categoryTitle?brand+' · kategória':brand;
  const title=newDiscovery?'Újdonságok':categoryTitle||'Válassz egyszerűen a teljes kínálatból.';
  const lead=newDiscovery?'A legfrissebben felvitt termékek elöl. Az ár és a készlet mindig az aktuális webshopadatból érkezik.':categoryTitle?`A(z) ${categoryTitle.toLocaleLowerCase('hu-HU')} kínálata ugyanabban az egységes webáruház-nézetben.`:'Aktuális árak és készlet közvetlenül a webáruházból.';

  return <StorefrontContentShell pageKey="catalog"><main className="section shopPage" data-storefront-catalog-route={newDiscovery?'new':'catalog'}><div className="shell">
    <Suspense fallback={null}><ReorderLoader products={products.map(product => ({ id: product.id, slug: product.slug, name: product.name, grossPrice: product.grossPrice, sku: product.sku, stock: product.stock, minimumQuantity: product.minimumQuantity, orderMultiple: product.orderMultiple }))}/></Suspense>
    <div className="sectionIntro shopIntro"><div><span className="eyebrow">{eyebrow}</span><h1 className="sectionTitle">{title}</h1></div><p className="lead">{lead}</p></div>
    <div className="shopTrustBar"><span>✓ Aktuális készlet</span><span>✓ Biztonságos pénztár</span><span>✓ Céges és B2B vásárlás</span><span>✓ Átlátható árak</span></div>
    <Suspense fallback={<section className="catalogEmpty"><p>Termékek betöltése…</p></section>}><ShopCatalog products={products} signedIn={access.signedIn} resellerApproved={access.resellerApproved}/></Suspense>
    {selection.length>0&&<section className="selectionHelp"><div><span className="eyebrow">{newDiscovery?'Friss érkezések':'Segítség a választáshoz'}</span><h2>{newDiscovery?'Legújabb termékek':'Kiemelt lehetőségek'}</h2></div><div className="selectionGrid">{selection.map(product=><div key={product.id}><strong>{product.size||product.name}</strong><span>{product.short||product.name}</span></div>)}</div></section>}
    <NewsletterSignup/>
  </div></main></StorefrontContentShell>;
}
