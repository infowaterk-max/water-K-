import {STOREFRONT_BUILDER_FOUNDATION_VERSION,STOREFRONT_PAGE_TYPES,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import {createStorefrontPrimitiveComponentRegistry,type StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-primitives';

export const STOREFRONT_SHARED_CONTENT_VERSION='shoporation.storefront-shared-content.v1' as const;

const ALL_PAGE_TYPES=[...STOREFRONT_PAGE_TYPES] as const;

/**
 * Reusable, presentation-only trust and evidence surfaces.
 * They do not create commerce, review, clinical or recommendation authority.
 */
export const STOREFRONT_SHARED_CONTENT_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  {
    manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'content.trust-strip',
      componentVersion:1,
      schemaSlot:'children',
      pageTypes:ALL_PAGE_TYPES,
      configurable:['items','columns','mobileColumns','presentation','styleSlots'],
      responsiveMode:'grid',
      capability:{minPlan:'alap',features:[]},
    }),
    bindingSlots:['items'],
  },
  {
    manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'editorial.before-after',
      componentVersion:1,
      schemaSlot:'children',
      pageTypes:['home','product','content','blog-article'],
      configurable:[
        'eyebrow','title','copy','beforeImage','beforeImageAlt','beforeLabel',
        'afterImage','afterImageAlt','afterLabel','caption','evidenceStatus','presentation','styleSlots',
      ],
      responsiveMode:'grid',
      capability:{minPlan:'alap',features:['contentMarketing']},
    }),
    bindingSlots:[
      'eyebrow','title','copy','beforeImage','beforeImageAlt','beforeLabel',
      'afterImage','afterImageAlt','afterLabel','caption','evidenceStatus',
    ],
  },
] as const;

export function createStorefrontSharedContentComponentRegistry(){
  const registry=createStorefrontPrimitiveComponentRegistry();
  for(const definition of STOREFRONT_SHARED_CONTENT_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}
