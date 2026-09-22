'use server';

import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {getCurrentStorefrontPageState} from '@/lib/builder/storefront-persistence';
import {getStorefrontTemplatePackage} from '@/lib/builder/storefront-template-catalog';
import {createStorefrontBuilderPresetLibrary} from '@/lib/builder/storefront-preset-application';

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export async function listVisualBuilderPresetLibraryAction(input:{pageKey:string}){
  await requireCurrentStoreContext('store.manage');
  const pageKey=input.pageKey.trim();
  if(!PAGE_KEY_PATTERN.test(pageKey))throw new Error('STOREFRONT_PRESET_LIBRARY_PAGE_KEY_INVALID');
  const state=await getCurrentStorefrontPageState(pageKey);
  const document=state?.draft?.document??state?.published?.document;
  if(!document)throw new Error('STOREFRONT_PRESET_LIBRARY_PAGE_NOT_FOUND');
  const template=getStorefrontTemplatePackage(document.templateKey,document.templateVersion);
  if(!template)throw new Error('STOREFRONT_PRESET_LIBRARY_TEMPLATE_NOT_FOUND');
  return createStorefrontBuilderPresetLibrary(template,document);
}
