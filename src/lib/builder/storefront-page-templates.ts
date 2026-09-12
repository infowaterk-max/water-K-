import {createStorefrontPresetBundle,materializeStorefrontPagePreset,type StorefrontPagePreset} from '@/lib/builder/storefront-presets';
import {
  getStorefrontGlobalStyleState,
  setStorefrontGlobalStyleState,
  STOREFRONT_GLOBAL_STYLES_METADATA_KEY,
} from '@/lib/builder/storefront-global-styles';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  validateStorefrontPageDocument,
  type StorefrontComponentRegistry,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_PAGE_TEMPLATES_VERSION='shoporation.storefront-page-templates.v1' as const;
export const STOREFRONT_REPEATABLE_PAGE_TYPES=['content','blog-article','legal'] as const;
export type StorefrontRepeatablePageType=typeof STOREFRONT_REPEATABLE_PAGE_TYPES[number];

export type StorefrontBuilderPageTemplate={
  presetId:string;
  label:string;
  sourcePageKey:string;
  pageType:StorefrontPageDocument['pageType'];
  canApplyToCurrent:boolean;
  canCreateNew:boolean;
};

export type StorefrontBuilderPageTemplateLibrary={
  version:typeof STOREFRONT_PAGE_TEMPLATES_VERSION;
  templateKey:string;
  templateVersion:number;
  currentPageKey:string;
  currentPageType:StorefrontPageDocument['pageType'];
  pageTemplates:StorefrontBuilderPageTemplate[];
};

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const clone=<T>(value:T):T=>structuredClone(value);
const repeatable=(pageType:StorefrontPageDocument['pageType'])=>(STOREFRONT_REPEATABLE_PAGE_TYPES as readonly string[]).includes(pageType);

function presetById(template:StorefrontInstallableTemplatePackage,presetId:string):StorefrontPagePreset{
  const preset=createStorefrontPresetBundle(template).pagePresets.find(item=>item.presetId===presetId);
  if(!preset)throw new Error('STOREFRONT_PAGE_TEMPLATE_NOT_FOUND');
  return preset;
}

function assertTemplateIdentity(document:StorefrontPageDocument,template:StorefrontInstallableTemplatePackage){
  if(document.templateKey!==template.manifest.templateKey||document.templateVersion!==template.manifest.templateVersion){
    throw new Error('STOREFRONT_PAGE_TEMPLATE_TEMPLATE_MISMATCH');
  }
}

function preserveGlobalStyles(source:StorefrontPageDocument,current:StorefrontPageDocument):StorefrontPageDocument{
  if(current.metadata?.[STOREFRONT_GLOBAL_STYLES_METADATA_KEY]===undefined)return source;
  return setStorefrontGlobalStyleState(source,getStorefrontGlobalStyleState(current));
}

function assertCompatible(document:StorefrontPageDocument,registry:StorefrontComponentRegistry,capability?:StorefrontRuntimeCapabilityContext){
  const validation=capability?validateStorefrontPageDocument(document,registry,capability):validateStorefrontPageDocument(document,registry);
  const failure=validation.violations.find(item=>item.severity==='error');
  if(failure)throw new Error(`STOREFRONT_PAGE_TEMPLATE_NOT_COMPATIBLE:${failure.code}`);
}

export function createStorefrontBuilderPageTemplateLibrary(template:StorefrontInstallableTemplatePackage,current:StorefrontPageDocument):StorefrontBuilderPageTemplateLibrary{
  assertTemplateIdentity(current,template);
  const bundle=createStorefrontPresetBundle(template);
  return{
    version:STOREFRONT_PAGE_TEMPLATES_VERSION,
    templateKey:template.manifest.templateKey,
    templateVersion:template.manifest.templateVersion,
    currentPageKey:current.pageKey,
    currentPageType:current.pageType,
    pageTemplates:bundle.pagePresets.map(preset=>({
      presetId:preset.presetId,
      label:preset.label,
      sourcePageKey:preset.pageKey,
      pageType:preset.pageType,
      canApplyToCurrent:preset.pageType===current.pageType,
      canCreateNew:repeatable(preset.pageType),
    })),
  };
}

export function materializeStorefrontPageTemplateSource(template:StorefrontInstallableTemplatePackage,presetId:string):StorefrontPageDocument{
  return materializeStorefrontPagePreset(template,presetById(template,presetId));
}

export function applyStorefrontPageTemplate(input:{
  current:StorefrontPageDocument;
  source:StorefrontPageDocument;
  registry:StorefrontComponentRegistry;
  capability?:StorefrontRuntimeCapabilityContext;
}):StorefrontPageDocument{
  const{current,source,registry,capability}=input;
  if(source.pageType!==current.pageType)throw new Error('STOREFRONT_PAGE_TEMPLATE_PAGE_TYPE_MISMATCH');
  if(source.templateKey!==current.templateKey||source.templateVersion!==current.templateVersion)throw new Error('STOREFRONT_PAGE_TEMPLATE_TEMPLATE_MISMATCH');
  let next=clone(source);
  next.pageKey=current.pageKey;
  next=preserveGlobalStyles(next,current);
  assertCompatible(next,registry,capability);
  return next;
}

export function materializeStorefrontPageTemplateForNewPage(input:{
  reference:StorefrontPageDocument;
  source:StorefrontPageDocument;
  targetPageKey:string;
  registry:StorefrontComponentRegistry;
  capability?:StorefrontRuntimeCapabilityContext;
}):StorefrontPageDocument{
  const{reference,source,registry,capability}=input;
  const targetPageKey=input.targetPageKey.trim();
  if(!PAGE_KEY_PATTERN.test(targetPageKey))throw new Error('STOREFRONT_PAGE_TEMPLATE_PAGE_KEY_INVALID');
  if(!repeatable(source.pageType))throw new Error('STOREFRONT_PAGE_TEMPLATE_REPEATABLE_TYPE_REQUIRED');
  if(source.templateKey!==reference.templateKey||source.templateVersion!==reference.templateVersion)throw new Error('STOREFRONT_PAGE_TEMPLATE_TEMPLATE_MISMATCH');
  let next=clone(source);
  next.pageKey=targetPageKey;
  next=preserveGlobalStyles(next,reference);
  assertCompatible(next,registry,capability);
  return next;
}
