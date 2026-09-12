import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {readStorefrontFidelityMetadata,writeStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V25_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v25';

export const BEAUTY_LAB_REFERENCE_V26_VERSION='shoporation.beauty-lab-reference-v2.6' as const;

const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function flatten(page:StorefrontPageDocument){
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const section of page.sections)visit(section);
  return result;
}

function required(page:StorefrontPageDocument,id:string){
  const found=flatten(page).find(node=>node.id===id);
  if(!found)throw new Error(`BEAUTY_LAB_REFERENCE_V26_NODE_MISSING:${id}`);
  return found;
}

function setFallback(node:StorefrontComponentNode,slot:string,path:string,fallback:unknown){
  node.bindings={...(node.bindings??{}),[slot]:{path,fallback}};
}

function patchResponsiveStyle(node:StorefrontComponentNode,viewport:'base'|'desktop'|'tablet'|'mobile',patch:Record<string,unknown>){
  const current=isRecord(node.config.style)?clone(node.config.style):{};
  const responsive=['base','desktop','tablet','mobile'].some(key=>Object.prototype.hasOwnProperty.call(current,key));
  if(!responsive){node.config={...node.config,style:{base:{...current,...patch}}};return;}
  const slot=isRecord(current[viewport])?current[viewport] as Record<string,unknown>:{};
  node.config={...node.config,style:{...current,[viewport]:{...slot,...patch}}};
}

function setStyleSlots(node:StorefrontComponentNode,slots:Record<string,unknown>){
  node.config={...node.config,styleSlots:slots};
}

function compactSection(page:StorefrontPageDocument,id:string,desktop='.85rem',mobile='.72rem'){
  const section=required(page,id);
  section.config={...section.config,spacing:'none'};
  patchResponsiveStyle(section,'base',{paddingBlock:desktop});
  patchResponsiveStyle(section,'mobile',{paddingBlock:mobile});
}

function buildHome(base:StorefrontPageDocument){
  const page=clone(base);

  const title=required(page,'beauty-hero-title');
  patchResponsiveStyle(title,'base',{fontSize:'clamp(3.25rem,5.15vw,5.05rem)',maxWidth:'15.5ch',lineHeight:.86});
  patchResponsiveStyle(title,'tablet',{fontSize:'clamp(3rem,6.4vw,4.3rem)',maxWidth:'15.5ch'});
  const titleLayer=required(page,'beauty-hero-title-layer');
  patchResponsiveStyle(titleLayer,'base',{width:'64%',maxWidth:'48rem'});
  patchResponsiveStyle(titleLayer,'tablet',{width:'66%'});

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
    root:{base:{gap:'.62rem'}},
    eyebrow:{base:{fontSize:'.58rem'}},
    header:{base:{gap:'.65rem'}},
    title:{base:{fontSize:'1.55rem',lineHeight:1,letterSpacing:'-.03em'},mobile:{fontSize:'1.35rem'}},
    copy:{base:{fontSize:'.68rem',lineHeight:1.25}},
    link:{base:{fontSize:'.62rem'}},
    grid:{base:{gap:'.38rem'}},
    media:{base:{aspectRatio:'1.48 / 1'}},
    cardBody:{base:{padding:'.4rem',gap:'.12rem'}},
    label:{base:{fontSize:'.67rem'}},
    itemCopy:{base:{fontSize:'.54rem',lineHeight:1.18,maxHeight:'1.28rem',overflow:'hidden'}},
    meta:{base:{fontSize:'.52rem',letterSpacing:'.07em'}},
  });

  const texture=required(page,'beauty-texture-navigation');
  texture.config={...texture.config,copy:'Érezd a különbséget.'};
  setStyleSlots(texture,{
    root:{base:{gap:'.62rem'}},
    eyebrow:{base:{fontSize:'.58rem'}},
    title:{base:{fontSize:'1.55rem',lineHeight:1,letterSpacing:'-.03em'},mobile:{fontSize:'1.35rem'}},
    copy:{base:{fontSize:'.68rem',lineHeight:1.25}},
    grid:{base:{gap:'.4rem'}},
    media:{base:{aspectRatio:'2.5 / 1'}},
    cardBody:{base:{padding:'.42rem',gap:'.1rem'}},
    label:{base:{fontSize:'.72rem'}},
    itemCopy:{base:{fontSize:'.57rem',lineHeight:1.18}},
    cta:{base:{fontSize:'.56rem'}},
  });

  const featured=required(page,'newFormulas');
  setStyleSlots(featured,{
    root:{base:{gap:'.62rem'}},
    title:{base:{fontSize:'1.55rem',lineHeight:1}},
    grid:{base:{gap:'.45rem'}},
    card:{base:{gap:'.26rem'}},
    media:{base:{aspectRatio:'1 / 1.08'}},
    badge:{base:{fontSize:'.5rem',padding:'.18rem .3rem'}},
    body:{base:{gap:'.08rem'}},
    name:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.66rem',fontWeight:700,lineHeight:1.15}},
    subtitle:{base:{fontSize:'.53rem',lineHeight:1.18}},
    price:{base:{fontSize:'.62rem'}},
    comparePrice:{base:{fontSize:'.54rem'}},
    cta:{base:{padding:'.45rem .55rem',fontSize:'.56rem'}},
  });

  page.metadata={...(page.metadata??{}),referencePass:'beauty-lab-reference-v2.6',referenceDensity:'compact-desktop-v1'};
  return page;
}

