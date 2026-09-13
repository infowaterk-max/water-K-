import {createStorefrontPresetBundle} from '@/lib/builder/storefront-presets';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import * as fidelity from '@/lib/builder/templates/beauty-lab-fidelity';

export {
  BEAUTY_LAB_TEMPLATE_KEY,
  BEAUTY_LAB_TEMPLATE_VERSION,
  BEAUTY_LAB_ENGINE_CONTRACT,
  BEAUTY_LAB_CATALOG_PAGE,
  BEAUTY_LAB_SEARCH_PAGE,
  BEAUTY_LAB_CART_PAGE,
  BEAUTY_LAB_CHECKOUT_PAGE,
  BEAUTY_LAB_ACCOUNT_PAGE,
  BEAUTY_LAB_CONTENT_PAGE,
  BEAUTY_LAB_BLOG_INDEX_PAGE,
  BEAUTY_LAB_BLOG_ARTICLE_PAGE,
  BEAUTY_LAB_FAQ_PAGE,
  BEAUTY_LAB_CONTACT_PAGE,
  BEAUTY_LAB_LEGAL_PAGE,
  BEAUTY_LAB_NOT_FOUND_PAGE,
  BEAUTY_LAB_TEMPLATE_MANIFEST,
} from '@/lib/builder/templates/beauty-lab-fidelity';

export const BEAUTY_LAB_DESIGN_TOKENS=Object.freeze({
  ...fidelity.BEAUTY_LAB_DESIGN_TOKENS,
  '--shoporation-color-background':'#FFFFFF',
  '--shoporation-color-surface':'#F7F7F5',
  '--shoporation-color-surface-muted':'#ECEEF1',
  '--shoporation-color-text':'#111111',
  '--shoporation-color-muted-text':'#626262',
  '--shoporation-color-border':'#D9D9D9',
  '--shoporation-color-primary':'#111111',
  '--shoporation-color-primary-contrast':'#FFFFFF',
  '--shoporation-color-accent':'var(--merchant-accent, #C8B9F4)',
  '--shoporation-heading-font':'var(--merchant-heading-font, Arial, Helvetica, sans-serif)',
  '--shoporation-display-font':'var(--merchant-display-font, "Arial Narrow", "Liberation Sans Narrow", Impact, sans-serif)',
  '--shoporation-body-font':'var(--merchant-body-font, Arial, Helvetica, sans-serif)',
} as const);

export const BEAUTY_LAB_VISUAL_DNA=Object.freeze({
  ...fidelity.BEAUTY_LAB_VISUAL_DNA,
  character:'minimal-formula-lab-white-lavender-high-contrast-editorial',
  palette:{background:'white',surface:'cool-off-white',primary:'black',accent:'lavender',text:'near-black'},
  typography:{display:'condensed-uppercase-display',interface:'geometric-sans'},
  journey:'formula-to-ingredient-to-texture-to-guided-choice-to-product',
} as const);

export const BEAUTY_LAB_MARKETING_LAYER_CONTRACT=Object.freeze({
  ...fidelity.BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  hero:['image','overlay','decoration','badge','title','copy','primary-cta'] as const,
  composition:'shared-visual-layers-plus-schema-style-no-template-runtime-branch',
});

export const BEAUTY_LAB_HOME_SECTION_ORDER=[
  'Formula Hero',
  'Formula Finder',
  'Shop by Concern',
  'Ingredient Index Preview',
  'New Formulas',
  'Texture Lab',
  'Routine Feature',
  'Product Grid',
  'Ingredient Story',
  'Reviews',
  'Footer',
] as const;

