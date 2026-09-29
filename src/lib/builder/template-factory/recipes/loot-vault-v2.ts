import {getStorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';
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
  hero:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  universe1:'/storefront-demo/loot-vault-v2/hero-cinematic.webp',
  universe2:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  universe3:'/storefront-demo/loot-vault-v2/category-anime.webp',
  universe4:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
  universe5:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  universe6:'/storefront-demo/loot-vault-v2/product-figure.webp',
  product1:'/storefront-demo/loot-vault-v2/product-figure.webp',
  product2:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  product3:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
  product4:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  editorial1:'/storefront-demo/loot-vault-v2/editorial-vault-shelf.webp',
  editorial2:'/storefront-demo/loot-vault-v2/category-miniatures.webp',
  background:'/storefront-demo/loot-vault-v2/editorial-collector-room.webp',
} as const;

export const LOOT_VAULT_V2_FACTORY_MEDIA_ASSETS:readonly StorefrontTemplateFactoryMediaAsset[]=Object.freeze([
  {key:'hero-main',state:'ready',role:'hero',src:MEDIA.hero,alt:'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
  {key:'universe-1',state:'ready',role:'category',src:MEDIA.universe1,alt:'Cinematikus fantasy gyűjtői univerzum aranyfényű karakterrel',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-2',state:'ready',role:'category',src:MEDIA.universe2,alt:'Sci-fi gyűjtői világ futurisztikus felszereléssel',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-3',state:'ready',role:'category',src:MEDIA.universe3,alt:'Karakterfigurák gyűjtői displayen',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-4',state:'ready',role:'category',src:MEDIA.universe4,alt:'Gaming univerzum prémium kontroller részlettel',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-5',state:'ready',role:'category',src:MEDIA.universe5,alt:'Vintage gyűjtői polc művészeti tárgyakkal',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-6',state:'ready',role:'category',src:MEDIA.universe6,alt:'Képregényes fantasy gyűjtői univerzum filmes hangulattal',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'product-1',state:'ready',role:'product',src:MEDIA.product1,alt:'Prémium gyűjtői figura',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-2',state:'ready',role:'product',src:MEDIA.product2,alt:'Mythic Warden fantasy gyűjtői szobor',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-3',state:'ready',role:'product',src:MEDIA.product3,alt:'Neon Controller Collector Edition',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-4',state:'ready',role:'product',src:MEDIA.product4,alt:'Vault Visor sci-fi gyűjtői relikvia',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'editorial-1',state:'ready',role:'editorial',src:MEDIA.editorial1,alt:'Neonfényes sci-fi gyűjtői relikvia és szerkesztett Vault történet',pageTypes:['blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-2',state:'ready',role:'editorial',src:MEDIA.editorial2,alt:'Kurált miniatűr gyűjtemény és relikviák',pageTypes:['product','blog-article'],representative:true,aspectRatio:'3:2'},
  {key:'catalog-background',state:'ready',role:'background',src:MEDIA.background,alt:'Sötét, színes neonfényes enteriőr',pageTypes:['catalog'],representative:true,aspectRatio:'16:9'},
]);

export const LOOT_VAULT_V2_FACTORY_RECIPE:StorefrontTemplateFactoryRecipe=Object.freeze({
  blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,
  category:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.category,
  templateKey:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.templateKey,
  displayName:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.displayName,
  templateVersion:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.templateVersion,
  minPlan:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.minPlan,
  requiredFeatures:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.template.requiredFeatures,
  demoNamespace:'gaming-loot-vault-v2',
  globalStyles:Object.freeze(getStorefrontGlobalStyleState(canonicalHome)),
  shell:Object.freeze({
    headerNode:structuredClone(canonicalHeader) as StorefrontComponentNode,
    footerNode:structuredClone(canonicalFooter) as StorefrontComponentNode,
    header:Object.freeze(structuredClone(canonicalHeader.config)),
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
    key:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority.referenceKey,
    approved:true,
    requiredPageTypes:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority.requiredPageTypes,
  }),
  commerceReadiness:Object.freeze({
    productCardPurchaseActions:Object.freeze({
      pageTypes:Object.freeze(['home','catalog'] as const),
    }),
  }),
  // Product Owner approved the complete Visual First direction on 2026-09-28.
  // The package remains a candidate until implementation fidelity proof passes.
  productOwnerReview:Object.freeze({internalVisualReviewPassed:true}),
});
