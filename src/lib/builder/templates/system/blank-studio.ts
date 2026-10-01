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
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {STOREFRONT_GLOBAL_STYLES_METADATA_KEY,STOREFRONT_GLOBAL_STYLES_VERSION,type StorefrontGlobalStyleState} from '@/lib/builder/storefront-global-styles';

export const BLANK_STUDIO_TEMPLATE_KEY='system.blank-studio' as const;
export const BLANK_STUDIO_TEMPLATE_VERSION=1 as const;

export const BLANK_STUDIO_VISUAL_DNA=Object.freeze({
  character:'neutral-builder-canvas',
  category:'system',
  intent:'from-scratch-authoring',
  hierarchy:'template-page-presets-section-presets-components',
  enginePolicy:'capability-driven-not-template-owned',
  defaultComposition:'header-starter-footer',
  exclusions:['category-specific-branding','demo-catalog','template-owned-engine','decorative-runtime-fork'],
} as const);

export const BLANK_STUDIO_DESIGN_TOKENS=Object.freeze({
  '--shoporation-color-background':'#ffffff',
  '--shoporation-color-surface':'#ffffff',
  '--shoporation-color-surface-muted':'#f5f5f3',
  '--shoporation-color-text':'#171717',
  '--shoporation-color-muted-text':'#6b6b66',
  '--shoporation-color-border':'#deded8',
  '--shoporation-color-primary':'#171717',
  '--shoporation-color-primary-contrast':'#ffffff',
  '--shoporation-color-accent':'#b88716',
  '--shoporation-color-accent-secondary':'#8d8d86',
  '--shoporation-color-success':'#257a4b',
  '--shoporation-color-warning':'#a96d00',
  '--shoporation-heading-font':'var(--merchant-heading-font, Arial, sans-serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, sans-serif)',
} as const);

export const BLANK_STUDIO_GLOBAL_STYLE_STATE:StorefrontGlobalStyleState=Object.freeze({
  version:STOREFRONT_GLOBAL_STYLES_VERSION,
  tokens:Object.freeze({
    background:'#ffffff',
    surface:'#ffffff',
    surfaceMuted:'#f5f5f3',
    text:'#171717',
    mutedText:'#6b6b66',
    border:'#deded8',
    primary:'#171717',
    primaryContrast:'#ffffff',
    accent:'#b88716',
    accentSecondary:'#8d8d86',
    headingFont:'system-sans',
    bodyFont:'system-sans',
    spacingScale:'comfortable',
    radiusScale:'soft',
  }),
});

const node=(input:StorefrontComponentNode):StorefrontComponentNode=>input;

const header=(_prefix:string):StorefrontComponentNode=>node({
  id:'blank-studio-header',
  componentKey:'system.header',
  componentVersion:1,
  config:{
    brandLabel:'Webshop neve',
    brandHref:'/',
    tone:'background',
    sticky:true,
    brandStyle:{minHeight:'2rem',display:'inline-flex',alignItems:'center'},
  },
  bindings:{
    brandLabel:{path:'brand.name',fallback:'Webshop neve'},
    brandHref:{path:'brand.homeHref',fallback:'/'},
  },
  children:[node({
    id:'blank-studio-navigation',
    componentKey:'system.navigation',
    componentVersion:1,
    config:{
      ariaLabel:'Fő navigáció',
      items:[],
      layout:'horizontal',
      styleSlots:{item:{minHeight:'2rem',display:'inline-flex',alignItems:'center',paddingInline:'.25rem'}},
    },
    bindings:{items:{path:'navigation.primary',fallback:[]}},
  })],
});

const footer=(_prefix:string):StorefrontComponentNode=>node({
  id:'blank-studio-footer-section',
  componentKey:'layout.section',
  componentVersion:1,
  config:{tone:'background',spacing:'s',width:'full'},
  children:[node({
    id:'blank-studio-footer',
    componentKey:'editorial.footer',
    componentVersion:1,
    config:{brandLabel:'Webshop neve',columns:[],copyright:'',tone:'background'},
    bindings:{
      brandLabel:{path:'brand.name',fallback:'Webshop neve'},
      columns:{path:'navigation.footer',fallback:[]},
      copyright:{path:'brand.copyright',fallback:''},
    },
  })],
});

