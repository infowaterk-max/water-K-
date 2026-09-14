import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE,PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION} from '@/lib/builder/templates/playroom-reference-v2-fidelity-v18';

export const PLAYROOM_V18_TEMPLATE_VERSION=18 as const;

/**
 * Canonical installable Playroom v18.
 *
 * The fidelity-v18 implementation originally remained on the historical v2
 * template identity, which meant persisted gaming.playroom@2 storefronts were
 * considered current and never received an upgrade offer. This wrapper gives
 * the accepted v18 composition a real template-version identity while keeping
 * the historical v2 package resolvable for merchants who have not upgraded yet.
 */
export const PLAYROOM_V18_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE,
  manifest:{
    ...PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE.manifest,
    templateVersion:PLAYROOM_V18_TEMPLATE_VERSION,
  },
  pages:PLAYROOM_REFERENCE_V2_FIDELITY_V18_TEMPLATE_PACKAGE.pages.map(page=>({
    ...page,
    templateVersion:PLAYROOM_V18_TEMPLATE_VERSION,
    metadata:{
      ...(page.metadata??{}),
      canonicalUpgradeFromTemplateVersion:2,
      referenceFidelityRelease:'playroom-v18',
      fidelityPolishVersion:PLAYROOM_REFERENCE_V2_FIDELITY_V18_VERSION,
    },
  })),
};
