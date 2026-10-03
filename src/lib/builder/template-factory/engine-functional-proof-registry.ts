import {STOREFRONT_RUNTIME_VERSION} from '@/lib/builder/storefront-runtime';
import {COMPATIBILITY_ENGINE_VERSION} from '@/lib/commerce/compatibility-engine';
import {CONTEXT_PROFILE_ENGINE_VERSION} from '@/lib/commerce/context-profile';
import {GUIDED_FINDER_ENGINE_VERSION} from '@/lib/commerce/guided-finder';
import {MULTI_PRODUCT_COMPOSER_ENGINE_VERSION} from '@/lib/commerce/multi-product-composer';
import {PRODUCT_CONFIGURATOR_ENGINE_VERSION} from '@/lib/commerce/product-configurator';
import {PRODUCT_DISCOVERY_ENGINE_VERSION} from '@/lib/commerce/product-discovery';
import {PROFESSIONAL_B2B_ENGINE_VERSION} from '@/lib/commerce/professional-b2b';
import {RETENTION_REORDER_ENGINE_VERSION} from '@/lib/commerce/retention-reorder';
import {STRUCTURED_PRODUCT_ENGINE_VERSION} from '@/lib/commerce/structured-product';
import {STORY_ENGINE_VERSION} from '@/lib/content/story-engine';

export const STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION='shoporation.storefront-engine-functional-proof-registry.v2' as const;
export const FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT='shoporation.fast-engine-functional-proof.v1' as const;
export const ENGINE_REGRESSION_PROOF_CONTRACT='shoporation.engine-regression-functional-proof.v1' as const;
export const SHARED_E13_FUNCTIONAL_PROOF_CONTRACT='shoporation.shared-engine-functional-proof.v1' as const;

export const SHARED_STOREFRONT_ENGINE_IDS=Object.freeze(['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E13'] as const);
export const RESERVED_STOREFRONT_ENGINE_IDS=Object.freeze(['E12'] as const);
export type StorefrontEngineId=(typeof SHARED_STOREFRONT_ENGINE_IDS)[number];
export const STOREFRONT_ENGINE_BRABUS_REVALIDATION_VERSION='shoporation.storefront-engine-brabus-revalidation.v1' as const;
export type StorefrontEngineBrabusRevalidationState='PROVEN'|'EVOLVE'|'RETHINK';
export type StorefrontEngineBrabusRevalidation={
  contract:typeof STOREFRONT_ENGINE_BRABUS_REVALIDATION_VERSION;
  engineId:StorefrontEngineId;
  state:StorefrontEngineBrabusRevalidationState;
  requiredForTemplate3:true;
  retainedProofProducer:string;
  proofProducer:string|null;
};
export type StorefrontEngineProofClass='structural-runtime'|'deterministic-runtime'|'content-authority'|'server-read-model'|'browser-journey';

export type StorefrontEngineFunctionalProofDefinition={
  engineId:StorefrontEngineId;
  label:string;
  authority:string;
  authorityVersion:string|null;
  sourceModule:string;
  proofClass:StorefrontEngineProofClass;
  proofContract:string;
  proofProducer:string;
  requiredInvariants:readonly string[];
  browserRequired:boolean;
  networkRequired:boolean;
  productionMutationAllowed:false;
};

const deterministic=(input:Omit<StorefrontEngineFunctionalProofDefinition,'proofClass'|'proofContract'|'browserRequired'|'networkRequired'|'productionMutationAllowed'>):StorefrontEngineFunctionalProofDefinition=>Object.freeze({
  ...input,
  proofClass:'deterministic-runtime',
  proofContract:ENGINE_REGRESSION_PROOF_CONTRACT,
  browserRequired:false,
  networkRequired:false,
  productionMutationAllowed:false,
});

