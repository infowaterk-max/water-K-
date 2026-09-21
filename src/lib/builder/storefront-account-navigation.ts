import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_ACCOUNT_NAVIGATION_VERSION='shoporation.storefront-account-navigation.v1' as const;

export const STOREFRONT_ACCOUNT_NAVIGATION_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'account.capability-navigation',
    componentVersion:1,
    schemaSlot:'account.navigation',
    pageTypes:['account'],
    configurable:['title','items','presentation','style','itemStyle'],
    responsiveMode:'stack',
    capability:{minPlan:'alap',features:['customers']},
  }),
  bindingSlots:['items'],
  protectedSystem:true,
}] as const;