export const BEAUTY_LAB_FIDELITY_VISUAL_DNA=fidelity.BEAUTY_LAB_VISUAL_DNA;
export const BEAUTY_LAB_FIDELITY_MARKETING_LAYER_CONTRACT=fidelity.BEAUTY_LAB_MARKETING_LAYER_CONTRACT;
export const BEAUTY_LAB_FIDELITY_HOME_SECTION_ORDER=fidelity.BEAUTY_LAB_HOME_SECTION_ORDER;

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode[]=>nodes.flatMap(node=>[node,...walk(node.children??[])]);
const required=(page:StorefrontPageDocument,id:string)=>{
  const match=walk(page.sections).find(node=>node.id===id);
  if(!match)throw new Error(`BEAUTY_LAB_RECOVERY_NODE_MISSING:${id}`);
  return match;
};
const style=(node:StorefrontComponentNode,value:Record<string,unknown>)=>{node.config={...node.config,style:value};return node;};
const layer=(id:string,zIndex:number,styleConfig:Record<string,unknown>,children:StorefrontComponentNode[],pointerEvents:'auto'|'none'='none'):StorefrontComponentNode=>({
  id,componentKey:'visual.layer',componentVersion:1,
  config:{position:'top-left',offsetX:'none',offsetY:'none',zIndex,width:'auto',height:'auto',tone:'transparent',padding:'none',opacity:1,pointerEvents,style:styleConfig},
  children,
});

const referenceNav=[
  {label:'SHOP',href:'/webaruhaz'},
  {label:'SKIN',href:'/webaruhaz?category=skin'},
  {label:'BODY',href:'/webaruhaz?category=body'},
  {label:'HAIR',href:'/webaruhaz?category=hair'},
  {label:'WELLNESS',href:'/webaruhaz?category=wellness'},
];

function applyReferenceHeader(page:StorefrontPageDocument,prefix:string){
  const header=required(page,`${prefix}-site-header`);
  header.config={
    ...header.config,
    tagline:'SCIENCE MEETS BEAUTY',
    style:{base:{backgroundColor:'#FFFFFF',color:'#111111',borderBottom:'1px solid #E6E6E6',boxShadow:'none'}},
    innerStyle:{base:{minHeight:'3.65rem',padding:'.5rem clamp(1rem,2.8vw,2.25rem)',gap:'clamp(.8rem,2vw,2rem)'},mobile:{minHeight:'3.4rem',padding:'.42rem .85rem'}},
    brandStyle:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontWeight:850,fontSize:'1rem',letterSpacing:'.08em',lineHeight:1,textTransform:'uppercase'}},
    taglineStyle:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.42rem',fontWeight:600,letterSpacing:'.18em',lineHeight:1.2}},
    utilityStyle:{base:{gap:'.78rem',fontSize:'.95rem'}},
    mobileToggleStyle:{base:{fontSize:'1rem'}},
  };
  const nav=required(page,`${prefix}-site-nav`);
  nav.config={...nav.config,items:referenceNav,style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.66rem',fontWeight:650,letterSpacing:'.06em',gap:'clamp(.8rem,2vw,1.7rem)'}}};
  nav.bindings={...(nav.bindings??{}),items:{path:'navigation.primary',fallback:referenceNav}};
}