const section=(id:string,children:StorefrontComponentNode[],tone='background',spacing='l'):StorefrontComponentNode=>node({
  id,
  componentKey:'layout.section',
  componentVersion:1,
  config:{tone,spacing,width:'full'},
  children:[node({
    id:id+'-container',
    componentKey:'layout.container',
    componentVersion:1,
    config:{width:'content',spacing:'m'},
    children,
  })],
});

const base=(pageKey:string,pageType:StorefrontBuilderPageType,sections:StorefrontComponentNode[],metadata:Record<string,unknown>={}):StorefrontPageDocument=>({
  schemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  pageKey,
  pageType,
  templateKey:BLANK_STUDIO_TEMPLATE_KEY,
  templateVersion:BLANK_STUDIO_TEMPLATE_VERSION,
  metadata:{
    systemTemplate:true,
    systemTemplateKind:'blank-studio',
    visualDNA:BLANK_STUDIO_VISUAL_DNA.character,
    editableDesignTokens:true,
    optionalEngines:'capability-library',
    ...metadata,
    [STOREFRONT_GLOBAL_STYLES_METADATA_KEY]:BLANK_STUDIO_GLOBAL_STYLE_STATE,
  },
  sections,
});

const heading=(id:string,value:string,level=1):StorefrontComponentNode=>node({
  id,
  componentKey:'content.heading',
  componentVersion:1,
  config:{text:value,level,align:'left',tone:'text'},
});

const text=(id:string,value:string):StorefrontComponentNode=>node({
  id,
  componentKey:'content.text',
  componentVersion:1,
  config:{text:value,as:'p',align:'left',tone:'muted'},
});

const productGrid=(id:string,title:string,path:string):StorefrontComponentNode=>node({
  id,
  componentKey:'commerce.product-grid',
  componentVersion:1,
  config:{
    title,
    products:[],
    columns:4,
    presentation:'standard',
    showBadges:true,
    showCompareAt:true,
    showCta:true,
    ctaLabel:'Megnézem',
    imageRatio:'1 / 1',
    emptyLabel:'Jelenleg nincs megjeleníthető termék.',
    currency:'HUF',
  },
  bindings:{
    title:{path:'content.'+id+'.title',fallback:title},
    products:{path,fallback:[]},
  },
});

const simplePage=(key:string,type:StorefrontBuilderPageType,title:string,copy:string)=>base(
  key,
  type,
  [
    header(key.replaceAll('.','-')),
    section(key.replaceAll('.','-')+'-body',[
      heading(key+'-title',title),
      text(key+'-copy',copy),
    ]),
    footer(key.replaceAll('.','-')),
  ],
  {starterComposition:'simple-content'},
);

export const BLANK_STUDIO_HOME_PAGE=base('blank-studio.home','home',[
  header('blank-home'),
  section('blank-home-starter',[
    heading('blank-home-starter-title','Kezdd innen'),
    text('blank-home-starter-copy','Ez egy szándékosan semleges kezdőszekció. Törölheted, átalakíthatod vagy lecserélheted a Builder könyvtárából választott szekcióra vagy motorra.'),
  ]),
  footer('blank-home'),
],{starterComposition:'header-placeholder-footer'});

export const BLANK_STUDIO_CATALOG_PAGE=base('blank-studio.catalog','catalog',[
  header('blank-catalog'),
  section('blank-catalog-heading',[node({
    id:'blank-catalog-collection-header',
    componentKey:'commerce.collection-header',
    componentVersion:1,
    config:{eyebrow:'',title:'Termékek',description:'',image:'',imageAlt:'',align:'left',presentation:'standard'},
    bindings:{
      eyebrow:{path:'collection.current.eyebrow',fallback:''},
      title:{path:'collection.current.title',fallback:'Termékek'},
      description:{path:'collection.current.description',fallback:''},
      image:{path:'collection.current.image',fallback:''},
      imageAlt:{path:'collection.current.imageAlt',fallback:''},
    },
  })]),
  section('blank-catalog-products',[productGrid('blankCatalogGrid','Termékek','catalog.products')]),
  footer('blank-catalog'),
],{starterComposition:'operational-catalog'});

