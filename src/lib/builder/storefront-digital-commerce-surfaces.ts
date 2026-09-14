import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  defineStorefrontBuilderComponent,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_DIGITAL_COMMERCE_SURFACES_VERSION='shoporation.storefront-digital-commerce-surfaces.v1' as const;

const definition=(input:{
  componentKey:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  configurable:readonly string[];
  features:readonly ('catalog'|'orders')[];
}):StorefrontRuntimeComponentDefinition=>({
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:input.componentKey,
    componentVersion:1,
    schemaSlot:'children',
    pageTypes:input.pageTypes,
    configurable:input.configurable,
    responsiveMode:'grid',
    capability:{minPlan:'alap',features:input.features},
  }),
  // Commerce/document truth is injected by the shared runtime binding layer.
  // Builder mutations may edit presentation config, but never this model slot.
  runtimeBindingSlots:['model'],
});

export const STOREFRONT_DIGITAL_COMMERCE_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  definition({
    componentKey:'commerce.fulfillment-summary',
    pageTypes:['product','cart','checkout'],
    configurable:['title','copy','physicalLabel','digitalLabel','mixedLabel','documentCenterLabel','presentation','styleSlots'],
    features:['catalog'],
  }),
  definition({
    componentKey:'commerce.product-documents',
    pageTypes:['product'],
    configurable:['eyebrow','title','copy','downloadLabel','emptyLabel','loginLabel','presentation','styleSlots'],
    features:['catalog'],
  }),
  definition({
    componentKey:'commerce.documents-center',
    pageTypes:['account'],
    configurable:['eyebrow','title','copy','digitalTitle','orderTitle','productTitle','emptyLabel','loginLabel','presentation','styleSlots'],
    features:['orders'],
  }),
  definition({
    componentKey:'commerce.post-purchase-guidance',
    pageTypes:['checkout','account'],
    configurable:['eyebrow','title','copy','documentCenterLabel','pendingLabel','presentation','styleSlots'],
    features:['orders'],
  }),
] as const;
