import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontTemplateManifest,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const CREATOR_STATION_TEMPLATE_KEY='tech.creator-station' as const;
export const CREATOR_STATION_TEMPLATE_VERSION=1 as const;

export const CREATOR_STATION_VISUAL_DNA=Object.freeze({
  character:'dark-digital-creator-workflow-commerce',
  category:'electronics-tech',
  palette:{
    background:'deep-graphite-charcoal',
    surface:'neutral-dark-panels',
    text:'cool-white',
    accentPrimary:'controlled-cyan',
    accentSecondary:'controlled-magenta-violet',
    warning:'rec-orange-red',
    compatible:'signal-green',
  },
  typography:{display:'technical-grotesk-sans',interface:'clean-sans',data:'monospace-timecode'},
  visualLanguage:['timeline','waveform','timecode','audio-meter','port-node','connection-chain'],
  imagery:'creator-workflow-camera-audio-light-capture-computer-software',
  density:'dark-technical-editorial',
  exclusions:['white-background-block','sterile-saas','cold-tech-dashboard','uncontrolled-rgb-chaos','fake-compatibility','fake-performance-guarantee'],
} as const);

export const CREATOR_STATION_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#0B0D10',
  '--shoporation-color-surface':'#14171D',
  '--shoporation-color-surface-muted':'#1D222B',
  '--shoporation-color-text':'#F4F7FB',
  '--shoporation-color-muted-text':'#96A0AE',
  '--shoporation-color-border':'#2B313C',
  '--shoporation-color-primary':'#0F1217',
  '--shoporation-color-primary-contrast':'#F4F7FB',
  '--shoporation-color-accent':'var(--merchant-accent, #35D0FF)',
  '--shoporation-color-accent-secondary':'#B45CFF',
  '--shoporation-color-warning':'#FF5A4F',
  '--shoporation-color-success':'#4FD48B',
  '--shoporation-heading-font':'var(--merchant-heading-font, Arial, sans-serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, sans-serif)',
  '--shoporation-data-font':'var(--merchant-data-font, ui-monospace, SFMono-Regular, Menlo, monospace)',
} as const);

export const CREATOR_STATION_ENGINE_CONTRACT=Object.freeze({
  requiredForFullExperience:['E1','E2','E3','E5','E6','E7','E10','E13'] as const,
  integration:{
    E1:'shared-page-schema-runtime',
    E2:'catalog-channel-eligibility-authority',
    E3:'workflow-finder-for-creator-use-case-and-goal-selection',
    E5:'slot-based-creator-setup-configurator',
    E6:'explainable-device-and-workflow-compatibility',
    E7:'structured-system-requirements-and-technical-specifications',
    E10:'creator-magazine-and-tutorial-story-read-models',
    E13:'provider-neutral-cart-checkout-and-final-validation',
  },
  authorityRule:'workflow-guidance-and-setup-presentation-never-invent-price-stock-compatibility-performance-or-order-authority',
  compatibilityPrinciples:{unknownIsCompatible:false,explainable:true,serverFinalValidation:true,noSilentReplacement:true},
} as const);

