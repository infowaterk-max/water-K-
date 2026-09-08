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

export const MONARCHE_TEMPLATE_KEY='fashion.monarche' as const;
export const MONARCHE_TEMPLATE_VERSION=1 as const;

export const MONARCHE_VISUAL_DNA=Object.freeze({
  character:'modern-editorial-luxury-commerce',
  palette:{
    background:'warm-off-white',
    text:'black-graphite',
    secondary:'soft-stone',
    accent:'merchant-replaceable',
  },
  typography:{
    display:'elegant-serif-display',
    interface:'clean-sans',
  },
  spacing:'generous-whitespace',
  imagery:'editorial-fashion-photography',
  chrome:'quiet-minimal-commerce',
} as const);

export const MONARCHE_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#f5f1eb',
  '--shoporation-color-surface':'#eee8e1',
  '--shoporation-color-surface-muted':'#e5ddd3',
  '--shoporation-color-text':'#171717',
  '--shoporation-color-muted-text':'#625e59',
  '--shoporation-color-border':'#d4cbc0',
  '--shoporation-color-primary':'#171717',
  '--shoporation-color-primary-contrast':'#fffdf9',
  '--shoporation-color-accent':'var(--merchant-accent, #8b7664)',
  '--shoporation-heading-font':'var(--merchant-heading-font, Georgia, serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, sans-serif)',
} as const);

export const MONARCHE_ENGINE_CONTRACT=Object.freeze({
  requiredForFullExperience:['E1','E2','E13'] as const,
  optional:['E7'] as const,
  wave1Integration:{
    E1:'runtime-implemented',
    E2:'product-discovery-binding-contract',
    E13:'checkout-binding-contract',
    E7:'optional-later-structured-product-info',
  },
} as const);

export const MONARCHE_HOME_SECTION_ORDER=[
  'Editorial Hero',
  'Collection Navigation',
  'New Arrivals',
  'Editorial Split Feature',
  'Product Story Grid',
  'Featured Collection',
  'Social Proof/Reviews',
  'Journal Preview',
  'Newsletter',
  'Footer',
] as const;

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;

const section=(id:string,children:StorefrontComponentNode[],input:{tone?:string;spacing?:string;width?:string}={}):StorefrontComponentNode=>node({
  id,
  componentKey:'layout.section',
  componentVersion:1,
  config:{tone:input.tone??'background',spacing:input.spacing??'xl',width:input.width??'full'},
  children:[node({
    id:`${id}-container`,
    componentKey:'layout.container',
    componentVersion:1,
    config:{width:'content',spacing:'m'},
    children,
  })],
});

const stack=(id:string,children:StorefrontComponentNode[],responsive?:StorefrontComponentNode['responsive']):StorefrontComponentNode=>node({
  id,
  componentKey:'layout.stack',
  componentVersion:1,
  config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},
  responsive,
  children,
});

