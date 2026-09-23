import {getStorefrontTemplateFactoryCategoryFoundation} from '@/lib/builder/template-factory/category-foundations';
import {
  compileStorefrontTemplateFactoryPackage,
  type StorefrontTemplateFactoryBuild,
  type StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/scaffold';

export function buildStorefrontTemplateFactoryCandidate(recipe:StorefrontTemplateFactoryRecipe):StorefrontTemplateFactoryBuild{
  return compileStorefrontTemplateFactoryPackage({
    foundation:getStorefrontTemplateFactoryCategoryFoundation(recipe.category),
    recipe,
  });
}

export * from '@/lib/builder/template-factory/scaffold';
export * from '@/lib/builder/template-factory/category-foundations';

export * from '@/lib/builder/template-factory/media-production';