export const STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY:readonly StorefrontEngineFunctionalProofDefinition[]=Object.freeze([
  Object.freeze({
    engineId:'E1',label:'Storefront Runtime',authority:'builder-template-system',authorityVersion:STOREFRONT_RUNTIME_VERSION,
    sourceModule:'src/lib/builder/storefront-runtime.ts',proofClass:'structural-runtime',proofContract:ENGINE_REGRESSION_PROOF_CONTRACT,
    proofProducer:'tests/storefront-runtime-backbone.test.tsx',
    requiredInvariants:Object.freeze(['canonical-page-schema','binding-resolution','responsive-runtime','component-registry-authority']),
    browserRequired:false,networkRequired:false,productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E2',label:'Product Discovery',authority:'commerce-read-model-authority',authorityVersion:PRODUCT_DISCOVERY_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/product-discovery.ts',proofClass:'deterministic-runtime',proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['deterministic','explainable','eligibility-fail-closed','no-commerce-mutation']),
    browserRequired:false,networkRequired:false,productionMutationAllowed:false,
  }),
  deterministic({
    engineId:'E3',label:'Guided Finder',authority:'commerce-read-model-authority',authorityVersion:GUIDED_FINDER_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/guided-finder.ts',proofProducer:'tests/guided-finder-engine.test.ts',
    requiredInvariants:Object.freeze(['deterministic-guidance','explainable-evidence','selection-validation','template-switch-preserves-authority']),
  }),
  deterministic({
    engineId:'E4',label:'Multi-Product Composer',authority:'commerce-read-model-authority',authorityVersion:MULTI_PRODUCT_COMPOSER_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/multi-product-composer.ts',proofProducer:'tests/multi-product-composer-engine.test.ts',
    requiredInvariants:Object.freeze(['real-catalog-lines','atomic-intent','server-revalidation','no-silent-replacement']),
  }),
  deterministic({
    engineId:'E5',label:'Product Configurator',authority:'commerce-read-model-authority',authorityVersion:PRODUCT_CONFIGURATOR_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/product-configurator.ts',proofProducer:'tests/product-configurator-engine.test.ts',
    requiredInvariants:Object.freeze(['slot-validation','compatibility-fail-closed','server-revalidation','no-silent-replacement']),
  }),
  deterministic({
    engineId:'E6',label:'Compatibility',authority:'commerce-read-model-authority',authorityVersion:COMPATIBILITY_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/compatibility-engine.ts',proofProducer:'tests/compatibility-engine.test.ts',
    requiredInvariants:Object.freeze(['structured-evidence','explainable-result','unknown-is-not-compatible','malformed-rule-fail-closed']),
  }),
  Object.freeze({
    engineId:'E7',label:'Compare & Spec',authority:'commerce-read-model-authority',authorityVersion:STRUCTURED_PRODUCT_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/structured-product.ts',proofClass:'deterministic-runtime',proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['shared-structured-registry','unit-normalization','comparison-determinism','no-commerce-mutation']),
    browserRequired:false,networkRequired:false,productionMutationAllowed:false,
  }),
  deterministic({
    engineId:'E8',label:'Context Profile',authority:'commerce-read-model-authority',authorityVersion:CONTEXT_PROFILE_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/context-profile.ts',proofProducer:'tests/context-profile-engine.test.ts',
    requiredInvariants:Object.freeze(['customer-context-separation','soft-ranking-not-hard-lock','cart-preserved','server-persistence-authority']),
  }),
  deterministic({
    engineId:'E9',label:'Retention / Reorder',authority:'commerce-read-model-authority',authorityVersion:RETENTION_REORDER_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/retention-reorder.ts',proofProducer:'tests/retention-reorder-engine.test.ts',
    requiredInvariants:Object.freeze(['server-retention-evidence','current-commerce-revalidation','no-subscription-invention','no-silent-quantity-adjustment']),
  }),
  Object.freeze({
    engineId:'E10',label:'Editorial / Story',authority:'content-authority',authorityVersion:STORY_ENGINE_VERSION,
    sourceModule:'src/lib/content/story-engine.ts',proofClass:'content-authority',proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['publication-lifecycle','provenance-fail-closed','unsafe-content-rejection','template-switch-preserves-content']),
    browserRequired:false,networkRequired:false,productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E11',label:'Professional / B2B',authority:'commerce-read-model-authority',authorityVersion:PROFESSIONAL_B2B_ENGINE_VERSION,
    sourceModule:'src/lib/commerce/professional-b2b.ts',proofClass:'server-read-model',proofContract:ENGINE_REGRESSION_PROOF_CONTRACT,
    proofProducer:'tests/professional-b2b-engine.test.ts',
    requiredInvariants:Object.freeze(['server-authoritative-snapshot','price-tax-stock-not-recomputed','moq-order-multiple-preserved','unsafe-snapshot-fail-closed']),
    browserRequired:false,networkRequired:false,productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E13',label:'Shared Checkout',authority:'payment-checkout-order-authority',authorityVersion:null,
    sourceModule:'src/components/checkout/checkout-form.tsx',proofClass:'browser-journey',proofContract:SHARED_E13_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'scripts/template-factory-product-owner-handoff.mjs#proveSharedE13FunctionalEngine',
    requiredInvariants:Object.freeze(['shared-runtime','authoritative-quote','guided-checkout-flow','no-production-side-effect']),
    browserRequired:true,networkRequired:true,productionMutationAllowed:false,
  }),
]);

export function getStorefrontEngineFunctionalProofDefinition(engineId:string){
  return STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.find(item=>item.engineId===engineId)??null;
}

