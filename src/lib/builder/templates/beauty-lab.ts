import {createStorefrontPresetBundle} from '@/lib/builder/storefront-presets';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import * as fidelity from '@/lib/builder/templates/beauty-lab-fidelity';

export {
  BEAUTY_LAB_TEMPLATE_KEY,
  BEAUTY_LAB_TEMPLATE_VERSION,
  BEAUTY_LAB_DESIGN_TOKENS,
  BEAUTY_LAB_ENGINE_CONTRACT,
  BEAUTY_LAB_CATALOG_PAGE,
  BEAUTY_LAB_PRODUCT_PAGE,
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

/**
 * Wave 32 is a released schema/API contract. Visual Fidelity Pilot 01 may evolve
 * the rendered composition, but the public Beauty Lab module must preserve these
 * historical semantic identities for installed drafts, migrations and tests.
 */
export const BEAUTY_LAB_VISUAL_DNA=Object.freeze({
  ...fidelity.BEAUTY_LAB_VISUAL_DNA,
  journey:'formula-to-ingredient-to-texture-to-guided-choice-to-product',
} as const);

export const BEAUTY_LAB_MARKETING_LAYER_CONTRACT=Object.freeze({
  ...fidelity.BEAUTY_LAB_MARKETING_LAYER_CONTRACT,
  hero:['image','overlay','decoration','badge','title','copy','primary-cta','secondary-cta'] as const,
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

/** New fidelity semantics stay explicitly available without redefining Wave 32. */
export const BEAUTY_LAB_FIDELITY_VISUAL_DNA=fidelity.BEAUTY_LAB_VISUAL_DNA;
export const BEAUTY_LAB_FIDELITY_MARKETING_LAYER_CONTRACT=fidelity.BEAUTY_LAB_MARKETING_LAYER_CONTRACT;
export const BEAUTY_LAB_FIDELITY_HOME_SECTION_ORDER=fidelity.BEAUTY_LAB_HOME_SECTION_ORDER;

const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const hiddenResponsive=()=>({desktop:{hidden:true},tablet:{hidden:true},mobile:{hidden:true}});
const compatibilityLayer=(id:string,children:StorefrontComponentNode[]=[]):StorefrontComponentNode=>({
  id,
  componentKey:'visual.layer',
  componentVersion:1,
  config:{position:'full',offsetX:'none',offsetY:'none',zIndex:0,width:'auto',height:'auto',tone:'transparent',padding:'none',opacity:0,pointerEvents:'none'},
  responsive:hiddenResponsive(),
  children,
});

const compatibilityImage=(id:string,srcPath:string,altPath:string):StorefrontComponentNode=>({
  id,
  componentKey:'content.image',
  componentVersion:1,
  config:{src:'',alt:'',width:1,height:1,fit:'cover',loading:'lazy',radius:'none'},
  bindings:{src:{path:srcPath,fallback:''},alt:{path:altPath,fallback:''}},
});

const compatibilityHeading=(id:string):StorefrontComponentNode=>({
  id,
  componentKey:'content.heading',
  componentVersion:1,
  config:{text:'',level:1,align:'left',tone:'text'},
  bindings:{text:{path:'content.formulaHero.title',fallback:'YOUR SKIN. YOUR FORMULA.'}},
});

const compatibilityButton=(id:string,labelPath:string,hrefPath:string,label:string):StorefrontComponentNode=>({
  id,
  componentKey:'content.button',
  componentVersion:1,
  config:{label,href:'#formula-finder',variant:'secondary',size:'m',ariaLabel:label},
  bindings:{label:{path:labelPath,fallback:label},href:{path:hrefPath,fallback:'#formula-finder'}},
});

function walk(nodes:StorefrontComponentNode[],visit:(node:StorefrontComponentNode)=>void){
  for(const node of nodes){visit(node);walk(node.children??[],visit);}
}

function buildCompatibilityHome():StorefrontPageDocument{
  const page=clone(fidelity.BEAUTY_LAB_HOME_PAGE);
  let hero:StorefrontComponentNode|undefined;
  let badge:StorefrontComponentNode|undefined;
  walk(page.sections,node=>{
    if(node.id==='beauty-formula-hero')hero=node;
    if(node.id==='beauty-hero-badge')badge=node;
  });
  if(!hero)throw new Error('BEAUTY_LAB_COMPATIBILITY_HERO_MISSING');

  if(badge){
    badge.bindings={...(badge.bindings??{}),text:{path:'content.formulaHero.badge',fallback:'CLEAN BEAUTY'}};
  }

  const existing=new Set((hero.children??[]).map(node=>node.id));
  const aliases:StorefrontComponentNode[]=[
    compatibilityLayer('beauty-hero-image-layer',[compatibilityImage('beauty-hero-image-wave32-binding','content.formulaHero.image','content.formulaHero.imageAlt')]),
    compatibilityLayer('beauty-hero-overlay-layer'),
    compatibilityLayer('beauty-hero-decoration-layer',[compatibilityImage('beauty-hero-decoration-wave32-binding','content.formulaHero.decoration','content.formulaHero.decorationAlt')]),
    compatibilityLayer('beauty-hero-title-layer',[compatibilityHeading('beauty-hero-title-wave32-binding')]),
    compatibilityLayer('beauty-hero-primary-cta-layer',[compatibilityButton('beauty-hero-primary-cta-wave32-binding','content.formulaHero.primaryLabel','content.formulaHero.primaryHref','Találd meg a formulád')]),
    compatibilityLayer('beauty-hero-secondary-cta-layer',[compatibilityButton('beauty-hero-secondary-cta-wave32-binding','content.formulaHero.secondaryLabel','content.formulaHero.secondaryHref','Összetevők')]),
  ];
  hero.children=[...(hero.children??[]),...aliases.filter(node=>!existing.has(node.id))];

  return{
    ...page,
    metadata:{
      ...page.metadata,
      sectionOrder:BEAUTY_LAB_HOME_SECTION_ORDER,
      visualFidelitySectionOrder:BEAUTY_LAB_FIDELITY_HOME_SECTION_ORDER,
      visualFidelityJourney:BEAUTY_LAB_FIDELITY_VISUAL_DNA.journey,
      compatibilityContract:'wave32-preserved-under-visual-fidelity-pilot01',
    },
  };
}

export const BEAUTY_LAB_HOME_PAGE=buildCompatibilityHome();

export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...fidelity.BEAUTY_LAB_TEMPLATE_PACKAGE,
  pages:fidelity.BEAUTY_LAB_TEMPLATE_PACKAGE.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_HOME_PAGE:page),
};

export const BEAUTY_LAB_PRESET_BUNDLE=createStorefrontPresetBundle(BEAUTY_LAB_TEMPLATE_PACKAGE);
