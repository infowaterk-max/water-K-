import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_FIDELITY_BEHAVIOR_VERSION='shoporation.visual-builder-behavior.v1' as const;
export const STOREFRONT_CONTENT_DISCLOSURE_MODES=['static','tabs','accordion','responsive'] as const;
export type StorefrontContentDisclosureMode=typeof STOREFRONT_CONTENT_DISCLOSURE_MODES[number];
export type StorefrontResolvedContentDisclosureMode=Exclude<StorefrontContentDisclosureMode,'responsive'>;
export type StorefrontContentTabsBehavior={mode:StorefrontContentDisclosureMode;defaultIndex:number;allowCollapse:boolean};
export type StorefrontMobileCollectionBehavior={mobileMode:'grid'|'carousel';mobilePeek:number};
export type StorefrontBehaviorKind='content-disclosure'|'mobile-carousel';

const DISCLOSURE_SET=new Set<string>(STOREFRONT_CONTENT_DISCLOSURE_MODES);
const MOBILE_CAROUSEL_COMPONENTS=new Set(['commerce.collection-navigation','commerce.product-grid','commerce.recommendation-row']);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

export function storefrontBehaviorKind(componentKey:string):StorefrontBehaviorKind|null{
  if(componentKey==='commerce.content-tabs')return'content-disclosure';
  if(MOBILE_CAROUSEL_COMPONENTS.has(componentKey))return'mobile-carousel';
  return null;
}

export function sanitizeStorefrontContentTabsBehavior(value:unknown):StorefrontContentTabsBehavior{
  const input=isRecord(value)?value:{};
  const requestedMode=typeof input.mode==='string'&&DISCLOSURE_SET.has(input.mode)?input.mode as StorefrontContentDisclosureMode:'static';
  const rawIndex=typeof input.defaultIndex==='number'&&Number.isFinite(input.defaultIndex)?Math.trunc(input.defaultIndex):0;
  return{mode:requestedMode,defaultIndex:clamp(rawIndex,0,50),allowCollapse:input.allowCollapse===true};
}

export function resolveStorefrontContentTabsMode(value:unknown,viewport:StorefrontViewport):StorefrontResolvedContentDisclosureMode{
  const behavior=sanitizeStorefrontContentTabsBehavior(value);
  if(behavior.mode!=='responsive')return behavior.mode;
  return viewport==='mobile'?'accordion':'tabs';
}

export function sanitizeStorefrontMobileCollectionBehavior(value:unknown):StorefrontMobileCollectionBehavior{
  const input=isRecord(value)?value:{};
  const mobileMode=input.mobileMode==='carousel'?'carousel':'grid';
  const rawPeek=typeof input.mobilePeek==='number'&&Number.isFinite(input.mobilePeek)?input.mobilePeek:.82;
  return{mobileMode,mobilePeek:clamp(rawPeek,.6,.95)};
}

export function sanitizeStorefrontBehavior(componentKey:string,value:unknown):StorefrontContentTabsBehavior|StorefrontMobileCollectionBehavior|null{
  const kind=storefrontBehaviorKind(componentKey);
  if(kind==='content-disclosure')return sanitizeStorefrontContentTabsBehavior(value);
  if(kind==='mobile-carousel')return sanitizeStorefrontMobileCollectionBehavior(value);
  return null;
}

export function isStorefrontMobileCarouselActive(componentKey:string,value:unknown,viewport:StorefrontViewport){
  return viewport==='mobile'&&storefrontBehaviorKind(componentKey)==='mobile-carousel'&&sanitizeStorefrontMobileCollectionBehavior(value).mobileMode==='carousel';
}

function findNode(nodes:StorefrontComponentNode[],nodeId:string):StorefrontComponentNode|null{
  for(const node of nodes){
    if(node.id===nodeId)return node;
    const found=findNode(node.children??[],nodeId);
    if(found)return found;
  }
  return null;
}

/** Builder mutation surface: behavior stays bounded to the shared component contract. */
export function setStorefrontNodeBehavior(document:StorefrontPageDocument,nodeId:string,value:unknown|null):StorefrontPageDocument{
  const next=structuredClone(document);
  const node=findNode(next.sections,nodeId);
  if(!node)throw new Error('FIDELITY_NODE_NOT_FOUND');
  if(!storefrontBehaviorKind(node.componentKey))throw new Error('FIDELITY_BEHAVIOR_COMPONENT_UNSUPPORTED');
  const config={...node.config};
  if(value===null)delete config.behavior;
  else{
    const sanitized=sanitizeStorefrontBehavior(node.componentKey,value);
    if(!sanitized)throw new Error('FIDELITY_BEHAVIOR_COMPONENT_UNSUPPORTED');
    config.behavior=sanitized;
  }
  node.config=config;
  return next;
}
