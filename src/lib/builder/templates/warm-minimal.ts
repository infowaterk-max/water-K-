import {STOREFRONT_BUILDER_FOUNDATION_VERSION,STOREFRONT_DEMO_CONTENT_POLICY,STOREFRONT_PAGE_SCHEMA_VERSION,STOREFRONT_TEMPLATE_MANIFEST_VERSION,STOREFRONT_TEMPLATE_MIGRATION_POLICY,defineStorefrontTemplateManifest,type StorefrontBuilderPageType} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

/**
 * Warm Minimal had an accepted product/design name before implementation but no
 * source-controlled canonical key. `home.warm-minimal` is the first concrete
 * package identity assigned to that accepted direction.
 */
export const WARM_MINIMAL_TEMPLATE_KEY='home.warm-minimal' as const;
export const WARM_MINIMAL_TEMPLATE_VERSION=1 as const;
export const WARM_MINIMAL_VISUAL_DNA=Object.freeze({
  character:'warm-minimal-natural-material-room-led-home-commerce',
  category:'home-living-design',
  palette:{background:'alabaster',surface:['oat','sand','putty','mushroom'],text:'soft-black',wood:'walnut',accents:['muted-sage','soft-clay']},
  typography:{display:'modern-grotesk-or-humanist-sans',interface:'clean-humanist-sans'},
  imagery:'gentle-diffused-daylight-editorial-home-photography-linen-oak-boucle-travertine-ceramic-ribbed-glass',
  spacing:'quiet-airy-low-contrast',
  journey:'room-to-material-to-composed-room-to-object-to-home-note',
  exclusions:['cool-grey-dominance','high-gloss-luxury','neon-or-color-pop','cluttered-marketplace','rustic-farmhouse','boho-decor','overly-glossy-editorial'],
} as const);

export const WARM_MINIMAL_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#F4F0E8',
  '--shoporation-color-surface':'#E8E0D3',
  '--shoporation-color-surface-muted':'#D7CCBD',
  '--shoporation-color-text':'#242321',
  '--shoporation-color-muted-text':'#6C665E',
  '--shoporation-color-border':'#C9BEAE',
  '--shoporation-color-primary':'#403A34',
  '--shoporation-color-primary-contrast':'#FAF7F1',
  '--shoporation-color-accent':'var(--merchant-accent, #87927E)',
  '--shoporation-color-clay':'#B88E78',
  '--shoporation-color-walnut':'#725746',
  '--shoporation-heading-font':'var(--merchant-heading-font, Arial, sans-serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, sans-serif)',
} as const);

export const WARM_MINIMAL_ENGINE_CONTRACT=Object.freeze({
  requiredForFullExperience:['E1','E2','E7','E10','E13'] as const,
  supporting:['Recommendations'] as const,
  integration:{
    E1:'shared-page-schema-runtime',
    E2:'shared-catalog-search-and-collection-eligibility',
    E7:'source-supplied-material-finish-dimensions-and-care-only',
    E10:'shared-editorial-room-story-and-home-notes',
    E13:'provider-neutral-cart-and-checkout',
    Recommendations:'shared-soft-layers-and-related-product-surface',
  },
  authorityRule:'warm-minimal-presentation-never-invents-material-finish-dimensions-care-price-stock-rating-or-order-authority',
} as const);

export const WARM_MINIMAL_HOME_SECTION_ORDER=[
  'Warm Minimal Hero',
  'Shop by Room',
  'Material Palette',
  'Shop the Room',
  'Room Story',
  'Quiet Essentials',
  'Soft Layers',
  'Editorial Journal / Home Notes',
  'Newsletter / Footer CTA',
] as const;

export const WARM_MINIMAL_ROOM_LABELS=['Living room','Bedroom','Kitchen','Bath','Entry'] as const;

