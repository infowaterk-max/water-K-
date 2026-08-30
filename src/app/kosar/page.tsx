import { CartView } from '@/components/cart/cart-view';
import { ProductRecommendations } from '@/components/catalog/product-recommendations';
import { getProducts } from '@/lib/catalog-server';

export const dynamic='force-dynamic';

export default async function Cart(){const products=await getProducts();return <main className="section"><div className="shell"><span className="eyebrow">Kosár</span><h1 className="sectionTitle">A rendelésed</h1><CartView/><ProductRecommendations products={products} context="cart"/></div></main>}
