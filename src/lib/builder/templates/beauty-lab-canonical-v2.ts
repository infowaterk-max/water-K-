import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v26';

/**
 * Canonical catalog release for the recovered Beauty Lab visual system.
 *
 * The reference recovery intentionally remains on the shared Storefront Runtime.
 * This wrapper only advances the installable template identity so already-persisted
 * v1 Builder drafts can be detected and explicitly upgraded to the approved v2
 * Page Schema. It does not add a second renderer or mutate published storefronts.
 */
export const BEAUTY_LAB_CANONICAL_TEMPLATE_VERSION=2 as const;

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...BEAUTY_LAB_REFERENCE_PACKAGE,
  manifest:{
    ...BEAUTY_LAB_REFERENCE_PACKAGE.manifest,
    templateVersion:BEAUTY_LAB_CANONICAL_TEMPLATE_VERSION,
  },
  pages:BEAUTY_LAB_REFERENCE_PACKAGE.pages.map(page=>({
    ...structuredClone(page),
    templateVersion:BEAUTY_LAB_CANONICAL_TEMPLATE_VERSION,
    metadata:{
      ...(page.metadata??{}),
      canonicalTemplateVersion:BEAUTY_LAB_CANONICAL_TEMPLATE_VERSION,
      canonicalTemplateSource:'beauty-lab-reference-v26',
    },
  })),
};