export const WARM_MINIMAL_MARKETING_LAYER_CONTRACT=Object.freeze({
  hero:['image','overlay','eyebrow','heading','copy','primary-cta','secondary-cta'] as const,
  businessCopyInImage:false,
  productTruthInImage:false,
  composition:'shared-visual-layers-no-template-local-layout-engine',
} as const);

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
const section=(id:string,children:StorefrontComponentNode[],tone='background'):StorefrontComponentNode=>node({id,componentKey:'layout.section',componentVersion:1,config:{tone,spacing:'xl',width:'full'},children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children})]});
const header=(prefix:string)=>node({id:`${prefix}-header`,componentKey:'system.header',componentVersion:1,config:{brandLabel:'Warm Minimal',brandHref:'/',tone:'background',sticky:true},bindings:{brandLabel:{path:'brand.name',fallback:'Warm Minimal'},brandHref:{path:'brand.homeHref',fallback:'/'}},children:[node({id:`${prefix}-nav`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:[],layout:'horizontal'},bindings:{items:{path:'navigation.primary',fallback:[]}}})]});
const footerFallback=[{id:'rooms',title:'Rooms',items:[{label:'Living room',href:'/webaruhaz?room=living'},{label:'Bedroom',href:'/webaruhaz?room=bedroom'},{label:'Kitchen',href:'/webaruhaz?room=kitchen'}]},{id:'notes',title:'Warm Minimal',items:[{label:'Home Notes',href:'/blog'},{label:'Kapcsolat',href:'/kapcsolat'}]}];
const footer=(prefix:string)=>node({id:`${prefix}-footer`,componentKey:'editorial.footer',componentVersion:1,config:{brandLabel:'Warm Minimal',columns:footerFallback,copyright:'© Warm Minimal',tone:'background'},bindings:{brandLabel:{path:'brand.name',fallback:'Warm Minimal'},columns:{path:'navigation.footer',fallback:footerFallback},copyright:{path:'brand.copyright',fallback:'© Warm Minimal'}}});
const base=(key:string,type:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,pageKey:key,pageType:type,templateKey:WARM_MINIMAL_TEMPLATE_KEY,templateVersion:WARM_MINIMAL_TEMPLATE_VERSION,metadata:{scaleOutTemplate:'Warm Minimal',templateCategory:'home-living-design',visualDNA:WARM_MINIMAL_VISUAL_DNA.character,...metadata},sections});
const productGrid=(id:string,title:string,path:string,columns=4):StorefrontComponentNode=>node({id,componentKey:'commerce.product-grid',componentVersion:1,config:{title,products:[],columns,presentation:'editorial',showBadges:true,showCompareAt:true,imageRatio:'4 / 5',emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF'},bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}}});
const splitFeature=(id:string,title:string,copy:string,image:string,root:string,imagePosition:'left'|'right')=>node({id,componentKey:'editorial.split-feature',componentVersion:1,config:{eyebrow:'Warm Minimal',title,copy,image,imageAlt:title,ctaLabel:'Felfedezem',ctaHref:'/webaruhaz',imagePosition,tone:'background'},bindings:{eyebrow:{path:`${root}.eyebrow`,fallback:'Warm Minimal'},title:{path:`${root}.title`,fallback:title},copy:{path:`${root}.copy`,fallback:copy},image:{path:`${root}.image`,fallback:image},imageAlt:{path:`${root}.imageAlt`,fallback:title},ctaLabel:{path:`${root}.ctaLabel`,fallback:'Felfedezem'},ctaHref:{path:`${root}.ctaHref`,fallback:'/webaruhaz'}}});
const simple=(key:string,type:StorefrontBuilderPageType,title:string,copy:string)=>{const p=key.replaceAll('.','-');return base(key,type,[header(p),section(`${p}-body`,[node({id:`${p}-title`,componentKey:'content.heading',componentVersion:1,config:{text:title,level:1,align:'left',tone:'text'},bindings:{text:{path:`content.${type}.title`,fallback:title}}}),node({id:`${p}-copy`,componentKey:'content.text',componentVersion:1,config:{text:copy,as:'p',align:'left',tone:'muted'},bindings:{text:{path:`content.${type}.copy`,fallback:copy}}})]),footer(p)]);};

export const WARM_MINIMAL_HOME_PAGE=base('warm-minimal.home','home',[
  header('warm-minimal-home'),
  node({id:'warm-minimal-hero-canvas',componentKey:'visual.layered-canvas',componentVersion:1,config:{height:'hero',tone:'background',radius:'none'},children:[
    node({id:'warm-minimal-hero-image-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'full',offsetX:'none',offsetY:'none',zIndex:0,width:'full',tone:'transparent',padding:'none',opacity:1,pointerEvents:'none'},children:[node({id:'warm-minimal-hero-image',componentKey:'content.image',componentVersion:1,config:{src:'/storefront-demo/warm-minimal/hero.svg',alt:'Meleg, természetes anyagokra épülő minimalista enteriőr',width:1400,height:900,fit:'cover',loading:'eager',radius:'none'},bindings:{src:{path:'content.warmMinimalHero.image',fallback:'/storefront-demo/warm-minimal/hero.svg'},alt:{path:'content.warmMinimalHero.imageAlt',fallback:'Meleg, természetes anyagokra épülő minimalista enteriőr'}}})]}),
    node({id:'warm-minimal-hero-overlay-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'full',offsetX:'none',offsetY:'none',zIndex:1,width:'full',tone:'scrim-soft',padding:'none',opacity:.06,pointerEvents:'none'}}),
    node({id:'warm-minimal-hero-eyebrow-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'top-left',offsetX:'l',offsetY:'l',zIndex:2,width:'auto',tone:'surface',padding:'s',opacity:.94,pointerEvents:'auto'},children:[node({id:'warm-minimal-hero-eyebrow',componentKey:'content.text',componentVersion:1,config:{text:'Warm Minimal',as:'strong',align:'left',tone:'text'},bindings:{text:{path:'content.warmMinimalHero.eyebrow',fallback:'Warm Minimal'}}})]}),
    node({id:'warm-minimal-hero-heading-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'center-left',offsetX:'l',offsetY:'none',zIndex:2,width:'wide',tone:'transparent',padding:'none',opacity:1,pointerEvents:'auto'},children:[node({id:'warm-minimal-hero-heading',componentKey:'content.heading',componentVersion:1,config:{text:'Csendes terek. Meleg anyagok.',level:1,align:'left',tone:'text'},bindings:{text:{path:'content.warmMinimalHero.title',fallback:'Csendes terek. Meleg anyagok.'}}})]}),
    node({id:'warm-minimal-hero-copy-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'bottom-left',offsetX:'l',offsetY:'xl',zIndex:2,width:'wide',tone:'transparent',padding:'none',opacity:1,pointerEvents:'auto'},children:[node({id:'warm-minimal-hero-copy',componentKey:'content.text',componentVersion:1,config:{text:'Természetes textúrák, puha neutrális tónusok és levegős otthoni kompozíciók.',as:'p',align:'left',tone:'text'},bindings:{text:{path:'content.warmMinimalHero.copy',fallback:'Természetes textúrák, puha neutrális tónusok és levegős otthoni kompozíciók.'}}})]}),
    node({id:'warm-minimal-hero-primary-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'bottom-left',offsetX:'l',offsetY:'m',zIndex:2,width:'auto',tone:'transparent',padding:'none',opacity:1,pointerEvents:'auto'},children:[node({id:'warm-minimal-hero-primary',componentKey:'content.button',componentVersion:1,config:{label:'Shop by room',href:'#warm-minimal-rooms',variant:'primary',size:'l',ariaLabel:'Shop by room'},bindings:{label:{path:'content.warmMinimalHero.primaryLabel',fallback:'Shop by room'},href:{path:'content.warmMinimalHero.primaryHref',fallback:'#warm-minimal-rooms'}}})]}),
    node({id:'warm-minimal-hero-secondary-layer',componentKey:'visual.layer',componentVersion:1,config:{position:'bottom-right',offsetX:'l',offsetY:'m',zIndex:2,width:'auto',tone:'transparent',padding:'none',opacity:1,pointerEvents:'auto'},children:[node({id:'warm-minimal-hero-secondary',componentKey:'content.button',componentVersion:1,config:{label:'Újdonságok',href:'/webaruhaz',variant:'secondary',size:'m',ariaLabel:'Újdonságok'},bindings:{label:{path:'content.warmMinimalHero.secondaryLabel',fallback:'Újdonságok'},href:{path:'content.warmMinimalHero.secondaryHref',fallback:'/webaruhaz'}}})]})
  ]}),
  section('warm-minimal-rooms',[node({id:'warm-minimal-room-navigation',componentKey:'commerce.collection-navigation',componentVersion:1,config:{title:'Shop by room',items:[],columns:5,imageRatio:'4 / 5',tone:'background'},bindings:{items:{path:'collection.rooms',fallback:[]}}})]),
  section('warm-minimal-material-palette',[node({id:'warm-minimal-material-palette-items',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Material palette',items:[],columns:5,missingLabel:'Nincs megadva'},bindings:{items:{path:'content.materialPalette.items',fallback:[]}}})],'surface'),
  section('warm-minimal-shop-room',[splitFeature('warm-minimal-shop-room-feature','Shop the Room','Egy teljes tér hangulatából induló, szerkesztett termékválogatás.','/storefront-demo/warm-minimal/room.svg','content.shopTheRoom','left')]),
  section('warm-minimal-room-story',[splitFeature('warm-minimal-room-story-feature','Room Story','Fény, textúra és arány: szerkesztett otthoni történet termékigazság kitalálása nélkül.','/storefront-demo/warm-minimal/detail.svg','content.roomStory','right')],'surface'),
  section('warm-minimal-quiet-essentials',[productGrid('warmMinimalQuietEssentials','Quiet essentials','catalog.quietEssentials',4)]),
  section('warm-minimal-soft-layers',[node({id:'warm-minimal-soft-layers-row',componentKey:'commerce.recommendation-row',componentVersion:1,config:{title:'Soft layers',products:[],columns:4,emptyLabel:'Nincs kapcsolódó ajánlat.',currency:'HUF'},bindings:{products:{path:'recommendations.softLayers',fallback:[]}}})],'surface'),
  section('warm-minimal-journal',[node({id:'warm-minimal-journal-index',componentKey:'story.index',componentVersion:1,config:{eyebrow:'Home Notes',title:'Editorial journal',items:[],columns:3,emptyLabel:'Hamarosan új otthoni jegyzetek érkeznek.'},bindings:{items:{path:'content.homeNotes.items',fallback:[]}}})]),
  node({id:'warm-minimal-newsletter',componentKey:'marketing.newsletter-signup',componentVersion:1,config:{eyebrow:'Warm Minimal Notes',title:'Csendes inspirációk az otthonodhoz',copy:'Új room storyk, anyagötletek és szerkesztett válogatások.',actionHref:'/hirlevel',inputLabel:'E-mail cím',buttonLabel:'Feliratkozom',consentLabel:'Elfogadom az adatkezelési tájékoztatót.',tone:'surface'},bindings:{eyebrow:{path:'content.newsletter.eyebrow',fallback:'Warm Minimal Notes'},title:{path:'content.newsletter.title',fallback:'Csendes inspirációk az otthonodhoz'},copy:{path:'content.newsletter.copy',fallback:'Új room storyk, anyagötletek és szerkesztett válogatások.'},actionHref:{path:'content.newsletter.actionHref',fallback:'/hirlevel'},inputLabel:{path:'content.newsletter.inputLabel',fallback:'E-mail cím'},buttonLabel:{path:'content.newsletter.buttonLabel',fallback:'Feliratkozom'},consentLabel:{path:'content.newsletter.consentLabel',fallback:'Elfogadom az adatkezelési tájékoztatót.'}}}),
  footer('warm-minimal-home'),
],{sectionOrder:WARM_MINIMAL_HOME_SECTION_ORDER,visualPreset:'warm-natural-minimal-home',roomLabels:WARM_MINIMAL_ROOM_LABELS,engineBinding:'E2+E7+E10',layerContract:WARM_MINIMAL_MARKETING_LAYER_CONTRACT,responsiveModes:['desktop','tablet','mobile']});

export const WARM_MINIMAL_CATALOG_PAGE=base('warm-minimal.catalog','catalog',[header('warm-minimal-catalog'),section('warm-minimal-catalog-heading',[node({id:'warm-minimal-catalog-collection-header',componentKey:'commerce.collection-header',componentVersion:1,config:{eyebrow:'Warm Minimal',title:'Otthon',description:'Válogass helyiség, anyag, szín és tárgytípus szerint.',image:'',imageAlt:'',align:'left'},bindings:{title:{path:'collection.current.title',fallback:'Otthon'},description:{path:'collection.current.description',fallback:'Válogass helyiség, anyag, szín és tárgytípus szerint.'}}})]),section('warm-minimal-catalog-products',[productGrid('warmMinimalCatalogGrid','Termékek','catalog.products',4)]),footer('warm-minimal-catalog')],{engineBinding:'E2+E7'});

export const WARM_MINIMAL_PRODUCT_PAGE=base('warm-minimal.product','product',[header('warm-minimal-product'),section('warm-minimal-product-main',[node({id:'warm-minimal-product-layout',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'l',align:'start'},children:[node({id:'warm-minimal-product-gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[],aspectRatio:'4 / 5',thumbnailPosition:'bottom'},bindings:{images:{path:'product.gallery',fallback:[]}},responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}}}),node({id:'warm-minimal-product-buybox',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},responsive:{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}},children:[node({id:'warm-minimal-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Warm Minimal',title:'Termék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF'},bindings:{title:{path:'product.name',fallback:'Termék'},price:{path:'pricing.displayPrice',fallback:''},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''},badges:{path:'product.badges',fallback:[]}}}),node({id:'warm-minimal-product-option',componentKey:'commerce.option-selector',componentVersion:1,config:{label:'Anyag / kivitel',options:[]},bindings:{label:{path:'variant.optionLabel',fallback:'Anyag / kivitel'},options:{path:'variant.optionOptions',fallback:[]}}}),node({id:'warm-minimal-product-key-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Anyag & kivitel',items:[],columns:2,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),node({id:'warm-minimal-product-cta',componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},bindings:{label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},href:{path:'commerce.purchaseHref',fallback:'#purchase'}}})]})]})]),section('warm-minimal-product-specs',[node({id:'warm-minimal-product-spec-groups',componentKey:'commerce.specification-groups',componentVersion:1,config:{title:'Méretek & ápolás',groups:[],missingLabel:'Nincs megadva'},bindings:{groups:{path:'product.specGroups',fallback:[]}}})]),section('warm-minimal-product-trust',[node({id:'warm-minimal-product-trust-copy',componentKey:'content.text',componentVersion:1,config:{text:'Szállítási és visszaküldési információk a kereskedő aktuális feltételei szerint.',as:'p',align:'left',tone:'muted'},bindings:{text:{path:'content.productTrust.copy',fallback:'Szállítási és visszaküldési információk a kereskedő aktuális feltételei szerint.'}}})]),section('warm-minimal-product-related',[node({id:'warm-minimal-product-related-row',componentKey:'commerce.recommendation-row',componentVersion:1,config:{title:'Ehhez a térhez',products:[],columns:4,emptyLabel:'Nincs kapcsolódó ajánlat.',currency:'HUF'},bindings:{products:{path:'recommendations.products',fallback:[]}}})]),footer('warm-minimal-product')],{engineBinding:'E7+E10',productStructure:'7-12-gallery-5-12-buybox-material-finish-dimensions-care-room-context',stickyPurchaseIntent:'shared-runtime-only-no-template-local-sticky-engine'});

export const WARM_MINIMAL_SEARCH_PAGE=base('warm-minimal.search','search',[header('warm-minimal-search'),section('warm-minimal-search-products',[productGrid('warmMinimalSearchGrid','Találatok','search.results',4)]),footer('warm-minimal-search')],{engineBinding:'E2'});
export const WARM_MINIMAL_CART_PAGE=base('warm-minimal.cart','cart',[header('warm-minimal-cart'),section('warm-minimal-cart-body',[node({id:'warm-minimal-cart-summary',componentKey:'commerce.cart-summary',componentVersion:1,config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad üres.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},total:{path:'cart.total',fallback:''}}})]),footer('warm-minimal-cart')]);
export const WARM_MINIMAL_CHECKOUT_PAGE=base('warm-minimal.checkout','checkout',[header('warm-minimal-checkout'),section('warm-minimal-checkout-body',[node({id:'warm-minimal-checkout-heading',componentKey:'content.heading',componentVersion:1,config:{text:'Pénztár',level:1,align:'left',tone:'text'}}),node({id:'warm-minimal-checkout-summary',componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos, provider-neutral checkout.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}}})]),footer('warm-minimal-checkout')],{engineBinding:'E13'});
export const WARM_MINIMAL_ACCOUNT_PAGE=simple('warm-minimal.account','account','Fiókom','Rendelések, mentett adatok és vásárlói beállítások.');
export const WARM_MINIMAL_CONTENT_PAGE=base('warm-minimal.content','content',[header('warm-minimal-content'),section('warm-minimal-content-story',[splitFeature('warm-minimal-content-feature','Home Notes','Szerkesztett room story, anyag- és térinspiráció meleg minimalista vizuális nyelven.','/storefront-demo/warm-minimal/detail.svg','content.homeNotesFeature','left')]),section('warm-minimal-content-materials',[node({id:'warm-minimal-content-material-guide',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Material guide',items:[],columns:4,missingLabel:'Nincs megadva'},bindings:{items:{path:'content.materialGuide.items',fallback:[]}}})]),footer('warm-minimal-content')],{contentRole:'home-notes',engineBinding:'E7+E10'});
export const WARM_MINIMAL_BLOG_INDEX_PAGE=base('warm-minimal.blog-index','blog-index',[header('warm-minimal-blog-index'),section('warm-minimal-blog-list',[node({id:'warm-minimal-blog-story-index',componentKey:'story.index',componentVersion:1,config:{eyebrow:'Home Notes',title:'Journal',items:[],columns:3,emptyLabel:'Hamarosan új bejegyzések érkeznek.'},bindings:{items:{path:'content.homeNotes.items',fallback:[]}}})]),footer('warm-minimal-blog-index')],{engineBinding:'E10'});
export const WARM_MINIMAL_BLOG_ARTICLE_PAGE=simple('warm-minimal.blog-article','blog-article','Home Notes','Szerkesztett enteriőr-, anyag- és otthontörténet.');
export const WARM_MINIMAL_FAQ_PAGE=simple('warm-minimal.faq','faq','GYIK','Anyag, méret, ápolás, szállítás és visszaküldés.');
export const WARM_MINIMAL_CONTACT_PAGE=simple('warm-minimal.contact','contact','Kapcsolat','Kapcsolat és ügyfélszolgálat.');
export const WARM_MINIMAL_LEGAL_PAGE=simple('warm-minimal.legal','legal','Jogi információk','A kereskedő jogi és adatkezelési tartalmának helye.');
export const WARM_MINIMAL_NOT_FOUND_PAGE=simple('warm-minimal.not-found','not-found','404','A keresett oldal nem található.');

export const WARM_MINIMAL_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,templateKey:WARM_MINIMAL_TEMPLATE_KEY,templateVersion:WARM_MINIMAL_TEMPLATE_VERSION,pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,minPlan:'alap',requiredFeatures:['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'],pageTypes:['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'],responsive:{desktop:true,tablet:true,mobile:true},migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,demoContent:{namespace:'home-warm-minimal',policy:STOREFRONT_DEMO_CONTENT_POLICY}});

export const WARM_MINIMAL_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={manifest:WARM_MINIMAL_TEMPLATE_MANIFEST,pages:[WARM_MINIMAL_HOME_PAGE,WARM_MINIMAL_CATALOG_PAGE,WARM_MINIMAL_PRODUCT_PAGE,WARM_MINIMAL_SEARCH_PAGE,WARM_MINIMAL_CART_PAGE,WARM_MINIMAL_CHECKOUT_PAGE,WARM_MINIMAL_ACCOUNT_PAGE,WARM_MINIMAL_CONTENT_PAGE,WARM_MINIMAL_BLOG_INDEX_PAGE,WARM_MINIMAL_BLOG_ARTICLE_PAGE,WARM_MINIMAL_FAQ_PAGE,WARM_MINIMAL_CONTACT_PAGE,WARM_MINIMAL_LEGAL_PAGE,WARM_MINIMAL_NOT_FOUND_PAGE],demoFixtures:[
  {entityType:'collection',entityKey:'living-room',payload:{title:'Living room',handle:'living-room',demo:true}},
  {entityType:'collection',entityKey:'bedroom',payload:{title:'Bedroom',handle:'bedroom',demo:true}},
  {entityType:'product',entityKey:'linen-lounge-chair',payload:{name:'Linen Lounge Chair',slug:'linen-lounge-chair',demo:true}},
  {entityType:'product',entityKey:'travertine-side-table',payload:{name:'Travertine Side Table',slug:'travertine-side-table',demo:true}},
  {entityType:'content',entityKey:'quiet-room-note',payload:{title:'Quiet Room Note',kind:'editorial-home-note',demo:true}},
]};
