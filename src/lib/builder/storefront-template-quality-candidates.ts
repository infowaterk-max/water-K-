import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION} from '@/lib/builder/storefront-template-quality-gate';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';
import type {StorefrontTemplateQualityManifest} from '@/lib/builder/storefront-template-quality-gate';

export type StorefrontTemplateQualityCandidateRegistration={
  template:StorefrontInstallableTemplatePackage;
  manifest:StorefrontTemplateQualityManifest;
};

/**
 * QA-only canonical candidate registrations.
 * Entries here are not production catalog activation and do not imply acceptance.
 * A candidate must still pass the full quality matrix and Product Owner review.
 */
export const LOOT_VAULT_V2_QUALITY_MANIFEST:StorefrontTemplateQualityManifest=Object.freeze({
  gateVersion:STOREFRONT_TEMPLATE_QUALITY_GATE_VERSION,
  templateKey:'gaming.loot-vault',
  minTemplateVersion:2,
  status:'candidate',
  sourcePrefixes:Object.freeze(['src/lib/builder/templates/gaming/loot-vault/v2/']),
  pageTypes:Object.freeze([...STOREFRONT_PAGE_TYPES]),
  viewports:Object.freeze([...STOREFRONT_VIEWPORTS]),
  shell:Object.freeze({
    canonical:true,
    allowedHeaderComponentKeys:Object.freeze(['system.commerce-header']),
    mobileNavigation:'hamburger',
  }),
  content:Object.freeze({informationPageRequired:true}),
  responsiveIsolation:Object.freeze({explicitEffectiveStyles:true}),
  browser:Object.freeze({
    maxHorizontalOverflowPx:2,
    minimumTouchTargetPx:32,
    recommendedTouchTargetPx:44,
    requireMobileMenu:true,
    requireFooter:true,
  }),
  golden:Object.freeze({
    required:false,
    baselineDirectory:'tests/visual-baselines/gaming.loot-vault/v2',
    maxPixelMismatchRatio:.005,
  }),
});

export const STOREFRONT_TEMPLATE_QUALITY_CANDIDATES:readonly StorefrontTemplateQualityCandidateRegistration[]=Object.freeze([
  Object.freeze({template:LOOT_VAULT_V2_TEMPLATE_PACKAGE,manifest:LOOT_VAULT_V2_QUALITY_MANIFEST}),
]);

export function resolveStorefrontTemplateQualityCandidate(templateKey:string,templateVersion?:number){
  const registration=STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.find(item=>
    item.template.manifest.templateKey===templateKey&&
    (templateVersion===undefined||item.template.manifest.templateVersion===templateVersion)
  );
  return registration??null;
}
