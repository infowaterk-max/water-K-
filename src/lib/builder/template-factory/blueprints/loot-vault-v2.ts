import {STOREFRONT_PAGE_TYPES,STOREFRONT_VIEWPORTS} from '@/lib/builder/storefront-foundation';
import {
  STOREFRONT_TEMPLATE_GENERATOR_BLUEPRINT_VERSION,
  type StorefrontTemplateGeneratorBlueprint,
} from '@/lib/builder/template-factory/generator-readiness';

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
  generator:Object.freeze({
    implementation:'deferred',
    target:'template-compiler',
  }),
});
