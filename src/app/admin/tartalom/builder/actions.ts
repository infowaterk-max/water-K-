'use server';

import {revalidatePath} from 'next/cache';
import {
  createCurrentStorefrontPreview,
  getCurrentStorefrontPageState,
  publishCurrentStorefrontPage,
  rollbackCurrentStorefrontPage,
  saveCurrentStorefrontPageDraft,
} from '@/lib/builder/storefront-persistence';
import {saveCurrentStorefrontTemplateDraftPlan} from '@/lib/builder/storefront-template-persistence';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {planStorefrontTemplateInstallation} from '@/lib/builder/storefront-template-installation';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {validateStorefrontBuilderWorkingCopy} from '@/lib/builder/storefront-visual-builder';
import {validateStorefrontBuilderSchemaStructure} from '@/lib/builder/storefront-builder-schema-policy';
import {
  getCurrentStorefrontBuilderCapability,
  listCurrentStorefrontTemplatePlanningPages,
} from '@/lib/builder/storefront-builder-server';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const refresh=()=>revalidatePath('/admin/tartalom/builder');

export async function saveVisualBuilderDraftAction(input:{document:StorefrontPageDocument;expectedDraftRevision:number|null;operationKey:string}){
  const[state,capability]=await Promise.all([
    getCurrentStorefrontPageState(input.document.pageKey),
    getCurrentStorefrontBuilderCapability(),
  ]);
  if(!state)throw new Error('BUILDER_PAGE_NOT_FOUND');
  const authoritativeRevision=state.draft?.revisionNumber??null;
  if(authoritativeRevision!==input.expectedDraftRevision)throw new Error('BUILDER_DRAFT_REVISION_STALE');
  const previous=state.draft?.document??state.published?.document;
  if(!previous)throw new Error('BUILDER_PAGE_BASE_REVISION_REQUIRED');
  const registry=createStorefrontVisualBuilderComponentRegistry();
  validateStorefrontBuilderWorkingCopy({
    previous,
    next:input.document,
    registry,
    capability,
  });
  validateStorefrontBuilderSchemaStructure({document:input.document,registry});
  const result=await saveCurrentStorefrontPageDraft(input);
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

export async function installVisualBuilderTemplateAction(input:{templateKey:string;templateVersion?:number;operationKey:string}){
  const template=getStorefrontTemplatePackage(input.templateKey,input.templateVersion);
  if(!template)throw new Error('BUILDER_TEMPLATE_NOT_FOUND');
  const[capability,existingPages]=await Promise.all([
    getCurrentStorefrontBuilderCapability(),
    listCurrentStorefrontTemplatePlanningPages(),
  ]);
  const plan=planStorefrontTemplateInstallation({
    template,
    componentRegistry:createStorefrontVisualBuilderComponentRegistry(),
    capability,
    existingPages,
  });
  const result=await saveCurrentStorefrontTemplateDraftPlan({plan,operationKey:input.operationKey});
  refresh();
  return result;
}
