import { CartView } from '@/components/cart/cart-view';
import { ProductRecommendations } from '@/components/catalog/product-recommendations';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getRecommendationRules } from '@/lib/recommendations/server';

export const dynamic='force-dynamic';

export default async function Cart(){
  const[products,rules,commerce]=await Promise.all([
    getProducts(),
    getRecommendationRules('cart'),
    getCommerceSettings(),
  ]);

  return <main className="section"><div className="shell"><span className="eyebrow">Kosár</span><h1 className="sectionTitle">A rendelésed</h1><CartView freeShippingThreshold={commerce.freeShippingThreshold}/><ProductRecommendations products={products} rules={rules} context="cart"/></div></main>;
}
