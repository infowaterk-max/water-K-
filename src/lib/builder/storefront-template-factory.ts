import {
  STOREFRONT_BUILDER_FOUNDATION_VERSION,
  STOREFRONT_DEMO_CONTENT_POLICY,
  STOREFRONT_PAGE_SCHEMA_VERSION,
  STOREFRONT_PAGE_TYPES,
  STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  defineStorefrontTemplateManifest,
  type StorefrontBuilderPageType,
} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontDemoFixture,StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {materializeStorefrontTemplateResponsiveStyles} from '@/lib/builder/storefront-responsive-isolation';
import type {FeatureCode,PlanCode} from '@/lib/plans/catalog';

export const STOREFRONT_TEMPLATE_FACTORY_VERSION='shoporation.template-factory.v1' as const;

export type StorefrontFactoryMediaAsset={
  id:string;
  role:'hero'|'category'|'product'|'editorial'|'background'|'decorative';
  src:string;
  alt:string;
};

export type StorefrontFactoryReferenceContract={
  referenceKey:string;
  requiredMediaRoles:readonly StorefrontFactoryMediaAsset['role'][];
  minimumRepresentativeMedia:number;
  forbidPlaceholderSvg:boolean;
};

export type StorefrontFactoryCategoryRecipe={
  key:string;
  catalogColumns:3|4;
  productImageRatio:'1 / 1'|'4 / 5'|'16 / 10';
  pdpGallerySpan:6|7;
  productPresentation:string;
  editorialTone:'background'|'surface'|'primary';
};

export type StorefrontFactoryTemplateDNA={
  character:string;
  tokens:{
    background:string;surface:string;surfaceMuted:string;text:string;mutedText:string;border:string;
    primary:string;primaryContrast:string;accent:string;accentSecondary:string;accentTertiary?:string;
    headingFont:string;bodyFont:string;spacingScale:'compact'|'comfortable'|'spacious';radiusScale:'sharp'|'soft'|'rounded';
  };
};

export type StorefrontFactoryDefinition={
  templateKey:string;
  templateVersion:number;
  displayName:string;
  demoNamespace:string;
  minPlan:PlanCode;
  requiredFeatures:readonly FeatureCode[];
  category:StorefrontFactoryCategoryRecipe;
  dna:StorefrontFactoryTemplateDNA;
  reference:StorefrontFactoryReferenceContract;
  media:readonly StorefrontFactoryMediaAsset[];
  copy:{
    tagline:string;
    heroEyebrow:string;heroTitle:string;heroCopy:string;heroCta:string;
    catalogTitle:string;catalogCopy:string;
    productEyebrow:string;
    editorialEyebrow:string;editorialTitle:string;editorialCopy:string;editorialCta:string;
  };
  navigation:{
    primary:readonly {label:string;href:string}[];
    footer:readonly {id:string;title:string;items:readonly {label:string;href:string}[]}[];
  };
  demoFixtures?:readonly StorefrontDemoFixture[];
};

export type StorefrontFactoryReadiness={
  technicalScaffoldComplete:boolean;
  referenceContractComplete:boolean;
  representativeMediaComplete:boolean;
  productOwnerReady:boolean;
  reasons:readonly string[];
};

const node=(value:StorefrontComponentNode):StorefrontComponentNode=>value;
const mediaByRole=(definition:StorefrontFactoryDefinition,role:StorefrontFactoryMediaAsset['role'])=>definition.media.filter(item=>item.role===role);
const firstMedia=(definition:StorefrontFactoryDefinition,role:StorefrontFactoryMediaAsset['role'])=>mediaByRole(definition,role)[0]??null;
const pagePrefix=(definition:StorefrontFactoryDefinition,type:StorefrontBuilderPageType)=>`${definition.templateKey.replaceAll('.','-')}-${type}`;

function header(definition:StorefrontFactoryDefinition):StorefrontComponentNode{
  return node({
    id:`${definition.templateKey.replaceAll('.','-')}-global-header`,
    componentKey:'system.commerce-header',componentVersion:1,
    config:{
      brandLabel:definition.displayName,brandHref:'/',tagline:definition.copy.tagline,
      utilityItems:[
        {label:'Kedvenceim',href:'/kedvencek',symbol:'♡'},
        {label:'Fiókom',href:'/fiokom',symbol:'♙'},
        {label:'Kosár',href:'/kosar',symbol:'⌑'},
      ],
      tone:'primary',sticky:true,presentation:'commerce-two-tier',showUtilityLabels:true,
      categoryTriggerLabel:'Kategóriák',categoryTriggerSymbol:'☰',categoryTriggerHref:'/webaruhaz',
    },
    bindings:{brandLabel:{path:'brand.name',fallback:definition.displayName},brandHref:{path:'brand.homeHref',fallback:'/'}},
    children:[
      node({id:`${definition.templateKey.replaceAll('.','-')}-global-search`,componentKey:'system.search',componentVersion:1,config:{action:'/kereses',queryParam:'q',placeholder:'Keresés termékre, kategóriára…',buttonLabel:'⌕',ariaLabel:'Keresés',presentation:'commerce'}}),
      node({id:`${definition.templateKey.replaceAll('.','-')}-global-navigation`,componentKey:'system.navigation',componentVersion:1,config:{ariaLabel:'Fő navigáció',items:definition.navigation.primary,layout:'horizontal'},bindings:{items:{path:'navigation.primary',fallback:definition.navigation.primary}}}),
    ],
  });
}

