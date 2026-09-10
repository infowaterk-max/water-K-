import {createStorefrontStoryRendererRegistry,STOREFRONT_STORY_RENDERERS_VERSION} from '@/components/builder/storefront-story';
import {STOREFRONT_VISUAL_LAYER_RENDERERS,STOREFRONT_VISUAL_LAYER_RENDERERS_VERSION} from '@/components/builder/storefront-visual-layers';

export const STOREFRONT_STORY_VISUAL_RENDERERS_VERSION='shoporation.storefront-story-visual-renderers.v1' as const;

/** Rendering composition for Story + shared Visual Layer primitives only. */
export function createStorefrontStoryVisualRendererRegistry(){
  const registry=createStorefrontStoryRendererRegistry();
  for(const [key,version,renderer] of STOREFRONT_VISUAL_LAYER_RENDERERS)registry.register(key,version,renderer);
  return registry;
}

export const STOREFRONT_STORY_VISUAL_RENDERER_DEPENDENCIES=Object.freeze({
  story:STOREFRONT_STORY_RENDERERS_VERSION,
  visual:STOREFRONT_VISUAL_LAYER_RENDERERS_VERSION,
} as const);
