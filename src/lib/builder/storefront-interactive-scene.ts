import {STOREFRONT_BUILDER_FOUNDATION_VERSION,defineStorefrontBuilderComponent} from '@/lib/builder/storefront-foundation';
import type {StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';
import {createStorefrontContextRetentionComponentRegistry} from '@/lib/builder/storefront-context-retention';

export const STOREFRONT_INTERACTIVE_SCENE_COMPONENTS_VERSION='shoporation.storefront-interactive-scene.v1' as const;

export type StorefrontInteractiveSceneProductOption={
  productId:string;
  label:string;
};

export const STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS:readonly StorefrontRuntimeComponentDefinition[]=[{
  manifest:defineStorefrontBuilderComponent({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    componentKey:'commerce.interactive-scene',
    componentVersion:1,
    schemaSlot:'sections',
    pageTypes:['home','catalog','product','content'],
    configurable:[
      'eyebrow','title','copy','backgroundImage','backgroundAlt','emptyLabel','style',
    ],
    responsiveMode:'grid',
    capability:{minPlan:'pro',features:['catalog','interactiveSceneCommerce']},
  }),
  bindingSlots:['backgroundImage','products'],
}] as const;

export function createStorefrontInteractiveSceneComponentRegistry(){
  const registry=createStorefrontContextRetentionComponentRegistry();
  for(const definition of STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS)registry.register(definition);
  return registry;
}