export const BLANK_STUDIO_PRODUCT_PAGE=base('blank-studio.product','product',[
  header('blank-product'),
  section('blank-product-main',[node({
    id:'blank-product-grid',
    componentKey:'layout.grid',
    componentVersion:1,
    config:{columns:12,gap:'xs',align:'start'},
    children:[
      node({
        id:'blank-product-gallery',
        componentKey:'commerce.product-gallery',
        componentVersion:1,
        config:{images:[],aspectRatio:'1 / 1',thumbnailPosition:'bottom',presentation:'standard'},
        bindings:{images:{path:'product.gallery',fallback:[]}},
        responsive:{desktop:{gridSpan:7},tablet:{gridSpan:7},mobile:{gridSpan:12}},
      }),
      node({
        id:'blank-product-buybox',
        componentKey:'layout.stack',
        componentVersion:1,
        config:{direction:'vertical',gap:'m',align:'stretch',justify:'start'},
        responsive:{desktop:{gridSpan:5},tablet:{gridSpan:5},mobile:{gridSpan:12}},
        children:[
          node({
            id:'blank-product-info',
            componentKey:'commerce.product-info',
            componentVersion:1,
            config:{eyebrow:'',title:'Termék',price:'',compareAtPrice:'',description:'',stockLabel:'',badges:[],currency:'HUF',presentation:'standard'},
            bindings:{
              eyebrow:{path:'product.eyebrow',fallback:''},
              title:{path:'product.name',fallback:'Termék'},
              price:{path:'pricing.displayPrice',fallback:''},
              compareAtPrice:{path:'pricing.compareAtPrice',fallback:''},
              description:{path:'product.description',fallback:''},
              stockLabel:{path:'inventory.stockLabel',fallback:''},
              badges:{path:'product.badges',fallback:[]},
            },
          }),
          node({
            id:'blank-product-variants',
            componentKey:'commerce.variant-swatches',
            componentVersion:1,
            config:{label:'Változat',options:[],presentation:'standard'},
            bindings:{
              label:{path:'variant.label',fallback:'Változat'},
              options:{path:'variant.options',fallback:[]},
            },
          }),
          node({
            id:'blank-product-buy',
            componentKey:'content.button',
            componentVersion:1,
            config:{label:'Kosárba teszem',href:'#purchase',variant:'primary',size:'l',ariaLabel:'Kosárba teszem'},
            bindings:{
              label:{path:'commerce.purchaseLabel',fallback:'Kosárba teszem'},
              href:{path:'commerce.purchaseHref',fallback:'#purchase'},
            },
          }),
        ],
      }),
    ],
  })]),
  footer('blank-product'),
],{starterComposition:'operational-product',pdpGrid:{desktop:'7/12+5/12',tablet:'7/12+5/12',mobile:'12/12+12/12'}});

export const BLANK_STUDIO_CART_PAGE=base('blank-studio.cart','cart',[
  header('blank-cart'),
  section('blank-cart-body',[node({
    id:'blank-cart-summary',
    componentKey:'commerce.cart-summary',
    componentVersion:1,
    config:{lines:[],subtotal:'',total:'',currency:'HUF',checkoutHref:'/penztar',checkoutLabel:'Tovább a pénztárhoz',emptyLabel:'A kosarad üres.'},
    bindings:{
      lines:{path:'cart.lines',fallback:[]},
      subtotal:{path:'cart.subtotal',fallback:''},
      total:{path:'cart.total',fallback:''},
    },
  })]),
  footer('blank-cart'),
],{starterComposition:'operational-cart',engineBinding:'E13'});

export const BLANK_STUDIO_CHECKOUT_PAGE=base('blank-studio.checkout','checkout',[
  header('blank-checkout'),
  section('blank-checkout-body',[
    heading('blank-checkout-title','Pénztár'),
    node({
      id:'blank-checkout-summary',
      componentKey:'commerce.checkout-summary',
      componentVersion:1,
      config:{lines:[],subtotal:'',shipping:'',total:'',currency:'HUF',secureLabel:'Biztonságos, provider-neutral checkout.'},
      bindings:{
        lines:{path:'cart.lines',fallback:[]},
        subtotal:{path:'cart.subtotal',fallback:''},
        shipping:{path:'cart.shipping',fallback:''},
        total:{path:'cart.total',fallback:''},
      },
    }),
  ]),
  footer('blank-checkout'),
],{starterComposition:'operational-checkout',engineBinding:'E13'});

