import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {BEAUTY_LAB_TEMPLATE_PACKAGE as BEAUTY_LAB_REFERENCE_V26_PACKAGE} from '@/lib/builder/templates/beauty-lab-reference-v26';

export const BEAUTY_LAB_REFERENCE_V27_VERSION='shoporation.beauty-lab-reference-v2.7' as const;

const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function flatten(page:StorefrontPageDocument){
  const result:StorefrontComponentNode[]=[];
  const visit=(node:StorefrontComponentNode)=>{result.push(node);for(const child of node.children??[])visit(child);};
  for(const section of page.sections)visit(section);
  return result;
}
function required(page:StorefrontPageDocument,id:string){const found=flatten(page).find(node=>node.id===id);if(!found)throw new Error(`BEAUTY_LAB_REFERENCE_V27_NODE_MISSING:${id}`);return found;}
function setFallback(node:StorefrontComponentNode,slot:string,path:string,fallback:unknown){node.bindings={...(node.bindings??{}),[slot]:{path,fallback}};}
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

function buildHome(base:StorefrontPageDocument){
  const page=clone(base);
  const featured=required(page,'newFormulas');
  mergeStyleSlots(featured,{
    title:{mobile:{display:'none'}},
    root:{mobile:{gap:'.35rem'}},
    grid:{mobile:{gridTemplateColumns:'1fr',gap:'.45rem'}},
    card:{mobile:{display:'grid',gridTemplateColumns:'minmax(0,1.15fr) minmax(7.5rem,.85fr)',gridTemplateRows:'auto 1fr auto',columnGap:'.65rem',rowGap:'.25rem',minHeight:'9rem',borderTop:'1px solid #eee',paddingTop:'.6rem'}},
    mediaLink:{mobile:{gridColumn:'2',gridRow:'1 / span 3',alignSelf:'stretch'}},
    media:{mobile:{aspectRatio:'1 / 1.05',height:'100%'}},
    body:{mobile:{gridColumn:'1',gridRow:'1 / span 2',alignSelf:'start',gap:'.18rem'}},
    name:{mobile:{fontSize:'.82rem'}},
    subtitle:{mobile:{fontSize:'.6rem'}},
    price:{mobile:{fontSize:'.7rem'}},
    cta:{mobile:{gridColumn:'1',gridRow:'3',alignSelf:'end',justifySelf:'start',marginTop:0,padding:'.35rem .55rem',fontSize:'.56rem'}},
  });
  const section=required(page,'beauty-new-formulas');
  const style=isRecord(section.config.style)?clone(section.config.style):{};
  const mobile=isRecord(style.mobile)?style.mobile as Record<string,unknown>:{};
  section.config={...section.config,style:{...style,mobile:{...mobile,paddingBlock:'.55rem'}}};
  page.metadata={...(page.metadata??{}),referencePass:'beauty-lab-reference-v2.7',mobileFeaturedPresentation:'single-column-bestseller-teaser'};
  return page;
}

function buildProduct(base:StorefrontPageDocument){
  const page=clone(base);
  const purchase=required(page,'beauty-product-purchase');
  purchase.componentKey='commerce.purchase-controls';
  purchase.componentVersion=1;
  purchase.config={
    productId:'',variantId:'',slug:'',name:'Niacinamide 10% Serum',unitPrice:8990,availableQuantity:0,minimumQuantity:1,orderMultiple:1,
    purchaseLabel:'Kosárba',wishlistLabel:'Kedvencekhez',currency:'HUF',presentation:'compact-pdp',
    styleSlots:{
      root:{base:{gridTemplateColumns:'5.2rem minmax(0,1fr) 2.8rem',gap:'.42rem'},mobile:{gridTemplateColumns:'5rem minmax(0,1fr) 2.75rem'}},
      quantity:{base:{minHeight:'2.75rem',borderRadius:'2px'}},
      step:{base:{fontSize:'.95rem'}},
      value:{base:{fontSize:'.7rem'}},
      purchase:{base:{minHeight:'2.75rem',borderRadius:'2px',fontFamily:'Arial, Helvetica, sans-serif',fontSize:'.68rem',fontWeight:750,letterSpacing:'.04em'}},
      wishlist:{base:{minHeight:'2.75rem',borderRadius:'2px',fontSize:'1.05rem'}},
    },
  };
  purchase.bindings={};
  setFallback(purchase,'productId','product.id','');
  setFallback(purchase,'variantId','variant.id','');
  setFallback(purchase,'slug','product.slug','');
  setFallback(purchase,'name','product.name','Niacinamide 10% Serum');
  setFallback(purchase,'unitPrice','pricing.unitPrice',8990);
  setFallback(purchase,'availableQuantity','inventory.availableQuantity',0);
  setFallback(purchase,'minimumQuantity','inventory.minimumQuantity',1);
  setFallback(purchase,'orderMultiple','inventory.orderMultiple',1);
  setFallback(purchase,'purchaseLabel','commerce.purchaseLabel','Kosárba');
  setFallback(purchase,'wishlistLabel','commerce.wishlistLabel','Kedvencekhez');

  page.metadata={
    ...(page.metadata??{}),
    referencePass:'beauty-lab-reference-v2.7',
    purchaseControls:'shared-functional-quantity-cart-wishlist-v1',
    operationalFallbackPolicy:'identity-and-stock-fail-closed',
    beforeAfterStatus:'deferred-until-authoritative-merchant-evidence-media-exists',
  };
  return page;
}

const source=BEAUTY_LAB_REFERENCE_V26_PACKAGE;
const sourceHome=source.pages.find(page=>page.pageType==='home');
const sourceProduct=source.pages.find(page=>page.pageType==='product');
if(!sourceHome||!sourceProduct)throw new Error('BEAUTY_LAB_REFERENCE_V27_SOURCE_PAGES_MISSING');

export const BEAUTY_LAB_REFERENCE_V27_HOME_PAGE=buildHome(sourceHome);
export const BEAUTY_LAB_REFERENCE_V27_PRODUCT_PAGE=buildProduct(sourceProduct);
export const BEAUTY_LAB_TEMPLATE_PACKAGE:StorefrontInstallableTemplatePackage={
  ...source,
  pages:source.pages.map(page=>page.pageType==='home'?BEAUTY_LAB_REFERENCE_V27_HOME_PAGE:page.pageType==='product'?BEAUTY_LAB_REFERENCE_V27_PRODUCT_PAGE:page),
};