export const CREATOR_STATION_WORKFLOWS=['YouTube','Podcast','Stream','Fotó','Short Video','Home Studio'] as const;
export const CREATOR_STATION_HOME_SECTION_ORDER=[
  'Build Your Workflow',
  'Visual Equipment Chain',
  'Timeline',
  'Setup Scenes',
  'Compatibility Checker',
  'System Requirements',
  'Starter / Advanced / Studio',
  'Creator Magazine',
  'Footer',
] as const;

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;
const section=(id:string,children:StorefrontComponentNode[],tone='background'):StorefrontComponentNode=>node({
  id,
  componentKey:'layout.section',
  componentVersion:1,
  config:{tone,spacing:'xl',width:'full'},
  children:[node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children})],
});
const header=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-header`,componentKey:'system.header',componentVersion:1,
  config:{brandLabel:'Creator Station',brandHref:'/',tone:'primary',sticky:true},
  bindings:{brandLabel:{path:'brand.name',fallback:'Creator Station'},brandHref:{path:'brand.homeHref',fallback:'/'}},
  children:[node({id:`${prefix}-nav`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:[],layout:'horizontal'},bindings:{items:{path:'navigation.primary',fallback:[]}}})],
});
const footerFallback=[
  {id:'workflows',title:'Workflow',items:[{label:'Creator setup',href:'/oldal/creator-workflow'},{label:'Eszközök',href:'/webaruhaz'}]},
  {id:'learn',title:'Tanulás',items:[{label:'Creator Magazine',href:'/blog'},{label:'Kapcsolat',href:'/kapcsolat'}]},
];
const footer=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-footer`,componentKey:'editorial.footer',componentVersion:1,
  config:{brandLabel:'Creator Station',columns:footerFallback,copyright:'© Creator Station',tone:'primary'},
  bindings:{brandLabel:{path:'brand.name',fallback:'Creator Station'},columns:{path:'navigation.footer',fallback:footerFallback},copyright:{path:'brand.copyright',fallback:'© Creator Station'}},
});
const base=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey,
  pageType,
  templateKey:CREATOR_STATION_TEMPLATE_KEY,
  templateVersion:CREATOR_STATION_TEMPLATE_VERSION,
  metadata:{scaleOutTemplate:'Creator Station',templateCategory:'electronics-tech',visualDNA:CREATOR_STATION_VISUAL_DNA.character,...metadata},
  sections,
});
const productGrid=(id:string,title:string,path:string,columns=4):StorefrontComponentNode=>node({
  id,componentKey:'commerce.product-grid',componentVersion:1,
  config:{title,products:[],columns,presentation:'tech',showBadges:true,showCompareAt:true,imageRatio:'1 / 1',emptyLabel:'Jelenleg nincs megjeleníthető eszköz.',currency:'HUF'},
  bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}},
});
const simple=(key:string,type:StorefrontBuilderPageType,title:string,copy:string):StorefrontPageDocument=>{
  const prefix=key.replaceAll('.','-');
  return base(key,type,[header(prefix),section(`${prefix}-body`,[
    node({id:`${prefix}-title`,componentKey:'content.heading',componentVersion:1,config:{text:title,level:1,align:'left',tone:'text'}}),
    node({id:`${prefix}-copy`,componentKey:'content.text',componentVersion:1,config:{text:copy,as:'p',align:'left',tone:'muted'}}),
  ]),footer(prefix)],{visualPreset:'creator-station-dark-content'});
};

