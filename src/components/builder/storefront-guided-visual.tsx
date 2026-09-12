import {createStorefrontGuidedFinderRendererRegistry,STOREFRONT_GUIDED_FINDER_RENDERERS_VERSION} from '@/components/builder/storefront-guided-finder';
import {STOREFRONT_VISUAL_LAYER_RENDERERS,STOREFRONT_VISUAL_LAYER_RENDERERS_VERSION} from '@/components/builder/storefront-visual-layers';
import {STOREFRONT_PURCHASE_CONTROLS_RENDERERS,STOREFRONT_PURCHASE_CONTROLS_RENDERERS_VERSION} from '@/components/builder/storefront-purchase-controls';

export const STOREFRONT_GUIDED_VISUAL_RENDERERS_VERSION='shoporation.storefront-guided-visual-renderers.v2' as const;

/** Shared renderer composition for Page Schemas combining guided, visual and purchase surfaces. */
export function createStorefrontGuidedVisualRendererRegistry(){
  const registry=createStorefrontGuidedFinderRendererRegistry();
  for(const[key,version,renderer]of STOREFRONT_VISUAL_LAYER_RENDERERS)registry.register(key,version,renderer);
  for(const[key,version,renderer]of STOREFRONT_PURCHASE_CONTROLS_RENDERERS)registry.register(key,version,renderer);
  return registry;
}

export const STOREFRONT_GUIDED_VISUAL_RENDERER_DEPENDENCIES=Object.freeze({
  guided:STOREFRONT_GUIDED_FINDER_RENDERERS_VERSION,
  visual:STOREFRONT_VISUAL_LAYER_RENDERERS_VERSION,
  purchase:STOREFRONT_PURCHASE_CONTROLS_RENDERERS_VERSION,
} as const);
