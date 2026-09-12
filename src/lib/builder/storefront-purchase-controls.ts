import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PURCHASE_CONTROLS_VERSION='shoporation.storefront-purchase-controls.v1' as const;

/**
 * Shared product purchase surface. Commerce identity/price/stock remain runtime
 * bindings; the component never becomes pricing, inventory or order authority.
 */
export const STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITION:StorefrontRuntimeComponentDefinition={
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'commerce.purchase-controls',
    componentVersion:1,
    schemaSlot:'children',
    pageTypes:['product'],
    configurable:[
      'productId','variantId','slug','name','unitPrice','availableQuantity','minimumQuantity','orderMultiple',
      'purchaseLabel','wishlistLabel','currency','presentation','styleSlots',
    ],
    responsiveMode:'fixed',
    capability:{minPlan:'alap',features:['catalog','inventory']},
  }),
  bindingSlots:[
    'productId','variantId','slug','name','unitPrice','availableQuantity','minimumQuantity','orderMultiple','purchaseLabel','wishlistLabel',
  ],
};
