import type {FeatureCode} from '@/lib/plans/catalog';
import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_PAGE_TYPES,
  defineStorefrontBuilderComponent,
  type StorefrontBuilderPageType,
  type StorefrontResponsiveMode,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';
import {createStorefrontCoreCommerceComponentRegistry} from '@/lib/builder/storefront-commerce';

export const STOREFRONT_EDITORIAL_COMPONENTS_VERSION='shoporation.storefront-editorial-components.v1' as const;

const editorialDefinition=(input:{
  componentKey:string;
  pageTypes:readonly StorefrontBuilderPageType[];
  configurable:readonly string[];
  bindingSlots:readonly string[];
  features?:readonly FeatureCode[];
  responsiveMode?:StorefrontResponsiveMode;
  protectedSystem?:boolean;
}):StorefrontRuntimeComponentDefinition=>({
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:input.componentKey,
    componentVersion:1,
    schemaSlot:'children',
    pageTypes:input.pageTypes,
    configurable:input.configurable,
    responsiveMode:input.responsiveMode??'fixed',
    capability:{minPlan:'alap',features:input.features??[]},
  }),
  bindingSlots:input.bindingSlots,
  protectedSystem:input.protectedSystem,
});

export const STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  editorialDefinition({
    componentKey:'editorial.hero',
    pageTypes:['home','blog-article','content'],
    configurable:['eyebrow','title','copy','image','imageAlt','primaryLabel','primaryHref','secondaryLabel','secondaryHref','imagePosition','height'],
    bindingSlots:['eyebrow','title','copy','image','imageAlt','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],
    features:['contentMarketing'],
    responsiveMode:'grid',
  }),
  editorialDefinition({
    componentKey:'editorial.split-feature',
    pageTypes:['home','content'],
    configurable:['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref','imagePosition','tone'],
    bindingSlots:['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref'],
    features:['contentMarketing'],
    responsiveMode:'grid',
  }),
  editorialDefinition({
    componentKey:'editorial.journal-preview',
    pageTypes:['home','blog-index'],
    configurable:['title','items','columns','emptyLabel'],
    bindingSlots:['title','items'],
    features:['contentMarketing'],
    responsiveMode:'grid',
  }),
  editorialDefinition({
    componentKey:'marketing.newsletter-signup',
    pageTypes:['home','content'],
    configurable:['eyebrow','title','copy','actionHref','inputLabel','buttonLabel','consentLabel','tone'],
    bindingSlots:['eyebrow','title','copy','actionHref','inputLabel','buttonLabel','consentLabel'],
    features:['marketingBasics'],
  }),
  editorialDefinition({
    componentKey:'editorial.footer',
    pageTypes:[...STOREFRONT_PAGE_TYPES],
    configurable:['brandLabel','columns','copyright','tone'],
    bindingSlots:['brandLabel','columns','copyright'],
    features:[],
  }),
] as const;

export function createStorefrontEditorialComponentRegistry(){
  const registry=createStorefrontCoreCommerceComponentRegistry();
  for(const definition of STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}