export const CREATOR_STATION_HOME_PAGE=base('creator-station.home','home',[
  header('creator-home'),
  section('creator-build-workflow',[
    node({
      id:'creator-workflow-finder',componentKey:'guided.finder',componentVersion:1,
      config:{eyebrow:'Build Your Workflow',title:'Építsd fel az alkotói workflow-dat',copy:'YouTube, Podcast, Stream, Fotó, Short Video vagy Home Studio — a Finder csak valóban elérhető termékeket rangsorol.',stepTitle:'1. lépés',stepCopy:'Válassz alkotói irányt.',question:'Milyen workflow-t építesz?',options:[],progressLabel:'1 / 3',actionLabel:'Workflow megnyitása',actionHref:'#equipment-chain',resultStatus:''},
      bindings:{stepTitle:{path:'finder.currentStep.title',fallback:'1. lépés'},stepCopy:{path:'finder.currentStep.copy',fallback:'Válassz alkotói irányt.'},question:{path:'finder.currentQuestion.label',fallback:'Milyen workflow-t építesz?'},options:{path:'finder.currentQuestion.options',fallback:[]},progressLabel:{path:'finder.progressLabel',fallback:'1 / 3'},actionHref:{path:'finder.resultHref',fallback:'#equipment-chain'},resultStatus:{path:'finder.resultStatus',fallback:''}},
    }),
  ]),
  section('creator-equipment-chain',[
    node({
      id:'equipment-chain',componentKey:'configurator.slot-list',componentVersion:1,
      config:{title:'Visual Equipment Chain',slots:[],emptyLabel:'A workflow kiválasztása után jelenik meg az eszközlánc.'},
      bindings:{title:{path:'configurator.chainTitle',fallback:'Visual Equipment Chain'},slots:{path:'configurator.slots',fallback:[]}},
    }),
  ],'surface'),
  section('creator-timeline',[
    node({
      id:'creator-timeline-flow',componentKey:'configurator.performance-targets',componentVersion:1,
      config:{eyebrow:'Timeline',title:'A jel útja, lépésről lépésre',copy:'Kamera → objektív → fény → mikrofon → capture → számítógép → szoftver. A konkrét workflow szerinti lépések bindingból érkeznek.',items:[]},
      bindings:{items:{path:'workflow.timeline',fallback:[]}},
    }),
  ]),
  section('creator-setup-scenes',[
    node({
      id:'creator-setup-scenes-nav',componentKey:'commerce.collection-navigation',componentVersion:1,
      config:{title:'Setup Scenes',items:[],columns:3,imageRatio:'16 / 9',tone:'background'},
      bindings:{items:{path:'collection.setupScenes',fallback:[]}},
    }),
  ]),
  section('creator-compatibility',[
    node({
      id:'creator-compatibility-status',componentKey:'compatibility.status',componentVersion:1,
      config:{title:'Compatibility Checker',status:'unknown',compatibleLabel:'Kompatibilis',incompatibleLabel:'Nem kompatibilis',unknownLabel:'Ismeretlen',copy:'Az Ismeretlen állapot soha nem számít kompatibilisnek.'},
      bindings:{status:{path:'compatibility.status',fallback:'unknown'},copy:{path:'compatibility.summary',fallback:'Az Ismeretlen állapot soha nem számít kompatibilisnek.'}},
    }),
  ],'surface'),
  section('creator-system-requirements',[
    node({
      id:'creator-system-requirements-block',componentKey:'commerce.key-specs',componentVersion:1,
      config:{title:'System Requirements',items:[],columns:4,missingLabel:'Nincs megadva'},
      bindings:{items:{path:'workflow.systemRequirements',fallback:[]}},
    }),
  ]),
  section('creator-tiers',[
    node({
      id:'creator-tier-compare',componentKey:'commerce.compare-spotlight',componentVersion:1,
      config:{title:'Starter / Advanced / Studio',copy:'Valódi setup-szintek összehasonlítása strukturált adatokkal; nincs garantált teljesítményállítás.',products:[],rows:[],ctaLabel:'Setupok összehasonlítása',ctaHref:'/oldal/creator-workflow'},
      bindings:{products:{path:'workflow.tiers.products',fallback:[]},rows:{path:'workflow.tiers.rows',fallback:[]},ctaHref:{path:'workflow.tiers.compareHref',fallback:'/oldal/creator-workflow'}},
    }),
  ]),
  section('creator-magazine',[
    node({
      id:'creator-magazine-index',componentKey:'editorial.journal-preview',componentVersion:1,
      config:{title:'Creator Magazine',items:[{id:'signal-chain',title:'Signal chain alapok',href:'/blog/signal-chain',image:'/storefront-demo/creator-station/magazine.svg',imageAlt:'Creator Station waveform és timeline illusztráció'}],columns:3,emptyLabel:'Hamarosan új tutorialok érkeznek.'},
      bindings:{items:{path:'story.creatorMagazine.items',fallback:[{id:'signal-chain',title:'Signal chain alapok',href:'/blog/signal-chain',image:'/storefront-demo/creator-station/magazine.svg',imageAlt:'Creator Station waveform és timeline illusztráció'}]}},
    }),
  ]),
  footer('creator-home'),
],{
  sectionOrder:CREATOR_STATION_HOME_SECTION_ORDER,
  visualPreset:'unified-dark-creator-ui',
  engineBinding:'E3+E5+E6+E7+E10',
  workflowExamples:CREATOR_STATION_WORKFLOWS,
});

export const CREATOR_STATION_CATALOG_PAGE=base('creator-station.catalog','catalog',[
  header('creator-catalog'),
  section('creator-catalog-workflow-nav',[
    node({id:'creator-catalog-guided-nav',componentKey:'guided.attribute-navigation',componentVersion:1,config:{eyebrow:'Workflow',title:'Eszközök felhasználás szerint',items:[]},bindings:{items:{path:'catalog.workflowNavigation',fallback:[]}}}),
  ]),
  section('creator-catalog-body',[
    node({id:'creator-catalog-layout',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'l',align:'start'},children:[
      node({id:'creator-catalog-facets',componentKey:'commerce.catalog-facets',componentVersion:1,config:{title:'Műszaki szűrés',facets:[],clearHref:'/webaruhaz',clearLabel:'Törlés'},bindings:{facets:{path:'catalog.facets',fallback:[]},clearHref:{path:'catalog.clearHref',fallback:'/webaruhaz'}},responsive:{desktop:{gridSpan:3},tablet:{gridSpan:4},mobile:{gridSpan:12}}}),
      node({...productGrid('creatorCatalogGrid','Creator eszközök','catalog.products',3),responsive:{desktop:{gridSpan:9},tablet:{gridSpan:8},mobile:{gridSpan:12}}}),
    ]}),
  ]),
  footer('creator-catalog'),
],{engineBinding:'E2+E7'});

