import type {FeatureCode} from '@/lib/plans/catalog';
import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  defineStorefrontBuilderComponent,
  type StorefrontBuilderPageType,
  type StorefrontResponsiveMode,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';
import {createStorefrontEditorialComponentRegistry} from '@/lib/builder/storefront-editorial';

export const STOREFRONT_STRUCTURED_PRODUCT_COMPONENTS_VERSION='shoporation.storefront-structured-product.v1' as const;

const structuredDefinition=(input:{
  componentKey:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  configurable:readonly string[];
  bindingSlots:readonly string[];
  features?:readonly FeatureCode[];
  responsiveMode?:StorefrontResponsiveMode;
}):StorefrontRuntimeComponentDefinition=>({
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:input.componentKey,
    componentVersion:1,
    schemaSlot:'children',
    pageTypes:input.pageTypes,
    configurable:input.configurable,
    responsiveMode:input.responsiveMode??'fixed',
    capability:{minPlan:'alap',features:input.features??['catalog']},
  }),
  bindingSlots:input.bindingSlots,
});

export const STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  structuredDefinition({componentKey:'commerce.option-selector',pageTypes:['product'],configurable:['label','options'],bindingSlots:['label','options'],features:['catalog','inventory']}),
  structuredDefinition({componentKey:'commerce.key-specs',pageTypes:['product','home','content'],configurable:['title','items','columns','missingLabel'],bindingSlots:['title','items'],responsiveMode:'grid'}),
  structuredDefinition({componentKey:'commerce.specification-groups',pageTypes:['product'],configurable:['title','groups','missingLabel'],bindingSlots:['title','groups']}),
  structuredDefinition({componentKey:'commerce.compare-button',pageTypes:['product','catalog','search'],configurable:['label','href','count','disabled'],bindingSlots:['label','href','count']}),
  structuredDefinition({componentKey:'commerce.compare-tray',pageTypes:['product','catalog','search'],configurable:['title','items','compareHref','compareLabel','maxItems','emptyLabel'],bindingSlots:['title','items','compareHref','compareLabel']}),
  structuredDefinition({componentKey:'commerce.compare-table',pageTypes:['product','catalog','search','content'],configurable:['title','products','groups','differencesOnly','missingLabel'],bindingSlots:['title','products','groups']}),
  structuredDefinition({componentKey:'commerce.technical-documents',pageTypes:['product'],configurable:['title','documents','emptyLabel'],bindingSlots:['title','documents']}),
  structuredDefinition({componentKey:'commerce.catalog-facets',pageTypes:['catalog','search'],configurable:['title','facets','clearHref','clearLabel'],bindingSlots:['title','facets','clearHref','clearLabel'],features:['catalog','searchFiltering']}),
  structuredDefinition({componentKey:'commerce.compare-spotlight',pageTypes:['home'],configurable:['title','copy','products','rows','ctaLabel','ctaHref'],bindingSlots:['title','copy','products','rows','ctaLabel','ctaHref'],responsiveMode:'grid'}),
  structuredDefinition({componentKey:'commerce.product-launch-hero',pageTypes:['home'],configurable:['eyebrow','title','copy','image','imageAlt','price','compareAtPrice','badge','primaryLabel','primaryHref','secondaryLabel','secondaryHref','tone'],bindingSlots:['eyebrow','title','copy','image','imageAlt','price','compareAtPrice','badge','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],responsiveMode:'grid'}),
] as const;

export function createStorefrontStructuredProductComponentRegistry(){
  const registry=createStorefrontEditorialComponentRegistry();
  for(const definition of STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}
