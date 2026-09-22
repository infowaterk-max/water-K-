import {createStorefrontStoryComponentRegistry,STOREFRONT_STORY_COMPONENTS_VERSION} from '@/lib/builder/storefront-story';
import {STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS,STOREFRONT_VISUAL_LAYERS_VERSION} from '@/lib/builder/storefront-visual-layers';

export const STOREFRONT_STORY_VISUAL_COMPONENTS_VERSION='shoporation.storefront-story-visual-components.v1' as const;

/** Composition-only registry used by story-led templates that also need the
 * shared layered visual primitives. It introduces no new storefront authority. */
export function createStorefrontStoryVisualComponentRegistry(){
  const registry=createStorefrontStoryComponentRegistry();
  for(const definition of STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}

export const STOREFRONT_STORY_VISUAL_COMPONENT_DEPENDENCIES=Object.freeze({
  story:STOREFRONT_STORY_COMPONENTS_VERSION,
  visual:STOREFRONT_VISUAL_LAYERS_VERSION,
  authority:'composition-only-no-new-commerce-content-or-guidance-authority',
} as const);
