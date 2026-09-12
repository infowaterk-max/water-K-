import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  createStorefrontPresetBundle,
  materializeStorefrontComponentPreset,
  materializeStorefrontSectionPreset,
  type StorefrontComponentPreset,
  type StorefrontSectionPreset,
} from '@/lib/builder/storefront-presets';
import {insertStorefrontSavedBlock} from '@/lib/builder/storefront-saved-blocks';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontComponentRegistry,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PRESET_APPLICATION_VERSION='shoporation.storefront-preset-application.v1' as const;

export type StorefrontBuilderSectionPreset={presetId:string;label:string;sourcePageKey:string;componentKey:string;componentVersion:number;fragment:StorefrontComponentNode;};
export type StorefrontBuilderComponentPreset={presetId:string;label:string;sourcePageKey:string;sourceNodeId:string;componentKey:string;componentVersion:number;visualConfig:Record<string,unknown>;responsive?:StorefrontComponentNode['responsive'];};
export type StorefrontBuilderPresetLibrary={version:typeof STOREFRONT_PRESET_APPLICATION_VERSION;templateKey:string;templateVersion:number;pageKey:string;pageType:StorefrontPageDocument['pageType'];sourcePageKey:string;sectionPresets:StorefrontBuilderSectionPreset[];componentPresets:StorefrontBuilderComponentPreset[];};

const VISUAL_KEYS=new Set([
  'tone','spacing','width','presentation','style','styleSlots','typography','artDirection','accentStyle','gap','align','justify','direction','fit','radius','objectPosition',
  'columns','imageRatio','thumbnailPosition','variant','size','layout','sticky','innerStyle','brandStyle','taglineStyle','utilityStyle','mobileToggleStyle','intrinsicSize','deferOffscreen',
]);
const clone=<T>(value:T):T=>structuredClone(value);
const isVisualKey=(key:string)=>VISUAL_KEYS.has(key)||key.endsWith('Style');

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode|undefined{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{for(const node of nodes){if(node.id===nodeId)return node;const nested=walk(node.children??[]);if(nested)return nested;}return undefined;};
  return walk(document.sections);
}

function sourcePageKey(template:StorefrontInstallableTemplatePackage,document:StorefrontPageDocument){
  const exact=template.pages.find(page=>page.pageKey===document.pageKey);if(exact)return exact.pageKey;
  const sameType=template.pages.find(page=>page.pageType===document.pageType);if(sameType)return sameType.pageKey;
  throw new Error('STOREFRONT_PRESET_LIBRARY_PAGE_NOT_FOUND');
}

function visualConfigFor(node:StorefrontComponentNode,registry:StorefrontComponentRegistry){
  const definition=registry.get(node.componentKey,node.componentVersion);if(!definition||definition.protectedSystem)return{};
  const configurable=new Set(definition.manifest.configurable);
  return Object.fromEntries(Object.entries(node.config).filter(([key])=>configurable.has(key)&&isVisualKey(key)).map(([key,value])=>[key,clone(value)]));
}

function sectionEntry(template:StorefrontInstallableTemplatePackage,preset:StorefrontSectionPreset,registry:StorefrontComponentRegistry):StorefrontBuilderSectionPreset|null{
  const fragment=materializeStorefrontSectionPreset(template,preset);const definition=registry.get(fragment.componentKey,fragment.componentVersion);
  if(!definition||definition.protectedSystem||definition.manifest.schemaSlot!=='sections')return null;
  return{presetId:preset.presetId,label:preset.label,sourcePageKey:preset.pageKey,componentKey:fragment.componentKey,componentVersion:fragment.componentVersion,fragment};
}

function componentEntry(template:StorefrontInstallableTemplatePackage,preset:StorefrontComponentPreset,registry:StorefrontComponentRegistry):StorefrontBuilderComponentPreset|null{
  const source=materializeStorefrontComponentPreset(template,preset);const definition=registry.get(source.componentKey,source.componentVersion);
  if(!definition||definition.protectedSystem)return null;
  const visualConfig=visualConfigFor(source,registry);if(!Object.keys(visualConfig).length&&!source.responsive)return null;
  return{presetId:preset.presetId,label:preset.label,sourcePageKey:preset.pageKey,sourceNodeId:source.id,componentKey:source.componentKey,componentVersion:source.componentVersion,visualConfig,...(source.responsive?{responsive:clone(source.responsive)}:{})};
}

