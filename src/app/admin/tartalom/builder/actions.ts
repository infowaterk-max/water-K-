'use server';

import {revalidatePath} from 'next/cache';
import {
  createCurrentStorefrontPreview,
  getCurrentStorefrontPageState,
  publishCurrentStorefrontPage,
  rollbackCurrentStorefrontPage,
  saveCurrentStorefrontPageDraft,
} from '@/lib/builder/storefront-persistence';
import {
  createCurrentStorefrontSavedBlock,
  deleteCurrentStorefrontSavedBlock,
  getCurrentStorefrontSavedBlock,
  updateCurrentStorefrontSavedBlock,
} from '@/lib/builder/storefront-saved-block-persistence';
import {
  createCurrentStorefrontReusableSymbol,
  deleteCurrentStorefrontReusableSymbol,
  getCurrentStorefrontReusableSymbol,
  listCurrentStorefrontReusableSymbols,
  setCurrentStorefrontReusableSymbolGlobalSlot,
  updateCurrentStorefrontReusableSymbol,
} from '@/lib/builder/storefront-reusable-symbol-persistence';
import {rebaseStorefrontReusableSymbolInstances,type StorefrontGlobalSymbolSlot} from '@/lib/builder/storefront-linked-symbols';
import {saveCurrentStorefrontTemplateDraftPlan} from '@/lib/builder/storefront-template-persistence';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontBuilderWorkingCopy} from '@/lib/builder/storefront-visual-builder';
import {validateStorefrontBuilderSchemaStructure} from '@/lib/builder/storefront-builder-schema-policy';
import {assertSafeStorefrontFidelityDocument} from '@/lib/builder/storefront-fidelity-security';
import {assertStorefrontPerformance} from '@/lib/builder/storefront-performance-contract';
import {generateCurrentStorefrontWithAi} from '@/lib/builder/storefront-ai-generator-server';
import {storefrontAiGenerationInputSchema} from '@/lib/builder/storefront-ai-generator';
import {
  getCurrentStorefrontBuilderCapability,
  listCurrentStorefrontTemplatePlanningPages,
} from '@/lib/builder/storefront-builder-server';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const refresh=()=>revalidatePath('/admin/tartalom/builder');

export async function saveVisualBuilderDraftAction(input:{document:StorefrontPageDocument;expectedDraftRevision:number|null;operationKey:string}){
  const[state,capability,symbols]=await Promise.all([
    getCurrentStorefrontPageState(input.document.pageKey),
    getCurrentStorefrontBuilderCapability(),
    listCurrentStorefrontReusableSymbols(),
  ]);
  if(!state)throw new Error('BUILDER_PAGE_NOT_FOUND');
  const authoritativeRevision=state.draft?.revisionNumber??null;
  if(authoritativeRevision!==input.expectedDraftRevision)throw new Error('BUILDER_DRAFT_REVISION_STALE');
  const previous=state.draft?.document??state.published?.document;
  if(!previous)throw new Error('BUILDER_PAGE_BASE_REVISION_REQUIRED');
  const document=rebaseStorefrontReusableSymbolInstances(input.document,symbols);
  assertSafeStorefrontFidelityDocument(document);
  assertStorefrontPerformance(document);
  const registry=createStorefrontVisualBuilderComponentRegistry();
  validateStorefrontBuilderWorkingCopy({previous,next:document,registry,capability});
  validateStorefrontBuilderSchemaStructure({document,registry});
  const result=await saveCurrentStorefrontPageDraft({...input,document});
  refresh();
  return result;
}

export async function createVisualBuilderPreviewAction(input:{pageId:string;revisionNumber:number;operationKey:string}){
  const result=await createCurrentStorefrontPreview(input);
  return{...result,href:`/storefront-preview/${encodeURIComponent(result.token)}`};
}

export async function publishVisualBuilderPageAction(input:{pageId:string;expectedDraftRevision:number;operationKey:string}){
  const result=await publishCurrentStorefrontPage(input);
  refresh();
  return result;
}

export async function rollbackVisualBuilderPageAction(input:{pageId:string;targetPublishedRevision:number;expectedCurrentPublishedRevision:number;operationKey:string}){
  const result=await rollbackCurrentStorefrontPage(input);
  refresh();
  return result;
}

export async function createVisualBuilderSavedBlockAction(input:{name:string;fragment:StorefrontComponentNode;operationKey:string}){
  const result=await createCurrentStorefrontSavedBlock(input);
  refresh();
  return result;
}
export async function getVisualBuilderSavedBlockAction(input:{blockId:string}){return getCurrentStorefrontSavedBlock(input.blockId);}
export async function updateVisualBuilderSavedBlockAction(input:{blockId:string;name?:string;description?:string|null;category?:string|null;operationKey:string}){
  const result=await updateCurrentStorefrontSavedBlock(input);refresh();return result;
}
export async function deleteVisualBuilderSavedBlockAction(input:{blockId:string;operationKey:string}){
  const result=await deleteCurrentStorefrontSavedBlock(input);refresh();return result;
}

export async function listVisualBuilderReusableSymbolsAction(){return listCurrentStorefrontReusableSymbols();}
export async function getVisualBuilderReusableSymbolAction(input:{symbolId:string}){return getCurrentStorefrontReusableSymbol(input.symbolId);}
export async function createVisualBuilderReusableSymbolAction(input:{name:string;fragment:StorefrontComponentNode;operationKey:string}){
  const result=await createCurrentStorefrontReusableSymbol(input);refresh();return result;
}
export async function updateVisualBuilderReusableSymbolAction(input:{symbolId:string;name:string;fragment:StorefrontComponentNode;operationKey:string}){
  const result=await updateCurrentStorefrontReusableSymbol(input);refresh();return result;
}
export async function setVisualBuilderReusableSymbolGlobalSlotAction(input:{symbolId:string;globalSlot:StorefrontGlobalSymbolSlot|null;operationKey:string}){
  const result=await setCurrentStorefrontReusableSymbolGlobalSlot(input);refresh();return result;
}
export async function deleteVisualBuilderReusableSymbolAction(input:{symbolId:string;operationKey:string}){
  const result=await deleteCurrentStorefrontReusableSymbol(input);refresh();return result;
}

export async function installVisualBuilderTemplateAction(input:{templateKey:string;templateVersion?:number;operationKey:string}){
  const template=getStorefrontTemplatePackage(input.templateKey,input.templateVersion);
  if(!template)throw new Error('BUILDER_TEMPLATE_NOT_FOUND');
  for(const page of template.pages)assertStorefrontPerformance(page);
  const[capability,existingPages]=await Promise.all([getCurrentStorefrontBuilderCapability(),listCurrentStorefrontTemplatePlanningPages()]);
  const plan=planStorefrontTemplateInstallation({template,componentRegistry:createStorefrontVisualBuilderComponentRegistry(),capability,existingPages});
  const result=await saveCurrentStorefrontTemplateDraftPlan({plan,operationKey:input.operationKey});
  refresh();
  return result;
}

export async function generateVisualBuilderStorefrontAction(rawInput:unknown){
  const parsed=storefrontAiGenerationInputSchema.safeParse(rawInput);
  if(!parsed.success)throw new Error('STOREFRONT_AI_INPUT_INVALID');
  const result=await generateCurrentStorefrontWithAi(parsed.data);
  refresh();
  return result;
}