export const CREATOR_STATION_PRODUCT_PAGE=base('creator-station.product','product',[
  header('creator-product'),
  section('creator-product-main',[
    node({id:'creator-product-layout',componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'l',align:'start'},children:[
      node({id:'creator-product-gallery',componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[],aspectRatio:'1 / 1',thumbnailPosition:'bottom'},bindings:{images:{path:'product.gallery',fallback:[]}},responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}}}),
      node({id:'creator-product-buybox',componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},responsive:{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}},children:[
        node({id:'creator-product-info',componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:'Creator Station',title:'Eszköz',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF'},bindings:{title:{path:'product.name',fallback:'Eszköz'},price:{path:'pricing.displayPrice',fallback:''},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''},badges:{path:'product.badges',fallback:[]}}}),
        node({id:'creator-product-option',componentKey:'commerce.option-selector',componentVersion:1,config:{label:'Változat',options:[]},bindings:{label:{path:'variant.optionLabel',fallback:'Változat'},options:{path:'variant.optionOptions',fallback:[]}}}),
        node({id:'creator-product-key-specs',componentKey:'commerce.key-specs',componentVersion:1,config:{title:'Creator Specs',items:[],columns:2,missingLabel:'Nincs megadva'},bindings:{items:{path:'product.keySpecs',fallback:[]}}}),
        node({id:'creator-product-compare',componentKey:'commerce.compare-button',componentVersion:1,config:{label:'Összehasonlítás',href:'#compare',count:0,disabled:false},bindings:{href:{path:'commerce.compareHref',fallback:'#compare'},count:{path:'commerce.compareCount',fallback:0}}}),
        node({id:'creator-product-cta',componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},bindings:{label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},href:{path:'commerce.purchaseHref',fallback:'#purchase'}}}),
      ]}),
    ]}),
  ]),
  section('creator-product-specs',[
    node({id:'creator-product-spec-groups',componentKey:'commerce.specification-groups',componentVersion:1,config:{title:'System & I/O Specifications',groups:[],missingLabel:'Nincs megadva'},bindings:{groups:{path:'product.specGroups',fallback:[]}}}),
  ]),
  section('creator-product-compatibility',[
    node({id:'creator-product-compatibility-evidence',componentKey:'compatibility.evidence',componentVersion:1,config:{title:'Kompatibilitás az aktív workflow-val',items:[],emptyLabel:'Nincs elég adat a kompatibilitás megállapításához.'},bindings:{items:{path:'compatibility.productEvidence',fallback:[]}}}),
  ]),
  section('creator-product-recommendations',[
    node({id:'creator-product-recommendations-block',componentKey:'commerce.recommendation-row',componentVersion:1,config:{title:'A workflow-hoz kapcsolódó eszközök',products:[],columns:4,emptyLabel:'Nincs kapcsolódó ajánlat.',currency:'HUF'},bindings:{products:{path:'recommendations.products',fallback:[]}}}),
  ]),
  footer('creator-product'),
],{engineBinding:'E6+E7'});

export const CREATOR_STATION_SEARCH_PAGE=base('creator-station.search','search',[
  header('creator-search'),
  section('creator-search-finder',[
    node({id:'creator-search-guided-results',componentKey:'guided.results',componentVersion:1,config:{eyebrow:'Workflow match',title:'Találatok',explanation:'',status:'',items:[],emptyLabel:'Nincs találat.'},bindings:{explanation:{path:'finder.explanation',fallback:''},status:{path:'finder.status',fallback:''},items:{path:'finder.items',fallback:[]}}}),
  ]),
  section('creator-search-products',[productGrid('creatorSearchGrid','Keresési találatok','search.results',4)]),
  footer('creator-search'),
],{engineBinding:'E2+E3'});

