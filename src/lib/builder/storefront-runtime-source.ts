import 'server-only';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {getPublishedStorefrontPage,resolveStorefrontPreviewToken} from '@/lib/builder/storefront-persistence';
import {listStorefrontReusableSymbolsForInstance} from '@/lib/builder/storefront-reusable-symbol-persistence';
import {materializeStorefrontReusableSymbols} from '@/lib/builder/storefront-linked-symbols';
import {requireStorefrontAccess} from '@/lib/storefront/access';

const PAGE_KEY_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type StorefrontResolvedRuntimePage={
  source:'published'|'preview';
  instanceId:string|null;
  page:StorefrontPageDocument;
};

/**
 * Resolve the published Page Schema for the current storefront host/context.
 * Linked reusable symbols and global header/footer are materialized immediately
 * before the existing renderer. The published page document remains immutable.
 */
export async function resolveCurrentStorefrontPublishedRuntimePage(
  pageKey:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(!PAGE_KEY_PATTERN.test(pageKey))return null;
  const instance=await requireStorefrontAccess();
  if(!instance)return null;
  const page=await getPublishedStorefrontPage(instance.id,pageKey);
  if(!page)return null;
  const symbols=await listStorefrontReusableSymbolsForInstance(instance.id);
  return{source:'published',instanceId:instance.id,page:materializeStorefrontReusableSymbols(page,symbols)};
}

/**
 * Preview tokens stay immutable bearer snapshots. Linked instances are already
 * rebased into the saved draft before token creation; current store-level symbol
 * state is intentionally not read here because doing so would mutate preview
 * semantics after a token was issued.
 */
export async function resolveStorefrontPreviewRuntimePage(
  token:string,
):Promise<StorefrontResolvedRuntimePage|null>{
  if(typeof token!=='string'||token.length<32||token.length>256)return null;
  const page=await resolveStorefrontPreviewToken(token);
  if(!page)return null;
  return{source:'preview',instanceId:null,page};
}