function footer(definition:StorefrontFactoryDefinition):StorefrontComponentNode{
  return node({
    id:`${definition.templateKey.replaceAll('.','-')}-global-footer`,
    componentKey:'layout.section',componentVersion:1,
    config:{tone:'primary',spacing:'none',width:'full',presentation:'flush'},
    children:[node({
      id:`${definition.templateKey.replaceAll('.','-')}-global-footer-content`,
      componentKey:'editorial.footer',componentVersion:1,
      config:{brandLabel:definition.displayName,columns:definition.navigation.footer,copyright:`© ${definition.displayName}`,tone:'primary'},
      bindings:{
        brandLabel:{path:'brand.name',fallback:definition.displayName},
        columns:{path:'navigation.footer',fallback:definition.navigation.footer},
        copyright:{path:'brand.copyright',fallback:`© ${definition.displayName}`},
      },
    })],
  });
}

function section(id:string,children:StorefrontComponentNode[],tone='background'):StorefrontComponentNode{
  return node({id,componentKey:'layout.section',componentVersion:1,config:{tone,spacing:'xl',width:'full'},children:[
    node({id:`${id}-container`,componentKey:'layout.container',componentVersion:1,config:{width:'content',spacing:'m'},children}),
  ]});
}

function heading(id:string,text:string,level=2):StorefrontComponentNode{
  return node({id,componentKey:'content.heading',componentVersion:1,config:{text,level,align:'left',tone:'text'}});
}
function text(id:string,value:string,bindingPath?:string):StorefrontComponentNode{
  return node({id,componentKey:'content.text',componentVersion:1,config:{text:value,as:'p',align:'left',tone:'muted',whiteSpace:'pre-line'},...(bindingPath?{bindings:{text:{path:bindingPath,fallback:value}}}:{})});
}
function productGrid(id:string,title:string,path:string,definition:StorefrontFactoryDefinition):StorefrontComponentNode{
  return node({
    id,componentKey:'commerce.product-grid',componentVersion:1,
    config:{title,products:[],columns:definition.category.catalogColumns,presentation:definition.category.productPresentation,showBadges:true,showCompareAt:true,showCta:true,ctaLabel:'Megnézem',imageRatio:definition.category.productImageRatio,emptyLabel:'Jelenleg nincs megjeleníthető termék.',currency:'HUF'},
    bindings:{title:{path:`content.${id}.title`,fallback:title},products:{path,fallback:[]}},
  });
}

