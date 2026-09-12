import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V27_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v27';

export const BEAUTY_LAB_REFERENCE_V28_VERSION='shoporation.beauty-lab-reference-v2.8' as const;

const clone=<T>(value:T):T=>structuredClone(value);

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
  const trust=required(page,'beauty-usp-grid');
  trust.componentKey='content.trust-strip';
  trust.componentVersion=1;
  trust.config={
    items:HOME_TRUST_ITEMS,
    columns:3,
    mobileColumns:3,
    presentation:'beauty-lab-home',
    styleSlots:{
      root:{base:{gap:'clamp(.75rem,2vw,1.6rem)',maxWidth:'44rem'},mobile:{gap:'.3rem',maxWidth:'none'}},
      item:{base:{gap:'.45rem'},mobile:{gap:'.28rem'}},
      symbol:{base:{fontSize:'.88rem'},mobile:{fontSize:'.78rem'}},
      label:{base:{fontSize:'.67rem',fontWeight:650,lineHeight:1.2},mobile:{fontSize:'.54rem',lineHeight:1.15}},
    },
  };
  trust.bindings={};
  setFallback(trust,'items','content.homeTrust.items',HOME_TRUST_ITEMS);
  delete trust.children;
  page.metadata={
    ...(page.metadata??{}),
    referencePass:'beauty-lab-reference-v2.8',
    homeTrustStrip:'shared-content-trust-strip-v1',
  };
  return page;
}

function buildProduct(base:StorefrontPageDocument){
  const page=clone(base);
  const trust=required(page,'beauty-product-trust');
  trust.componentKey='content.trust-strip';
  trust.componentVersion=1;
  trust.config={
    items:PRODUCT_TRUST_ITEMS,
    columns:3,
    mobileColumns:2,
    presentation:'compact-pdp',
    styleSlots:{
      root:{base:{gap:'.6rem',borderTop:'1px solid #E6E6E6',paddingTop:'.72rem'},mobile:{gap:'.32rem'}},
      item:{base:{gap:'.38rem'}},
      symbol:{base:{fontSize:'.82rem',color:'#4F7567'}},
      label:{base:{fontSize:'.58rem',lineHeight:1.18,fontWeight:600}},
    },
  };
  trust.bindings={};
  setFallback(trust,'items','content.productTrust.items',PRODUCT_TRUST_ITEMS);
  delete trust.children;

  const evidence:StorefrontComponentNode={
    id:'beauty-product-before-after',
    componentKey:'editorial.before-after',
    componentVersion:1,
    config:{
      eyebrow:'',title:'',copy:'',
      beforeImage:'',beforeImageAlt:'',beforeLabel:'',
      afterImage:'',afterImageAlt:'',afterLabel:'',
      caption:'',evidenceStatus:'unverified',presentation:'merchant-evidence',
      styleSlots:{root:{base:{paddingBlock:'.5rem'}},grid:{base:{gap:'.6rem'}}},
    },
    bindings:{
      eyebrow:{path:'content.beforeAfter.eyebrow',fallback:''},
      title:{path:'content.beforeAfter.title',fallback:''},
      copy:{path:'content.beforeAfter.copy',fallback:''},
      beforeImage:{path:'content.beforeAfter.beforeImage',fallback:''},
      beforeImageAlt:{path:'content.beforeAfter.beforeImageAlt',fallback:''},
      beforeLabel:{path:'content.beforeAfter.beforeLabel',fallback:''},
      afterImage:{path:'content.beforeAfter.afterImage',fallback:''},
      afterImageAlt:{path:'content.beforeAfter.afterImageAlt',fallback:''},
      afterLabel:{path:'content.beforeAfter.afterLabel',fallback:''},
      caption:{path:'content.beforeAfter.caption',fallback:''},
      evidenceStatus:{path:'content.beforeAfter.evidenceStatus',fallback:'unverified'},
    },
  };
  const explanation=required(page,'beauty-product-explanation');
  explanation.children=[...(explanation.children??[]).filter(child=>child.id!==evidence.id),evidence];

  page.metadata={
    ...(page.metadata??{}),
    referencePass:'beauty-lab-reference-v2.8',
    productTrustStrip:'shared-content-trust-strip-v1',
    beforeAfterPrimitive:'editorial.before-after@1',
    beforeAfterStatus:'wired-fail-closed-awaiting-authoritative-merchant-evidence',
  };
  return page;
}

const source=BEAUTY_LAB_REFERENCE_V27_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
const sourceProduct=source.pages.find(page=>page.pageType==='product');
if(!sourceHome||!sourceProduct)throw new Error('BEAUTY_LAB_REFERENCE_V28_SOURCE_PAGES_MISSING');

export const BEAUTY_LAB_REFERENCE_V28_HOME_PAGE=buildHome(sourceHome);
export const BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE=buildProduct(sourceProduct);
export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V28_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_REFERENCE_V28_PRODUCT_PAGE:page),
};
