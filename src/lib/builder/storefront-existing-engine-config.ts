import {validateGuidedFinderConfig,type GuidedFinderConfig} from '@/lib/commerce/guided-finder';
import {validateMultiProductComposerConfig,type MultiProductComposerConfig} from '@/lib/commerce/multi-product-composer';
import {validateCompatibilityRules,type CompatibilityRule} from '@/lib/commerce/compatibility-engine';
import {validateProductConfiguratorConfig,type ProductConfiguratorConfig} from '@/lib/commerce/product-configurator';

export const STOREFRONT_EXISTING_ENGINE_CONFIG_VERSION='shoporation.storefront-existing-engine-config.v1' as const;
export const STOREFRONT_EXISTING_ENGINE_KINDS=['guided_finder','multi_product_composer','product_configurator'] as const;
export type StorefrontExistingEngineKind=typeof STOREFRONT_EXISTING_ENGINE_KINDS[number];

export type StorefrontGuidedFinderDocument={config:GuidedFinderConfig};
export type StorefrontComposerDocument={config:MultiProductComposerConfig};
export type StorefrontConfiguratorDocument={config:ProductConfiguratorConfig;compatibilityRules:readonly CompatibilityRule[]};
export type StorefrontExistingEngineDocument=StorefrontGuidedFinderDocument|StorefrontComposerDocument|StorefrontConfiguratorDocument;
export type StorefrontExistingEngineRecord={id:string;engineKind:StorefrontExistingEngineKind;configKey:string;label:string;document:StorefrontExistingEngineDocument};

const record=(value:unknown):Record<string,unknown>|null=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const jsonSafe=(value:unknown)=>{try{JSON.stringify(value);return true}catch{return false}};

export function validateStorefrontExistingEngineDocument(kind:StorefrontExistingEngineKind,value:unknown):readonly string[]{
  const root=record(value),config=record(root?.config);
  if(!root||!config||!jsonSafe(value))return['STOREFRONT_ENGINE_DOCUMENT_INVALID'];
  try{
    if(kind==='guided_finder')return validateGuidedFinderConfig(config as unknown as GuidedFinderConfig).map(item=>item.code);
    if(kind==='multi_product_composer')return validateMultiProductComposerConfig(config as unknown as MultiProductComposerConfig).map(item=>item.code);
    const configErrors=validateProductConfiguratorConfig(config as unknown as ProductConfiguratorConfig).map(item=>item.code);
    const rules=Array.isArray(root.compatibilityRules)?root.compatibilityRules as CompatibilityRule[]:[];
    return[...configErrors,...validateCompatibilityRules(rules).map(item=>item.code)];
  }catch{return['STOREFRONT_ENGINE_DOCUMENT_INVALID']}
}

export function existingEngineConfigKey(kind:StorefrontExistingEngineKind,document:StorefrontExistingEngineDocument):string{
  const config=document.config;
  return kind==='guided_finder'?(config as GuidedFinderConfig).finderKey:kind==='multi_product_composer'?(config as MultiProductComposerConfig).composerKey:(config as ProductConfiguratorConfig).configuratorKey;
}

export function existingEngineConfigLabel(document:StorefrontExistingEngineDocument):string{return document.config.label.trim();}

export function withStorefrontEngineTenant(kind:StorefrontExistingEngineKind,document:StorefrontExistingEngineDocument,tenantId:string):StorefrontExistingEngineDocument{
  if(kind==='guided_finder')return{config:{...(document as StorefrontGuidedFinderDocument).config,tenantId}};
  if(kind==='multi_product_composer')return{config:{...(document as StorefrontComposerDocument).config,tenantId}};
  const source=document as StorefrontConfiguratorDocument;
  return{config:{...source.config,tenantId},compatibilityRules:[...source.compatibilityRules]};
}
