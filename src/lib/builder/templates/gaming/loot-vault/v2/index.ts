import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {materializeStorefrontTemplateResponsiveStyles} from '@/lib/builder/storefront-responsive-isolation';
import snapshot from '@/lib/builder/templates/gaming/loot-vault/v2/canonical-package.json';

export const LOOT_VAULT_V2_TEMPLATE_VERSION=2 as const;

/**
 * Canonical package authority for gaming.loot-vault@2.
 * This index is the only public entrypoint. The package is a Factory candidate
 * until the existing acceptance workflow and Product Owner visual review promote it.
 * The internal snapshot is normalized once through the shared responsive authority so
 * the public package exports explicit Desktop/Tablet/Mobile state with no legacy chain.
 */
const rawSnapshot=structuredClone(snapshot) as unknown as StorefrontInstallableTemplatePackage;
const canonical=materializeStorefrontTemplateResponsiveStyles(rawSnapshot);

if(canonical.manifest.templateKey!=='gaming.loot-vault')throw new Error('LOOT_VAULT_V2_CANONICAL_TEMPLATE_KEY_INVALID');
if(canonical.manifest.templateVersion!==LOOT_VAULT_V2_TEMPLATE_VERSION)throw new Error('LOOT_VAULT_V2_CANONICAL_TEMPLATE_VERSION_INVALID');
if(canonical.pages.length!==14)throw new Error('LOOT_VAULT_V2_CANONICAL_PAGE_COVERAGE_INVALID');
if(canonical.pages.some(page=>page.templateKey!=='gaming.loot-vault'||page.templateVersion!==LOOT_VAULT_V2_TEMPLATE_VERSION)){
  throw new Error('LOOT_VAULT_V2_CANONICAL_PAGE_IDENTITY_INVALID');
}

export const LOOT_VAULT_V2_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage=canonical;
