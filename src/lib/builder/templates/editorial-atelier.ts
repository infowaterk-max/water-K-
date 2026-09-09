import {STOREFRONT_BUILDER_FOUNDATION_VERSION,STOREFRONT_DEMO_CONTENT_POLICY,STOREFRONT_PAGE_SCHEMA_VERSION,STOREFRONT_TEMPLATE_MANIFEST_VERSION,STOREFRONT_TEMPLATE_MIGRATION_POLICY,defineStorefrontTemplateManifest,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const EDITORIAL_ATELIER_TEMPLATE_KEY='fashion.editorial-atelier' as const;
export const EDITORIAL_ATELIER_TEMPLATE_VERSION=1 as const;

export const EDITORIAL_ATELIER_VISUAL_DNA=Object.freeze({
  character:'fashion-magazine-meets-premium-commerce',
  category:'fashion-apparel',
  position:'editorial-asymmetric-campaign-led-luxury',
  palette:{background:'broken-white',surface:'sand-beige',text:'ink-black',accent:'merchant-replaceable'},
  typography:{display:'high-contrast-editorial-serif',interface:'modern-clean-sans'},
  spacing:'large-editorial-negative-space',
  imagery:'large-campaign-fashion-photography-with-crop-led-composition',
  composition:'asymmetric-editorial-story-before-grid',
  chrome:'quiet-minimal-magazine-commerce',
  imageRatios:{campaign:'3 / 4',product:'4 / 5',journal:'3 / 2'},
  cards:'large-image-led-low-chrome',
  buttons:'quiet-textual-and-rectangular-premium',
  exclusions:['monarche-balanced-retail-grid-clone','street-drop-culture-clone','discount-density','symmetric-hero-cards-grid-default','baked-in-campaign-text','fabricated-price-stock-rating-material-or-fit-claim'],
} as const);

export const EDITORIAL_ATELIER_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#f6f1ea',
  '--shoporation-color-surface':'#e8ddd0',
  '--shoporation-color-surface-muted':'#d8cabc',
  '--shoporation-color-text':'#151412',
  '--shoporation-color-muted-text':'#69635d',
  '--shoporation-color-border':'#c9bcae',
  '--shoporation-color-primary':'#151412',
  '--shoporation-color-primary-contrast':'#fffaf4',
  '--shoporation-color-accent':'var(--merchant-accent, #8f6d61)',
  '--shoporation-heading-font':'var(--merchant-heading-font, Georgia, serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, sans-serif)',
} as const);

export const EDITORIAL_ATELIER_ENGINE_CONTRACT=Object.freeze({
  requiredForFullExperience:['E1','E2','E10','E13'] as const,
  optional:['E7'] as const,
  integration:{
    E1:'shared-page-schema-runtime',
    E2:'catalog-search-product-eligibility-authority',
    E10:'campaign-journal-lookbook-story-authority',
    E13:'provider-neutral-cart-checkout-authority',
    E7:'optional-structured-product-facts-only-when-supplied',
  },
  authorityRule:'editorial-atelier-presentation-never-invents-price-stock-rating-material-fit-sizing-product-attribute-or-order-authority',
} as const);

export const EDITORIAL_ATELIER_PRO_CONTRACT=Object.freeze({
  feature:'shop-the-look-interactive-scene',
  plan:'pro',
  alapFallback:'editorial-split-story-plus-authoritative-product-recommendation',
  implementationBoundary:'future-shared-interactive-scene-or-composer-engine-required-no-template-specific-hotspot-engine',
  authorityBoundary:'hotspots-may-reference-authoritative-products-but-never-own-price-stock-variant-or-order-state',
} as const);

