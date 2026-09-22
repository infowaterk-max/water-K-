import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {readStorefrontFidelityMetadata,writeStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V24_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v2';

export const BEAUTY_LAB_REFERENCE_V28_VERSION='shoporation.beauty-lab-reference-v2.8' as const;

const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const VIEWPORTS=['base','desktop','tablet','mobile'] as const;

function flatten(page:StorefrontPageDocument){
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const section of page.sections)visit(section);
  return result;
}

function required(page:StorefrontPageDocument,id:string){
  const found=flatten(page).find(node=>node.id===id);
  if(!found)throw new Error(`BEAUTY_LAB_REFERENCE_V28_NODE_MISSING:${id}`);
  return found;
}

function setFallback(node:StorefrontComponentNode,slot:string,path:string,fallback:unknown){
  node.bindings={...(node.bindings??{}),[slot]:{path,fallback}};
}

function patchStyle(node:StorefrontComponentNode,viewport:typeof VIEWPORTS[number],patch:Record<string,unknown>){
  const current=isRecord(node.config.style)?clone(node.config.style):{};
  const responsive=VIEWPORTS.some(key=>Object.prototype.hasOwnProperty.call(current,key));
  if(!responsive){
    node.config={...node.config,style:{base:{...current,...patch}}};
    return;
  }
  const slot=isRecord(current[viewport])?current[viewport] as Record<string,unknown>:{};
  node.config={...node.config,style:{...current,[viewport]:{...slot,...patch}}};
}

function setStyleSlots(node:StorefrontComponentNode,slots:Record<string,unknown>){
  node.config={...node.config,styleSlots:slots};
}

function mergeStyleSlots(node:StorefrontComponentNode,patch:Record<string,unknown>){
  const current=isRecord(node.config.styleSlots)?clone(node.config.styleSlots):{};
  const next={...current};
  for(const[slot,value]of Object.entries(patch)){
    const existing=isRecord(next[slot])?next[slot] as Record<string,unknown>:{};
    const update=isRecord(value)?value:{};
    const merged={...existing};
    for(const[viewport,style]of Object.entries(update)){
      const currentViewport=isRecord(merged[viewport])?merged[viewport] as Record<string,unknown>:{};
      merged[viewport]={...currentViewport,...(isRecord(style)?style:{})};
    }
    next[slot]=merged;
  }
  node.config={...node.config,styleSlots:next};
}

function compactSection(page:StorefrontPageDocument,id:string,desktop='.85rem',mobile='.72rem'){
  const section=required(page,id);
  section.config={...section.config,spacing:'none'};
  patchStyle(section,'base',{paddingBlock:desktop});
  patchStyle(section,'mobile',{paddingBlock:mobile});
}

function deferHomeSectionsAfter(page:StorefrontPageDocument,anchorId:string){
  const anchorIndex=page.sections.findIndex(section=>section.id===anchorId);
  if(anchorIndex<0)throw new Error(`BEAUTY_LAB_REFERENCE_V28_DEFER_ANCHOR_MISSING:${anchorId}`);
  for(const section of page.sections.slice(anchorIndex+1)){
    if(section.componentKey!=='layout.section')continue;
    section.config={...section.config,deferOffscreen:true,intrinsicSize:'auto 720px'};
  }
}

const HOME_TRUST_ITEMS=[
  {id:'skin',symbol:'◌',label:'Bőrbarát formulák'},
  {id:'clean',symbol:'♧',label:'Tisztább összetevők'},
  {id:'results',symbol:'✓',label:'Valódi eredmények'},
] as const;

const PRODUCT_TRUST_ITEMS=[
  {id:'stock',symbol:'◌',label:'Raktáron'},
  {id:'shipping',symbol:'♧',label:'Ingyenes szállítás 20 000 Ft felett'},
  {id:'returns',symbol:'✓',label:'30 napos visszaküldés'},
] as const;

