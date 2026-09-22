import type {FeatureCode} from '@/lib/plans/catalog';
import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent,type StorefrontBuilderPageType,type StorefrontResponsiveMode} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';
import {createStorefrontStructuredProductComponentRegistry} from '@/lib/builder/storefront-structured-product';

export const STOREFRONT_STORY_COMPONENTS_VERSION='shoporation.storefront-story-components.v1' as const;

const storyDefinition=(input:{componentKey:string;pageTypes:readonly StorefrontBuilderPageType[];configurable:readonly string[];bindingSlots:readonly string[];features?:readonly FeatureCode[];responsiveMode?:StorefrontResponsiveMode}):StorefrontRuntimeComponentDefinition=>({manifest:defineStorefrontBuilderComponent({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,componentKey:input.componentKey,componentVersion:1,schemaSlot:'children',pageTypes:input.pageTypes,configurable:input.configurable,responsiveMode:input.responsiveMode??'fixed',capability:{minPlan:'alap',features:input.features??['contentMarketing']}}),bindingSlots:input.bindingSlots});

export const STOREFRONT_STORY_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  storyDefinition({componentKey:'story.hero',pageTypes:['home','content','blog-article'],configurable:['eyebrow','title','excerpt','image','imageAlt','ctaLabel','ctaHref','tone','imagePosition'],bindingSlots:['eyebrow','title','excerpt','image','imageAlt','ctaLabel','ctaHref'],responsiveMode:'grid'}),
  storyDefinition({componentKey:'story.feature',pageTypes:['home','content','product','blog-article'],configurable:['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref','imagePosition','tone','relationLabel'],bindingSlots:['eyebrow','title','copy','image','imageAlt','ctaLabel','ctaHref','relationLabel'],responsiveMode:'grid'}),
  storyDefinition({componentKey:'story.provenance',pageTypes:['home','product','content','blog-article'],configurable:['eyebrow','title','copy','claims','verifiedLabel','tone'],bindingSlots:['eyebrow','title','copy','claims','verifiedLabel']}),
  storyDefinition({componentKey:'story.timeline',pageTypes:['home','content','blog-article'],configurable:['eyebrow','title','items'],bindingSlots:['eyebrow','title','items'],responsiveMode:'grid'}),
  storyDefinition({componentKey:'story.body',pageTypes:['content','blog-article'],configurable:['blocks','relations','emptyLabel'],bindingSlots:['blocks','relations']}),
  storyDefinition({componentKey:'story.index',pageTypes:['home','blog-index'],configurable:['eyebrow','title','items','columns','emptyLabel'],bindingSlots:['eyebrow','title','items'],responsiveMode:'grid'}),
  storyDefinition({componentKey:'story.service-care',pageTypes:['home','product','content'],configurable:['eyebrow','title','copy','items','tone'],bindingSlots:['eyebrow','title','copy','items'],features:[]}),
] as const;

export function createStorefrontStoryComponentRegistry(){const registry=createStorefrontStructuredProductComponentRegistry();for(const definition of STOREFRONT_STORY_COMPONENT_DEFINITIONS)registry.register(definition);return registry;}