export function createStorefrontBuilderPresetLibrary(template:StorefrontInstallableTemplatePackage,document:StorefrontPageDocument):StorefrontBuilderPresetLibrary{
  if(template.manifest.templateKey!==document.templateKey||template.manifest.templateVersion!==document.templateVersion)throw new Error('STOREFRONT_PRESET_LIBRARY_TEMPLATE_MISMATCH');
  const registry=createStorefrontVisualBuilderComponentRegistry();const bundle=createStorefrontPresetBundle(template);const sourceKey=sourcePageKey(template,document);
  const sectionPresets=bundle.sectionPresets.filter(preset=>preset.pageKey===sourceKey).flatMap(preset=>{const entry=sectionEntry(template,preset,registry);return entry?[entry]:[];});
  const componentPresets=bundle.componentPresets.filter(preset=>preset.pageKey===sourceKey).flatMap(preset=>{const entry=componentEntry(template,preset,registry);return entry?[entry]:[];});
  return{version:STOREFRONT_PRESET_APPLICATION_VERSION,templateKey:template.manifest.templateKey,templateVersion:template.manifest.templateVersion,pageKey:document.pageKey,pageType:document.pageType,sourcePageKey:sourceKey,sectionPresets,componentPresets};
}

function assertCompatible(document:StorefrontPageDocument,registry:StorefrontComponentRegistry,capability?:StorefrontRuntimeCapabilityContext){
  const validation=capability?validateStorefrontPageDocument(document,registry,capability):validateStorefrontPageDocument(document,registry);
  const failure=validation.violations.find(item=>item.severity==='error');if(failure)throw new Error(`STOREFRONT_PRESET_NOT_COMPATIBLE:${failure.code}`);
}

export function insertStorefrontSectionPreset(document:StorefrontPageDocument,preset:StorefrontBuilderSectionPreset,registry:StorefrontComponentRegistry,capability?:StorefrontRuntimeCapabilityContext){
  const definition=registry.get(preset.componentKey,preset.componentVersion);if(!definition||definition.protectedSystem||definition.manifest.schemaSlot!=='sections')throw new Error('STOREFRONT_PRESET_SECTION_NOT_INSERTABLE');
  const inserted=insertStorefrontSavedBlock(document,preset.fragment);assertCompatible(inserted.document,registry,capability);return inserted;
}

export function applyStorefrontComponentPresetAppearance(document:StorefrontPageDocument,input:{nodeId:string;preset:StorefrontBuilderComponentPreset},registry:StorefrontComponentRegistry,capability?:StorefrontRuntimeCapabilityContext):StorefrontPageDocument{
  const next=clone(document);const node=findNode(next,input.nodeId);if(!node)throw new Error('STOREFRONT_PRESET_TARGET_NOT_FOUND');
  if(node.componentKey!==input.preset.componentKey||node.componentVersion!==input.preset.componentVersion)throw new Error('STOREFRONT_PRESET_COMPONENT_MISMATCH');
  const definition=registry.get(node.componentKey,node.componentVersion);if(!definition||definition.protectedSystem)throw new Error('STOREFRONT_PRESET_COMPONENT_NOT_APPLICABLE');
  const configurable=new Set(definition.manifest.configurable);const patch:Record<string,unknown>={};
  for(const[key,value]of Object.entries(input.preset.visualConfig)){if(!configurable.has(key)||!isVisualKey(key))throw new Error('STOREFRONT_PRESET_VISUAL_CONFIG_INVALID');patch[key]=clone(value);}
  if(!Object.keys(patch).length&&!input.preset.responsive)throw new Error('STOREFRONT_PRESET_VISUAL_CONFIG_EMPTY');
  node.config={...node.config,...patch};if(input.preset.responsive)node.responsive={...(node.responsive??{}),...clone(input.preset.responsive)};
  assertCompatible(next,registry,capability);return next;
}
