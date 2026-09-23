import {STOREFRONT_GLOBAL_STYLES_VERSION} from '@/lib/builder/storefront-global-styles';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontTemplateFactoryRecipe} from '@/lib/builder/template-factory/scaffold';
import {
  createLootVaultV2ShellFooter,
  createLootVaultV2ShellHeader,
  LOOT_VAULT_V2_DEMO_FIXTURES,
  LOOT_VAULT_V2_MEDIA_ASSETS,
  LOOT_VAULT_V2_PAGE_OVERRIDES,
} from '@/lib/builder/template-factory/recipes/loot-vault-v2-pages';

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
    headerNode:createLootVaultV2ShellHeader(),
    footerNode:createLootVaultV2ShellFooter(),
    header:Object.freeze({
      logoUrl:'',
      logoAlt:'',
      brandLabel:'Loot Vault',
      tagline:'Fandom. Gyűjtemény. Történetek.',
      categoryTriggerLabel:'Univerzumok',
      searchPlaceholder:'Keresés termékre, univerzumra…',
    }),
  }),
  pageOverrides:LOOT_VAULT_V2_PAGE_OVERRIDES,
  demoFixtures:LOOT_VAULT_V2_DEMO_FIXTURES,
  media:Object.freeze({
    assets:LOOT_VAULT_V2_MEDIA_ASSETS,
    inheritedFallbackSrc:LOOT_VAULT_V2_MEDIA_ASSETS.find(asset=>asset.role==='background')?.src,
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
  productOwnerReview:Object.freeze({internalVisualReviewPassed:true}),
});
