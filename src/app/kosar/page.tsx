import { CartView } from '@/components/cart/cart-view';
import { ProductRecommendations } from '@/components/catalog/product-recommendations';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getRecommendationRules } from '@/lib/recommendations/server';
import { requireStorefrontAccess } from '@/lib/storefront/access';
export const dynamic='force-dynamic';
export default async function Cart(){await requireStorefrontAccess();const[products,rules,commerce]=await Promise.all([getProducts(),getRecommendationRules('cart'),getCommerceSettings()]);return <main className="section cartShowcase"><div className="shell"><div className="commerceMastInner"><div><span className="showcaseKicker">Kosár</span><h1 className="sectionTitle">Már csak néhány lépés.</h1></div><p className="lead">Ellenőrizd a kiválasztott termékeket, mennyiségeket és a kézbesítés típusát, majd folytasd a vezetett pénztárhoz.</p></div><CartView freeShippingThreshold={commerce.freeShippingThreshold} products={products.map(product=>({id:product.id,name:product.name,slug:product.slug,grossPrice:product.grossPrice,minimumQuantity:product.minimumQuantity,orderMultiple:product.orderMultiple,fulfillmentType:product.fulfillmentType}))}/><ProductRecommendations products={products} rules={rules} context="cart"/></div></main>}
