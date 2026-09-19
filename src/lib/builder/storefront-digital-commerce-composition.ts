import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION='shoporation.storefront-digital-commerce-composition.v4' as const;

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

function findComponentNode(nodes:readonly StorefrontComponentNode[],componentKey:string):StorefrontComponentNode|null{
  for(const item of nodes){
    if(item.componentKey===componentKey)return clone(item);
    const nested=findComponentNode(item.children??[],componentKey);
    if(nested)return nested;
  }
  return null;
}

const DOWNLOADS_FACT_COMPONENT_KEYS=new Set([
  'commerce.key-specs',
  'commerce.specification-groups',
  'commerce.technical-documents',
  'compatibility.evidence',
  'compatibility.status',
]);

const DOWNLOADS_PURCHASE_COMPONENT_KEYS=new Set([
  'commerce.product-info',
  'commerce.option-selector',
  'commerce.variant-swatches',
  'commerce.purchase-controls',
  'commerce.add-to-cart',
]);

function downloadsFactsHostScore(item:StorefrontComponentNode):number{
  const keys=(item.children??[]).map(child=>child.componentKey);
  const factCount=keys.filter(key=>DOWNLOADS_FACT_COMPONENT_KEYS.has(key)).length;
  if(!factCount)return 0;
  const purchaseCount=keys.filter(key=>DOWNLOADS_PURCHASE_COMPONENT_KEYS.has(key)).length;
  const layoutBonus=['layout.container','layout.grid'].includes(item.componentKey)?4:0;
  const richFactsBonus=keys.some(key=>['commerce.specification-groups','commerce.technical-documents','compatibility.evidence','compatibility.status'].includes(key))?4:0;
  const multiFactsBonus=factCount>1?6:0;
  const purchasePenalty=purchaseCount?18:0;
  return factCount*10+layoutBonus+richFactsBonus+multiFactsBonus-purchasePenalty;
}

function findDownloadsFactsHostId(nodes:readonly StorefrontComponentNode[]):string|null{
  let best:{id:string;score:number}|null=null;
  const visit=(items:readonly StorefrontComponentNode[])=>{
    for(const item of items){
      const score=downloadsFactsHostScore(item);
      if(score>0&&(!best||score>best.score))best={id:item.id,score};
      if(item.children?.length)visit(item.children);
    }
  };
  visit(nodes);
  return best?.id??null;
}

function appendNodeToTarget(nodes:readonly StorefrontComponentNode[],targetId:string,child:StorefrontComponentNode):StorefrontComponentNode[]{
  return nodes.map(item=>{
    const next=clone(item);
    if(next.id===targetId){
      const children=[...(next.children??[])];
      if(!children.some(entry=>entry.componentKey===child.componentKey))children.push(clone(child));
      return{...next,children};
    }
    if(next.children?.length)return{...next,children:appendNodeToTarget(next.children,targetId,child)};
    return next;
  });
}

function embedStandaloneDownloadsIntoFacts(sections:readonly StorefrontComponentNode[]):StorefrontComponentNode[]{
  const hostId=findDownloadsFactsHostId(sections);
  if(!hostId)return sections.map(clone);
  const standalone=sections.find(section=>section.id.endsWith('-digital-commerce')&&hasComponent([section],'commerce.downloads-tile'));
  if(!standalone)return sections.map(clone);
  const tile=findComponentNode([standalone],'commerce.downloads-tile');
  if(!tile)return sections.map(clone);
  const withoutStandalone=sections.filter(section=>section.id!==standalone.id).map(clone);
  return appendNodeToTarget(withoutStandalone,hostId,tile);
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
  if(next.pageType==='product'){
    next.sections=next.sections.filter(section=>!isLegacyProductDigitalCommerceSection(section));
    next.sections=embedStandaloneDownloadsIntoFacts(next.sections);
  }
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
    if(next.pageType==='product')next.sections=embedStandaloneDownloadsIntoFacts(next.sections);
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