function page(definition:StorefrontFactoryDefinition,type:StorefrontBuilderPageType,body:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument{
  return{
    schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
    pageKey:`${definition.templateKey}.${type}`,
    pageType:type,
    templateKey:definition.templateKey,
    templateVersion:definition.templateVersion,
    metadata:{
      templateFactoryVersion:STOREFRONT_TEMPLATE_FACTORY_VERSION,
      templateCategory:definition.category.key,
      visualDNA:definition.dna.character,
      referenceKey:definition.reference.referenceKey,
      shoporationGlobalStyles:{version:'shoporation.storefront-global-styles.v1',tokens:definition.dna.tokens},
      ...metadata,
    },
    sections:[header(definition),...body,footer(definition)],
  };
}

function simplePage(definition:StorefrontFactoryDefinition,type:StorefrontBuilderPageType,titleValue:string,copy:string,bindings?:{title?:string;body?:string}){
  const p=pagePrefix(definition,type);
  const children=[heading(`${p}-title`,titleValue,1),text(`${p}-copy`,copy,bindings?.body)];
  if(bindings?.title)children[0]={...children[0],bindings:{text:{path:bindings.title,fallback:titleValue}}};
  return page(definition,type,[section(`${p}-body`,children)]);
}

export function evaluateStorefrontFactoryReadiness(definition:StorefrontFactoryDefinition):StorefrontFactoryReadiness{
  const reasons:string[]=[];
  const roles=new Set(definition.media.map(item=>item.role));
  for(const role of definition.reference.requiredMediaRoles)if(!roles.has(role))reasons.push(`missing-media-role:${role}`);
  if(definition.media.length<definition.reference.minimumRepresentativeMedia)reasons.push('representative-media-count');
  if(definition.reference.forbidPlaceholderSvg&&definition.media.some(item=>/placeholder|wireframe|geometric/i.test(item.id)||/placeholder/i.test(item.src)))reasons.push('placeholder-media');
  if(!definition.reference.referenceKey.trim())reasons.push('reference-key');
  const technicalScaffoldComplete=STOREFRONT_PAGE_TYPES.length===14;
  const referenceContractComplete=Boolean(definition.reference.referenceKey&&definition.reference.requiredMediaRoles.length);
  const representativeMediaComplete=!reasons.some(item=>item.startsWith('missing-media-role:')||item==='representative-media-count'||item==='placeholder-media');
  return{
    technicalScaffoldComplete,
    referenceContractComplete,
    representativeMediaComplete,
    productOwnerReady:technicalScaffoldComplete&&referenceContractComplete&&representativeMediaComplete,
    reasons:Object.freeze(reasons),
  };
}

export function buildStorefrontTemplateFromFactory(definition:StorefrontFactoryDefinition):StorefrontInstallableTemplatePackage{
  const hero=firstMedia(definition,'hero');
  const editorial=firstMedia(definition,'editorial')??hero;
  const p=(type:StorefrontBuilderPageType)=>pagePrefix(definition,type);
  const gallerySpan=definition.category.pdpGallerySpan;
  const buyboxSpan=(12-gallerySpan) as 5|6;

  const home=page(definition,'home',[
    node({id:`${p('home')}-hero`,componentKey:'story.hero',componentVersion:1,config:{eyebrow:definition.copy.heroEyebrow,title:definition.copy.heroTitle,excerpt:definition.copy.heroCopy,image:hero?.src??'',imageAlt:hero?.alt??'',ctaLabel:definition.copy.heroCta,ctaHref:'/webaruhaz',tone:'primary',imagePosition:'right'}}),
    section(`${p('home')}-categories`,[node({id:`${p('home')}-category-navigation`,componentKey:'commerce.collection-navigation',componentVersion:1,config:{title:'Fedezd fel a kategóriákat',items:[],columns:4,imageRatio:definition.category.productImageRatio,tone:'background'},bindings:{items:{path:'collection.navigation',fallback:[]}}})]),
    section(`${p('home')}-featured`,[productGrid(`${p('home')}-featured-grid`,'Kiemelt termékek','catalog.featured',definition)],'surface'),
    node({id:`${p('home')}-editorial`,componentKey:'story.feature',componentVersion:1,config:{eyebrow:definition.copy.editorialEyebrow,title:definition.copy.editorialTitle,copy:definition.copy.editorialCopy,image:editorial?.src??'',imageAlt:editorial?.alt??'',ctaLabel:definition.copy.editorialCta,ctaHref:'/blog',imagePosition:'left',tone:definition.category.editorialTone}}),
  ],{factoryRole:'reference-composed-home'});

  const catalog=page(definition,'catalog',[
    section(`${p('catalog')}-intro`,[node({id:`${p('catalog')}-collection-header`,componentKey:'commerce.collection-header',componentVersion:1,config:{eyebrow:definition.displayName,title:definition.copy.catalogTitle,description:definition.copy.catalogCopy,image:'',imageAlt:'',align:'left'},bindings:{title:{path:'collection.current.title',fallback:definition.copy.catalogTitle},description:{path:'collection.current.description',fallback:definition.copy.catalogCopy}}})]),
    section(`${p('catalog')}-commerce`,[node({id:`${p('catalog')}-grid`,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'m',align:'start'},children:[
      node({id:`${p('catalog')}-facets`,componentKey:'commerce.catalog-facets',componentVersion:1,config:{title:'Szűrők',facets:[],clearHref:'/webaruhaz',clearLabel:'Törlés'},bindings:{facets:{path:'catalog.facets',fallback:[]},clearHref:{path:'catalog.clearHref',fallback:'/webaruhaz'}},responsive:{desktop:{gridSpan:3},tablet:{gridSpan:4},mobile:{gridSpan:12}}}),
      node({...productGrid(`${p('catalog')}-products`,definition.copy.catalogTitle,'catalog.products',definition),responsive:{desktop:{gridSpan:9},tablet:{gridSpan:8},mobile:{gridSpan:12}}}),
    ]})]),
  ],{factoryRole:'shared-catalog'});

  const product=page(definition,'product',[
    section(`${p('product')}-main`,[node({id:`${p('product')}-layout`,componentKey:'layout.grid',componentVersion:1,config:{columns:12,gap:'m',align:'start'},children:[
      node({id:`${p('product')}-gallery`,componentKey:'commerce.product-gallery',componentVersion:1,config:{images:[],aspectRatio:definition.category.productImageRatio,thumbnailPosition:'bottom'},bindings:{images:{path:'product.gallery',fallback:[]}},responsive:{desktop:{gridSpan:gallerySpan},tablet:{gridSpan:gallerySpan},mobile:{gridSpan:12}}}),
      node({id:`${p('product')}-buybox`,componentKey:'layout.stack',componentVersion:1,config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},responsive:{desktop:{gridSpan:buyboxSpan},tablet:{gridSpan:buyboxSpan},mobile:{gridSpan:12}},children:[
        node({id:`${p('product')}-info`,componentKey:'commerce.product-info',componentVersion:1,config:{eyebrow:definition.copy.productEyebrow,title:'Termék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF'},bindings:{title:{path:'product.name',fallback:'Termék'},price:{path:'pricing.displayPrice',fallback:''},compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},description:{path:'product.description',fallback:''},stockLabel:{path:'inventory.stockLabel',fallback:''},badges:{path:'product.badges',fallback:[]}}}),
        node({id:`${p('product')}-cta`,componentKey:'content.button',componentVersion:1,config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},bindings:{label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},href:{path:'commerce.purchaseHref',fallback:'#purchase'}}}),
      ]}),
    ]})]),
    section(`${p('product')}-recommendations`,[node({id:`${p('product')}-recommendation-row`,componentKey:'commerce.recommendation-row',componentVersion:1,config:{title:'Kapcsolódó termékek',products:[],columns:4,emptyLabel:'Nincs kapcsolódó ajánlat.',currency:'HUF'},bindings:{products:{path:'recommendations.products',fallback:[]}}})],'surface'),
  ],{factoryRole:'shared-pdp'});

  const cart=page(definition,'cart',[section(`${p('cart')}-body`,[node({id:`${p('cart')}-summary`,componentKey:'commerce.cart-summary',componentVersion:1,config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad üres.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},total:{path:'cart.total',fallback:''}}})])],{factoryRole:'shared-cart'});
  const checkout=page(definition,'checkout',[section(`${p('checkout')}-body`,[heading(`${p('checkout')}-title`,'Pénztár',1),node({id:`${p('checkout')}-summary`,componentKey:'commerce.checkout-summary',componentVersion:1,config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos pénztár.'},bindings:{lines:{path:'cart.lines',fallback:[]},subtotal:{path:'cart.subtotal',fallback:''},shipping:{path:'cart.shipping',fallback:''},total:{path:'cart.total',fallback:''}}})])],{factoryRole:'shared-checkout'});

  const pages:StorefrontPageDocument[]=[
    home,catalog,product,cart,checkout,
    simplePage(definition,'account','Fiókom','Rendelések, profiladatok és vásárlói beállítások.'),
    page(definition,'search',[section(`${p('search')}-body`,[heading(`${p('search')}-title`,'Keresési eredmények',1),productGrid(`${p('search')}-results`,'Találatok','search.results',definition)])],{factoryRole:'shared-search'}),
    simplePage(definition,'content','Információ','', {title:'content.page.title',body:'content.page.body'}),
    page(definition,'blog-index',[section(`${p('blog-index')}-body`,[heading(`${p('blog-index')}-title`,'Magazin',1),text(`${p('blog-index')}-copy`,'Történetek, útmutatók és inspiráció.')])],{factoryRole:'shared-blog-index'}),
    page(definition,'blog-article',[section(`${p('blog-article')}-body`,[heading(`${p('blog-article')}-title`,'Cikk',1),text(`${p('blog-article')}-copy`,'', 'content.article.body')])],{factoryRole:'shared-blog-article'}),
    simplePage(definition,'faq','Gyakori kérdések','Válaszok a legfontosabb vásárlási kérdésekre.'),
    simplePage(definition,'contact','Kapcsolat','Írj nekünk, segítünk.'),
    simplePage(definition,'legal','Jogi információk','', {title:'content.page.title',body:'content.page.body'}),
    simplePage(definition,'not-found','Az oldal nem található','Ellenőrizd a címet, vagy térj vissza a főoldalra.'),
  ];

  const manifest=defineStorefrontTemplateManifest({
    foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
    manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
    templateKey:definition.templateKey,
    templateVersion:definition.templateVersion,
    pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
    minPlan:definition.minPlan,
    requiredFeatures:definition.requiredFeatures,
    pageTypes:STOREFRONT_PAGE_TYPES,
    responsive:{desktop:true,tablet:true,mobile:true},
    migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
    demoContent:{namespace:definition.demoNamespace,policy:STOREFRONT_DEMO_CONTENT_POLICY},
  });

  return materializeStorefrontTemplateResponsiveStyles({
    manifest,
    pages,
    demoFixtures:definition.demoFixtures??[],
  });
}