export const EDITORIAL_ATELIER_HOME_SECTION_ORDER=[
  'Magazine Cover Hero',
  'Issue Statement',
  'Campaign Story I',
  'Campaign Story II',
  'The Edit',
  'Shop the Story',
  'Featured Silhouettes',
  'Journal',
  'Newsletter',
  'Footer',
] as const;

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
const section=(id:string,children:StorefrontComponentNode[],tone='background',spacing='xl'):StorefrontComponentNode=>node({id,componentKey:'layout.section',componentVersion:1,config:{tone,spacing,width:'full'},children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children})]});
const stack=(id:string,children:StorefrontComponentNode[],responsive?:StorefrontComponentNode['responsive']):StorefrontComponentNode=>node({id,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},responsive,children});

const navigationFallback=[
  {label:'New Issue',href:'/webaruhaz?sort=new'},
  {label:'Women',href:'/webaruhaz?collection=women'},
  {label:'Men',href:'/webaruhaz?collection=men'},
  {label:'The Edit',href:'/webaruhaz?collection=the-edit'},
  {label:'Journal',href:'/blog'},
] as const;

const header=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-header`,componentKey:'system.header',componentVersion:1,
  config:{brandLabel:'Atelier Nova',brandHref:'/',tone:'background',sticky:true},
  bindings:{brandLabel:{path:'brand.name',fallback:'Atelier Nova'},brandHref:{path:'brand.homeHref',fallback:'/'}},
  children:[node({id:`${prefix}-navigation`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:navigationFallback.map(item=>({...item})),layout:'horizontal'},bindings:{items:{path:'navigation.primary',fallback:navigationFallback.map(item=>({...item}))}}})],
});

const footerFallback=[
  {id:'shop',title:'Shop',items:[{label:'New Issue',href:'/webaruhaz?sort=new'},{label:'Women',href:'/webaruhaz?collection=women'},{label:'Men',href:'/webaruhaz?collection=men'},{label:'The Edit',href:'/webaruhaz?collection=the-edit'}]},
  {id:'atelier',title:'Atelier',items:[{label:'Journal',href:'/blog'},{label:'Kapcsolat',href:'/kapcsolat'},{label:'GYIK',href:'/gyik'}]},
];
const footer=(prefix:string):StorefrontComponentNode=>node({id:`${prefix}-footer`,componentKey:'editorial.footer',componentVersion:1,config:{brandLabel:'Atelier Nova',columns:footerFallback,copyright:'© Atelier Nova',tone:'primary'},bindings:{brandLabel:{path:'brand.name',fallback:'Atelier Nova'},columns:{path:'navigation.footer',fallback:footerFallback},copyright:{path:'brand.copyright',fallback:'© Atelier Nova'}}});

const base=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey,
  pageType,
  templateKey:EDITORIAL_ATELIER_TEMPLATE_KEY,
  templateVersion:EDITORIAL_ATELIER_TEMPLATE_VERSION,
  metadata:{scaleOutWave:25,templateCategory:'fashion-apparel',visualDNA:EDITORIAL_ATELIER_VISUAL_DNA.character,portfolioPosition:EDITORIAL_ATELIER_VISUAL_DNA.position,authorityRule:EDITORIAL_ATELIER_ENGINE_CONTRACT.authorityRule,...metadata},
  sections,
});

const grid=(id:string,title:string,path:string,columns=3,presentation='editorial'):StorefrontComponentNode=>node({id,componentKey:'commerce.product-grid',componentVersion:1,config:{title,products:[],columns,presentation,showBadges:true,showCompareAt:true,imageRatio:'4 / 5',emptyLabel:'Jelenleg nincs megjeleníthető darab.',currency:'HUF'},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const rec=(id:string,title:string,path:string,columns=3):StorefrontComponentNode=>node({id,componentKey:'commerce.recommendation-row',componentVersion:1,config:{title,products:[],columns,emptyLabel:'Jelenleg nincs kapcsolódó ajánlat.',currency:'HUF'},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const simple=(key:string,type:StorefrontBuilderPageType,title:string,copy:string,preset:string)=>{const p=key.replaceAll('.','-');return base(key,type,[header(p),section(`${p}-content`,[node({id:`${p}-title`,componentKey:'content.heading',componentVersion:1,config:{text:title,level:1,align:'left',tone:'text'},bindings:{text:{path:`content.${type}.title`,fallback:title}}}),node({id:`${p}-copy`,componentKey:'content.text',componentVersion:1,config:{text:copy,as:'p',align:'left',tone:'text'},bindings:{text:{path:`content.${type}.copy`,fallback:copy}}})]),footer(p)],{visualPreset:preset});};

export const EDITORIAL_ATELIER_HOME_PAGE=base('editorial-atelier.home','home',[
  header('editorial-atelier-home'),
  node({id:'atelier-cover-hero',componentKey:'editorial.hero',componentVersion:1,config:{eyebrow:'Issue 01 / New Season',title:'A wardrobe, edited like a magazine.',copy:'Nagy képek, kevés zaj és szerkesztett darabok egy kampányvezérelt divatélményben.',image:'/storefront-demo/editorial-atelier/cover.svg',imageAlt:'Atelier Nova editorial kampányfotó',primaryLabel:'Read the issue',primaryHref:'#atelier-issue',secondaryLabel:'Shop the edit',secondaryHref:'/webaruhaz?collection=the-edit',imagePosition:'left',height:'cover'},bindings:{eyebrow:{path:'content.atelierCover.eyebrow',fallback:'Issue 01 / New Season'},title:{path:'content.atelierCover.title',fallback:'A wardrobe, edited like a magazine.'},copy:{path:'content.atelierCover.copy',fallback:'Nagy képek, kevés zaj és szerkesztett darabok egy kampányvezérelt divatélményben.'},image:{path:'content.atelierCover.image',fallback:'/storefront-demo/editorial-atelier/cover.svg'},imageAlt:{path:'content.atelierCover.imageAlt',fallback:'Atelier Nova editorial kampányfotó'},primaryLabel:{path:'content.atelierCover.primaryLabel',fallback:'Read the issue'},primaryHref:{path:'content.atelierCover.primaryHref',fallback:'#atelier-issue'},secondaryLabel:{path:'content.atelierCover.secondaryLabel',fallback:'Shop the edit'},secondaryHref:{path:'content.atelierCover.secondaryHref',fallback:'/webaruhaz?collection=the-edit'}}}),
  section('atelier-issue',[node({id:'atelier-issue-heading',componentKey:'content.heading',componentVersion:1,config:{text:'This issue: proportion, movement, restraint.',level:2,align:'left',tone:'text'},bindings:{text:{path:'content.atelierIssue.title',fallback:'This issue: proportion, movement, restraint.'}}}),node({id:'atelier-issue-copy',componentKey:'content.text',componentVersion:1,config:{text:'A szerkesztett történet vezeti a vásárlást; a termékadatokat továbbra is a commerce authority szolgáltatja.',as:'p',align:'left',tone:'muted'},bindings:{text:{path:'content.atelierIssue.copy',fallback:'A szerkesztett történet vezeti a vásárlást; a termékadatokat továbbra is a commerce authority szolgáltatja.'}}})],'background','l'),
  node({id:'atelier-campaign-one',componentKey:'editorial.split-feature',componentVersion:1,config:{eyebrow:'Campaign / I',title:'Volume against silence.',copy:'Egyetlen erős kép és egyetlen történeti fókuszpont — nem klasszikus retail kártyasor.',image:'/storefront-demo/editorial-atelier/campaign-one.svg',imageAlt:'Atelier Nova kampány I',ctaLabel:'Explore the story',ctaHref:'/blog/campaign-one',imagePosition:'right',tone:'surface'},bindings:{eyebrow:{path:'content.campaignOne.eyebrow',fallback:'Campaign / I'},title:{path:'content.campaignOne.title',fallback:'Volume against silence.'},copy:{path:'content.campaignOne.copy',fallback:'Egyetlen erős kép és egyetlen történeti fókuszpont — nem klasszikus retail kártyasor.'},image:{path:'content.campaignOne.image',fallback:'/storefront-demo/editorial-atelier/campaign-one.svg'},imageAlt:{path:'content.campaignOne.imageAlt',fallback:'Atelier Nova kampány I'},ctaLabel:{path:'content.campaignOne.ctaLabel',fallback:'Explore the story'},ctaHref:{path:'content.campaignOne.ctaHref',fallback:'/blog/campaign-one'}}}),
  node({id:'atelier-campaign-two',componentKey:'editorial.split-feature',componentVersion:1,config:{eyebrow:'Campaign / II',title:'Structure in motion.',copy:'A második kampánykép ellenpontot ad: eltérő crop, fordított képoldal, kevesebb szöveg.',image:'/storefront-demo/editorial-atelier/campaign-two.svg',imageAlt:'Atelier Nova kampány II',ctaLabel:'See the edit',ctaHref:'/webaruhaz?collection=campaign-two',imagePosition:'left',tone:'background'},bindings:{eyebrow:{path:'content.campaignTwo.eyebrow',fallback:'Campaign / II'},title:{path:'content.campaignTwo.title',fallback:'Structure in motion.'},copy:{path:'content.campaignTwo.copy',fallback:'A második kampánykép ellenpontot ad: eltérő crop, fordított képoldal, kevesebb szöveg.'},image:{path:'content.campaignTwo.image',fallback:'/storefront-demo/editorial-atelier/campaign-two.svg'},imageAlt:{path:'content.campaignTwo.imageAlt',fallback:'Atelier Nova kampány II'},ctaLabel:{path:'content.campaignTwo.ctaLabel',fallback:'See the edit'},ctaHref:{path:'content.campaignTwo.ctaHref',fallback:'/webaruhaz?collection=campaign-two'}}}),
  section('atelier-the-edit',[grid('atelierTheEdit','The Edit','catalog.theEdit',3,'editorial')],'surface'),
  node({id:'atelier-shop-story',componentKey:'editorial.split-feature',componentVersion:1,config:{eyebrow:'Shop the Story',title:'One look, multiple pieces.',copy:'Alap csomagban szerkesztett történet és kapcsolódó termékajánló. A Pro hotspot/Interactive Scene külön közös engine-re épülhet.',image:'/storefront-demo/editorial-atelier/shop-story.svg',imageAlt:'Atelier Nova összeállítás',ctaLabel:'Shop the look',ctaHref:'#atelier-shop-story-products',imagePosition:'right',tone:'primary'},bindings:{eyebrow:{path:'content.shopStory.eyebrow',fallback:'Shop the Story'},title:{path:'content.shopStory.title',fallback:'One look, multiple pieces.'},copy:{path:'content.shopStory.copy',fallback:'Alap csomagban szerkesztett történet és kapcsolódó termékajánló. A Pro hotspot/Interactive Scene külön közös engine-re épülhet.'},image:{path:'content.shopStory.image',fallback:'/storefront-demo/editorial-atelier/shop-story.svg'},imageAlt:{path:'content.shopStory.imageAlt',fallback:'Atelier Nova összeállítás'},ctaLabel:{path:'content.shopStory.ctaLabel',fallback:'Shop the look'},ctaHref:{path:'content.shopStory.ctaHref',fallback:'#atelier-shop-story-products'}}}),
  section('atelier-shop-story-products',[rec('atelierShopStoryProducts','Pieces from the story','recommendations.shopStory',3)],'background','l'),
  section('atelier-featured-silhouettes',[grid('atelierFeaturedSilhouettes','Featured silhouettes','catalog.featuredSilhouettes',2,'story')],'background','xl'),
  section('atelier-journal',[node({id:'atelier-journal-preview',componentKey:'editorial.journal-preview',componentVersion:1,config:{title:'Journal / Notes from the issue',items:[],columns:3,emptyLabel:'A következő editorial történet hamarosan érkezik.'},bindings:{title:{path:'content.journal.title',fallback:'Journal / Notes from the issue'},items:{path:'content.journal.items',fallback:[]}}})]),
  node({id:'atelier-newsletter',componentKey:'marketing.newsletter-signup',componentVersion:1,config:{eyebrow:'Atelier Notes',title:'The next issue, in your inbox.',copy:'Kampányok, Journal és új szerkesztett válogatások.',actionHref:'/hirlevel',inputLabel:'E-mail-cím',buttonLabel:'Feliratkozom',consentLabel:'A feliratkozással elfogadod az adatkezelési tájékoztatót.',tone:'primary'},bindings:{eyebrow:{path:'content.newsletter.eyebrow',fallback:'Atelier Notes'},title:{path:'content.newsletter.title',fallback:'The next issue, in your inbox.'},copy:{path:'content.newsletter.copy',fallback:'Kampányok, Journal és új szerkesztett válogatások.'},actionHref:{path:'content.newsletter.actionHref',fallback:'/hirlevel'},inputLabel:{path:'content.newsletter.inputLabel',fallback:'E-mail-cím'},buttonLabel:{path:'content.newsletter.buttonLabel',fallback:'Feliratkozom'},consentLabel:{path:'content.newsletter.consentLabel',fallback:'A feliratkozással elfogadod az adatkezelési tájékoztatót.'}}}),
  footer('editorial-atelier-home'),
],{sectionOrder:EDITORIAL_ATELIER_HOME_SECTION_ORDER,visualPreset:'asymmetric-fashion-magazine-home',builderLayers:{cover:['image','eyebrow','title','copy','primaryLabel','primaryHref','secondaryLabel','secondaryHref'],campaignOne:['image','eyebrow','title','copy','ctaLabel','ctaHref'],campaignTwo:['image','eyebrow','title','copy','ctaLabel','ctaHref'],shopStory:['image','eyebrow','title','copy','ctaLabel','ctaHref'],responsive:['desktop','tablet','mobile']},engineBinding:'E2+E10',proContract:EDITORIAL_ATELIER_PRO_CONTRACT});

export const EDITORIAL_ATELIER_CATALOG_PAGE=base('editorial-atelier.catalog','catalog',[header('editorial-atelier-catalog'),section('atelier-catalog-head',[node({id:'atelier-catalog-header',componentKey:'commerce.collection-header',componentVersion:1,config:{eyebrow:'The Edit',title:'Collection',description:'Szerkesztett termékek kampány- és kollekciókontextussal.',image:'',imageAlt:'',align:'left'},bindings:{eyebrow:{path:'collection.current.eyebrow',fallback:'The Edit'},title:{path:'collection.current.title',fallback:'Collection'},description:{path:'collection.current.description',fallback:'Szerkesztett termékek kampány- és kollekciókontextussal.'},image:{path:'collection.current.image',fallback:''},imageAlt:{path:'collection.current.imageAlt',fallback:''}}})]),section('atelier-catalog-products',[grid('atelierCatalogGrid','Collection','catalog.products',3,'editorial')]),footer('editorial-atelier-catalog')],{visualPreset:'editorial-collection',engineBinding:'E2'});

export const EDITORIAL_ATELIER_PRODUCT_PAGE=base('editorial-atelier.product','product',[header('editorial-atelier-product'),section('atelier-product-main',[node({id:'atelier-product-grid',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'l',align:'start'},children:[node({id:'atelier-product-gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[],aspectRatio:'4 / 5',thumbnailPosition:'bottom'},bindings:{images:{path:'product.gallery',fallback:[]}},responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}}}),stack('atelier-product-buybox',[node({id:'atelier-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Atelier Nova',title:'Termék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF'},bindings:{eyebrow:{path:'product.eyebrow',fallback:'Atelier Nova'},title:{path:'product.name',fallback:'Termék'},price:{path:'pricing.displayPrice',fallback:''},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''},badges:{path:'product.badges',fallback:[]}}}),node({id:'atelier-product-color',componentKey:'commerce.variant-swatches',componentVersion:1,config:{label:'Szín',options:[]},bindings:{label:{path:'variant.colorLabel',fallback:'Szín'},options:{path:'variant.colorOptions',fallback:[]}}}),node({id:'atelier-product-size',componentKey:'commerce.size-selector',componentVersion:1,config:{label:'Méret',options:[]},bindings:{label:{path:'variant.sizeLabel',fallback:'Méret'},options:{path:'variant.sizeOptions',fallback:[]}}}),node({id:'atelier-product-cta',componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},bindings:{label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},href:{path:'commerce.purchaseHref',fallback:'#purchase'}}})],{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}})]})]),node({id:'atelier-product-story',componentKey:'editorial.split-feature',componentVersion:1,config:{eyebrow:'From the issue',title:'The story behind the look.',copy:'Editorial kontextus csak a termékadatok felülírása nélkül.',image:'/storefront-demo/editorial-atelier/campaign-one.svg',imageAlt:'Editorial termékkontextus',ctaLabel:'Read the Journal',ctaHref:'/blog',imagePosition:'left',tone:'surface'},bindings:{eyebrow:{path:'content.productStory.eyebrow',fallback:'From the issue'},title:{path:'content.productStory.title',fallback:'The story behind the look.'},copy:{path:'content.productStory.copy',fallback:'Editorial kontextus csak a termékadatok felülírása nélkül.'},image:{path:'content.productStory.image',fallback:'/storefront-demo/editorial-atelier/campaign-one.svg'},imageAlt:{path:'content.productStory.imageAlt',fallback:'Editorial termékkontextus'},ctaLabel:{path:'content.productStory.ctaLabel',fallback:'Read the Journal'},ctaHref:{path:'content.productStory.ctaHref',fallback:'/blog'}}}),section('atelier-product-recommendations',[rec('atelierProductRecommendations','Complete the edit','recommendations.products',3)]),footer('editorial-atelier-product')],{visualPreset:'editorial-product-gallery-buybox',variantContract:'attribute-based-generic',soldOutVariantBehavior:'visible-disabled',engineBinding:'E2+E10',pdpGrid:{desktop:'7/12+5/12',tablet:'7/12+5/12',mobile:'12/12+12/12'},commerceClarity:['price','stock','size','purchase-cta']});

export const EDITORIAL_ATELIER_SEARCH_PAGE=base('editorial-atelier.search','search',[header('editorial-atelier-search'),section('atelier-search-head',[node({id:'atelier-search-title',componentKey:'content.heading',componentVersion:1,config:{text:'Search the issue',level:1,align:'left',tone:'text'},bindings:{text:{path:'search.title',fallback:'Search the issue'}}}),node({id:'atelier-search-copy',componentKey:'content.text',componentVersion:1,config:{text:'',as:'p',align:'left',tone:'muted'},bindings:{text:{path:'search.summary',fallback:''}}})]),section('atelier-search-results',[grid('atelierSearchResults','Találatok','search.results',3,'editorial')]),footer('editorial-atelier-search')],{engineBinding:'E2'});

export const EDITORIAL_ATELIER_CART_PAGE=base('editorial-atelier.cart','cart',[header('editorial-atelier-cart'),section('atelier-cart-summary',[node({id:'atelier-cart-summary-block',componentKey:'commerce.cart-summary',componentVersion:1,config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad jelenleg üres.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},total:{path:'cart.total',fallback:''}}})]),section('atelier-cart-recommendations',[rec('atelierCartRecommendations','From the same issue','recommendations.cart',3)],'surface'),footer('editorial-atelier-cart')],{engineBinding:'E13'});

export const EDITORIAL_ATELIER_CHECKOUT_PAGE=base('editorial-atelier.checkout','checkout',[header('editorial-atelier-checkout'),section('atelier-checkout-intro',[node({id:'atelier-checkout-title',componentKey:'content.heading',componentVersion:1,config:{text:'Pénztár',level:1,align:'left',tone:'text'}}),node({id:'atelier-checkout-summary-block',componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos, provider-neutral checkout.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}}})]),footer('editorial-atelier-checkout')],{visualPreset:'quiet-editorial-checkout',engineBinding:'E13',checkoutUxContract:'guided-accordion-owned-by-shared-e13-checkout-runtime-not-template-local'});

export const EDITORIAL_ATELIER_ACCOUNT_PAGE=simple('editorial-atelier.account','account','Fiókom','Rendelések, profiladatok és vásárlói beállítások.','quiet-account');
export const EDITORIAL_ATELIER_CONTENT_PAGE=base('editorial-atelier.content','content',[header('editorial-atelier-content'),node({id:'atelier-content-hero',componentKey:'editorial.hero',componentVersion:1,config:{eyebrow:'Atelier',title:'A campaign becomes a story.',copy:'Hosszabb editorial tartalom nagy képekkel és szerkesztett ritmussal.',image:'/storefront-demo/editorial-atelier/campaign-two.svg',imageAlt:'Atelier Nova editorial tartalom',primaryLabel:'Journal',primaryHref:'/blog',secondaryLabel:'Shop',secondaryHref:'/webaruhaz',imagePosition:'right',height:'article'},bindings:{title:{path:'content.content.title',fallback:'A campaign becomes a story.'},copy:{path:'content.content.copy',fallback:'Hosszabb editorial tartalom nagy képekkel és szerkesztett ritmussal.'},image:{path:'content.content.image',fallback:'/storefront-demo/editorial-atelier/campaign-two.svg'},imageAlt:{path:'content.content.imageAlt',fallback:'Atelier Nova editorial tartalom'}}}),footer('editorial-atelier-content')],{visualPreset:'editorial-longform',engineBinding:'E10'});
export const EDITORIAL_ATELIER_BLOG_INDEX_PAGE=base('editorial-atelier.blog-index','blog-index',[header('editorial-atelier-blog-index'),section('atelier-blog-index-content',[node({id:'atelier-blog-index-journal',componentKey:'editorial.journal-preview',componentVersion:1,config:{title:'Journal',items:[],columns:3,emptyLabel:'A Journal hamarosan új történetekkel jelentkezik.'},bindings:{title:{path:'content.blog.title',fallback:'Journal'},items:{path:'content.blog.posts',fallback:[]}}})]),footer('editorial-atelier-blog-index')],{visualPreset:'magazine-journal-index',engineBinding:'E10'});
export const EDITORIAL_ATELIER_BLOG_ARTICLE_PAGE=base('editorial-atelier.blog-article','blog-article',[header('editorial-atelier-blog-article'),node({id:'atelier-article-hero',componentKey:'editorial.hero',componentVersion:1,config:{eyebrow:'Journal',title:'Editorial story',copy:'',image:'',imageAlt:'',primaryLabel:'',primaryHref:'#',secondaryLabel:'',secondaryHref:'#',imagePosition:'left',height:'article'},bindings:{eyebrow:{path:'content.article.eyebrow',fallback:'Journal'},title:{path:'content.article.title',fallback:'Editorial story'},copy:{path:'content.article.excerpt',fallback:''},image:{path:'content.article.image',fallback:''},imageAlt:{path:'content.article.imageAlt',fallback:''}}}),section('atelier-article-body',[node({id:'atelier-article-body-copy',componentKey:'content.text',componentVersion:1,config:{text:'',as:'p',align:'left',tone:'text'},bindings:{text:{path:'content.article.bodyExcerpt',fallback:''}}})]),footer('editorial-atelier-blog-article')],{visualPreset:'magazine-journal-article',engineBinding:'E10'});
export const EDITORIAL_ATELIER_FAQ_PAGE=simple('editorial-atelier.faq','faq','Gyakori kérdések','Rendelés, szállítás, visszaküldés és termékinformáció.','service-editorial');
export const EDITORIAL_ATELIER_CONTACT_PAGE=simple('editorial-atelier.contact','contact','Kapcsolat','Írj nekünk, ha segítségre van szükséged.','service-editorial');
export const EDITORIAL_ATELIER_LEGAL_PAGE=simple('editorial-atelier.legal','legal','Jogi információk','A kereskedő által kezelt jogi és adatkezelési tartalom helye.','legal-editorial');
export const EDITORIAL_ATELIER_NOT_FOUND_PAGE=base('editorial-atelier.not-found','not-found',[header('editorial-atelier-not-found'),section('atelier-not-found-content',[node({id:'atelier-not-found-title',componentKey:'content.heading',componentVersion:1,config:{text:'404 / Between issues',level:1,align:'center',tone:'text'}}),node({id:'atelier-not-found-copy',componentKey:'content.text',componentVersion:1,config:{text:'Ez az oldal már nem található.',as:'p',align:'center',tone:'muted'}}),node({id:'atelier-not-found-cta',componentKey:'content.button',componentVersion:1,config:{label:'Vissza a főoldalra',href:'/',variant:'secondary',size:'m',ariaLabel:'Vissza a főoldalra'}})]),footer('editorial-atelier-not-found')],{visualPreset:'magazine-not-found'});

export const EDITORIAL_ATELIER_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  templateKey:EDITORIAL_ATELIER_TEMPLATE_KEY,
  templateVersion:EDITORIAL_ATELIER_TEMPLATE_VERSION,
  pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  minPlan:'alap',
  requiredFeatures:['catalog','inventory','orders','contentMarketing','marketingBasics','productRecommendations','searchFiltering','commerceIntegrations'],
  pageTypes:['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'],
  responsive:{desktop:true,tablet:true,mobile:true},
  migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  demoContent:{namespace:'fashion-editorial-atelier',policy:STOREFRONT_DEMO_CONTENT_POLICY},
});

export const EDITORIAL_ATELIER_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  manifest:EDITORIAL_ATELIER_TEMPLATE_MANIFEST,
  pages:[EDITORIAL_ATELIER_HOME_PAGE,EDITORIAL_ATELIER_CATALOG_PAGE,EDITORIAL_ATELIER_PRODUCT_PAGE,EDITORIAL_ATELIER_SEARCH_PAGE,EDITORIAL_ATELIER_CART_PAGE,EDITORIAL_ATELIER_CHECKOUT_PAGE,EDITORIAL_ATELIER_ACCOUNT_PAGE,EDITORIAL_ATELIER_CONTENT_PAGE,EDITORIAL_ATELIER_BLOG_INDEX_PAGE,EDITORIAL_ATELIER_BLOG_ARTICLE_PAGE,EDITORIAL_ATELIER_FAQ_PAGE,EDITORIAL_ATELIER_CONTACT_PAGE,EDITORIAL_ATELIER_LEGAL_PAGE,EDITORIAL_ATELIER_NOT_FOUND_PAGE],
  demoFixtures:[
    {entityType:'collection',entityKey:'the-edit',payload:{title:'The Edit',handle:'the-edit',demo:true}},
    {entityType:'collection',entityKey:'campaign-two',payload:{title:'Campaign II',handle:'campaign-two',demo:true}},
    {entityType:'product',entityKey:'longline-coat',payload:{name:'Longline Coat',slug:'longline-coat',demo:true}},
    {entityType:'product',entityKey:'column-dress',payload:{name:'Column Dress',slug:'column-dress',demo:true}},
    {entityType:'product',entityKey:'wide-trouser',payload:{name:'Wide Trouser',slug:'wide-trouser',demo:true}},
    {entityType:'content',entityKey:'issue-01',payload:{title:'Issue 01',kind:'journal',demo:true}},
  ],
};