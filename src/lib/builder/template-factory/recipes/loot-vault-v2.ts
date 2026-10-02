import {LOOT_VAULT_V2_GENERATOR_BLUEPRINT} from '@/lib/builder/template-factory/blueprints/loot-vault-v2';
import {defineStorefrontTemplateGenome} from '@/lib/builder/template-factory/template-genome';
import {
  STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION,
  type StorefrontTemplateProductOwnerIntent,
} from '@/lib/builder/template-factory/constraint-planner';
import {compileStorefrontTemplateProductionCandidate} from '@/lib/builder/template-factory/production-compiler';
import type {
  StorefrontTemplateFactoryMediaAsset,
  StorefrontTemplateFactoryMediaManifest,
  StorefrontTemplateFactoryRecipe,
} from '@/lib/builder/template-factory/scaffold';
import {LOOT_VAULT_V2_TEMPLATE_PACKAGE} from '@/lib/builder/templates/gaming/loot-vault/v2';

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
  {key:'hero-main',state:'ready',role:'hero',semanticRole:'hero-scene',src:MEDIA.hero,alt:'Cinematikus fantasy jelenet gyűjtői Loot Vault hangulattal',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
  {key:'universe-1',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe1,alt:'Gyűjtői figurák polcon',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-2',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe2,alt:'Játék- és figuragyűjtemény',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-3',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe3,alt:'Karakterfigurák gyűjtői displayen',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-4',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe4,alt:'Anime figurák és emléktárgyak',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-5',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe5,alt:'Vintage gyűjtői polc művészeti tárgyakkal',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'universe-6',state:'ready',role:'category',semanticRole:'universe-editorial',src:MEDIA.universe6,alt:'Sötét neonfényes gyűjtői tér',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'product-1',state:'ready',role:'product',semanticRole:'collector-product',src:MEDIA.product1,alt:'Prémium gyűjtői figura',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-2',state:'ready',role:'product',semanticRole:'collector-product',src:MEDIA.product2,alt:'Fantasy gyűjtői szobor',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-3',state:'ready',role:'product',semanticRole:'collector-product',src:MEDIA.product3,alt:'Dramatikus gyűjtői miniatűr kiadás',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-4',state:'ready',role:'product',semanticRole:'collector-product',src:MEDIA.product4,alt:'Sötét sci-fi gyűjtői relikvia',pageTypes:['home','product'],representative:true,aspectRatio:'4:5'},
  {key:'editorial-1',state:'ready',role:'editorial',semanticRole:'archive-story',src:MEDIA.editorial1,alt:'Sötét gyűjtői archívum polcokkal és kiállított tárgyakkal',pageTypes:['home','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-2',state:'ready',role:'editorial',semanticRole:'archive-story',src:MEDIA.editorial2,alt:'Kurált miniatűr gyűjtemény és relikviák',pageTypes:['product','blog-article'],representative:true,aspectRatio:'3:2'},
  {key:'catalog-background',state:'ready',role:'background',semanticRole:'supporting-background',src:MEDIA.background,alt:'Sötét, színes neonfényes enteriőr',pageTypes:['catalog'],representative:true,aspectRatio:'16:9'},
]);

export const LOOT_VAULT_V2_TEMPLATE_GENOME=defineStorefrontTemplateGenome({
  contract:'shoporation.template-genome.v1',
  identity:{
    category:'gaming',
    templateKey:'gaming.loot-vault',
    displayName:'Loot Vault',
    templateVersion:2,
    genomeVersion:1,
  },
  lineage:{
    parentHash:null,
    evolution:'origin',
    note:'Canonical Genome projection of the accepted Loot Vault v2 collector-vault identity; concrete media remains owned by the Factory Media Manifest.',
  },
  dimensions:{
    identity:{
      character:'dark-theatrical-collector-vault-commerce',
      position:'collector-first premium vault storefront with editorial discovery and evidence-bound rarity',
      rules:['collector-object-first','rarity-is-data-not-decoration','theatrical-not-casino'],
    },
    color:{
      strategy:'near-black gallery surfaces with restrained bronze and oxidized-green accents',
      tokens:{background:'#0D0E0F',surface:'#17191A',text:'#F3EBDD',accent:'#A57A45',secondary:'#53695D'},
      rules:['high-contrast-content','accent-is-sparse','rarity-colors-never-invent-product-truth'],
    },
    typography:{
      display:'cinematic editorial serif-or-display',
      body:'clean readable sans',
      data:'compact specification sans',
      scale:'large editorial headings with compact commerce metadata',
      rules:['display-for-story','sans-for-commerce','spec-data-remains-dense-and-legible'],
    },
    spacing:{
      rhythm:'dramatic gallery pauses between dense collector groups',
      density:'medium-low editorial with localized dense specification areas',
      rules:['hero-breathes','product-grids-remain-scannable','specification-density-is-local'],
    },
    shape:{
      language:'vault panels, framed collection surfaces and restrained rectangular cards',
      radius:'restrained',
      border:'subtle metallic or low-contrast framed separation',
      rules:['no-bubbly-gaming-cards','no-random-pill-everywhere','framing-supports-collection-hierarchy'],
    },
    motion:{
      character:'cinematic restrained reveal',
      intensity:'subtle',
      rules:['no-slot-machine-motion','no-fake-countdown-pressure','motion-never-owns-commerce-state'],
    },
    composition:{
      grammar:'editorial hero to universe discovery to collector selection to story-led depth',
      sectionRhythm:'alternating cinematic feature and commerce evidence blocks',
      density:'hero-low then catalog-medium with focused high-density fact zones',
      archetypes:['cinematic-hero','universe-selector','collector-grid','editorial-feature','fact-led-pdp'],
      rules:['avoid-playroom-command-center-composition','commerce-remains-primary-after-discovery','story-never-replaces-product-truth'],
    },
    image:{
      language:'cinematic collector displays, figurines, props, art books and archival vault lighting',
      roles:['hero-scene','universe-editorial','collector-product','archive-story','supporting-background'],
      rules:['assets-must-be-template-specific','no-foundation-media-reuse','media-supports-object-provenance-not-fake-scarcity'],
      forbidConcreteSources:true,
    },
    commerce:{
      character:'collector discovery over shared catalog, structured facts and provider-neutral checkout',
      rules:['price-stock-order-remain-shared-authority','rarity-from-structured-product-data','preorder-never-fabricated'],
    },
    content:{
      voice:'curatorial, informed and atmospheric without hype deception',
      hierarchy:'object identity then evidence then story',
      rules:['no-fake-exclusive-copy','no-invented-numbering','editorial-copy-cannot-overrule-commerce-data'],
    },
    shell:{
      navigation:'vault/universe discovery with direct commerce access',
      header:'dark restrained sticky commerce shell',
      footer:'editorial vault/service split',
      rules:['shell-stays-builder-editable','mobile-navigation-remains-complete','cart-and-account-affordances-stay-visible'],
    },
    responsive:{
      desktopAuthority:true,
      tabletStrategy:'preserve collector hierarchy while reducing simultaneous columns',
      mobileStrategy:'stack editorial and commerce blocks without losing selected options or actions',
      rules:['explicit-overrides-only','reset-to-inherited-remains-available','no-duplicate-mobile-page-authority'],
    },
    componentGrammar:{
      preferred:['story.hero','story.feature','commerce.collection-navigation','commerce.product-grid','commerce.key-specs','commerce.specification-groups'],
      discouraged:['generic-rgb-dashboard','slot-machine-countdown','foundation-specific-playroom-shell'],
      rules:['prefer-shared-components','template-identity-through-bounded-config','no-template-local-commerce-engine'],
    },
    exclusion:{
      identities:['playroom-neon-command-center','generic-rgb-gamer-skin','loot-box-casino-ui'],
      similarities:['same-home-rhythm-as-playroom','same-media-language-as-playroom','repainted-foundation-shell-only'],
      rules:['distinct-composition-required','distinct-spacing-rhythm-required','distinct-media-language-required'],
    },
  },
});

export const LOOT_VAULT_V2_PRODUCTION_INTENT:StorefrontTemplateProductOwnerIntent=Object.freeze({
  contract:STOREFRONT_TEMPLATE_PRODUCT_OWNER_INTENT_VERSION,
  intentId:'gaming.loot-vault.v2.production-intent',
  intentVersion:1,
  visualAuthorityReferenceKey:LOOT_VAULT_V2_GENERATOR_BLUEPRINT.productionContracts.visualAuthority.referenceKey,
  emphasis:'balanced',
  densityPreference:'balanced',
  requiredArchetypes:Object.freeze(['cinematic-hero','collector-grid'] as const),
  requiredMediaRoles:Object.freeze(['hero-scene','collector-product'] as const),
  preferredComponentFamilies:Object.freeze(['story.hero','commerce.product-grid','commerce.key-specs'] as const),
  prioritizedEngines:Object.freeze(['E6','E7','E10'] as const),
  note:'Preserve the accepted collector-vault visual authority while prioritizing cinematic discovery, collector evidence and structured compatibility/specification proof.',
});

export const LOOT_VAULT_V2_FACTORY_MEDIA_MANIFEST:StorefrontTemplateFactoryMediaManifest=Object.freeze({
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
  semanticBindings:Object.freeze([
    {semanticRole:'hero-scene',technicalRole:'hero',minCount:1,aspectRatio:'16:9',pageTypes:['home'],representative:true} as const,
    {semanticRole:'universe-editorial',technicalRole:'category',minCount:6,aspectRatio:'4:5',pageTypes:['home'],representative:true} as const,
    {semanticRole:'collector-product',technicalRole:'product',minCount:4,aspectRatio:'4:5',pageTypes:['home','product'],representative:true} as const,
    {semanticRole:'archive-story',technicalRole:'editorial',minCount:2,aspectRatio:'3:2',pageTypes:['home','product','blog-index','blog-article'],representative:true} as const,
    {semanticRole:'supporting-background',technicalRole:'background',minCount:1,aspectRatio:'16:9',pageTypes:['catalog'],representative:true} as const,
  ]),
  minimumRepresentativeMedia:14,
  forbidPlaceholderSvg:true,
});

export const LOOT_VAULT_V2_PRODUCTION_COMPILATION=compileStorefrontTemplateProductionCandidate({
  blueprint:LOOT_VAULT_V2_GENERATOR_BLUEPRINT,
  candidate:LOOT_VAULT_V2_TEMPLATE_PACKAGE,
  genome:LOOT_VAULT_V2_TEMPLATE_GENOME,
  productionIntent:LOOT_VAULT_V2_PRODUCTION_INTENT,
  media:LOOT_VAULT_V2_FACTORY_MEDIA_MANIFEST,
  productOwnerReview:Object.freeze({internalVisualReviewPassed:true}),
});

if(!LOOT_VAULT_V2_PRODUCTION_COMPILATION.valid||!LOOT_VAULT_V2_PRODUCTION_COMPILATION.recipe){
  const blocker=LOOT_VAULT_V2_PRODUCTION_COMPILATION.issues[0];
  throw new Error('LOOT_VAULT_V2_DYNAMIC_COMPILER_FAILED:'+(blocker?.code??'UNKNOWN')+':'+(blocker?.path??'unknown'));
}

export const LOOT_VAULT_V2_FACTORY_RECIPE:StorefrontTemplateFactoryRecipe=LOOT_VAULT_V2_PRODUCTION_COMPILATION.recipe;
