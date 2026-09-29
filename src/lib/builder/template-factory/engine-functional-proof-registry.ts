import {PRODUCT_DISCOVERY_ENGINE_VERSION} from '@/lib/commerce/product-discovery';
import {STRUCTURED_PRODUCT_ENGINE_VERSION} from '@/lib/commerce/structured-product';
import {STORY_ENGINE_VERSION} from '@/lib/content/story-engine';

export const STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION='shoporation.storefront-engine-functional-proof-registry.v1' as const;
export const FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT='shoporation.fast-engine-functional-proof.v1' as const;
export const SHARED_E13_FUNCTIONAL_PROOF_CONTRACT='shoporation.shared-engine-functional-proof.v1' as const;

export type StorefrontEngineId='E2'|'E7'|'E10'|'E13';
export type StorefrontEngineProofClass='deterministic-runtime'|'content-authority'|'browser-journey';

export type StorefrontEngineFunctionalProofDefinition={
  engineId:StorefrontEngineId;
  label:string;
  authority:string;
  authorityVersion:string|null;
  proofClass:StorefrontEngineProofClass;
  proofContract:string;
  proofProducer:string;
  requiredInvariants:readonly string[];
  browserRequired:boolean;
  networkRequired:boolean;
  productionMutationAllowed:false;
};

export const STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY:readonly StorefrontEngineFunctionalProofDefinition[]=Object.freeze([
  Object.freeze({
    engineId:'E2',
    label:'Product Discovery',
    authority:'commerce-read-model-authority',
    authorityVersion:PRODUCT_DISCOVERY_ENGINE_VERSION,
    proofClass:'deterministic-runtime',
    proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['deterministic','explainable','eligibility-fail-closed','no-commerce-mutation']),
    browserRequired:false,
    networkRequired:false,
    productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E7',
    label:'Compare & Spec',
    authority:'commerce-read-model-authority',
    authorityVersion:STRUCTURED_PRODUCT_ENGINE_VERSION,
    proofClass:'deterministic-runtime',
    proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['shared-structured-registry','unit-normalization','comparison-determinism','no-commerce-mutation']),
    browserRequired:false,
    networkRequired:false,
    productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E10',
    label:'Editorial / Story',
    authority:'content-authority',
    authorityVersion:STORY_ENGINE_VERSION,
    proofClass:'content-authority',
    proofContract:FAST_ENGINE_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'tests/template-factory-fast-engine-functional-proof.test.ts',
    requiredInvariants:Object.freeze(['publication-lifecycle','provenance-fail-closed','unsafe-content-rejection','template-switch-preserves-content']),
    browserRequired:false,
    networkRequired:false,
    productionMutationAllowed:false,
  }),
  Object.freeze({
    engineId:'E13',
    label:'Shared Checkout',
    authority:'payment-checkout-order-authority',
    authorityVersion:null,
    proofClass:'browser-journey',
    proofContract:SHARED_E13_FUNCTIONAL_PROOF_CONTRACT,
    proofProducer:'scripts/template-factory-product-owner-handoff.mjs#proveSharedE13FunctionalEngine',
    requiredInvariants:Object.freeze(['shared-runtime','authoritative-quote','guided-checkout-flow','no-production-side-effect']),
    browserRequired:true,
    networkRequired:true,
    productionMutationAllowed:false,
  }),
]);

export function getStorefrontEngineFunctionalProofDefinition(engineId:StorefrontEngineId){
  return STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY.find(item=>item.engineId===engineId)??null;
}

export function validateStorefrontEngineFunctionalProofRegistry(){
  const issues:string[]=[];
  const ids=new Set<string>();
  for(const entry of STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY){
    if(ids.has(entry.engineId))issues.push(`ENGINE_FUNCTIONAL_PROOF_DUPLICATE:${entry.engineId}`);
    ids.add(entry.engineId);
    if(!entry.label.trim()||!entry.authority.trim()||!entry.proofContract.trim()||!entry.proofProducer.trim())issues.push(`ENGINE_FUNCTIONAL_PROOF_REQUIRED_FIELD:${entry.engineId}`);
    if(!entry.requiredInvariants.length||new Set(entry.requiredInvariants).size!==entry.requiredInvariants.length)issues.push(`ENGINE_FUNCTIONAL_PROOF_INVARIANTS_INVALID:${entry.engineId}`);
    const browser=entry.proofClass==='browser-journey';
    if(entry.browserRequired!==browser)issues.push(`ENGINE_FUNCTIONAL_PROOF_BROWSER_CLASS_DRIFT:${entry.engineId}`);
    if(entry.networkRequired&&!entry.browserRequired)issues.push(`ENGINE_FUNCTIONAL_PROOF_NETWORK_CLASS_DRIFT:${entry.engineId}`);
    if(entry.engineId!=='E13'&&!entry.authorityVersion)issues.push(`ENGINE_FUNCTIONAL_PROOF_AUTHORITY_VERSION_REQUIRED:${entry.engineId}`);
    if(entry.engineId==='E13'&&entry.proofContract!==SHARED_E13_FUNCTIONAL_PROOF_CONTRACT)issues.push('ENGINE_FUNCTIONAL_PROOF_E13_CONTRACT_DRIFT');
  }
  for(const id of ['E2','E7','E10','E13'] as const)if(!ids.has(id))issues.push(`ENGINE_FUNCTIONAL_PROOF_REQUIRED_ENGINE_MISSING:${id}`);
  return Object.freeze({contract:STOREFRONT_ENGINE_FUNCTIONAL_PROOF_REGISTRY_VERSION,ok:issues.length===0,issues:Object.freeze(issues)});
}