export const CREATOR_STATION_CART_PAGE=base('creator-station.cart','cart',[
  header('creator-cart'),
  section('creator-cart-configuration',[
    node({id:'creator-cart-config-summary',componentKey:'configurator.summary',componentVersion:1,config:{title:'Creator setup',configurationId:'',items:[],subtotal:'',currency:'HUF',editLabel:'Setup szerkesztése',editHref:'#',revalidationLabel:'Ár, készlet, csatorna és kompatibilitás a checkout előtt újraellenőrzésre kerül.'},bindings:{configurationId:{path:'configurator.cart.configurationId',fallback:''},items:{path:'configurator.cart.items',fallback:[]},subtotal:{path:'configurator.cart.subtotal',fallback:''},currency:{path:'configurator.cart.currency',fallback:'HUF'},editHref:{path:'configurator.cart.editHref',fallback:'#'}}}),
  ]),
  section('creator-cart-summary',[
    node({id:'creator-cart-commerce-summary',componentKey:'commerce.cart-summary',componentVersion:1,config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad üres.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},total:{path:'cart.total',fallback:''}}}),
  ]),
  footer('creator-cart'),
],{engineBinding:'E5+E6'});

export const CREATOR_STATION_CHECKOUT_PAGE=base('creator-station.checkout','checkout',[
  header('creator-checkout'),
  section('creator-checkout-summary',[
    node({id:'creator-checkout-commerce-summary',componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos, provider-neutral checkout.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}}}),
  ]),
  footer('creator-checkout'),
],{engineBinding:'E13'});

export const CREATOR_STATION_ACCOUNT_PAGE=base('creator-station.account','account',[
  header('creator-account'),
  section('creator-account-summary',[
    node({id:'creator-account-config-summary',componentKey:'configurator.summary',componentVersion:1,config:{title:'Mentett setup',configurationId:'',items:[],subtotal:'',currency:'HUF',editLabel:'Setup megnyitása',editHref:'#',revalidationLabel:'A mentett setup nem garantálja a jelenlegi árat, készletet vagy kompatibilitást.'},bindings:{configurationId:{path:'configurator.account.configurationId',fallback:''},items:{path:'configurator.account.items',fallback:[]},subtotal:{path:'configurator.account.subtotal',fallback:''},currency:{path:'configurator.account.currency',fallback:'HUF'},editHref:{path:'configurator.account.editHref',fallback:'#'}}}),
  ]),
  footer('creator-account'),
],{engineBinding:'E5'});

export const CREATOR_STATION_CONTENT_PAGE=base('creator-station.content','content',[
  header('creator-content'),
  section('creator-content-finder',[
    node({id:'creator-content-finder-block',componentKey:'guided.finder',componentVersion:1,config:{eyebrow:'Workflow Finder',title:'Találd meg a setup irányát',copy:'A Finder workflow és cél szerint segít.',stepTitle:'1. lépés',stepCopy:'Válassz workflow-t.',question:'Milyen tartalmat készítesz?',options:[],progressLabel:'1 / 3',actionLabel:'Tovább',actionHref:'#creator-builder',resultStatus:''},bindings:{question:{path:'finder.currentQuestion.label',fallback:'Milyen tartalmat készítesz?'},options:{path:'finder.currentQuestion.options',fallback:[]},progressLabel:{path:'finder.progressLabel',fallback:'1 / 3'}}}),
  ]),
  section('creator-content-builder',[
    node({id:'creator-builder',componentKey:'configurator.builder',componentVersion:1,config:{eyebrow:'Setup Builder',title:'Építs működő creator setupot',copy:'Slot-alapú összeállítás valódi katalógustermékekből.',slots:[],selectedCount:0,requiredCount:0,subtotal:'',currency:'HUF',actionLabel:'Kompatibilitás ellenőrzése',actionHref:'#creator-content-compatibility',revalidationLabel:'A végleges kompatibilitás, ár, készlet és csatorna szerveroldali újraellenőrzést igényel.'},bindings:{slots:{path:'configurator.slots',fallback:[]},selectedCount:{path:'configurator.selectedCount',fallback:0},requiredCount:{path:'configurator.requiredCount',fallback:0},subtotal:{path:'configurator.currentSubtotal',fallback:''},currency:{path:'configurator.currency',fallback:'HUF'},actionHref:{path:'configurator.actionHref',fallback:'#creator-content-compatibility'}}}),
  ],'surface'),
  section('creator-content-compatibility',[
    node({id:'creator-content-compatibility-status',componentKey:'compatibility.status',componentVersion:1,config:{title:'Compatibility Checker',status:'unknown',compatibleLabel:'Kompatibilis',incompatibleLabel:'Nem kompatibilis',unknownLabel:'Ismeretlen',copy:'Az Ismeretlen állapot nem számít kompatibilisnek.'},bindings:{status:{path:'compatibility.status',fallback:'unknown'},copy:{path:'compatibility.summary',fallback:'Az Ismeretlen állapot nem számít kompatibilisnek.'}}}),
    node({id:'creator-content-compatibility-evidence',componentKey:'compatibility.evidence',componentVersion:1,config:{title:'Compatibility Evidence',items:[],emptyLabel:'Nincs elég bizonyíték.'},bindings:{items:{path:'compatibility.evidence',fallback:[]}}}),
  ]),
  footer('creator-content'),
],{contentRole:'creator-workflow-builder',engineBinding:'E3+E5+E6+E7'});

