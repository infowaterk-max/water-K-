import {STOREFRONT_PRIMITIVE_DEFINITIONS} from '@/lib/builder/storefront-primitives';
import {STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-commerce';
import {STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-editorial';
import {STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-structured-product';
import {STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-guided-finder';
import {STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-multi-product-composer';
import {STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-configurator';
import {STOREFRONT_CONTEXT_RETENTION_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-context-retention';
import {STOREFRONT_PROFESSIONAL_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-professional';
import {STOREFRONT_STORY_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-story';
import {STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-visual-layers';
import {STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-purchase-controls';
import {STOREFRONT_SHARED_CONTENT_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-shared-content';
import {STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS} from '@/lib/builder/storefront-interactive-scene';
import {StorefrontComponentRegistry,type StorefrontRuntimeComponentDefinition} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_BUILDER_REGISTRY_VERSION='shoporation.storefront-builder-registry.special-commerce-v1' as const;

/** One source-controlled allowlist composed from canonical runtime component families. */
const DEFINITION_FAMILIES:readonly (readonly StorefrontRuntimeComponentDefinition[])[]=[
  STOREFRONT_PRIMITIVE_DEFINITIONS,
  STOREFRONT_CORE_COMMERCE_COMPONENT_DEFINITIONS,
  STOREFRONT_EDITORIAL_COMPONENT_DEFINITIONS,
  STOREFRONT_STRUCTURED_PRODUCT_COMPONENT_DEFINITIONS,
  STOREFRONT_GUIDED_FINDER_COMPONENT_DEFINITIONS,
  STOREFRONT_MULTI_PRODUCT_COMPOSER_COMPONENT_DEFINITIONS,
  STOREFRONT_CONFIGURATOR_COMPONENT_DEFINITIONS,
  STOREFRONT_CONTEXT_RETENTION_COMPONENT_DEFINITIONS,
  STOREFRONT_PROFESSIONAL_COMPONENT_DEFINITIONS,
  STOREFRONT_STORY_COMPONENT_DEFINITIONS,
  STOREFRONT_VISUAL_LAYER_COMPONENT_DEFINITIONS,
  STOREFRONT_PURCHASE_CONTROLS_COMPONENT_DEFINITIONS,
  STOREFRONT_SHARED_CONTENT_COMPONENT_DEFINITIONS,
  STOREFRONT_INTERACTIVE_SCENE_COMPONENT_DEFINITIONS,
] as const;

export function createStorefrontVisualBuilderComponentRegistry(){
  const registry=new StorefrontComponentRegistry();
  const seen=new Set<string>();
  for(const family of DEFINITION_FAMILIES){
    for(const definition of family){
      const key=`${definition.manifest.componentKey}@${definition.manifest.componentVersion}`;
      if(seen.has(key))continue;
      seen.add(key);
      registry.register(definition);
    }
  }
  return registry;
}

export const STOREFRONT_BUILDER_COMPONENT_FAMILY_COUNT=DEFINITION_FAMILIES.length;
