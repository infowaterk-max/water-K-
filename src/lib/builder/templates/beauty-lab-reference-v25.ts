import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {readStorefrontFidelityMetadata,writeStorefrontFidelityMetadata} from '@/lib/builder/storefront-fidelity-engine';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V24_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v2';

export const BEAUTY_LAB_REFERENCE_V25_VERSION='shoporation.beauty-lab-reference-v2.5' as const;

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
  if(!found)throw new Error(`BEAUTY_LAB_REFERENCE_V25_NODE_MISSING:${id}`);
  return found;
}

function setFallback(node:StorefrontComponentNode,slot:string,path:string,fallback:unknown){
  node.bindings={...(node.bindings??{}),[slot]:{path,fallback}};
}

function patchStyle(node:StorefrontComponentNode,viewport:typeof VIEWPORTS[number],patch:Record<string,unknown>){
  const current=isRecord(node.config.style)?clone(node.config.style):{};
  const slotted=VIEWPORTS.some(key=>Object.prototype.hasOwnProperty.call(current,key));
  if(!slotted){
    node.config={...node.config,style:{base:{...current,...patch}}};
    return;
  }
  const slot=isRecord(current[viewport])?current[viewport] as Record<string,unknown>:{};
  node.config={...node.config,style:{...current,[viewport]:{...slot,...patch}}};
}

function compactSection(page:StorefrontPageDocument,id:string,basePadding='1.45rem',mobilePadding='1.05rem'){
  const section=required(page,id);
  section.config={...section.config,spacing:'none'};
  patchStyle(section,'base',{paddingBlock:basePadding});
  patchStyle(section,'mobile',{paddingBlock:mobilePadding});
}

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

  const titleLayer=required(page,'beauty-hero-title-layer');
  patchStyle(titleLayer,'base',{width:'60%',maxWidth:'45rem'});
  patchStyle(titleLayer,'tablet',{width:'62%'});
  patchStyle(titleLayer,'mobile',{top:'10%',left:'1rem',right:'1rem',width:'auto',maxWidth:'none'});

  const copyLayer=required(page,'beauty-hero-copy-layer');
  patchStyle(copyLayer,'mobile',{left:'1rem',bottom:'4.7rem',width:'auto',maxWidth:'57%'});
  const ctaLayer=required(page,'beauty-hero-primary-cta-layer');
  patchStyle(ctaLayer,'mobile',{left:'1rem',bottom:'.85rem'});

  const compactIds=['beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-new-formulas','beauty-routine-feature'] as const;
  compactIds.forEach(id=>compactSection(page,id));

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
  texture.config={...texture.config,copy:'Gél, krém, milk vagy olaj — válassz érzet alapján.',items:textureFallback,columns:4};
  setFallback(texture,'items','catalog.textureNavigation',textureFallback);

  const featured=required(page,'newFormulas');
  const featuredItems=Array.isArray(featured.config.products)?clone(featured.config.products) as Record<string,unknown>[]:[];
  const bestseller=featuredItems.find(item=>String(item.badge??'').toUpperCase()==='BESTSELLER');
  const reorderedFeatured=bestseller?[bestseller,...featuredItems.filter(item=>item!==bestseller)]:featuredItems;
  featured.config={...featured.config,products:reorderedFeatured.slice(0,5),columns:5};
  setFallback(featured,'products','catalog.newFormulas',reorderedFeatured.slice(0,5));

  const desktopOrder=page.sections.map(section=>section.id);
  const mobileOrder=[
    'beauty-home-site-header','beauty-formula-hero','beauty-usp-row','beauty-new-formulas','beauty-formula-finder','beauty-ingredient-index','beauty-texture-lab','beauty-routine-feature','beauty-concern','beauty-product-grid','beauty-ingredient-story','beauty-reviews','beauty-newsletter','beauty-home-footer',
  ];
  const current=readStorefrontFidelityMetadata(page);
  const withFidelity=writeStorefrontFidelityMetadata(page,{
    editMode:current?.editMode??'normal',
    sectionOrder:{...(current?.sectionOrder??{}),desktop:desktopOrder,mobile:mobileOrder},
    nodeOrder:current?.nodeOrder,
    designGuard:{
      mode:current?.designGuard?.mode??'warn',
      presetId:'beauty-lab-reference-v2.5-home',
      baselineVersion:5,
      protectedNodeIds:['beauty-formula-hero','beauty-hero-title-layer','beauty-hero-copy-layer','beauty-hero-primary-cta-layer','beauty-usp-row'],
    },
  });
  withFidelity.metadata={
    ...(withFidelity.metadata??{}),
    referencePass:'beauty-lab-reference-v2.5',
    topFlow:'hero-trust-featured-mobile-finder-ingredient-texture-routine',
    responsiveReferenceComposition:true,
  };
  return withFidelity;
}

const source=BEAUTY_LAB_REFERENCE_V24_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
if(!sourceHome)throw new Error('BEAUTY_LAB_REFERENCE_V25_HOME_MISSING');

export const BEAUTY_LAB_REFERENCE_V25_HOME_PAGE=buildHome(sourceHome);

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V25_HOME_PAGE:page),
};