const header=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-header`,
  componentKey:'system.header',
  componentVersion:1,
  config:{brandLabel:'Monarche',brandHref:'/',tone:'background',sticky:true},
  bindings:{
    brandLabel:{path:'brand.name',fallback:'Monarche'},
    brandHref:{path:'brand.homeHref',fallback:'/'},
  },
  children:[node({
    id:`${prefix}-navigation`,
    componentKey:'system.navigation',
    componentVersion:1,
    config:{ariaLabel:'Fő navigáció',items:[],layout:'horizontal'},
    bindings:{items:{path:'navigation.primary',fallback:[]}},
  })],
});

const footerFallback=[
  {id:'shop',title:'Shop',items:[{label:'Újdonságok',href:'/webaruhaz'},{label:'Kollekciók',href:'/webaruhaz'}]},
  {id:'service',title:'Információ',items:[{label:'Kapcsolat',href:'/kapcsolat'},{label:'GYIK',href:'/gyik'}]},
];

const footer=(prefix:string):StorefrontComponentNode=>node({
  id:`${prefix}-footer`,
  componentKey:'editorial.footer',
  componentVersion:1,
  config:{brandLabel:'Monarche',columns:footerFallback,copyright:'© Monarche',tone:'primary'},
  bindings:{
    brandLabel:{path:'brand.name',fallback:'Monarche'},
    columns:{path:'navigation.footer',fallback:footerFallback},
    copyright:{path:'brand.copyright',fallback:'© Monarche'},
  },
});

const basePage=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey,
  pageType,
  templateKey:MONARCHE_TEMPLATE_KEY,
  templateVersion:MONARCHE_TEMPLATE_VERSION,
  metadata:{
    goldenTemplate:'Golden #1',
    visualDNA:MONARCHE_VISUAL_DNA.character,
    ...metadata,
  },
  sections,
});

const productGrid=(id:string,title:string,bindingPath:string,presentation='standard',columns=4):StorefrontComponentNode=>node({
  id,
  componentKey:'commerce.product-grid',
  componentVersion:1,
  config:{title,products:[],columns,presentation,showBadges:true,showCompareAt:true,imageRatio:'4 / 5',emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF'},
  bindings:{
    title:{path:`content.${id}.title`,fallback:title},
    products:{path:bindingPath,fallback:[]},
  },
});

const recommendationRow=(id:string,title:string,bindingPath:string):StorefrontComponentNode=>node({
  id,
  componentKey:'commerce.recommendation-row',
  componentVersion:1,
  config:{title,products:[],columns:4,emptyLabel:'Jelenleg nincs kapcsolódó ajánlat.',currency:'HUF'},
  bindings:{
    title:{path:`content.${id}.title`,fallback:title},
    products:{path:bindingPath,fallback:[]},
  },
});

export const MONARCHE_HOME_PAGE=basePage('monarche.home','home',[
  header('monarche-home'),
  node({
    id:'monarche-hero',
    componentKey:'editorial.hero',
    componentVersion:1,
    config:{
      eyebrow:'Új szezon',
      title:'Csendes luxus. Határozott jelenlét.',
      copy:'Szerkesztett darabok, tiszta arányok és időtálló anyagok egy modern ruhatárhoz.',
      image:'/storefront-demo/monarche/hero.svg',
      imageAlt:'Monarche editorial kampány',
      primaryLabel:'Újdonságok',
      primaryHref:'/webaruhaz',
      secondaryLabel:'Kollekciók',
      secondaryHref:'/webaruhaz',
      imagePosition:'right',
      height:'editorial',
    },
    bindings:{
      eyebrow:{path:'content.monarcheHero.eyebrow',fallback:'Új szezon'},
      title:{path:'content.monarcheHero.title',fallback:'Csendes luxus. Határozott jelenlét.'},
      copy:{path:'content.monarcheHero.copy',fallback:'Szerkesztett darabok, tiszta arányok és időtálló anyagok egy modern ruhatárhoz.'},
      image:{path:'content.monarcheHero.image',fallback:'/storefront-demo/monarche/hero.svg'},
      imageAlt:{path:'content.monarcheHero.imageAlt',fallback:'Monarche editorial kampány'},
      primaryLabel:{path:'content.monarcheHero.primaryLabel',fallback:'Újdonságok'},
      primaryHref:{path:'content.monarcheHero.primaryHref',fallback:'/webaruhaz'},
      secondaryLabel:{path:'content.monarcheHero.secondaryLabel',fallback:'Kollekciók'},
      secondaryHref:{path:'content.monarcheHero.secondaryHref',fallback:'/webaruhaz'},
    },
  }),
  section('monarche-collection-navigation',[
    node({
      id:'monarche-collection-navigation-block',
      componentKey:'commerce.collection-navigation',
      componentVersion:1,
      config:{title:'Shop by edit',items:[],columns:4,imageRatio:'4 / 5',tone:'background'},
      bindings:{
        title:{path:'content.collectionNavigation.title',fallback:'Shop by edit'},
        items:{path:'collection.navigation',fallback:[]},
      },
    }),
  ],{spacing:'l'}),
  section('monarche-new-arrivals',[
    productGrid('newArrivals','Újdonságok','catalog.newArrivals','standard',4),
  ]),
  node({
    id:'monarche-editorial-split',
    componentKey:'editorial.split-feature',
    componentVersion:1,
    config:{
      eyebrow:'The Edit',
      title:'Formák, amelyek együtt élnek veled.',
      copy:'A Monarche a letisztult szabásokat puha textúrákkal és visszafogott részletekkel párosítja.',
      image:'/storefront-demo/monarche/edit.svg',
      imageAlt:'Monarche szerkesztett összeállítás',
      ctaLabel:'Fedezd fel a történetet',
      ctaHref:'/journal',
      imagePosition:'left',
      tone:'surface',
    },
    bindings:{
      eyebrow:{path:'content.monarcheEdit.eyebrow',fallback:'The Edit'},
      title:{path:'content.monarcheEdit.title',fallback:'Formák, amelyek együtt élnek veled.'},
      copy:{path:'content.monarcheEdit.copy',fallback:'A Monarche a letisztult szabásokat puha textúrákkal és visszafogott részletekkel párosítja.'},
      image:{path:'content.monarcheEdit.image',fallback:'/storefront-demo/monarche/edit.svg'},
      imageAlt:{path:'content.monarcheEdit.imageAlt',fallback:'Monarche szerkesztett összeállítás'},
      ctaLabel:{path:'content.monarcheEdit.ctaLabel',fallback:'Fedezd fel a történetet'},
      ctaHref:{path:'content.monarcheEdit.ctaHref',fallback:'/journal'},
    },
  }),
  section('monarche-product-story',[
    productGrid('productStory','Wear it your way','catalog.productStory','story',3),
  ],{tone:'surface'}),
  section('monarche-featured-collection',[
    node({
      id:'monarche-featured-collection-header',
      componentKey:'commerce.collection-header',
      componentVersion:1,
      config:{eyebrow:'Featured collection',title:'The Essential Line',description:'Öltözékek, amelyek nem egy szezonra készültek.',image:'',imageAlt:'',align:'left'},
      bindings:{
        eyebrow:{path:'collection.featured.eyebrow',fallback:'Featured collection'},
        title:{path:'collection.featured.title',fallback:'The Essential Line'},
        description:{path:'collection.featured.description',fallback:'Öltözékek, amelyek nem egy szezonra készültek.'},
        image:{path:'collection.featured.image',fallback:''},
        imageAlt:{path:'collection.featured.imageAlt',fallback:''},
      },
    }),
    productGrid('featuredCollection','Válogatás','catalog.featured','standard',4),
  ]),
  section('monarche-reviews',[
    node({
      id:'monarche-review-summary',
      componentKey:'commerce.review-summary',
      componentVersion:1,
      config:{rating:4.9,count:0,label:'Vásárlóink visszajelzései'},
      bindings:{
        rating:{path:'reviews.summary.rating',fallback:4.9},
        count:{path:'reviews.summary.count',fallback:0},
        label:{path:'reviews.summary.label',fallback:'Vásárlóink visszajelzései'},
      },
    }),
  ],{tone:'surface',spacing:'l'}),
  section('monarche-journal',[
    node({
      id:'monarche-journal-preview',
      componentKey:'editorial.journal-preview',
      componentVersion:1,
      config:{title:'Journal',items:[],columns:3,emptyLabel:'A journal hamarosan új történetekkel jelentkezik.'},
      bindings:{
        title:{path:'content.journal.title',fallback:'Journal'},
        items:{path:'content.journal.items',fallback:[]},
      },
    }),
  ]),
  node({
    id:'monarche-newsletter',
    componentKey:'marketing.newsletter-signup',
    componentVersion:1,
    config:{
      eyebrow:'Monarche Notes',
      title:'Új történetek, új darabok.',
      copy:'Iratkozz fel a szerkesztett újdonságokra és kollekciós történetekre.',
      actionHref:'/hirlevel',
      inputLabel:'E-mail-cím',
      buttonLabel:'Feliratkozom',
      consentLabel:'A feliratkozással elfogadod az adatkezelési tájékoztatót.',
      tone:'primary',
    },
    bindings:{
      eyebrow:{path:'content.newsletter.eyebrow',fallback:'Monarche Notes'},
      title:{path:'content.newsletter.title',fallback:'Új történetek, új darabok.'},
      copy:{path:'content.newsletter.copy',fallback:'Iratkozz fel a szerkesztett újdonságokra és kollekciós történetekre.'},
      actionHref:{path:'content.newsletter.actionHref',fallback:'/hirlevel'},
      inputLabel:{path:'content.newsletter.inputLabel',fallback:'E-mail-cím'},
      buttonLabel:{path:'content.newsletter.buttonLabel',fallback:'Feliratkozom'},
      consentLabel:{path:'content.newsletter.consentLabel',fallback:'A feliratkozással elfogadod az adatkezelési tájékoztatót.'},
    },
  }),
  footer('monarche-home'),
],{
  sectionOrder:MONARCHE_HOME_SECTION_ORDER,
  visualPreset:'editorial-fashion-home',
});

export const MONARCHE_CATALOG_PAGE=basePage('monarche.catalog','catalog',[
  header('monarche-catalog'),
  section('monarche-catalog-hero',[
    node({
      id:'monarche-catalog-collection-header',
      componentKey:'commerce.collection-header',
      componentVersion:1,
      config:{eyebrow:'Collection',title:'Összes termék',description:'A teljes Monarche válogatás.',image:'',imageAlt:'',align:'left'},
      bindings:{
        eyebrow:{path:'collection.current.eyebrow',fallback:'Collection'},
        title:{path:'collection.current.title',fallback:'Összes termék'},
        description:{path:'collection.current.description',fallback:'A teljes Monarche válogatás.'},
        image:{path:'collection.current.image',fallback:''},
        imageAlt:{path:'collection.current.imageAlt',fallback:''},
      },
    }),
  ],{spacing:'l'}),
  section('monarche-catalog-products',[productGrid('catalogGrid','Válogatás','catalog.products','standard',4)],{spacing:'l'}),
  footer('monarche-catalog'),
],{visualPreset:'fashion-collection'});

export const MONARCHE_PRODUCT_PAGE=basePage('monarche.product','product',[
  header('monarche-product'),
  section('monarche-product-main',[
    node({
      id:'monarche-product-grid',
      componentKey:'layout.grid',
      componentVersion:1,
      config:{columns:12,gap:'l',align:'start'},
      children:[
        node({
          id:'monarche-product-gallery',
          componentKey:'commerce.product-gallery',
          componentVersion:1,
          config:{images:[],aspectRatio:'4 / 5',thumbnailPosition:'bottom'},
          bindings:{images:{path:'product.gallery',fallback:[]}},
          responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}},
        }),
        stack('monarche-product-buybox',[
          node({
            id:'monarche-product-info',
            componentKey:'commerce.product-info',
            componentVersion:1,
            config:{eyebrow:'Monarche',title:'Termék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF'},
            bindings:{
              eyebrow:{path:'product.eyebrow',fallback:'Monarche'},
              title:{path:'product.name',fallback:'Termék'},
              price:{path:'pricing.displayPrice',fallback:''},
              compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},
              description:{path:'product.description',fallback:''},
              stockLabel:{path:'inventory.stockLabel',fallback:''},
              badges:{path:'product.badges',fallback:[]},
            },
          }),
          node({
            id:'monarche-product-color',
            componentKey:'commerce.variant-swatches',
            componentVersion:1,
            config:{label:'Szín',options:[]},
            bindings:{
              label:{path:'variant.colorLabel',fallback:'Szín'},
              options:{path:'variant.colorOptions',fallback:[]},
            },
          }),
          node({
            id:'monarche-product-size',
            componentKey:'commerce.size-selector',
            componentVersion:1,
            config:{label:'Méret',options:[]},
            bindings:{
              label:{path:'variant.sizeLabel',fallback:'Méret'},
              options:{path:'variant.sizeOptions',fallback:[]},
            },
          }),
          node({
            id:'monarche-product-cta',
            componentKey:'content.button',
            componentVersion:1,
            config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},
            bindings:{
              label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},
              href:{path:'commerce.purchaseHref',fallback:'#purchase'},
            },
          }),
          node({
            id:'monarche-product-review-summary',
            componentKey:'commerce.review-summary',
            componentVersion:1,
            config:{rating:0,count:0,label:'Értékelések'},
            bindings:{
              rating:{path:'reviews.summary.rating',fallback:0},
              count:{path:'reviews.summary.count',fallback:0},
              label:{path:'reviews.summary.label',fallback:'Értékelések'},
            },
          }),
        ],{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}}),
      ],
    }),
  ]),
  section('monarche-product-recommendations',[recommendationRow('productRecommendations','Ezek is tetszhetnek','recommendations.products')]),
  footer('monarche-product'),
],{
  visualPreset:'product-gallery-buybox',
  variantContract:'attribute-based-generic',
  soldOutVariantBehavior:'visible-disabled',
});

export const MONARCHE_SEARCH_PAGE=basePage('monarche.search','search',[
  header('monarche-search'),
  section('monarche-search-heading',[
    node({id:'monarche-search-title',componentKey:'content.heading',componentVersion:1,config:{text:'Keresési eredmények',level:1,align:'left',tone:'text'},bindings:{text:{path:'search.title',fallback:'Keresési eredmények'}}}),
    node({id:'monarche-search-copy',componentKey:'content.text',componentVersion:1,config:{text:'',as:'p',align:'left',tone:'muted'},bindings:{text:{path:'search.summary',fallback:''}}}),
  ],{spacing:'l'}),
  section('monarche-search-results',[productGrid('searchResults','Találatok','search.results','standard',4)],{spacing:'l'}),
  footer('monarche-search'),
],{visualPreset:'product-discovery-results',engineBinding:'E2'});

export const MONARCHE_CART_PAGE=basePage('monarche.cart','cart',[
  header('monarche-cart'),
  section('monarche-cart-summary',[
    node({
      id:'monarche-cart-summary-block',
      componentKey:'commerce.cart-summary',
      componentVersion:1,
      config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad jelenleg üres.'},
      bindings:{
        lines:{path:'cart.lines',fallback:[]},
        subtotal:{path:'cart.subtotal',fallback:''},
        total:{path:'cart.total',fallback:''},
      },
    }),
  ]),
  section('monarche-cart-recommendations',[recommendationRow('cartRecommendations','Még hozzáadhatod','recommendations.cart')],{tone:'surface'}),
  footer('monarche-cart'),
],{visualPreset:'minimal-cart'});

export const MONARCHE_CHECKOUT_PAGE=basePage('monarche.checkout','checkout',[
  header('monarche-checkout'),
  section('monarche-checkout-intro',[
    node({id:'monarche-checkout-title',componentKey:'content.heading',componentVersion:1,config:{text:'Pénztár',level:1,align:'left',tone:'text'}}),
    node({
      id:'monarche-checkout-summary-block',
      componentKey:'commerce.checkout-summary',
      componentVersion:1,
      config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos rendelés · a fizetési és szállítási folyamat a közös checkout engine feladata.'},
      bindings:{
        lines:{path:'cart.lines',fallback:[]},
        subtotal:{path:'cart.subtotal',fallback:''},
        shipping:{path:'cart.shipping',fallback:''},
        total:{path:'cart.total',fallback:''},
      },
    }),
  ]),
  footer('monarche-checkout'),
],{visualPreset:'minimal-luxe-checkout',engineBinding:'E13'});

const simpleContentPage=(input:{
  pageKey:string;
  pageType:StorefrontBuilderPageType;
  title:string;
  titleBinding:string;
  copy:string;
  copyBinding:string;
  visualPreset:string;
})=>basePage(input.pageKey,input.pageType,[
  header(input.pageKey.replace('.','-')),
  section(`${input.pageKey.replace('.','-')}-content`,[
    node({id:`${input.pageKey}-title`,componentKey:'content.heading',componentVersion:1,config:{text:input.title,level:1,align:'left',tone:'text'},bindings:{text:{path:input.titleBinding,fallback:input.title}}}),
    node({id:`${input.pageKey}-copy`,componentKey:'content.text',componentVersion:1,config:{text:input.copy,as:'p',align:'left',tone:'text'},bindings:{text:{path:input.copyBinding,fallback:input.copy}}}),
  ]),
  footer(input.pageKey.replace('.','-')),
],{visualPreset:input.visualPreset});

export const MONARCHE_ACCOUNT_PAGE=simpleContentPage({
  pageKey:'monarche.account',
  pageType:'account',
  title:'Fiókom',
  titleBinding:'content.account.title',
  copy:'Rendelések, profiladatok és vásárlói beállítások.',
  copyBinding:'content.account.copy',
  visualPreset:'quiet-account',
});

export const MONARCHE_CONTENT_PAGE=simpleContentPage({
  pageKey:'monarche.content',
  pageType:'content',
  title:'Történet',
  titleBinding:'content.page.title',
  copy:'Szerkesztett márkatörténet és tartalom.',
  copyBinding:'content.page.excerpt',
  visualPreset:'editorial-content',
});

export const MONARCHE_BLOG_INDEX_PAGE=basePage('monarche.blog-index','blog-index',[
  header('monarche-blog-index'),
  section('monarche-blog-index-content',[
    node({
      id:'monarche-blog-index-journal',
      componentKey:'editorial.journal-preview',
      componentVersion:1,
      config:{title:'Journal',items:[],columns:3,emptyLabel:'A journal hamarosan új történetekkel jelentkezik.'},
      bindings:{
        title:{path:'content.blog.title',fallback:'Journal'},
        items:{path:'content.blog.posts',fallback:[]},
      },
    }),
  ]),
  footer('monarche-blog-index'),
],{visualPreset:'editorial-journal-index'});

export const MONARCHE_BLOG_ARTICLE_PAGE=basePage('monarche.blog-article','blog-article',[
  header('monarche-blog-article'),
  node({
    id:'monarche-article-hero',
    componentKey:'editorial.hero',
    componentVersion:1,
    config:{eyebrow:'Journal',title:'Történet',copy:'',image:'',imageAlt:'',primaryLabel:'',primaryHref:'#',secondaryLabel:'',secondaryHref:'#',imagePosition:'right',height:'article'},
    bindings:{
      eyebrow:{path:'content.article.eyebrow',fallback:'Journal'},
      title:{path:'content.article.title',fallback:'Történet'},
      copy:{path:'content.article.excerpt',fallback:''},
      image:{path:'content.article.image',fallback:''},
      imageAlt:{path:'content.article.imageAlt',fallback:''},
    },
  }),
  section('monarche-article-body',[
    node({id:'monarche-article-body-copy',componentKey:'content.text',componentVersion:1,config:{text:'',as:'p',align:'left',tone:'text'},bindings:{text:{path:'content.article.bodyExcerpt',fallback:''}}}),
  ],{width:'full'}),
  footer('monarche-blog-article'),
],{visualPreset:'editorial-journal-article'});

export const MONARCHE_FAQ_PAGE=simpleContentPage({
  pageKey:'monarche.faq',
  pageType:'faq',
  title:'Gyakori kérdések',
  titleBinding:'content.faq.title',
  copy:'Válaszok a rendelésről, szállításról, visszaküldésről és termékekről.',
  copyBinding:'content.faq.intro',
  visualPreset:'service-content',
});

export const MONARCHE_CONTACT_PAGE=simpleContentPage({
  pageKey:'monarche.contact',
  pageType:'contact',
  title:'Kapcsolat',
  titleBinding:'content.contact.title',
  copy:'Írj nekünk, ha segítségre van szükséged.',
  copyBinding:'content.contact.intro',
  visualPreset:'service-content',
});

export const MONARCHE_LEGAL_PAGE=simpleContentPage({
  pageKey:'monarche.legal',
  pageType:'legal',
  title:'Jogi információk',
  titleBinding:'content.legal.title',
  copy:'A kereskedő által kezelt jogi és adatkezelési tartalom helye.',
  copyBinding:'content.legal.intro',
  visualPreset:'legal-content',
});

export const MONARCHE_NOT_FOUND_PAGE=basePage('monarche.not-found','not-found',[
  header('monarche-not-found'),
  section('monarche-not-found-content',[
    node({id:'monarche-not-found-title',componentKey:'content.heading',componentVersion:1,config:{text:'404',level:1,align:'center',tone:'text'}}),
    node({id:'monarche-not-found-copy',componentKey:'content.text',componentVersion:1,config:{text:'Ez az oldal már nem található.',as:'p',align:'center',tone:'muted'}}),
    node({id:'monarche-not-found-cta',componentKey:'content.button',componentVersion:1,config:{label:'Vissza a főoldalra',href:'/',variant:'secondary',size:'m',ariaLabel:'Vissza a főoldalra'}}),
  ]),
  footer('monarche-not-found'),
],{visualPreset:'minimal-not-found'});

export const MONARCHE_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  templateKey:MONARCHE_TEMPLATE_KEY,
  templateVersion:MONARCHE_TEMPLATE_VERSION,
  pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  minPlan:'alap',
  requiredFeatures:[
    'catalog',
    'inventory',
    'orders',
    'contentMarketing',
    'marketingBasics',
    'productRecommendations',
    'reviews',
    'searchFiltering',
    'commerceIntegrations',
  ],
  pageTypes:[
    'home','catalog','product','search','cart','checkout','account','content',
    'blog-index','blog-article','faq','contact','legal','not-found',
  ],
  responsive:{desktop:true,tablet:true,mobile:true},
  migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  demoContent:{namespace:'fashion-monarche',policy:STOREFRONT_DEMO_CONTENT_POLICY},
});

export const MONARCHE_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  manifest:MONARCHE_TEMPLATE_MANIFEST,
  pages:[
    MONARCHE_HOME_PAGE,
    MONARCHE_CATALOG_PAGE,
    MONARCHE_PRODUCT_PAGE,
    MONARCHE_SEARCH_PAGE,
    MONARCHE_CART_PAGE,
    MONARCHE_CHECKOUT_PAGE,
    MONARCHE_ACCOUNT_PAGE,
    MONARCHE_CONTENT_PAGE,
    MONARCHE_BLOG_INDEX_PAGE,
    MONARCHE_BLOG_ARTICLE_PAGE,
    MONARCHE_FAQ_PAGE,
    MONARCHE_CONTACT_PAGE,
    MONARCHE_LEGAL_PAGE,
    MONARCHE_NOT_FOUND_PAGE,
  ],
  demoFixtures:[
    {entityType:'collection',entityKey:'new-arrivals',payload:{title:'New Arrivals',handle:'new-arrivals',demo:true}},
    {entityType:'collection',entityKey:'essential-line',payload:{title:'The Essential Line',handle:'essential-line',demo:true}},
    {entityType:'product',entityKey:'wool-coat',payload:{name:'Sculpted Wool Coat',slug:'sculpted-wool-coat',priceLabel:'89 900 Ft',demo:true}},
    {entityType:'product',entityKey:'silk-dress',payload:{name:'Silk Column Dress',slug:'silk-column-dress',priceLabel:'69 900 Ft',demo:true}},
    {entityType:'product',entityKey:'tailored-trouser',payload:{name:'Tailored Wide Trouser',slug:'tailored-wide-trouser',priceLabel:'49 900 Ft',demo:true}},
    {entityType:'content',entityKey:'journal-intro',payload:{title:'The Quiet Edit',kind:'journal',demo:true}},
  ],
};
