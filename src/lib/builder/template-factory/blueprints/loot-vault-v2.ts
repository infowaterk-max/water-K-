import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION,
  type StorefrontTemplateGeneratorBlueprint,
} from '@/lib/builder/template-factory/generator-readiness';
import {STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION} from '@/lib/builder/template-factory/production-compiler-contract';
import {
  STOREFRONT_TEMPLATE_FILE_OWNERSHIP_CONTRACT_VERSION,
  STOREFRONT_TEMPLATE_VISUAL_AUTHORITY_VERSION,
} from '@/lib/builder/template-factory/production-contracts';

export const LOOT_VAULT_V2_GENERATOR_BLUEPRINT:StorefrontTemplateGeneratorBlueprint=Object.freeze({
  contract:STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION,
  template:Object.freeze({
    category:'gaming',
    templateKey:'gaming.loot-vault',
    displayName:'Loot Vault',
    templateVersion:2,
    minPlan:'alap',
    requiredFeatures:Object.freeze(['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'] as const),
  }),
  composition:Object.freeze({
    pageTypes:Object.freeze([...STOREFRONT_PAGE_TYPES]),
    viewports:Object.freeze([...STOREFRONT_VIEWPORTS]),
    templateOwnedPageTypes:Object.freeze([...STOREFRONT_PAGE_TYPES]),
  }),
  authorities:Object.freeze({
    pageSchema:'canonical-page-schema',
    components:'shared-component-registry',
    runtime:'shared-storefront-runtime',
    builder:'visual-builder-page-schema',
    responsive:'canonical-responsive-authority',
  }),
  productionContracts:Object.freeze({
    visualAuthority:Object.freeze({
      contract:STOREFRONT_TEMPLATE_VISUAL_AUTHORITY_VERSION,
      referenceKey:'gaming.loot-vault.accepted-reference-2026-09-06',
      state:'accepted-reference',
      requiredPageTypes:Object.freeze(['home','catalog','product','blog-index','blog-article'] as const),
      designChangePolicy:'product-owner-reapproval-required',
    }),
    fileOwnership:Object.freeze({
      contract:STOREFRONT_TEMPLATE_FILE_OWNERSHIP_CONTRACT_VERSION,
      templateOwnedRoots:Object.freeze([
        'src/lib/builder/template-factory/blueprints/loot-vault-v2.ts',
        'src/lib/builder/template-factory/recipes/loot-vault-v2.ts',
        'src/lib/builder/templates/gaming/loot-vault/v2/',
        'public/storefront-demo/loot-vault-v2/',
      ] as const),
      sharedAuthorityPolicy:'canonical-extension-review',
    }),
  }),
  generator:Object.freeze({
    implementation:'dynamic-production-compiler',
    target:'template-compiler',
    compilerContract:STOREFRONT_TEMPLATE_PRODUCTION_COMPILER_VERSION,
  }),
});