export const STOREFRONT_ENGINE_BRABUS_REVALIDATION:readonly StorefrontEngineBrabusRevalidation[]=Object.freeze(
  STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.map(entry=>Object.freeze({
    contract:STOREFRONT_ENGINE_BRABUS_REVALIDATION_VERSION,
    engineId:entry.engineId,
    state:'EVOLVE' as const,
    requiredForTemplate3:true as const,
    retainedProofProducer:entry.proofProducer,
    proofProducer:null,
  })),
);
export function getStorefrontEngineBrabusRevalidation(engineId:string){
  return STOREFRONT_ENGINE_BRABUS_REVALIDATION.find(item=>item.engineId===engineId)??null;
}


export function parseStorefrontEngineBinding(binding:unknown):readonly string[]{
  if(typeof binding!=='string'||!binding.trim())return Object.freeze([]);
  return Object.freeze([...new Set(binding.match(/\bE\d{1,2}\b/g)??[])]);
}

export function validateStorefrontEngineBinding(binding:unknown){
  const engineIds=parseStorefrontEngineBinding(binding);
  const issues:string[]=[];
  for(const engineId of engineIds){
    if((RESERVED_STOREFRONT_ENGINE_IDS as readonly string[]).includes(engineId)){
      issues.push(`ENGINE_FUNCTIONAL_PROOF_RESERVED_ENGINE_REFERENCED:${engineId}`);
      continue;
    }
    if(!getStorefrontEngineFunctionalProofDefinition(engineId))issues.push(`ENGINE_FUNCTIONAL_PROOF_UNREGISTERED_ENGINE:${engineId}`);
  }
  return Object.freeze({engineIds,ok:issues.length===0,issues:Object.freeze(issues)});
}

export function validateStorefrontEngineFunctionalProofRegistry(
  registry:readonly StorefrontEngineFunctionalProofDefinition[]=STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY,
){
  const issues:string[]=[];
  const ids=new Set<string>();
  const required=new Set<string>(SHARED_STOREFRONT_ENGINE_IDS);
  for(const entry of registry){
    if(ids.has(entry.engineId))issues.push(`ENGINE_FUNCTIONAL_PROOF_DUPLICATE:${entry.engineId}`);
    ids.add(entry.engineId);
    if(!required.has(entry.engineId))issues.push(`ENGINE_FUNCTIONAL_PROOF_UNKNOWN_ENGINE:${entry.engineId}`);
    if(!entry.label.trim()||!entry.authority.trim()||!entry.sourceModule.trim()||!entry.proofContract.trim()||!entry.proofProducer.trim())issues.push(`ENGINE_FUNCTIONAL_PROOF_REQUIRED_FIELD:${entry.engineId}`);
    if(!entry.requiredInvariants.length||new Set(entry.requiredInvariants).size!==entry.requiredInvariants.length)issues.push(`ENGINE_FUNCTIONAL_PROOF_INVARIANTS_INVALID:${entry.engineId}`);
    const browser=entry.proofClass==='browser-journey';
    if(entry.browserRequired!==browser)issues.push(`ENGINE_FUNCTIONAL_PROOF_BROWSER_CLASS_DRIFT:${entry.engineId}`);
    if(entry.networkRequired&&!entry.browserRequired)issues.push(`ENGINE_FUNCTIONAL_PROOF_NETWORK_CLASS_DRIFT:${entry.engineId}`);
    if(entry.engineId!=='E13'&&!entry.authorityVersion)issues.push(`ENGINE_FUNCTIONAL_PROOF_AUTHORITY_VERSION_REQUIRED:${entry.engineId}`);
    if(entry.engineId==='E13'&&entry.proofContract!==SHARED_E13_FUNCTIONAL_PROOF_CONTRACT)issues.push('ENGINE_FUNCTIONAL_PROOF_E13_CONTRACT_DRIFT');
  }
  for(const id of SHARED_STOREFRONT_ENGINE_IDS)if(!ids.has(id))issues.push(`ENGINE_FUNCTIONAL_PROOF_REQUIRED_ENGINE_MISSING:${id}`);
  for(const revalidation of STOREFRONT_ENGINE_BRABUS_REVALIDATION){
    if(!ids.has(revalidation.engineId))issues.push(`ENGINE_BRABUS_REVALIDATION_UNKNOWN_ENGINE:${revalidation.engineId}`);
    if(revalidation.contract!==STOREFRONT_ENGINE_BRABUS_REVALIDATION_VERSION)issues.push(`ENGINE_BRABUS_REVALIDATION_CONTRACT_DRIFT:${revalidation.engineId}`);
    if(revalidation.state==='PROVEN'&&!revalidation.proofProducer)issues.push(`ENGINE_BRABUS_REVALIDATION_PROOF_REQUIRED:${revalidation.engineId}`);
  }
  return Object.freeze({
    contract:STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION,
    engineIds:Object.freeze([...ids]),
    ok:issues.length===0,
    issues:Object.freeze(issues),
  });
}
