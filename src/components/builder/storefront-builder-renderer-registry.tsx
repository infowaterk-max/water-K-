import {StorefrontRendererRegistry} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontInteractiveSceneRendererRegistry} from '@/components/builder/storefront-interactive-scene';
import {createStorefrontRecipeCommerceRendererRegistry} from '@/components/builder/storefront-recipe-commerce';
import {createStorefrontProfessionalRendererRegistry} from '@/components/builder/storefront-professional';
import {createStorefrontStoryVisualRendererRegistry} from '@/components/builder/storefront-story-visual';
import {createStorefrontSharedContentRendererRegistry} from '@/components/builder/storefront-shared-content';
import {STOREFRONT_PURCHASE_CONTROLS_RENDERERS} from '@/components/builder/storefront-purchase-controls';

export const STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION='shoporation.storefront-builder-renderers.special-commerce-v2' as const;

/** Runtime renderers stay canonical; this registry is only a composition view for the Builder. */
export function createStorefrontVisualBuilderRendererRegistry(){
  const target=new StorefrontRendererRegistry();
  const seen=new Set<string>();
  const register=(componentKey:string,componentVersion:number,renderer:Parameters<StorefrontRendererRegistry['register']>[2])=>{
    const key=`${componentKey}@${componentVersion}`;
    if(seen.has(key))return;
    seen.add(key);
    target.register(componentKey,componentVersion,renderer);
  };
  for(const source of[
    createStorefrontInteractiveSceneRendererRegistry(),
    createStorefrontRecipeCommerceRendererRegistry(),
    createStorefrontProfessionalRendererRegistry(),
    createStorefrontStoryVisualRendererRegistry(),
    createStorefrontSharedContentRendererRegistry(),
  ]){
    for(const item of source.list())register(item.componentKey,item.componentVersion,item.renderer);
  }
  for(const[componentKey,componentVersion,renderer]of STOREFRONT_PURCHASE_CONTROLS_RENDERERS)register(componentKey,componentVersion,renderer);
  return target;
}