export const CREATOR_STATION_BLOG_INDEX_PAGE=simple('creator-station.blog-index','blog-index','Creator Magazine','Tutorialok, workflow-k, setup magyarázatok és alkotói technológiai történetek.');
export const CREATOR_STATION_BLOG_ARTICLE_PAGE=simple('creator-station.blog-article','blog-article','Creator Magazine','Strukturált szerkesztőségi tartalom E10 story authority-ből.');
export const CREATOR_STATION_FAQ_PAGE=simple('creator-station.faq','faq','GYIK','Workflow, kompatibilitás, setup és rendelési kérdések.');
export const CREATOR_STATION_CONTACT_PAGE=simple('creator-station.contact','contact','Kapcsolat','Creator setup és kereskedői kapcsolatfelvétel.');
export const CREATOR_STATION_LEGAL_PAGE=simple('creator-station.legal','legal','Jogi információk','A kereskedő jogi és adatkezelési tartalmának helye.');
export const CREATOR_STATION_NOT_FOUND_PAGE=simple('creator-station.not-found','not-found','404','A keresett oldal nem található.');

export const CREATOR_STATION_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  templateKey:CREATOR_STATION_TEMPLATE_KEY,
  templateVersion:CREATOR_STATION_TEMPLATE_VERSION,
  pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  minPlan:'alap',
  requiredFeatures:['catalog','inventory','orders','contentMarketing','productRecommendations','searchFiltering','commerceIntegrations'],
  pageTypes:['home','catalog','product','search','cart','checkout','account','content','blog-index','blog-article','faq','contact','legal','not-found'],
  responsive:{desktop:true,tablet:true,mobile:true},
  migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  demoContent:{namespace:'tech-creator-station',policy:STOREFRONT_DEMO_CONTENT_POLICY},
});

export const CREATOR_STATION_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  manifest:CREATOR_STATION_TEMPLATE_MANIFEST,
  pages:[
    CREATOR_STATION_HOME_PAGE,
    CREATOR_STATION_CATALOG_PAGE,
    CREATOR_STATION_PRODUCT_PAGE,
    CREATOR_STATION_SEARCH_PAGE,
    CREATOR_STATION_CART_PAGE,
    CREATOR_STATION_CHECKOUT_PAGE,
    CREATOR_STATION_ACCOUNT_PAGE,
    CREATOR_STATION_CONTENT_PAGE,
    CREATOR_STATION_BLOG_INDEX_PAGE,
    CREATOR_STATION_BLOG_ARTICLE_PAGE,
    CREATOR_STATION_FAQ_PAGE,
    CREATOR_STATION_CONTACT_PAGE,
    CREATOR_STATION_LEGAL_PAGE,
    CREATOR_STATION_NOT_FOUND_PAGE,
  ],
  demoFixtures:[
    {entityType:'collection',entityKey:'youtube-workflow',payload:{title:'YouTube',handle:'youtube-workflow',demo:true}},
    {entityType:'collection',entityKey:'podcast-workflow',payload:{title:'Podcast',handle:'podcast-workflow',demo:true}},
    {entityType:'product',entityKey:'creator-camera',payload:{name:'Creator Camera',slug:'creator-camera',kind:'camera',demo:true}},
    {entityType:'product',entityKey:'creator-audio-interface',payload:{name:'Creator Audio Interface',slug:'creator-audio-interface',kind:'audio-interface',demo:true}},
    {entityType:'content',entityKey:'signal-chain-guide',payload:{title:'Signal Chain Guide',kind:'creator-tutorial',demo:true}},
  ],
};
