import { StoreNavigation } from '@/components/navigation/store-navigation';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { resolveStorefrontNavigation } from '@/lib/navigation/storefront-ia';

/**
 * Server-side tenant adapter for the storefront navigation contract.
 * It intentionally stays separate from the root layout so page/template composition can
 * decide where the navigation component is mounted. Block 22 can invoke the same adapter.
 */
export async function ConfiguredStoreNavigation(){
  const instance=await getCurrentWebshopInstance();
  const items=resolveStorefrontNavigation(instance?.storefront.navigation);
  return <StoreNavigation items={items}/>;
}