function buildHome(base:StorefrontPageDocument){
  const page=clone(base);

  const header=required(page,'beauty-home-site-header');
  header.config={...header.config,tagline:'SCIENCE MEETS BEAUTY'};

  const hero=required(page,'beauty-formula-hero');
  patchStyle(hero,'mobile',{minHeight:'24.5rem',height:'24.5rem'});

  const title=required(page,'beauty-hero-title');
  setFallback(title,'text','content.formulaHero.title','YOUR SKIN.\nYOUR FORMULA.');
  patchStyle(title,'base',{fontFamily:'var(--shoporation-display-font, "DejaVu Sans Condensed", "Arial Narrow", Impact, sans-serif)',maxWidth:'14ch'});
  patchStyle(title,'tablet',{maxWidth:'14ch'});
  patchStyle(title,'mobile',{fontFamily:'var(--shoporation-display-font, "DejaVu Sans Condensed", "Arial Narrow", Impact, sans-serif)',fontSize:'clamp(2.35rem,10vw,2.65rem)',maxWidth:'none'});
  patchStyle(title,'base',{fontSize:'clamp(3.25rem,5.15vw,5.05rem)',maxWidth:'15.5ch',lineHeight:.86});
  patchStyle(title,'tablet',{fontSize:'clamp(3rem,6.4vw,4.3rem)',maxWidth:'15.5ch'});

  const titleLayer=required(page,'beauty-hero-title-layer');
  patchStyle(titleLayer,'base',{width:'60%',maxWidth:'45rem'});
  patchStyle(titleLayer,'tablet',{width:'62%'});
  patchStyle(titleLayer,'mobile',{top:'10%',left:'1rem',right:'1rem',width:'auto',maxWidth:'none'});
  patchStyle(titleLayer,'base',{width:'64%',maxWidth:'48rem'});
  patchStyle(titleLayer,'tablet',{width:'66%'});

  const copyLayer=required(page,'beauty-hero-copy-layer');
  patchStyle(copyLayer,'mobile',{left:'1rem',bottom:'4.7rem',width:'auto',maxWidth:'57%'});
  const ctaLayer=required(page,'beauty-hero-primary-cta-layer');
  patchStyle(ctaLayer,'mobile',{left:'1rem',bottom:'.85rem'});

  for(const id of ['beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-routine-feature'] as const)compactSection(page,id);

  const finder=required(page,'formula-finder');
  finder.config={...finder.config,copy:'',actionLabel:'Tovább'};
  setStyleSlots(finder,{
    root:{base:{gridTemplateColumns:'minmax(0,1.8fr) minmax(12rem,.72fr)'}},
    content:{base:{padding:'1rem 1.15rem',gap:'.55rem'},mobile:{padding:'.9rem .8rem',gap:'.48rem'}},
    eyebrow:{base:{fontSize:'.58rem'}},
    title:{base:{fontSize:'1.72rem',lineHeight:.98,letterSpacing:'-.03em'},mobile:{fontSize:'1.45rem'}},
    options:{base:{gap:'.42rem'}},
    option:{base:{minHeight:'3.55rem',padding:'.42rem',gap:'.12rem'},mobile:{minHeight:'3.25rem',padding:'.36rem'}},
    optionMedia:{base:{fontSize:'1rem'}},
    optionLabel:{base:{fontSize:'.66rem'}},
    action:{base:{padding:'.52rem .95rem',fontSize:'.62rem'}},
    aside:{base:{minHeight:'10.8rem'}},
    asideContent:{base:{inset:'.8rem'}},
    asideTitle:{base:{fontSize:'.57rem'}},
    asideCopy:{base:{fontSize:'.62rem',lineHeight:1.25}},
  });

  const ingredient=required(page,'beauty-ingredient-index-block');
  setStyleSlots(ingredient,{
    root:{base:{gap:'.62rem'}},eyebrow:{base:{fontSize:'.58rem'}},header:{base:{gap:'.65rem'}},
    title:{base:{fontSize:'1.55rem',lineHeight:1,letterSpacing:'-.03em'},mobile:{fontSize:'1.35rem'}},
    copy:{base:{fontSize:'.68rem',lineHeight:1.25}},link:{base:{fontSize:'.62rem'}},grid:{base:{gap:'.38rem'}},
    media:{base:{aspectRatio:'1.48 / 1'}},cardBody:{base:{padding:'.4rem',gap:'.12rem'}},label:{base:{fontSize:'.67rem'}},
    itemCopy:{base:{fontSize:'.54rem',lineHeight:1.18,maxHeight:'1.28rem',overflow:'hidden'}},meta:{base:{fontSize:'.52rem',letterSpacing:'.07em'}},
  });

  const texture=required(page,'beauty-texture-navigation');
  const textureItems=Array.isArray(texture.config.items)?clone(texture.config.items) as Record<string,unknown>[]:[];
  const gel=textureItems[0]??{};
  const cream=textureItems[1]??{};
  const oil=textureItems[2]??{};
  const mist=textureItems[3]??{};
  const textureFallback=[
    {...gel,id:'gel',label:'GÉL',href:'/webaruhaz?texture=gel'},
    {...cream,id:'cream',label:'KRÉM',href:'/webaruhaz?texture=cream'},
    {...mist,id:'milk',label:'MILK',href:'/webaruhaz?texture=milk',copy:'Selymes, lágy emulzió'},
    {...oil,id:'oil',label:'OLAJ',href:'/webaruhaz?texture=oil'},
  ];
  texture.config={...texture.config,copy:'Érezd a különbséget.',items:textureFallback,columns:4};
  setFallback(texture,'items','catalog.textureNavigation',textureFallback);
  setStyleSlots(texture,{
    root:{base:{gap:'.62rem'}},eyebrow:{base:{fontSize:'.58rem'}},
    title:{base:{fontSize:'1.55rem',lineHeight:1,letterSpacing:'-.03em'},mobile:{fontSize:'1.35rem'}},
    copy:{base:{fontSize:'.68rem',lineHeight:1.25}},grid:{base:{gap:'.4rem'}},media:{base:{aspectRatio:'2.5 / 1'}},
    cardBody:{base:{padding:'.42rem',gap:'.1rem'}},label:{base:{fontSize:'.72rem'}},itemCopy:{base:{fontSize:'.57rem',lineHeight:1.18}},cta:{base:{fontSize:'.56rem'}},
  });

  const featured=required(page,'newFormulas');
  const featuredItems=Array.isArray(featured.config.products)?clone(featured.config.products) as Record<string,unknown>[]:[];
  const bestseller=featuredItems.find(item=>String(item.badge??'').toUpperCase()==='BESTSELLER');
  const reorderedFeatured=bestseller?[bestseller,...featuredItems.filter(item=>item!==bestseller)]:featuredItems;
  featured.config={...featured.config,products:reorderedFeatured.slice(0,5),columns:5};
  setFallback(featured,'products','catalog.newFormulas',reorderedFeatured.slice(0,5));
  setStyleSlots(featured,{
    root:{base:{gap:'.62rem'}},title:{base:{fontSize:'1.55rem',lineHeight:1}},grid:{base:{gap:'.45rem'}},card:{base:{gap:'.26rem'}},
    media:{base:{aspectRatio:'1 / 1.08'}},badge:{base:{fontSize:'.5rem',padding:'.18rem .3rem'}},body:{base:{gap:'.08rem'}},
    name:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.66rem',fontWeight:700,lineHeight:1.15}},subtitle:{base:{fontSize:'.53rem',lineHeight:1.18}},
    price:{base:{fontSize:'.62rem'}},comparePrice:{base:{fontSize:'.54rem'}},cta:{base:{padding:'.45rem .55rem',fontSize:'.56rem'}},
  });
  mergeStyleSlots(featured,{
    title:{mobile:{display:'none'}},root:{mobile:{gap:'.35rem'}},grid:{mobile:{gridTemplateColumns:'1fr',gap:'.45rem'}},
    card:{mobile:{display:'grid',gridTemplateColumns:'minmax(0,1.15fr) minmax(7.5rem,.85fr)',gridTemplateRows:'auto 1fr auto',columnGap:'.65rem',rowGap:'.25rem',minHeight:'9rem',borderTop:'1px solid #eee',paddingTop:'.6rem'}},
    mediaLink:{mobile:{gridColumn:'2',gridRow:'1 / span 3',alignSelf:'stretch'}},media:{mobile:{aspectRatio:'1 / 1.05',height:'100%'}},
    body:{mobile:{gridColumn:'1',gridRow:'1 / span 2',alignSelf:'start',gap:'.18rem'}},name:{mobile:{fontSize:'.82rem'}},subtitle:{mobile:{fontSize:'.6rem'}},price:{mobile:{fontSize:'.7rem'}},
    cta:{mobile:{gridColumn:'1',gridRow:'3',alignSelf:'end',justifySelf:'start',marginTop:0,padding:'.35rem .55rem',fontSize:'.56rem'}},
  });
  const featuredSection=required(page,'beauty-new-formulas');
  patchStyle(featuredSection,'mobile',{paddingBlock:'.55rem'});

  const desktopOrder=page.sections.map(section=>section.id);
  const mobileOrder=[
    'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-new-formulas','beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-routine-feature','beauty-concern','beauty-product-grid','beauty-ingredient-story','beauty-reviews','beauty-newsletter','beauty-home-footer',
  ];
  const current=readStorefrontFidelityMetadata(page);
  const withFidelity=writeStorefrontFidelityMetadata(page,{
    editMode:current?.editMode??'normal',
    sectionOrder:{...(current?.sectionOrder??{}),desktop:desktopOrder,mobile:mobileOrder},
    nodeOrder:current?.nodeOrder,
    designGuard:{mode:current?.designGuard?.mode??'warn',presetId:'beauty-lab-reference-v2.5-home',baselineVersion:5,protectedNodeIds:['beauty-formula-hero','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer','beauty-usp-row']},
  });

  const trust=required(withFidelity,'beauty-usp-grid');
  trust.componentKey='content.trust-strip';
  trust.componentVersion=1;
  trust.config={items:HOME_TRUST_ITEMS,columns:3,mobileColumns:3,presentation:'beauty-lab-home',styleSlots:{
    root:{base:{gap:'clamp(.75rem,2vw,1.6rem)',maxWidth:'44rem'},mobile:{gap:'.3rem',maxWidth:'none'}},
    item:{base:{gap:'.45rem'},mobile:{gap:'.28rem'}},symbol:{base:{fontSize:'.88rem'},mobile:{fontSize:'.78rem'}},
    label:{base:{fontSize:'.67rem',fontWeight:650,lineHeight:1.2},mobile:{fontSize:'.54rem',lineHeight:1.15}},
  }};
  trust.bindings={};
  setFallback(trust,'items','content.homeTrust.items',HOME_TRUST_ITEMS);
  delete trust.children;

  deferHomeSectionsAfter(withFidelity,'beauty-usp-row');
  withFidelity.metadata={
    ...(withFidelity.metadata??{}),referencePass:'beauty-lab-reference-v2.8',topFlow:'hero-trust-featured-mobile-finder-ingredient-texture-routine',
    responsiveReferenceComposition:true,referenceDensity:'compact-desktop-v1',mobileFeaturedPresentation:'single-column-bestseller-teaser',
    homeTrustStrip:'shared-content-trust-strip-v1',offscreenSectionDeferral:'shared-layout-section-v1',canonicalComposition:'flattened-v2.8-from-v2.4',
  };
  return withFidelity;
}

