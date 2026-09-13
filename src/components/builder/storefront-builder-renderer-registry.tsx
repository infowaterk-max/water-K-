import {StorefrontRendererRegistry} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontContextRetentionRendererRegistry} from '@/components/builder/storefront-context-retention';
import {createStorefrontProfessionalRendererRegistry} from '@/components/builder/storefront-professional';
import {createStorefrontStoryVisualRendererRegistry} from '@/components/builder/storefront-story-visual';
import {createStorefrontSharedContentRendererRegistry} from '@/components/builder/storefront-shared-content';
import {STOREFRONT_PURCHASE_CONTROLS_RENDERERS} from '@/components/builder/storefront-purchase-controls';

export const STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION='shoporation.storefront-builder-renderers.block22.v1' as const;

/**
 * Combines existing renderer families by component key/version. Runtime renderers
 * stay canonical; this registry is only a composition view for the Builder.
 */
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
    createStorefrontContextRetentionRendererRegistry(),
    createStorefrontProfessionalRendererRegistry(),
    createStorefrontStoryVisualRendererRegistry(),
    createStorefrontSharedContentRendererRegistry(),
  ]){
    for(const item of source.list())register(item.componentKey,item.componentVersion,item.renderer);
  }
  for(const[componentKey,componentVersion,renderer]of STOREFRONT_PURCHASE_CONTROLS_RENDERERS)register(componentKey,componentVersion,renderer);
  return target;
}
