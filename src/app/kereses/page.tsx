import {Suspense} from 'react';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';
import {ShopCatalog} from '@/components/catalog/shop-catalog';
import {getProducts} from '@/lib/catalog-server';
import {getCommerceAccess} from '@/lib/commerce/access';
import {requireStorefrontBrowseAccess} from '@/lib/storefront/access';

export const metadata={title:'Keresés',description:'Keresés a webshop termékei között.'};

export default async function SearchPage(){
  const instance=await requireStorefrontBrowseAccess();
  const[products,access]=await Promise.all([getProducts(),getCommerceAccess()]);
  const brand=instance?.brand.name??'Webáruház';
  return <StorefrontContentShell pageKey="search"><main className="section shopPage"><div className="shell">
    <div className="sectionIntro shopIntro"><div><span className="eyebrow">{brand}</span><h1 className="sectionTitle">Keresés a webshopban</h1></div><p className="lead">A keresőkifejezés és a támogatott szűrők az URL-ből is betöltődnek.</p></div>
    <Suspense fallback={null}><ShopCatalog products={products} signedIn={access.signedIn} resellerApproved={access.resellerApproved}/></Suspense>
  </div></main></StorefrontContentShell>;
}
