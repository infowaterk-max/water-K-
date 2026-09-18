import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION='shoporation.storefront-digital-commerce-composition.v1' as const;

export const STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE=Object.freeze({
  product:['commerce.fulfillment-summary','commerce.product-documents'],
  cart:['commerce.fulfillment-summary'],
  checkout:['commerce.fulfillment-summary','commerce.post-purchase-guidance'],
  account:['commerce.documents-center','commerce.post-purchase-guidance'],
} as const);

type SupportedPageType=keyof typeof STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE;

const clone=<T>(value:T):T=>structuredClone(value);
const node=(value:StorefrontComponentNode)=>value;
const idPart=(value:string)=>value.replace(/[^A-Za-z0-9._:-]/g,'-').slice(0,72)||'page';

function hasComponent(nodes:readonly StorefrontComponentNode[],componentKey:string):boolean{
  return nodes.some(item=>item.componentKey===componentKey||hasComponent(item.children??[],componentKey));
}

function defaultConfig(componentKey:string):Record<string,unknown>{
  switch(componentKey){
    case'commerce.fulfillment-summary':return{title:'Teljesítés és kézbesítés',documentCenterLabel:'Dokumentumok és letöltések'};
    case'commerce.product-documents':return{eyebrow:'Dokumentumok',title:'Termékdokumentumok',downloadLabel:'Dokumentum letöltése',loginLabel:'Belépés a fiókba'};
    case'commerce.documents-center':return{eyebrow:'Saját fiók',title:'Dokumentumok és letöltések',digitalTitle:'Digitális tartalmak',orderTitle:'Rendelési dokumentumok',productTitle:'Termékdokumentumok',emptyLabel:'Még nincs megjeleníthető dokumentum vagy letölthető tartalom.',loginLabel:'Belépés a fiókba'};
    case'commerce.post-purchase-guidance':return{eyebrow:'Vásárlás után',title:'Hozzáférés és dokumentumok',pendingLabel:'Fizetés után elérhető',documentCenterLabel:'Dokumentumok és letöltések'};
    default:return{};
  }
}

/**
 * Adds only Page Schema composition. Commerce truth remains runtime/server-owned.
 * The function is deliberately template-agnostic so current and future template
 * packages can use the same capability nodes without a backend/runtime fork.
 */
export function composeStorefrontDigitalCommerceCapabilities(
  document:StorefrontPageDocument,
  options:{presentation?:string}={},
):StorefrontPageDocument{
  const required=STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE[document.pageType as SupportedPageType];
  if(!required)return clone(document);
  const missing=required.filter(componentKey=>!hasComponent(document.sections,componentKey));
  if(!missing.length)return clone(document);
  const prefix=`shared-${idPart(document.pageKey)}-digital-commerce`;
  const capabilityNodes=missing.map((componentKey,index)=>node({
    id:`${prefix}-${index+1}`,
    componentKey,
    componentVersion:1,
    config:{...defaultConfig(componentKey),...(options.presentation?{presentation:options.presentation}:{})},
  }));
  const section=node({
    id:prefix,
    componentKey:'layout.section',
    componentVersion:1,
    config:{tone:'background',spacing:'s',width:'full',...(options.presentation?{presentation:options.presentation}:{})},
    children:[node({
      id:`${prefix}-container`,
      componentKey:'layout.container',
      componentVersion:1,
      config:{width:'content',spacing:'s',...(options.presentation?{presentation:options.presentation}:{})},
      children:capabilityNodes,
    })],
  });
  return{...clone(document),sections:[...clone(document.sections),section]};
}
