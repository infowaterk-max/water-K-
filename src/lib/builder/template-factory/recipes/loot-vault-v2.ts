import {STOREFRONT_GLOBAL_STYLES_VERSION} from '@/lib/builder/storefront-global-styles';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontTemplateFactoryRecipe} from '@/lib/builder/template-factory/scaffold';

export const LOOT_VAULT_V2_FACTORY_RECIPE:StorefrontTemplateFactoryRecipe=Object.freeze({
  category:'gaming',
  templateKey:'gaming.loot-vault',
  displayName:'Loot Vault',
  templateVersion:2,
  minPlan:'alap',
  requiredFeatures:Object.freeze(['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'] satisfies FeatureCode[]),
  demoNamespace:'gaming-loot-vault-v2',
  globalStyles:Object.freeze({
    version:STOREFRONT_GLOBAL_STYLES_VERSION,
    tokens:Object.freeze({
      background:'#0d0e0f',
      surface:'#17191a',
      surfaceMuted:'#202322',
      text:'#f3ebdd',
      mutedText:'#a9a397',
      border:'#393a35',
      primary:'#17110b',
      primaryContrast:'#f3ebdd',
      accent:'#a57a45',
      accentSecondary:'#53695d',
      accentTertiary:'#7a3d38',
      headingFont:'editorial-serif',
      bodyFont:'system-sans',
      spacingScale:'comfortable',
      radiusScale:'soft',
    }),
  }),
  shell:Object.freeze({
    header:Object.freeze({
      brandLabel:'Loot Vault',
      tagline:'Fandom. Gyűjtemény. Történetek.',
      categoryTriggerLabel:'Univerzumok',
      searchPlaceholder:'Keresés termékre, univerzumra…',
    }),
  }),
  demoFixtures:Object.freeze([]),
  media:Object.freeze({
    assets:Object.freeze([]),
    requiredRoles:Object.freeze(['hero','category','product','editorial','background'] as const),
    requirements:Object.freeze([
      {role:'hero',minCount:1,aspectRatio:'16:9'} as const,
      {role:'category',minCount:6,aspectRatio:'4:5'} as const,
      {role:'product',minCount:4,aspectRatio:'4:5'} as const,
      {role:'editorial',minCount:2,aspectRatio:'3:2'} as const,
      {role:'background',minCount:1,aspectRatio:'16:9'} as const,
    ]),
    minimumRepresentativeMedia:14,
    forbidPlaceholderSvg:true,
  }),
  reference:Object.freeze({
    key:'gaming.loot-vault.accepted-reference-2026-09-06',
    approved:true,
    requiredPageTypes:Object.freeze(['home','catalog','product','blog-index','blog-article'] as const),
  }),
  productOwnerReview:Object.freeze({internalVisualReviewPassed:false}),
});
