import {STOREFRONT_GLOBAL_STYLES_VERSION} from '@/lib/builder/storefront-global-styles';
import type {FeatureCode} from '@/lib/plans/catalog';
import type {StorefrontTemplateFactoryRecipe} from '@/lib/builder/template-factory/scaffold';
import {
  LOOT_VAULT_V2_MEDIA_PATHS,
  LOOT_VAULT_V2_REFERENCE_PAGE_OVERRIDES,
} from '@/lib/builder/template-factory/recipes/loot-vault-v2-pages';

const navigation=Object.freeze([
  {label:'Univerzumok',href:'/#loot-universes'},
  {label:'Figurák',href:'/webaruhaz?category=figures'},
  {label:'Művészeti albumok',href:'/webaruhaz?category=art-books'},
  {label:'Relikviák',href:'/webaruhaz?category=relics'},
  {label:'Limitált kiadások',href:'/webaruhaz?filter=limited'},
  {label:'Előrendelések',href:'/webaruhaz?filter=preorder'},
  {label:'Vault Magazin',href:'/blog'},
]);

const footerColumns=Object.freeze([
  {id:'vault',title:'Loot Vault',items:[
    {label:'Gyűjtői válogatás',href:'/webaruhaz'},
    {label:'Limitált kiadások',href:'/webaruhaz?filter=limited'},
    {label:'Előrendelések',href:'/webaruhaz?filter=preorder'},
  ]},
  {id:'stories',title:'Történetek',items:[
    {label:'Vault Magazin',href:'/blog'},
    {label:'GYIK',href:'/gyik'},
    {label:'Kapcsolat',href:'/kapcsolat'},
  ]},
  {id:'help',title:'Információ',items:[
    {label:'Szállítás',href:'/oldal/szallitas'},
    {label:'Jogi információk',href:'/jogi'},
    {label:'Fiókom',href:'/fiokom'},
  ]},
]);

