import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_RELEASE_COMMERCE_COMPONENTS_VERSION='shoporation.storefront-release-commerce.v1' as const;

export const STOREFRONT_RELEASE_COMMERCE_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'commerce.release',
    componentVersion:1,
    schemaSlot:'sections',
    pageTypes:['home','catalog','product','content','blog-article'],
    configurable:['eyebrow','title','copy','scheduledLabel','liveLabel','endedLabel','style'],
    responsiveMode:'grid',
    capability:{minPlan:'alap',features:['catalog','inventory','releaseCommerce']},
  }),
  bindingSlots:['releases'],
}] as const;
