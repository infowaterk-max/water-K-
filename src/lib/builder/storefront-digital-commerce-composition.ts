import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';

export const STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION='shoporation.storefront-digital-commerce-composition.v4' as const;

export const STOREFRONT_DIGITAL_COMMERCE_COMPONENTS_BY_PAGE_TYPE=Object.freeze({
  product:['commerce.downloads-tile'],
  cart:[],
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

function isDeprecatedCartDigitalCommerceSection(section:StorefrontComponentNode):boolean{
  return section.id.endsWith('-digital-commerce')&&hasComponent([section],'commerce.fulfillment-summary');
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
  'commerce.size-selector',
  'commerce.purchase-controls',
  'commerce.add-to-cart',
  'content.button',
]);

function subtreeHasAny(node:StorefrontComponentNode,keys:Set<string>):boolean{
  return keys.has(node.componentKey)||(node.children??[]).some(child=>subtreeHasAny(child,keys));
}

function downloadsFactsHostScore(item:StorefrontComponentNode):number{
  const children=item.children??[];
  if(!children.length)return 0;
  const factBranches=children.filter(child=>subtreeHasAny(child,DOWNLOADS_FACT_COMPONENT_KEYS)).length;
  const purchaseBranches=children.filter(child=>subtreeHasAny(child,DOWNLOADS_PURCHASE_COMPONENT_KEYS)).length;
  if(!factBranches)return 0;
  const isLayout=['layout.section','layout.container','layout.grid','layout.stack'].includes(item.componentKey);
  if(!isLayout)return 0;
  // A buybox with one nested key-spec block is not a facts cluster.
  if(purchaseBranches>0&&factBranches<2)return 0;
  const gridBonus=item.componentKey==='layout.grid'?16:item.componentKey==='layout.container'?10:item.componentKey==='layout.section'?8:2;
  const multiFactBonus=factBranches>1?24:0;
  const purchasePenalty=purchaseBranches*10;
  return factBranches*12+gridBonus+multiFactBonus-purchasePenalty;
}

function findDownloadsFactsHostId(nodes:readonly StorefrontComponentNode[]):string|null{
  let bestId:string|null=null;
  let bestScore=0;
  const visit=(items:readonly StorefrontComponentNode[])=>{
    for(const item of items){
      const score=downloadsFactsHostScore(item);
      if(score>bestScore){
        bestId=item.id;
        bestScore=score;
      }
      if(item.children?.length)visit(item.children);
    }
  };
  visit(nodes);
  return bestId;
}

function withGridSpan(item:StorefrontComponentNode,desktop:4|6|12,tablet:4|6|12,mobile:12):StorefrontComponentNode{
  return{
    ...clone(item),
    responsive:{
      ...(item.responsive??{}),
      desktop:{...(item.responsive?.desktop??{}),gridSpan:desktop},
      tablet:{...(item.responsive?.tablet??{}),gridSpan:tablet},
      mobile:{...(item.responsive?.mobile??{}),gridSpan:mobile},
    },
  };
}

function appendNodeToTarget(nodes:readonly StorefrontComponentNode[],targetId:string,child:StorefrontComponentNode):StorefrontComponentNode[]{
  return nodes.map(item=>{
    const next=clone(item);
    if(next.id===targetId){
      let children=[...(next.children??[])];
      let compactChild:StorefrontComponentNode={
        ...clone(child),
        config:{...child.config,presentation:'facts-tile'},
      };
      if(next.componentKey==='layout.grid'){
        if(children.length===2){
          children=children.map(entry=>withGridSpan(entry,4,4,12));
          compactChild=withGridSpan(compactChild,4,4,12);
        }else if(children.length===1){
          children=children.map(entry=>withGridSpan(entry,6,6,12));
          compactChild=withGridSpan(compactChild,6,6,12);
        }else{
          compactChild=withGridSpan(compactChild,4,6,12);
        }
      }
      if(!children.some(entry=>entry.componentKey===compactChild.componentKey))children.push(compactChild);
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

  const next=clone(document);
  if(next.pageType==='product'){
    next.sections=next.sections.filter(section=>!isLegacyProductDigitalCommerceSection(section));
    next.sections=embedStandaloneDownloadsIntoFacts(next.sections);
  }
  if(next.pageType==='cart')next.sections=next.sections.filter(section=>!isDeprecatedCartDigitalCommerceSection(section));
  if(next.metadata?.digitalCommerceCompositionVersion===STOREFRONT_DIGITAL_COMMERCE_COMPOSITION_VERSION
    &&required.every(componentKey=>hasComponent(next.sections,componentKey)))return next;
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
