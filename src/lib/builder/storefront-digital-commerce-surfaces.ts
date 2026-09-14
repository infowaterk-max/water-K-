import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  defineStorefrontBuilderComponent,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {
  StorefrontComponentNode,
  StorefrontPageDocument,
  StorefrontRuntimeComponentDefinition,
} from '@/lib/builder/storefront-runtime';

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
  // Commerce/document truth is injected by the runtime. Builder mutations may
  // edit presentation config, but never the authoritative model binding.
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
    configurable:['eyebrow','title','copy','digitalTitle','orderTitle','emptyLabel','loginLabel','presentation','styleSlots'],
    features:['orders'],
  }),
  definition({
    componentKey:'commerce.post-purchase-guidance',
    pageTypes:['checkout','account'],
    configurable:['eyebrow','title','copy','documentCenterLabel','pendingLabel','presentation','styleSlots'],
    features:['orders'],
  }),
] as const;

const MODEL_PATHS:Readonly<Record<string,Partial<Record<StorefrontBuilderPageType,string>>>>=Object.freeze({
  'commerce.fulfillment-summary':{
    product:'commerce.digitalCommerce.productFulfillment',
    cart:'commerce.digitalCommerce.cartFulfillment',
    checkout:'commerce.digitalCommerce.checkoutFulfillment',
  },
  'commerce.product-documents':{product:'commerce.digitalCommerce.productDocuments'},
  'commerce.documents-center':{account:'commerce.digitalCommerce.documentsCenter'},
  'commerce.post-purchase-guidance':{
    checkout:'commerce.digitalCommerce.postPurchase',
    account:'commerce.digitalCommerce.postPurchase',
  },
});

function bindNode(node:StorefrontComponentNode,pageType:StorefrontBuilderPageType):StorefrontComponentNode{
  const children=node.children?.map(child=>bindNode(child,pageType));
  const path=MODEL_PATHS[node.componentKey]?.[pageType];
  if(!path)return children?{...node,children}:node;
  return{
    ...node,
    // Always replace a persisted/authored model binding with the canonical
    // runtime path. This keeps business authority outside Page Schema content.
    bindings:{...(node.bindings??{}),model:{path}},
    ...(children?{children}:{}),
  };
}

export function bindStorefrontDigitalCommerceRuntime(document:StorefrontPageDocument):StorefrontPageDocument{
  return{...document,sections:document.sections.map(section=>bindNode(section,document.pageType))};
}