function buildRecoveryHome():StorefrontPageDocument{
  const page=clone(fidelity.BEAUTY_LAB_HOME_PAGE);
  page.sections=page.sections.filter(section=>section.id!=='beauty-home-trust-bar');
  applyReferenceHeader(page,'beauty-home');

  const hero=required(page,'beauty-formula-hero');
  const photo=clone(required(page,'beauty-hero-photo'));
  const productImage=clone(required(page,'beauty-hero-product-image'));
  const eyebrow=clone(required(page,'beauty-hero-eyebrow'));
  const title=clone(required(page,'beauty-hero-title'));
  const copy=clone(required(page,'beauty-hero-copy'));
  const cta=clone(required(page,'beauty-hero-cta'));
  const badge=clone(required(page,'beauty-hero-badge'));

  photo.config={...photo.config,objectPosition:'58% 38%',style:{base:{width:'100%',height:'100%',minHeight:'100%',objectFit:'cover',objectPosition:'58% 38%',borderRadius:0},mobile:{objectPosition:'58% center'}}};
  productImage.config={...productImage.config,style:{base:{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',borderRadius:0}}};
  eyebrow.config={...eyebrow.config,text:'SCIENCE / CARE / RESULTS',tone:'text',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.62rem',fontWeight:750,letterSpacing:'.16em',textTransform:'uppercase',color:'#111111'},mobile:{color:'#FFFFFF',fontSize:'.56rem'}}};
  eyebrow.bindings={text:{path:'content.formulaHero.eyebrow',fallback:'SCIENCE / CARE / RESULTS'}};
  title.config={...title.config,text:'YOUR SKIN.\nYOUR FORMULA.',tone:'text',accentText:'FORMULA.',style:{base:{fontFamily:'var(--shoporation-display-font, "Arial Narrow", Impact, sans-serif)',fontSize:'clamp(4.7rem,8.5vw,8.8rem)',fontWeight:900,fontStretch:'condensed',lineHeight:.78,letterSpacing:'-.055em',textTransform:'uppercase',maxWidth:'6.8ch',color:'#111111',whiteSpace:'pre-line'},tablet:{fontSize:'clamp(4.1rem,9vw,6.3rem)'},mobile:{fontSize:'clamp(3.3rem,15vw,5.1rem)',lineHeight:.8,maxWidth:'6.6ch',color:'#FFFFFF'}},accentStyle:{base:{color:'#BCA8F0'},mobile:{color:'#D2C5FF'}}};
  title.bindings={text:{path:'content.formulaHero.title',fallback:'YOUR SKIN.\nYOUR FORMULA.'}};
  copy.config={...copy.config,text:'Targeted formulas, clear ingredients and textures made easy to understand.',tone:'text',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.82rem',lineHeight:1.45,maxWidth:'31ch',color:'#292929'},mobile:{display:'none'}}};
  copy.bindings={text:{path:'content.formulaHero.copy',fallback:'Targeted formulas, clear ingredients and textures made easy to understand.'}};
  cta.config={...cta.config,label:'FIND YOUR FORMULA',href:'#formula-finder',variant:'primary',size:'m',ariaLabel:'Find your formula',style:{base:{background:'#111111',color:'#FFFFFF',border:'1px solid #111111',borderRadius:0,padding:'.78rem 1.15rem',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.64rem',fontWeight:750,letterSpacing:'.08em',textTransform:'uppercase'},mobile:{padding:'.72rem 1rem'}}};
  cta.bindings={label:{path:'content.formulaHero.primaryLabel',fallback:'FIND YOUR FORMULA'},href:{path:'content.formulaHero.primaryHref',fallback:'#formula-finder'}};
  badge.config={...badge.config,text:'CLEAN INGREDIENTS\nREAL RESULTS',tone:'text',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.58rem',fontWeight:750,lineHeight:1.35,letterSpacing:'.12em',textTransform:'uppercase',textAlign:'center',color:'#111111'}}};
  badge.bindings={text:{path:'content.formulaHero.badge',fallback:'CLEAN INGREDIENTS\nREAL RESULTS'}};

  hero.config={
    ...hero.config,
    height:'hero',
    tone:'background',
    radius:'none',
    presentation:'reference-driven',
    style:{base:{minHeight:'clamp(35rem,51vw,47rem)',height:'clamp(35rem,51vw,47rem)',background:'#FFFFFF',borderRadius:0,overflow:'hidden'},tablet:{minHeight:'42rem',height:'42rem'},mobile:{minHeight:'39rem',height:'39rem'}},
  };
  hero.children=[
    layer('beauty-hero-image-layer',0,{base:{inset:0,width:'100%',height:'100%',maxWidth:'none',padding:0,transform:'none'}},[photo]),
    layer('beauty-hero-overlay-layer',1,{base:{inset:0,width:'100%',height:'100%',maxWidth:'none',padding:0,background:'linear-gradient(90deg,rgba(255,255,255,.98) 0%,rgba(255,255,255,.88) 25%,rgba(255,255,255,.12) 49%,rgba(255,255,255,0) 68%)'},mobile:{background:'linear-gradient(180deg,rgba(17,17,17,0) 15%,rgba(17,17,17,.08) 42%,rgba(17,17,17,.72) 100%)'}},[]),
    layer('beauty-hero-decoration-layer',2,{base:{top:'11%',right:'9%',bottom:'auto',left:'auto',width:'22%',height:'72%',maxWidth:'25rem',padding:0,transform:'none',background:'transparent'},tablet:{right:'5%',width:'27%'},mobile:{display:'none'}},[productImage]),
    layer('beauty-hero-badge-layer',3,{base:{top:0,right:0,bottom:0,left:'auto',width:'9.5rem',height:'100%',maxWidth:'none',padding:'1.25rem .8rem',transform:'none',background:'rgba(238,244,247,.78)',display:'flex',alignItems:'flex-end',justifyContent:'center'},tablet:{width:'7.5rem'},mobile:{display:'none'}},[badge]),
    layer('beauty-hero-title-layer',5,{base:{top:'16%',left:'4.5%',right:'auto',bottom:'auto',width:'47%',maxWidth:'44rem',height:'auto',padding:0,transform:'none'},tablet:{top:'18%',left:'3.5%',width:'53%'},mobile:{top:'43%',left:'1rem',right:'1rem',width:'auto',maxWidth:'none'}},[eyebrow,title],'auto'),
    layer('beauty-hero-copy-layer',5,{base:{top:'auto',left:'4.5%',bottom:'17%',right:'auto',width:'31rem',maxWidth:'39%',height:'auto',padding:0,transform:'none'},tablet:{left:'3.5%',bottom:'15%',maxWidth:'43%'},mobile:{display:'none'}},[copy],'auto'),
    layer('beauty-hero-primary-cta-layer',6,{base:{top:'auto',left:'4.5%',bottom:'7.5%',right:'auto',width:'auto',height:'auto',padding:0,transform:'none'},tablet:{left:'3.5%',bottom:'6.5%'},mobile:{left:'1rem',bottom:'1.2rem'}},[cta],'auto'),
  ];

  const uspSection=required(page,'beauty-usp-row');
  uspSection.config={...uspSection.config,spacing:'none',tone:'background',style:{base:{paddingBlock:0,borderBottom:'1px solid #E6E6E6',background:'#FFFFFF'}}};
  const uspContainer=required(page,'beauty-usp-row-container');
  uspContainer.config={...uspContainer.config,style:{base:{padding:'1rem clamp(1rem,4vw,4.5rem)'},mobile:{padding:'.85rem .75rem'}}};
  const uspGrid=required(page,'beauty-usp-grid');
  uspGrid.children=(uspGrid.children??[]).slice(0,3);
  uspGrid.config={...uspGrid.config,columns:3,gap:'s',style:{base:{gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'1rem'},mobile:{gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'.45rem'}}};
  for(const child of uspGrid.children??[])style(child,{base:{borderRight:'1px solid #E6E6E6',paddingRight:'1rem'},mobile:{paddingRight:'.45rem'}});

  for(const id of ['beauty-formula-finder','beauty-concern','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-product-grid','beauty-reviews']){
    const target=required(page,id);
    target.config={...target.config,style:{base:{paddingBlock:'clamp(2.4rem,5vw,4.8rem)',background:'#FFFFFF'}}};
  }
  const finder=required(page,'beauty-formula-finder');
  finder.config={...finder.config,style:{base:{paddingBlock:'clamp(2.8rem,5vw,5.4rem)',background:'#F7F7F5',borderBottom:'1px solid #E6E6E6'}}};
  const ingredient=required(page,'beauty-ingredient-index');
  ingredient.config={...ingredient.config,style:{base:{paddingBlock:'clamp(2.7rem,5vw,4.7rem)',background:'#FFFFFF',borderBottom:'1px solid #ECECEC'}}};

  const order=['beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-formula-finder','beauty-concern','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-routine-feature','beauty-product-grid','beauty-ingredient-story','beauty-reviews','beauty-newsletter','beauty-home-footer'];
  const byId=new Map(page.sections.map(section=>[section.id,section]));
  page.sections=order.flatMap(id=>{const entry=byId.get(id);return entry?[entry]:[];});
  page.metadata={...page.metadata,sectionOrder:BEAUTY_LAB_HOME_SECTION_ORDER,visualFidelityRecovery:'canary-reference-schema-v1',compatibilityContract:'wave32-semantics-without-hidden-dom',referenceAuthority:'po-approved-beauty-lab-second-image'};
  return page;
}

function buildRecoveryProduct():StorefrontPageDocument{
  const page=clone(fidelity.BEAUTY_LAB_PRODUCT_PAGE);
  page.sections=page.sections.filter(section=>section.id!=='beauty-product-trust-bar');
  applyReferenceHeader(page,'beauty-product');
  const main=required(page,'beauty-product-main');
  main.config={...main.config,spacing:'none',style:{base:{paddingBlock:'1.2rem clamp(0rem,2vw,2rem)',background:'#FFFFFF'}}};
  const container=required(page,'beauty-product-main-container');
  container.config={...container.config,style:{base:{paddingInline:'clamp(1rem,3vw,3rem)',maxWidth:'1240px'}}};
  const breadcrumb:StorefrontComponentNode={id:'beauty-product-breadcrumb',componentKey:'content.text',componentVersion:1,config:{text:'HOME / SKIN / SERUMS / CLOUD SERUM',as:'small',align:'left',tone:'muted',style:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.58rem',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'1.1rem'}}}};
  container.children=[breadcrumb,...(container.children??[])];
  const layout=required(page,'beauty-product-layout');
  layout.config={...layout.config,gap:'l',style:{base:{gap:'clamp(1.6rem,4vw,4.5rem)',alignItems:'start'},mobile:{gap:'1.4rem'}}};
  const buybox=required(page,'beauty-product-buybox');
  buybox.config={...buybox.config,gap:'s',style:{base:{maxWidth:'31rem',padding:'1rem 0 2rem 0',gap:'.85rem'},mobile:{maxWidth:'none',padding:'0 0 1.5rem 0'}}};
  const buyboxChildren=buybox.children??[];
  buybox.children=[
    ...buyboxChildren.filter(node=>node.id==='beauty-product-info'),
    ...buyboxChildren.filter(node=>node.id==='beauty-product-rating'),
    ...buyboxChildren.filter(node=>node.id==='beauty-product-variants'),
    ...buyboxChildren.filter(node=>node.id==='beauty-product-key-specs'),
    ...buyboxChildren.filter(node=>node.id==='beauty-product-purchase'),
    ...buyboxChildren.filter(node=>node.id==='beauty-product-trust'),
  ];
  const purchase=required(page,'beauty-product-purchase');
  purchase.config={...purchase.config,label:'ADD TO BAG',ariaLabel:'Add to bag',style:{base:{width:'100%',background:'#111111',color:'#FFFFFF',border:'1px solid #111111',borderRadius:0,padding:'.9rem 1rem',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.68rem',fontWeight:750,letterSpacing:'.08em',textTransform:'uppercase'}}};
  purchase.bindings={...(purchase.bindings??{}),label:{path:'commerce.purchaseLabel',fallback:'ADD TO BAG'}};
  const trust=required(page,'beauty-product-trust');
  trust.config={...trust.config,text:'SECURE CHECKOUT · 30 DAY RETURNS · TRACKED DELIVERY',style:{base:{fontSize:'.58rem',letterSpacing:'.055em',textTransform:'uppercase',borderTop:'1px solid #E6E6E6',paddingTop:'.8rem'}}};
  for(const id of ['beauty-product-specifications','beauty-product-tabs','beauty-product-explanation','beauty-product-related']){
    const target=required(page,id);
    target.config={...target.config,style:{base:{paddingBlock:'clamp(2rem,4vw,4rem)',background:'#FFFFFF',borderTop:'1px solid #EAEAEA'}}};
  }
  page.metadata={...page.metadata,visualFidelityRecovery:'canary-reference-schema-v1',referenceAuthority:'po-approved-beauty-lab-second-image'};
  return page;
}

export const BEAUTY_LAB_HOME_PAGE=buildRecoveryHome();
export const BEAUTY_LAB_PRODUCT_PAGE=buildRecoveryProduct();

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...fidelity.BEAUTY_LAB_TEMPLATE_PACKAGE,
  pages:fidelity.BEAUTY_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_PRODUCT_PAGE:page),
};

export const BEAUTY_LAB_PRESET_BUNDLE=createStorefrontPresetBundle(BEAUTY_LAB_TEMPLATE_PACKAGE);
