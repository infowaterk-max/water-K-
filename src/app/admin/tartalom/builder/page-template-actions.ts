'use server';

import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getCurrentStorefrontPageState,saveCurrentStorefrontPageDraft} from '@/lib/builder/storefront-persistence';
import {getCurrentStorefrontBuilderCapability} from '@/lib/builder/storefront-builder-server';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {
  createStorefrontBuilderPageTemplateLibrary,
  materializeStorefrontPageTemplateForNewPage,
  materializeStorefrontPageTemplateSource,
} from '@/lib/builder/storefront-page-templates';

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

async function currentPageContext(pageKey:string){
  await requireCurrentStoreContext('store.manage');
  const normalized=pageKey.trim();
  if(!PAGE_KEY_PATTERN.test(normalized))throw new Error('STOREFRONT_PAGE_TEMPLATE_PAGE_KEY_INVALID');
  const state=await getCurrentStorefrontPageState(normalized);
  const document=state?.draft?.document??state?.published?.document;
  if(!state||!document)throw new Error('STOREFRONT_PAGE_TEMPLATE_CURRENT_PAGE_NOT_FOUND');
  const template=getStorefrontTemplatePackage(document.templateKey,document.templateVersion);
  if(!template)throw new Error('STOREFRONT_PAGE_TEMPLATE_TEMPLATE_NOT_FOUND');
  return{state,document,template};
}

export async function listVisualBuilderPageTemplatesAction(input:{pageKey:string}){
  const{document,template}=await currentPageContext(input.pageKey);
  return createStorefrontBuilderPageTemplateLibrary(template,document);
}

export async function getVisualBuilderPageTemplateSourceAction(input:{pageKey:string;presetId:string}){
  const{template}=await currentPageContext(input.pageKey);
  return materializeStorefrontPageTemplateSource(template,input.presetId);
}

export async function createVisualBuilderPageFromTemplateAction(input:{
  referencePageKey:string;
  presetId:string;
  targetPageKey:string;
  operationKey:string;
}){
  const targetPageKey=input.targetPageKey.trim();
  if(!PAGE_KEY_PATTERN.test(targetPageKey))throw new Error('STOREFRONT_PAGE_TEMPLATE_PAGE_KEY_INVALID');
  const{document:reference,template}=await currentPageContext(input.referencePageKey);
  const existing=await getCurrentStorefrontPageState(targetPageKey);
  if(existing)throw new Error('STOREFRONT_PAGE_TEMPLATE_TARGET_EXISTS');
  const source=materializeStorefrontPageTemplateSource(template,input.presetId);
  const capability=await getCurrentStorefrontBuilderCapability();
  const document=materializeStorefrontPageTemplateForNewPage({
    reference,
    source,
    targetPageKey,
    registry:createStorefrontVisualBuilderComponentRegistry(),
    capability,
  });
  const saved=await saveCurrentStorefrontPageDraft({document,expectedDraftRevision:null,operationKey:input.operationKey});
  return{pageKey:document.pageKey,pageType:document.pageType,revisionNumber:saved.revisionNumber,replayed:saved.replayed};
}
