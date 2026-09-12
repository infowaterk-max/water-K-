'use server';

import {getCurrentStorefrontInteractiveSceneCatalog} from '@/lib/builder/storefront-interactive-scene-server';

export async function listInteractiveSceneProductOptionsAction(){
  const catalog=await getCurrentStorefrontInteractiveSceneCatalog();
  return catalog.options;
}
