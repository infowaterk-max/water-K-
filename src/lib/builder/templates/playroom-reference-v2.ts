import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {PLAYROOM_TEMPLATE_PACKAGE} from '@/lib/builder/templates/playroom';

export const PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION=2 as const;

export const PLAYROOM_REFERENCE_V2_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...PLAYROOM_TEMPLATE_PACKAGE,
  manifest:{
    ...PLAYROOM_TEMPLATE_PACKAGE.manifest,
    templateVersion:PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION,
  },
  pages:PLAYROOM_TEMPLATE_PACKAGE.pages.map(page=>({
    ...page,
    templateVersion:PLAYROOM_REFERENCE_V2_TEMPLATE_VERSION,
    metadata:{
      ...(page.metadata??{}),
      canonicalUpgradeFromTemplateVersion:1,
      visualAuthority:'Neon Gamer Webáruház Kezdőlap',
      referenceFidelityRelease:'playroom-v2',
    },
  })),
};
