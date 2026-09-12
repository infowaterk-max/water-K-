import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_RECIPE_COMMERCE_COMPONENTS_VERSION='shoporation.storefront-recipe-commerce.v1' as const;

export const STOREFRONT_RECIPE_COMMERCE_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'commerce.recipe',
    componentVersion:1,
    schemaSlot:'sections',
    pageTypes:['home','product','content','blog-article'],
    configurable:['eyebrow','title','copy','actionLabel','showClaims','style'],
    responsiveMode:'grid',
    capability:{minPlan:'pro',features:['catalog','inventory','recipeCommerce']},
  }),
  bindingSlots:['recipes','catalog'],
}] as const;
