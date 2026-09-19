import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION='shoporation.storefront-digital-commerce-composition.v2' as const;

export const STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE=Object.freeze({
  product:['commerce.downloads-tile'],
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

function isLegacyProductDigitalCommerceSection(section:StorefrontComponentNode):boolean{
  if(!section.id.endsWith('-digital-commerce'))return false;
  const hasLegacy=hasComponent([section],'commerce.fulfillment-summary')||hasComponent([section],'commerce.product-documents');
  const hasPriorityTile=hasComponent([section],'commerce.downloads-tile');
  return hasLegacy&&!hasPriorityTile;
}

function containsProductPrimarySurface(nodes:readonly StorefrontComponentNode[]):boolean{
  return nodes.some(item=>
    ['commerce.product-gallery','commerce.product-info','commerce.variant-swatches','commerce.option-selector','commerce.purchase-controls','commerce.add-to-cart'].includes(item.componentKey)
    ||containsProductPrimarySurface(item.children??[])
  );
}

function isHeaderSection(item:StorefrontComponentNode):boolean{
  return item.componentKey==='system.commerce-header'||item.componentKey==='editorial.header'||item.componentKey.endsWith('.header');
}

function resolveCapabilityInsertIndex(document:StorefrontPageDocument):number{
  if(document.pageType==='product'){
    const primary=document.sections.findIndex(section=>containsProductPrimarySurface([section]));
    if(primary>=0)return primary+1;
    const firstContent=document.sections.findIndex(section=>!isHeaderSection(section));
    if(firstContent>=0)return firstContent+1;
    return 0;
  }
  const footer=document.sections.findIndex(item=>item.componentKey==='editorial.footer'||item.componentKey.endsWith('.footer'));
  return footer>=0?footer:document.sections.length;
}

function defaultConfig(componentKey:string):Record<string,unknown>{
  switch(componentKey){
    case'commerce.downloads-tile':return{eyebrow:'LETÖLTÉSEK',title:'Letöltések',documentsLabel:'Dokumentumok',digitalLabel:'Digitális termék',digitalAccountCopy:'Vásárlás után a letöltés a Fiókom → Letöltéseim menüpontban érhető el.',openLabel:'Megnyitás',presentation:'priority-tile'};
    case'commerce.fulfillment-summary':return{title:'Teljesítés és kézbesítés',documentCenterLabel:'Dokumentumok és letöltések'};
    case'commerce.product-documents':return{eyebrow:'Dokumentumok',title:'Termékdokumentumok',downloadLabel:'Dokumentum letöltése',loginLabel:'Belépés a fiókba'};
    case'commerce.documents-center':return{eyebrow:'Saját fiók',title:'Letöltéseim',digitalTitle:'Digitális vásárlások',orderTitle:'Rendelési dokumentumok',productTitle:'Termékdokumentumok',emptyLabel:'Még nincs megjeleníthető dokumentum vagy letölthető tartalom.',loginLabel:'Belépés a fiókba'};
    case'commerce.post-purchase-guidance':return{eyebrow:'Vásárlás után',title:'Hozzáférés és dokumentumok',pendingLabel:'Fizetés után elérhető',documentCenterLabel:'Fiókom → Letöltéseim'};
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
  if(document.metadata?.digitalCommerceCompositionVersion===STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION)return clone(document);

  const next=clone(document);
  if(next.pageType==='product')next.sections=next.sections.filter(section=>!isLegacyProductDigitalCommerceSection(section));
  const missing=required.filter(componentKey=>!hasComponent(next.sections,componentKey));
  const prefix=`shared-${idPart(next.pageKey)}-digital-commerce`;

  if(missing.length){
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
    const insertIndex=resolveCapabilityInsertIndex(next);
    next.sections.splice(insertIndex,0,section);
  }

  next.metadata={
    ...(next.metadata??{}),
    digitalCommerceCompositionVersion:STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION,
  };
  return next;
}

/** Applies the same shared composition contract to a complete template package. */
export function composeStorefrontDigitalCommerceTemplatePackage<T extends StorefrontInstallableTemplatePackage>(template:T):T{
  return{
    ...clone(template),
    pages:template.pages.map(page=>composeStorefrontDigitalCommerceCapabilities(page)),
  } as T;
}
