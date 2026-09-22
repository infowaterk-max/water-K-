import {headers} from 'next/headers';
import { CartView } from '@/components/cart/cart-view';
import { ProductRecommendations } from '@/components/catalog/product-recommendations';
import { StorefrontCartShell } from '@/components/cart/storefront-cart-shell';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getRecommendationRules } from '@/lib/recommendations/server';
import { requireStorefrontAccess } from '@/lib/storefront/access';
import { resolveCurrentStorefrontCartRuntimePage } from '@/lib/builder/storefront-runtime-source';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
export const dynamic='force-dynamic';

function viewportFromUserAgent(value:string):StorefrontViewport{const v=value.toLowerCase();if(/ipad|tablet|kindle|silk/.test(v))return'tablet';if(/mobi|iphone|ipod|android/.test(v))return'mobile';return'desktop'}

export default async function Cart(){
 await requireStorefrontAccess();
 const[products,rules,commerce,runtime,userAgent]=await Promise.all([getProducts(),getRecommendationRules('cart'),getCommerceSettings(),resolveCurrentStorefrontCartRuntimePage(),headers().then(value=>value.get('user-agent')??'')]);
 const cart=<><CartView freeShippingThreshold={commerce.freeShippingThreshold} products={products.map(product=>({id:product.id,name:product.name,slug:product.slug,grossPrice:product.grossPrice,minimumQuantity:product.minimumQuantity,orderMultiple:product.orderMultiple,fulfillmentType:product.fulfillmentType}))}/><ProductRecommendations products={products} rules={rules}/></>;
 if(runtime)return <StorefrontCartShell runtime={runtime} viewport={viewportFromUserAgent(userAgent)}>{cart}</StorefrontCartShell>;
 return <main className="section cartShowcase" data-storefront-cart-fallback="legacy"><div className="shell"><div className="commerceMastInner"><div><span className="showcaseKicker">Kosár</span><h1 className="sectionTitle">Már csak néhány lépés.</h1></div><p className="lead">Ellenőrizd a kiválasztott termékeket, mennyiségeket és a kézbesítés típusát, majd folytasd a vezetett pénztárhoz.</p></div>{cart}</div></main>;
}
