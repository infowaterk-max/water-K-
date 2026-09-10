import {COMPATIBILITY_ENGINE_VERSION} from '@/lib/commerce/compatibility-engine';
import {CONTEXT_PROFILE_ENGINE_VERSION} from '@/lib/commerce/context-profile';
import {GUIDED_FINDER_ENGINE_VERSION} from '@/lib/commerce/guided-finder';
import {MULTI_PRODUCT_COMPOSER_ENGINE_VERSION} from '@/lib/commerce/multi-product-composer';
import {PRODUCT_CONFIGURATOR_ENGINE_VERSION} from '@/lib/commerce/product-configurator';
import {PRODUCT_DISCOVERY_ENGINE_VERSION} from '@/lib/commerce/product-discovery';
import {STRUCTURED_PRODUCT_ENGINE_VERSION} from '@/lib/commerce/structured-product';

export const ROADMAP_BLOCK15_ENGINE_FAMILY=Object.freeze({
  productDiscovery:PRODUCT_DISCOVERY_ENGINE_VERSION,
  guidedFinder:GUIDED_FINDER_ENGINE_VERSION,
  multiProductComposer:MULTI_PRODUCT_COMPOSER_ENGINE_VERSION,
  productConfigurator:PRODUCT_CONFIGURATOR_ENGINE_VERSION,
  compatibility:COMPATIBILITY_ENGINE_VERSION,
  compareSpec:STRUCTURED_PRODUCT_ENGINE_VERSION,
  profileContext:CONTEXT_PROFILE_ENGINE_VERSION,
} as const);

export const ROADMAP_BLOCK15_AUTHORITY_CONTRACT=Object.freeze({
  canonicalScope:'product-discovery-guided-finder-multi-product-composer-configurator-compatibility',
  sharedCatalogAuthority:true,
  sharedStructuredAttributeAuthority:'shoporation.compare-spec-engine.v1',
  deterministicOutputs:true,
  explainableOutputs:true,
  builderReadyReadModels:true,
  pageSchemaTemplatesImplemented:false,
  visualBuilderImplemented:false,
  parallelCatalogEngine:false,
  supplierFeedSync:false,
  automaticCatalogEnrichment:false,
  marketplaceBulkPublishing:false,
  advancedPimErpConnector:false,
  aiGeneratedProductData:false,
} as const);
