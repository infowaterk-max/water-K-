'use server';

import {getCurrentStorefrontBuilderCapability} from '@/lib/builder/storefront-builder-server';
import {getCurrentStorefrontRecipeCommerceBundle} from '@/lib/builder/storefront-recipe-commerce-server';

export async function listRecipeCommerceOptionsAction(){
  const capability=await getCurrentStorefrontBuilderCapability();
  if(!new Set(capability.features).has('recipeCommerce'))return[];
  const bundle=await getCurrentStorefrontRecipeCommerceBundle();
  return bundle.options;
}
