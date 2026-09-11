import {StorefrontRendererRegistry} from '@/components/builder/storefront-runtime-renderer';
import {createStorefrontContextRetentionRendererRegistry} from '@/components/builder/storefront-context-retention';
import {createStorefrontProfessionalRendererRegistry} from '@/components/builder/storefront-professional';
import {createStorefrontStoryVisualRendererRegistry} from '@/components/builder/storefront-story-visual';

export const STOREFRONT_BUILDER_RENDERER_REGISTRY_VERSION='shoporation.storefront-builder-renderers.block22.v1' as const;

/**
 * Combines existing renderer families by component key/version. Runtime renderers
 * stay canonical; this registry is only a composition view for the Builder.
 */
export function createStorefrontVisualBuilderRendererRegistry(){
  const target=new StorefrontRendererRegistry();
  const seen=new Set<string>();
  for(const source of[
    createStorefrontContextRetentionRendererRegistry(),
    createStorefrontProfessionalRendererRegistry(),
    createStorefrontStoryVisualRendererRegistry(),
  ]){
    for(const item of source.list()){
      const key=`${item.componentKey}@${item.componentVersion}`;
      if(seen.has(key))continue;
      seen.add(key);
      target.register(item.componentKey,item.componentVersion,item.renderer);
    }
  }
  return target;
}
