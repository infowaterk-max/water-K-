import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {resolveStorefrontGlobalStyleCssVariables} from '@/lib/builder/storefront-global-styles';
import snapshot from '@/lib/builder/templates/gaming/playroom/v20/canonical-package.json';

export const PLAYROOM_V20_TEMPLATE_VERSION=20 as const;

/**
 * Playroom v20 canonical package authority. This index is the only public entrypoint for gaming.playroom@20.
 *
 * Historical Playroom sources are not runtime dependencies. v20 does not compose,
 * upgrade or import v19/v18/reference/polish layers at runtime. A future v21
 * must start from this complete v20 authority and become the next complete
 * package snapshot before v20 is archived.
 */
const canonical=structuredClone(snapshot) as unknown as StorefrontInstallableTemplatePackage;

if(canonical.manifest.templateKey!=='gaming.playroom')throw new Error('PLAYROOM_V20_CANONICAL_TEMPLATE_KEY_INVALID');
if(canonical.manifest.templateVersion!==PLAYROOM_V20_TEMPLATE_VERSION)throw new Error('PLAYROOM_V20_CANONICAL_TEMPLATE_VERSION_INVALID');
if(canonical.pages.length!==14)throw new Error('PLAYROOM_V20_CANONICAL_PAGE_COVERAGE_INVALID');
if(canonical.pages.some(page=>page.templateKey!=='gaming.playroom'||page.templateVersion!==PLAYROOM_V20_TEMPLATE_VERSION)){
  throw new Error('PLAYROOM_V20_CANONICAL_PAGE_IDENTITY_INVALID');
}

export const PLAYROOM_V20_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage=canonical;
const themeSource=canonical.pages.find(page=>page.pageType==='home')??canonical.pages[0];
if(!themeSource)throw new Error('PLAYROOM_V20_THEME_SOURCE_MISSING');
export const PLAYROOM_V20_DESIGN_TOKENS=Object.freeze(resolveStorefrontGlobalStyleCssVariables(themeSource));
