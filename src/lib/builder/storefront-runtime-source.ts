import 'server-only';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
import {requireStorefrontAccess} from '@/lib/storefront/access';

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type StorefrontResolvedRuntimePage={
  source:'published'|'preview';
  instanceId:string|null;
  page:StorefrontPageDocument;
};

/**
 * Resolve the published Page Schema for the current storefront host/context.
 * Tenant identity is derived server-side by requireStorefrontAccess; callers do
 * not supply an instance id and this function never changes publication state.
 */
export async function resolveCurrentStorefrontPublishedRuntimePage(
  pageKey:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(!PAGE_KEY_PATTERN.test(pageKey))return null;
  const instance=await requireStorefrontAccess();
  if(!instance)return null;
  const page=await getPublishedStorefrontPage(instance.id,pageKey);
  if(!page)return null;
  return{source:'published',instanceId:instance.id,page};
}

/**
 * Preview tokens are bearer capabilities bound by the persistence authority to
 * one immutable draft revision. No tenant id/page document is accepted from the
 * caller and resolving a token never advances the published head.
 */
export async function resolveStorefrontPreviewRuntimePage(
  token:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(typeof token!=='string'||token.length<32||token.length>256)return null;
  const page=await resolveStorefrontPreviewToken(token);
  if(!page)return null;
  return{source:'preview',instanceId:null,page};
}
