import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
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
export const STOREFRONT_TEMPLATE_QUALITY_CANDIDATES:readonly StorefrontTemplateQualityCandidateRegistration[]=Object.freeze([]);

export function resolveStorefrontTemplateQualityCandidate(templateKey:string,templateVersion?:number){
  const registration=STOREFRONT_TEMPLATE_QUALITY_CANDIDATES.find(item=>
    item.template.manifest.templateKey===templateKey&&
    (templateVersion===undefined||item.template.manifest.templateVersion===templateVersion)
  );
  return registration??null;
}
