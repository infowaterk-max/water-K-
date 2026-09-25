import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_PAGE_TYPES,
  defineStorefrontBuilderComponent,
} from '@/lib/builder/storefront-foundation';
import {createStorefrontPrimitiveComponentRegistry} from '@/lib/builder/storefront-primitives';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_COMMERCE_HEADER_VERSION='shoporation.storefront-commerce-header.v2' as const;
const ALL_PAGE_TYPES=[...STOREFRONT_PAGE_TYPES] as const;

export const STOREFRONT_COMMERCE_HEADER_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  {
    manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'system.commerce-header',
      componentVersion:1,
      schemaSlot:'protected.header',
      pageTypes:ALL_PAGE_TYPES,
      configurable:[
        'brandLabel','brandHref','logoUrl','logoAlt','tagline','utilityItems','tone','sticky','presentation',
        'showUtilityLabels','categoryTriggerLabel','categoryTriggerHref','categoryTriggerSymbol','navTagline','mobileMenuItems',
        'style','styleSlots','innerStyle','brandStyle','taglineStyle','utilityStyle','logoStyle',
      ],
      responsiveMode:'primary-navigation',
      capability:{minPlan:'alap',features:[]},
    }),
    bindingSlots:['brandLabel','brandHref','logoUrl','logoAlt','utilityItems'],
    allowsChildren:true,
    allowedChildren:['system.search','system.navigation'],
    protectedSystem:true,
  },
  {
    manifest:defineStorefrontBuilderComponent({
      foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
      componentKey:'system.search',
      componentVersion:1,
      schemaSlot:'children',
      pageTypes:ALL_PAGE_TYPES,
      configurable:['action','queryParam','placeholder','buttonLabel','ariaLabel','presentation','style','styleSlots','inputStyle','buttonStyle'],
      responsiveMode:'container',
      capability:{minPlan:'alap',features:[]},
    }),
    bindingSlots:['action','placeholder','buttonLabel','ariaLabel'],
  },
] as const;

export function createStorefrontCommerceHeaderComponentRegistry(){
  const registry=createStorefrontPrimitiveComponentRegistry();
  for(const definition of STOREFRONT_COMMERCE_HEADER_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}
