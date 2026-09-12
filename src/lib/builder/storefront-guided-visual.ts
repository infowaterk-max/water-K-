import {createStorefrontGuidedFinderComponentRegistry,STOREFRONT_GUIDED_FINDER_COMPONENTS_VERSION} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS,STOREFRONT_VISUAL_LAYERS_VERSION} from '@/lib/builder/storefront-visual-layers';
import {STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITION,STOREFRONT_PURCHASE_CONTROLS_VERSION} from '@/lib/builder/storefront-purchase-controls';

export const STOREFRONT_GUIDED_VISUAL_COMPONENTS_VERSION='shoporation.storefront-guided-visual-components.v2' as const;

/**
 * Shared composition used by templates that need deterministic Guided Finder,
 * independent visual layers and the common functional purchase control surface.
 * This is registry composition only; it creates no pricing/inventory authority.
 */
export function createStorefrontGuidedVisualComponentRegistry(){
  const registry=createStorefrontGuidedFinderComponentRegistry();
  for(const definition of STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS)registry.register(definition);
  registry.register(STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITION);
  return registry;
}

export const STOREFRONT_GUIDED_VISUAL_COMPONENT_DEPENDENCIES=Object.freeze({
  guided:STOREFRONT_GUIDED_FINDER_COMPONENTS_VERSION,
  visual:STOREFRONT_VISUAL_LAYERS_VERSION,
  purchase:STOREFRONT_PURCHASE_CONTROLS_VERSION,
  authority:'composition-only-no-new-commerce-pricing-inventory-or-guidance-authority',
} as const);