function trustItem(id:string,symbol:string,label:string):StorefrontComponentNode{
  return{
    id:`beauty-product-trust-${id}`,
    componentKey:'layout.stack',componentVersion:1,
    config:{direction:'horizontal',gap:'xs',align:'center',justify:'start',style:{base:{display:'flex',flexDirection:'row',alignItems:'center',gap:'.38rem'}}},
    responsive:{desktop:{gridSpan:1},tablet:{gridSpan:1},mobile:{gridSpan:1}},
    children:[
      {id:`beauty-product-trust-${id}-symbol`,componentKey:'content.text',componentVersion:1,config:{text:symbol,as:'strong',align:'left',tone:'text',style:{base:{fontSize:'.82rem',lineHeight:1,color:'#4F7567'}}}},
      {id:`beauty-product-trust-${id}-label`,componentKey:'content.text',componentVersion:1,config:{text:label,as:'small',align:'left',tone:'muted',style:{base:{fontSize:'.58rem',lineHeight:1.18}}}},
    ],
  };
}

function buildProduct(base:StorefrontPageDocument){
  const page=clone(base);

  page.sections=page.sections.filter(section=>section.id!=='beauty-product-trust-bar');
  const sectionOrder=['beauty-product-site-header','beauty-product-main','beauty-product-tabs','beauty-product-specifications','beauty-product-related','beauty-product-explanation','beauty-product-footer'];
  const sectionById=new Map(page.sections.map(section=>[section.id,section]));
  page.sections=sectionOrder.flatMap(id=>{const section=sectionById.get(id);return section?[section]:[];});

  const info=required(page,'beauty-product-info');
  setStyleSlots(info,{
    root:{base:{gap:'.48rem'}},
    badge:{base:{fontSize:'.56rem',padding:'.18rem .36rem'}},
    title:{base:{fontSize:'2.2rem',lineHeight:.96},tablet:{fontSize:'2rem'},mobile:{fontSize:'1.9rem'}},
    price:{base:{fontSize:'1rem'}},
    description:{base:{fontSize:'.74rem',lineHeight:1.42,maxWidth:'29rem'}},
  });

  const rating=required(page,'beauty-product-rating');
  setStyleSlots(rating,{
    root:{base:{fontSize:'.7rem',gap:'.34rem'}},
    stars:{base:{fontSize:'.72rem'}},
    rating:{base:{fontSize:'.7rem'}},
    label:{base:{fontSize:'.66rem'}},
  });

  const buybox=required(page,'beauty-product-buybox');
  const buyboxOrder=['beauty-product-info','beauty-product-rating','beauty-product-key-specs','beauty-product-variants','beauty-product-purchase','beauty-product-trust'];
  const current=readStorefrontFidelityMetadata(page);
  const withOrder=writeStorefrontFidelityMetadata(page,{
    editMode:current?.editMode??'normal',
    sectionOrder:current?.sectionOrder,
    nodeOrder:{...(current?.nodeOrder??{}),[buybox.id]:{desktop:buyboxOrder,tablet:buyboxOrder,mobile:buyboxOrder}},
    designGuard:{
      mode:current?.designGuard?.mode??'warn',
      presetId:'beauty-lab-reference-v2.6-product',
      baselineVersion:6,
      protectedNodeIds:['beauty-product-main','beauty-product-layout','beauty-product-buybox','beauty-product-trust'],
    },
  });

  const trust=required(withOrder,'beauty-product-trust');
  trust.componentKey='layout.grid';
  trust.componentVersion=1;
  trust.config={columns:3,gap:'s',align:'center',presentation:'trust-strip',style:{base:{gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'.6rem',borderTop:'1px solid #E6E6E6',paddingTop:'.72rem'},mobile:{gap:'.32rem'}}};
  delete trust.bindings;
  trust.children=[
    trustItem('stock','◌','Raktáron'),
    trustItem('shipping','♧','Ingyenes szállítás 20 000 Ft felett'),
    trustItem('returns','✓','30 napos visszaküldés'),
  ];

  const tabs=required(withOrder,'beauty-product-content-tabs');
  setStyleSlots(tabs,{
    root:{base:{borderColor:'#E8E8E8'}},
    nav:{base:{padding:'.72rem 0',gap:'1.35rem'}},
    tab:{base:{fontSize:'.62rem',letterSpacing:'.035em'}},
    panels:{base:{padding:'1rem 0',gap:'1.2rem'}},
    panel:{base:{gap:'.3rem'}},
    panelTitle:{base:{fontSize:'1rem'}},
    panelCopy:{base:{fontSize:'.68rem',lineHeight:1.4}},
  });

  const related=required(withOrder,'beauty-product-recommendations');
  const products=Array.isArray(related.config.products)?clone(related.config.products) as Record<string,unknown>[]:[];
  const relatedThree=products.slice(0,3);
  related.config={...related.config,columns:3,products:relatedThree,showCta:true,ctaLabel:'Kosárba'};
  setFallback(related,'products','recommendations.products',relatedThree);
  setStyleSlots(related,{
    root:{base:{gap:'.75rem'}},
    title:{base:{fontSize:'1.45rem'}},
    grid:{base:{gap:'.55rem'}},
    card:{base:{gap:'.24rem'}},
    media:{base:{aspectRatio:'1 / 1.08'}},
    name:{base:{fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.64rem',fontWeight:700}},
    subtitle:{base:{fontSize:'.52rem'}},
    price:{base:{fontSize:'.6rem'}},
    cta:{base:{padding:'.44rem .5rem',fontSize:'.54rem'}},
  });

  for(const id of ['beauty-product-tabs','beauty-product-specifications','beauty-product-related','beauty-product-explanation'] as const)compactSection(withOrder,id,'1rem','.8rem');
  withOrder.metadata={...(withOrder.metadata??{}),referencePass:'beauty-lab-reference-v2.6',pdpFlow:'main-tabs-ingredients-related-results'};
  return withOrder;
}

const source=BEAUTY_LAB_REFERENCE_V25_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
const sourceProduct=source.pages.find(page=>page.pageType==='product');
if(!sourceHome||!sourceProduct)throw new Error('BEAUTY_LAB_REFERENCE_V26_SOURCE_PAGES_MISSING');

export const BEAUTY_LAB_REFERENCE_V26_HOME_PAGE=buildHome(sourceHome);
export const BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE=buildProduct(sourceProduct);

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V26_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_REFERENCE_V26_PRODUCT_PAGE:page),
};
