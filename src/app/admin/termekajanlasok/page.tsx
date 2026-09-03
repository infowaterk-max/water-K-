import { getProducts } from '@/lib/catalog-server';
import { getRecommendationRules } from '@/lib/recommendations/server';
import { RecommendationManager } from '@/components/admin/recommendation-manager';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

export const dynamic='force-dynamic';

export default async function RecommendationsPage(){
  await requirePlanFeature('productRecommendations');
  await requireCurrentStoreContext('catalog.manage');
  const[products,rules]=await Promise.all([getProducts({includeAllChannels:true}),getRecommendationRules()]);
  return <section className="adminMain">
    <span className="eyebrow">Admin · Értékesítésösztönzés</span>
    <h1 className="sectionTitle">Termékajánlások</h1>
    <p className="lead">Állíts be cross-sell és rendelés utáni ajánlatokat kódmódosítás nélkül. Ha nincs kézi szabály, a webshop biztonságos automatikus ajánlással működik tovább.</p>
    <RecommendationManager products={products} rules={rules}/>
  </section>;
}
