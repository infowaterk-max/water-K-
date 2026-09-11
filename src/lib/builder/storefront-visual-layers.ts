import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';
import {createStorefrontStructuredProductComponentRegistry} from '@/lib/builder/storefront-structured-product';

export const STOREFRONT_VISUAL_LAYERS_VERSION='shoporation.storefront-visual-layers.v1' as const;
const PAGE_TYPES:readonly StorefrontBuilderPageType[]=['home','content','blog-article'];
export const STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[
  {manifest:defineStorefrontBuilderComponent({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,componentKey:'visual.layered-canvas',componentVersion:1,schemaSlot:'children',pageTypes:PAGE_TYPES,configurable:['height','tone','radius','presentation'],responsiveMode:'container',capability:{minPlan:'alap',features:[]}}),allowsChildren:true},
  {manifest:defineStorefrontBuilderComponent({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,componentKey:'visual.layer',componentVersion:1,schemaSlot:'children',pageTypes:PAGE_TYPES,configurable:['position','offsetX','offsetY','zIndex','width','height','tone','padding','opacity','pointerEvents','presentation'],responsiveMode:'container',capability:{minPlan:'alap',features:[]}}),allowsChildren:true},
] as const;
export function createStorefrontVisualLayerComponentRegistry(){const registry=createStorefrontStructuredProductComponentRegistry();for(const definition of STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS)registry.register(definition);return registry;}
