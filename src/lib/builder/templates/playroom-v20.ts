import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import snapshot from '@/lib/builder/templates/playroom-v20-canonical-package.json';

export const PLAYROOM_V20_TEMPLATE_VERSION=20 as const;

/**
 * Playroom v20 is a self-contained canonical package snapshot.
 *
 * Historical Playroom sources remain in Git history only. v20 does not compose,
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