function buildProduct(base:StorefrontPageDocument){
  const page=clone(base);
  page.sections=page.sections.filter(section=>section.id!=='beauty-product-trust-bar');
  const sectionOrder=['beauty-product-site-header','beauty-product-main','beauty-product-tabs','beauty-product-specifications','beauty-product-related','beauty-product-explanation','beauty-product-footer'];
  const sectionById=new Map(page.sections.map(section=>[section.id,section]));
  page.sections=sectionOrder.flatMap(id=>{const section=sectionById.get(id);return section?[section]:[];});

  const info=required(page,'beauty-product-info');
  setStyleSlots(info,{
    root:{base:{gap:'.48rem'}},badge:{base:{fontSize:'.56rem',padding:'.18rem .36rem'}},
    title:{base:{fontSize:'2.2rem',lineHeight:.96},tablet:{fontSize:'2rem'},mobile:{fontSize:'1.9rem'}},
    price:{base:{fontSize:'1rem'}},description:{base:{fontSize:'.74rem',lineHeight:1.42,maxWidth:'29rem'}},
  });
  const rating=required(page,'beauty-product-rating');
  setStyleSlots(rating,{root:{base:{fontSize:'.7rem',gap:'.34rem'}},stars:{base:{fontSize:'.72rem'}},rating:{base:{fontSize:'.7rem'}},label:{base:{fontSize:'.66rem'}}});

  const buybox=required(page,'beauty-product-buybox');
  const buyboxOrder=['beauty-product-info','beauty-product-rating','beauty-product-key-specs','beauty-product-variants','beauty-product-purchase','beauty-product-trust'];
  const current=readStorefrontFidelityMetadata(page);
  const withOrder=writeStorefrontFidelityMetadata(page,{
    editMode:current?.editMode??'normal',sectionOrder:current?.sectionOrder,
    nodeOrder:{...(current?.nodeOrder??{}),[buybox.id]:{desktop:buyboxOrder,tablet:buyboxOrder,mobile:buyboxOrder}},
    designGuard:{mode:current?.designGuard?.mode??'warn',presetId:'beauty-lab-reference-v2.6-product',baselineVersion:6,protectedNodeIds:['beauty-product-main','beauty-product-layout','beauty-product-buybox','beauty-product-trust']},
  });

  const tabs=required(withOrder,'beauty-product-content-tabs');
  setStyleSlots(tabs,{
    root:{base:{borderColor:'#E8E8E8'}},nav:{base:{padding:'.72rem 0',gap:'1.35rem'}},tab:{base:{fontSize:'.62rem',letterSpacing:'.035em'}},
    panels:{base:{padding:'1rem 0',gap:'1.2rem'}},panel:{base:{gap:'.3rem'}},panelTitle:{base:{fontSize:'1rem'}},panelCopy:{base:{fontSize:'.68rem',lineHeight:1.4}},
  });

  const related=required(withOrder,'beauty-product-recommendations');
  const products=Array.isArray(related.config.products)?clone(related.config.products) as Record<string,unknown>[]:[];
  const relatedThree=products.slice(0,3);
  related.config={...related.config,columns:3,products:relatedThree,showCta:true,ctaLabel:'Kosárba'};
  setFallback(related,'products','recommendations.products',relatedThree);
  setStyleSlots(related,{
    root:{base:{gap:'.75rem'}},title:{base:{fontSize:'1.45rem'}},grid:{base:{gap:'.55rem'}},card:{base:{gap:'.24rem'}},media:{base:{aspectRatio:'1 / 1.08'}},
    name:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.64rem',fontWeight:700}},subtitle:{base:{fontSize:'.52rem'}},price:{base:{fontSize:'.6rem'}},cta:{base:{padding:'.44rem .5rem',fontSize:'.54rem'}},
  });
  for(const id of ['beauty-product-tabs','beauty-product-specifications','beauty-product-related','beauty-product-explanation'] as const)compactSection(withOrder,id,'1rem','.8rem');

  const purchase=required(withOrder,'beauty-product-purchase');
  purchase.componentKey='commerce.purchase-controls';
  purchase.componentVersion=1;
  purchase.config={
    productId:'',variantId:'',slug:'',name:'Niacinamide 10% Serum',unitPrice:8990,availableQuantity:0,minimumQuantity:1,orderMultiple:1,
    purchaseLabel:'Kosárba',wishlistLabel:'Kedvencekhez',currency:'HUF',presentation:'compact-pdp',styleSlots:{
      root:{base:{gridTemplateColumns:'5.2rem minmax(0,1fr) 2.8rem',gap:'.42rem'},mobile:{gridTemplateColumns:'5rem minmax(0,1fr) 2.75rem'}},
      quantity:{base:{minHeight:'2.75rem',borderRadius:'2px'}},step:{base:{fontSize:'.95rem'}},value:{base:{fontSize:'.7rem'}},
      purchase:{base:{minHeight:'2.75rem',borderRadius:'2px',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.68rem',fontWeight:750,letterSpacing:'.04em'}},
      wishlist:{base:{minHeight:'2.75rem',borderRadius:'2px',fontSize:'1.05rem'}},
    },
  };
  purchase.bindings={};
  setFallback(purchase,'productId','product.id','');setFallback(purchase,'variantId','variant.id','');setFallback(purchase,'slug','product.slug','');
  setFallback(purchase,'name','product.name','Niacinamide 10% Serum');setFallback(purchase,'unitPrice','pricing.unitPrice',8990);setFallback(purchase,'availableQuantity','inventory.availableQuantity',0);
  setFallback(purchase,'minimumQuantity','inventory.minimumQuantity',1);setFallback(purchase,'orderMultiple','inventory.orderMultiple',1);
  setFallback(purchase,'purchaseLabel','commerce.purchaseLabel','Kosárba');setFallback(purchase,'wishlistLabel','commerce.wishlistLabel','Kedvencekhez');

  const trust=required(withOrder,'beauty-product-trust');
  trust.componentKey='content.trust-strip';
  trust.componentVersion=1;
  trust.config={items:PRODUCT_TRUST_ITEMS,columns:3,mobileColumns:2,presentation:'compact-pdp',styleSlots:{
    root:{base:{gap:'.6rem',borderTop:'1px solid #E6E6E6',paddingTop:'.72rem'},mobile:{gap:'.32rem'}},item:{base:{gap:'.38rem'}},
    symbol:{base:{fontSize:'.82rem',color:'#4F7567'}},label:{base:{fontSize:'.58rem',lineHeight:1.18,fontWeight:600}},
  }};
  trust.bindings={};
  setFallback(trust,'items','content.productTrust.items',PRODUCT_TRUST_ITEMS);
  delete trust.children;

  const evidence:StorefrontComponentNode={
    id:'beauty-product-before-after',componentKey:'editorial.before-after',componentVersion:1,
    config:{eyebrow:'',title:'',copy:'',beforeImage:'',beforeImageAlt:'',beforeLabel:'',afterImage:'',afterImageAlt:'',afterLabel:'',caption:'',evidenceStatus:'unverified',presentation:'merchant-evidence',styleSlots:{root:{base:{paddingBlock:'.5rem'}},grid:{base:{gap:'.6rem'}}}},
    bindings:{
      eyebrow:{path:'content.beforeAfter.eyebrow',fallback:''},title:{path:'content.beforeAfter.title',fallback:''},copy:{path:'content.beforeAfter.copy',fallback:''},
      beforeImage:{path:'content.beforeAfter.beforeImage',fallback:''},beforeImageAlt:{path:'content.beforeAfter.beforeImageAlt',fallback:''},beforeLabel:{path:'content.beforeAfter.beforeLabel',fallback:''},
      afterImage:{path:'content.beforeAfter.afterImage',fallback:''},afterImageAlt:{path:'content.beforeAfter.afterImageAlt',fallback:''},afterLabel:{path:'content.beforeAfter.afterLabel',fallback:''},
      caption:{path:'content.beforeAfter.caption',fallback:''},evidenceStatus:{path:'content.beforeAfter.evidenceStatus',fallback:'unverified'},
    },
  };
  const explanation=required(withOrder,'beauty-product-explanation');
  explanation.children=[...(explanation.children??[]).filter(child=>child.id!==evidence.id),evidence];

  withOrder.metadata={
    ...(withOrder.metadata??{}),referencePass:'beauty-lab-reference-v2.8',pdpFlow:'main-tabs-ingredients-related-results',
    purchaseControls:'shared-functional-quantity-cart-wishlist-v1',operationalFallbackPolicy:'identity-and-stock-fail-closed',
    productTrustStrip:'shared-content-trust-strip-v1',beforeAfterPrimitive:'editorial.before-after@1',
    beforeAfterStatus:'wired-fail-closed-awaiting-authoritative-merchant-evidence',canonicalComposition:'flattened-v2.8-from-v2.4',
  };
  return withOrder;
}

const source=BEAUTY_LAB_REFERENCE_V24_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
const sourceProduct=source.pages.find(page=>page.pageType==='product');
if(!sourceHome||!sourceProduct)throw new Error('BEAUTY_LAB_REFERENCE_V28_SOURCE_PAGES_MISSING');

export const BEAUTY_LAB_REFERENCE_V28_HOME_PAGE=buildHome(sourceHome);
export const BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE=buildProduct(sourceProduct);
export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V28_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE:page),
};