export const BLANK_STUDIO_SEARCH_PAGE=base('blank-studio.search','search',[
  header('blank-search'),
  section('blank-search-intro',[
    heading('blank-search-title','Keresési eredmények'),
    text('blank-search-copy','A találatok a közös keresési és katalógus-authorityból érkeznek.'),
  ]),
  section('blank-search-results',[productGrid('blankSearchGrid','Találatok','search.results')]),
  footer('blank-search'),
],{starterComposition:'operational-search'});

export const BLANK_STUDIO_ACCOUNT_PAGE=simplePage('blank-studio.account','account','Fiókom','A vásárlói fiók tartalma a közös Shoperation fiók- és rendelési authorityhoz kapcsolódik.');
export const BLANK_STUDIO_CONTENT_PAGE=simplePage('blank-studio.content','content','Tartalmi oldal','Cseréld le ezt a blokkot saját tartalomra vagy válassz kész szekciót a Builder könyvtárából.');
export const BLANK_STUDIO_BLOG_INDEX_PAGE=simplePage('blank-studio.blog-index','blog-index','Blog','A bloglista tartalmát a közös tartalomkezelésből építheted fel.');
export const BLANK_STUDIO_BLOG_ARTICLE_PAGE=simplePage('blank-studio.blog-article','blog-article','Blogbejegyzés','A cikk szerkezete szabadon alakítható a Builderben.');
export const BLANK_STUDIO_FAQ_PAGE=simplePage('blank-studio.faq','faq','Gyakori kérdések','Adj hozzá FAQ vagy accordion szekciókat a könyvtárból.');
export const BLANK_STUDIO_CONTACT_PAGE=simplePage('blank-studio.contact','contact','Kapcsolat','Adj hozzá kapcsolati adatokat, űrlapot, térképet vagy saját szekciókat.');
export const BLANK_STUDIO_LEGAL_PAGE=simplePage('blank-studio.legal','legal','Jogi információk','A kereskedő jogi és adatkezelési tartalmának helye.');
export const BLANK_STUDIO_NOT_FOUND_PAGE=simplePage('blank-studio.not-found','not-found','404','A keresett oldal nem található.');

export const BLANK_STUDIO_TEMPLATE_MANIFEST=defineStorefrontTemplateManifest({
  foundationVersion:STOREFRONT_BUILDER_FOUNDATION_VERSION,
  manifestVersion:STOREFRONT_TEMPLATE_MANIFEST_VERSION,
  templateKey:BLANK_STUDIO_TEMPLATE_KEY,
  templateVersion:BLANK_STUDIO_TEMPLATE_VERSION,
  pageSchemaVersion:STOREFRONT_PAGE_SCHEMA_VERSION,
  minPlan:'alap',
  requiredFeatures:['catalog','inventory','orders','contentMarketing','searchFiltering','commerceIntegrations'],
  pageTypes:[...STOREFRONT_PAGE_TYPES],
  responsive:{desktop:true,tablet:true,mobile:true},
  migration:STOREFRONT_TEMPLATE_MIGRATION_POLICY,
  demoContent:{namespace:'system-blank-studio',policy:STOREFRONT_DEMO_CONTENT_POLICY},
});

export const BLANK_STUDIO_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  manifest:BLANK_STUDIO_TEMPLATE_MANIFEST,
  pages:[
    BLANK_STUDIO_HOME_PAGE,
    BLANK_STUDIO_CATALOG_PAGE,
    BLANK_STUDIO_PRODUCT_PAGE,
    BLANK_STUDIO_CART_PAGE,
    BLANK_STUDIO_CHECKOUT_PAGE,
    BLANK_STUDIO_ACCOUNT_PAGE,
    BLANK_STUDIO_SEARCH_PAGE,
    BLANK_STUDIO_CONTENT_PAGE,
    BLANK_STUDIO_BLOG_INDEX_PAGE,
    BLANK_STUDIO_BLOG_ARTICLE_PAGE,
    BLANK_STUDIO_FAQ_PAGE,
    BLANK_STUDIO_CONTACT_PAGE,
    BLANK_STUDIO_LEGAL_PAGE,
    BLANK_STUDIO_NOT_FOUND_PAGE,
  ],
  demoFixtures:[],
};
