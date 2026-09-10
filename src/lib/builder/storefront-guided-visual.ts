import {createStorefrontGuidedFinderComponentRegistry,STOREFRONT_GUIDED_FINDER_COMPONENTS_VERSION} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS,STOREFRONT_VISUAL_LAYERS_VERSION} from '@/lib/builder/storefront-visual-layers';

export const STOREFRONT_GUIDED_VISUAL_COMPONENTS_VERSION='shoporation.storefront-guided-visual-components.v1' as const;

/**
 * Shared composition used by templates that need both deterministic Guided Finder
 * surfaces and independent visual marketing layers. This is registry composition,
 * not a new commerce/recommendation/medical engine or authority boundary.
 */
export function createStorefrontGuidedVisualComponentRegistry(){
  const registry=createStorefrontGuidedFinderComponentRegistry();
  for(const definition of STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}

export const STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES=Object.freeze({
  guided:STOREFRONT_GUIDED_FINDER_COMPONENTS_VERSION,
  visual:STOREFRONT_VISUAL_LAYERS_VERSION,
  authority:'composition-only-no-new-commerce-or-guidance-authority',
} as const);
