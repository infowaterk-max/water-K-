import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {materializeStorefrontTemplateResponsiveStyles} from '@/lib/builder/storefront-responsive-isolation';
import {resolveStorefrontGlobalStyleCssVariables} from '@/lib/builder/storefront-global-styles';
import snapshot from '@/lib/builder/templates/sport/sport-hub/v1/canonical-package.json';

export const SPORT_HUB_V1_TEMPLATE_VERSION=1 as const;

/**
 * Canonical authority for sport.sport-hub@1.
 * The 14-page visual composition is PO-approved. This entrypoint normalizes the
 * snapshot through the shared responsive authority and never imports the retired
 * legacy src/lib/builder/templates/sport-hub.ts implementation.
 */
const rawSnapshot=structuredClone(snapshot) as unknown as StorefrontInstallableTemplatePackage;
const canonical=materializeStorefrontTemplateResponsiveStyles(rawSnapshot);

if(canonical.manifest.templateKey!=='sport.sport-hub')throw new Error('SPORT_HUB_V1_CANONICAL_TEMPLATE_KEY_INVALID');
if(canonical.manifest.templateVersion!==SPORT_HUB_V1_TEMPLATE_VERSION)throw new Error('SPORT_HUB_V1_CANONICAL_TEMPLATE_VERSION_INVALID');
if(canonical.pages.length!==14)throw new Error('SPORT_HUB_V1_CANONICAL_PAGE_COVERAGE_INVALID');
if(canonical.pages.some(page=>page.templateKey!=='sport.sport-hub'||page.templateVersion!==SPORT_HUB_V1_TEMPLATE_VERSION)){
  throw new Error('SPORT_HUB_V1_CANONICAL_PAGE_IDENTITY_INVALID');
}

export const SPORT_HUB_V1_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage=canonical;

const themeSource=canonical.pages.find(page=>page.pageType==='home')??canonical.pages[0];
if(!themeSource)throw new Error('SPORT_HUB_V1_THEME_SOURCE_MISSING');
export const SPORT_HUB_V1_DESIGN_TOKENS=Object.freeze(resolveStorefrontGlobalStyleCssVariables(themeSource));
