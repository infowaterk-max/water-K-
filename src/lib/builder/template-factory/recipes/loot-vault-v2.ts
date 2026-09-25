import {getStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontTemplateFactoryMediaAsset,StorefrontTemplateFactoryRecipe} from '@/lib/builder/template-factory/scaffold';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';

const canonicalHome=LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.find(page=>page.pageType==='home');
if(!canonicalHome)throw new Error('LOOT_VAULT_V2_FACTORY_CANONICAL_HOME_MISSING');
const canonicalHeader=canonicalHome.sections[0];
const canonicalFooter=canonicalHome.sections.at(-1);
if(!canonicalHeader||!canonicalFooter)throw new Error('LOOT_VAULT_V2_FACTORY_CANONICAL_SHELL_MISSING');

const CANONICAL_PAGE_OVERRIDES=Object.freeze(Object.fromEntries(
  LOOT_VAULT_V2_TEMPLATE_PACKAGE.pages.map(page=>[page.pageType,structuredClone(page)]),
)) as Readonly<Partial<Record<StorefrontBuilderPageType,StorefrontPageDocument>>>;

const MEDIA={
  hero:'/storefront-demo/loot-vault-v2/hero-cinematic.webp',
  universe1:'/storefront-demo/loot-vault-v2/category-galaxy.webp',
  universe2:'/storefront-demo/loot-vault-v2/category-heroes.webp',
  universe3:'/storefront-demo/loot-vault-v2/category-anime.webp',
  universe4:'/storefront-demo/loot-vault-v2/category-fantasy.webp',
  universe5:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  universe6:'/storefront-demo/loot-vault-v2/category-retro.webp',
  product1:'/storefront-demo/loot-vault-v2/product-figure.webp',
  product2:'/storefront-demo/loot-vault-v2/product-statue.webp',
  product3:'/storefront-demo/loot-vault-v2/product-edition.webp',
  product4:'/storefront-demo/loot-vault-v2/product-relic.webp',
  editorial1:'/storefront-demo/loot-vault-v2/background-archive.webp',
  editorial2:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  background:'/storefront-demo/loot-vault-v2/background-archive.webp',
} as const;

export const LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS:readonly StorefrontTemplateFactoryMediaAsset[]=Object.freeze([
  {key:'hero-main',state:'ready',role:'hero',src:MEDIA.hero,alt:'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
  {key:'universe-1',state:'ready',role:'category',src:MEDIA.universe1,alt:'Gyűjtői figurák polcon',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-2',state:'ready',role:'category',src:MEDIA.universe2,alt:'Játék- és figuragyűjtemény',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-3',state:'ready',role:'category',src:MEDIA.universe3,alt:'Karakterfigurák gyűjtői displayen',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-4',state:'ready',role:'category',src:MEDIA.universe4,alt:'Anime figurák és emléktárgyak',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-5',state:'ready',role:'category',src:MEDIA.universe5,alt:'Vintage gyűjtői polc művészeti tárgyakkal',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-6',state:'ready',role:'category',src:MEDIA.universe6,alt:'Sötét neonfényes gyűjtői tér',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'product-1',state:'ready',role:'product',src:MEDIA.product1,alt:'Prémium gyűjtői figura',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-2',state:'ready',role:'product',src:MEDIA.product2,alt:'Fantasy gyűjtői szobor',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-3',state:'ready',role:'product',src:MEDIA.product3,alt:'Dramatikus gyűjtői miniatűr kiadás',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-4',state:'ready',role:'product',src:MEDIA.product4,alt:'Sötét sci-fi gyűjtői relikvia',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'editorial-1',state:'ready',role:'editorial',src:MEDIA.editorial1,alt:'Sötét gyűjtői archívum polcokkal és kiállított tárgyakkal',pageTypes:['home','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-2',state:'ready',role:'editorial',src:MEDIA.editorial2,alt:'Kurált miniatűr gyűjtemény és relikviák',pageTypes:['product','blog-article'],representative:true,aspectRatio:'3:2'},
  {key:'catalog-background',state:'ready',role:'background',src:MEDIA.background,alt:'Sötét, színes neonfényes enteriőr',pageTypes:['catalog'],representative:true,aspectRatio:'16:9'},
]);

export const LOOT_VAULT_V2_FACTORY_RECIPE:StorefrontTemplateFactoryRecipe=Object.freeze({
  category:'gaming',
  templateKey:'gaming.loot-vault',
  displayName:'Loot Vault',
  templateVersion:2,
  minPlan:'alap',
  requiredFeatures:Object.freeze(['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'] satisfies FeatureCode[]),
  demoNamespace:'gaming-loot-vault-v2',
  globalStyles:Object.freeze(getStorefrontGlobalStyleState(canonicalHome)),
  shell:Object.freeze({
    headerNode:structuredClone(canonicalHeader) as StorefrontComponentNode,
    footerNode:structuredClone(canonicalFooter) as StorefrontComponentNode,
    header:Object.freeze({}),
  }),
  pageOverrides:CANONICAL_PAGE_OVERRIDES,
  demoFixtures:Object.freeze(structuredClone(LOOT_VAULT_V2_TEMPLATE_PACKAGE.demoFixtures??[])),
  media:Object.freeze({
    assets:LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS,
    inheritedFallbackSrc:MEDIA.background,
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
  commerceReadiness:Object.freeze({
    productCardPurchaseActions:Object.freeze({
      pageTypes:Object.freeze(['home','catalog'] as const),
    }),
  }),
  // Recovered from the previously proven #439 candidate. This is the internal
  // pre-Product-Owner review state only; it is not template acceptance.
  productOwnerReview:Object.freeze({internalVisualReviewPassed:true}),
});
