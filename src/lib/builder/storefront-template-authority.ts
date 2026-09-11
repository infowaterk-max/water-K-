import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_TEMPLATE_AUTHORITY_VERSION='shoporation.storefront-template-authority.block21.v1' as const;

/**
 * Canonical lifecycle ownership for Block 21. This module is intentionally
 * declarative: the existing server helpers/RPCs remain the only mutation path.
 */
export const STOREFRONT_TEMPLATE_AUTHORITY=Object.freeze({
  templateMaterialization:{
    authority:'save_storefront_template_drafts_v1',
    output:'draft-revisions-only',
    atomic:true,
    idempotent:true,
    publishes:false,
  },
  pageLifecycle:{
    saveDraft:'save_storefront_page_draft_v1',
    publish:'publish_storefront_page_v1',
    rollback:'rollback_storefront_page_v1',
    preview:'create_storefront_preview_session_v1',
    secondPublicationAuthority:false,
  },
  tenantIdentity:{
    clientSuppliedAuthority:false,
    serverScopeRequired:true,
    databaseAuthorityRecheck:true,
  },
  businessMutationBoundary:{
    products:false,
    variants:false,
    collections:false,
    customers:false,
    orders:false,
    b2b:false,
    workflows:false,
  },
} as const);

export type StorefrontRuntimeDocumentSource='preview'|'published';

export type StorefrontRuntimePageSelector=
  |{pageKey:string;pageType?:never}
  |{pageKey?:never;pageType:StorefrontBuilderPageType};

/**
 * Read contract used by storefront adapters. Preview and published modes consume
 * the same Page Schema; only their immutable revision source differs.
 */
export type StorefrontRuntimeResolutionContract={
  source:StorefrontRuntimeDocumentSource;
  selector:StorefrontRuntimePageSelector;
  samePageSchemaSemantics:true;
  activatesTenant:false;
};

export function storefrontRuntimeResolutionContract(
  source:StorefrontRuntimeDocumentSource,
  selector:StorefrontRuntimePageSelector,
):Readonly<StorefrontRuntimeResolutionContract>{
  if('pageKey'in selector&&(!selector.pageKey||!selector.pageKey.trim()))throw new Error('STOREFRONT_PAGE_KEY_REQUIRED');
  return Object.freeze({source,selector:{...selector},samePageSchemaSemantics:true,activatesTenant:false});
}