const media=Object.freeze([
  {key:'hero-cinematic',state:'planned',role:'hero',src:LOOT_VAULT_V2_MEDIA_PATHS.hero,alt:'Filmszerű fantasy és sci-fi gyűjtői jelenet meleg bronz fénnyel',pageTypes:['home'],representative:true,aspectRatio:'16:9'},
  {key:'category-galaxy',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryGalaxy,alt:'Galaktikus gyűjtői világ',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'category-heroes',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryHeroes,alt:'Hősök és antihősök gyűjtői világa',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'category-anime',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryAnime,alt:'Anime ihletésű gyűjtői világ',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'category-fantasy',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryFantasy,alt:'Fantasy gyűjtői világ',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'category-miniatures',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryMiniatures,alt:'Festett miniatűrök és diorámák',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'category-retro',state:'planned',role:'category',src:LOOT_VAULT_V2_MEDIA_PATHS.categoryRetro,alt:'Retro gaming gyűjtői világ',pageTypes:['home'],representative:true,aspectRatio:'4:5'},
  {key:'product-figure',state:'planned',role:'product',src:LOOT_VAULT_V2_MEDIA_PATHS.productFigure,alt:'Prémium gyűjtői figura',pageTypes:['home','catalog','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-statue',state:'planned',role:'product',src:LOOT_VAULT_V2_MEDIA_PATHS.productStatue,alt:'Részletgazdag gyűjtői szobor',pageTypes:['home','catalog','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-edition',state:'planned',role:'product',src:LOOT_VAULT_V2_MEDIA_PATHS.productEdition,alt:'Díszdobozos gyűjtői kiadás',pageTypes:['home','catalog','product'],representative:true,aspectRatio:'4:5'},
  {key:'product-relic',state:'planned',role:'product',src:LOOT_VAULT_V2_MEDIA_PATHS.productRelic,alt:'Prémium fantasy relikvia',pageTypes:['home','catalog','product'],representative:true,aspectRatio:'4:5'},
  {key:'editorial-room',state:'planned',role:'editorial',src:LOOT_VAULT_V2_MEDIA_PATHS.editorialRoom,alt:'Hangulatos gyűjtői szoba vitrinnel és relikviákkal',pageTypes:['home','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'editorial-shelf',state:'planned',role:'editorial',src:LOOT_VAULT_V2_MEDIA_PATHS.editorialShelf,alt:'Prémium gyűjtői polc meleg fényekkel',pageTypes:['home','product','blog-index'],representative:true,aspectRatio:'3:2'},
  {key:'background-archive',state:'planned',role:'background',src:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive,alt:'Sötét gyűjtői archívum bronz megvilágítással',pageTypes:['catalog','blog-index','blog-article'],representative:true,aspectRatio:'16:9'},
] as const);

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
      logoUrl:'',
      logoAlt:'Loot Vault',
      tagline:'Fandom. Gyűjtemény. Történetek.',
      navTagline:'TÖBB MINT TERMÉKEK. EGY KÖZÖSSÉG.',
      categoryTriggerLabel:'Univerzumok',
      searchPlaceholder:'Keresés termékre, univerzumra…',
      tone:'background',
    }),
    patches:Object.freeze([
      {match:{componentKey:'system.search'},config:{placeholder:'Keresés termékre, univerzumra…',ariaLabel:'Keresés a Loot Vaultban'}},
      {match:{componentKey:'system.navigation'},config:{items:navigation,ariaLabel:'Loot Vault fő navigáció'}},
      {match:{componentKey:'editorial.footer'},config:{brandLabel:'Loot Vault',columns:footerColumns,copyright:'© Loot Vault'}},
    ]),
  }),
  pageOverrides:LOOT_VAULT_V2_REFERENCE_PAGE_OVERRIDES,
  demoFixtures:Object.freeze([
    {entityType:'collection',entityKey:'vault-galaxy',payload:{title:'Galaktikus legendák',handle:'vault-galaxy',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryGalaxy,demo:true}},
    {entityType:'collection',entityKey:'vault-heroes',payload:{title:'Hősök és antihősök',handle:'vault-heroes',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryHeroes,demo:true}},
    {entityType:'collection',entityKey:'vault-anime',payload:{title:'Anime világ',handle:'vault-anime',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryAnime,demo:true}},
    {entityType:'collection',entityKey:'vault-fantasy',payload:{title:'Fantasy',handle:'vault-fantasy',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryFantasy,demo:true}},
    {entityType:'collection',entityKey:'vault-miniatures',payload:{title:'Miniatűrök',handle:'vault-miniatures',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryMiniatures,demo:true}},
    {entityType:'collection',entityKey:'vault-retro',payload:{title:'Retro gaming',handle:'vault-retro',image:LOOT_VAULT_V2_MEDIA_PATHS.categoryRetro,demo:true}},
    {entityType:'product',entityKey:'vault-figure',payload:{name:'Obszidián őrszem – prémium figura',slug:'obszidian-orszem',kind:'collectible-figure',image:LOOT_VAULT_V2_MEDIA_PATHS.productFigure,badge:'LIMITÁLT',price:89990,demo:true}},
    {entityType:'product',entityKey:'vault-statue',payload:{name:'Vörös vándor – gyűjtői szobor',slug:'voros-vandor',kind:'collector-statue',image:LOOT_VAULT_V2_MEDIA_PATHS.productStatue,badge:'EXKLUZÍV',price:129990,demo:true}},
    {entityType:'product',entityKey:'vault-edition',payload:{name:'Aranykapu – gyűjtői kiadás',slug:'aranykapu-kiadas',kind:'collector-edition',image:LOOT_VAULT_V2_MEDIA_PATHS.productEdition,badge:'ELŐRENDELÉS',price:59990,demo:true}},
    {entityType:'product',entityKey:'vault-relic',payload:{name:'Éjfény relikvia',slug:'ejfeny-relikvia',kind:'collector-relic',image:LOOT_VAULT_V2_MEDIA_PATHS.productRelic,badge:'LIMITÁLT',price:74990,demo:true}},
    {entityType:'content',entityKey:'collector-room',payload:{title:'Így válik a polc történetté',kind:'collector-editorial',image:LOOT_VAULT_V2_MEDIA_PATHS.editorialRoom,demo:true}},
    {entityType:'content',entityKey:'collector-archive',payload:{title:'Tárgyak, amelyekhez történet tartozik',kind:'collector-editorial',image:LOOT_VAULT_V2_MEDIA_PATHS.backgroundArchive,demo:true}},
  ]),
  media:Object.freeze({
    assets:media,
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
