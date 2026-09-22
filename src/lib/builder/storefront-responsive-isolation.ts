import {resolveStorefrontResponsiveOverride,resolveStorefrontResponsiveOverrideLegacyCascade,type StorefrontComponentNode,type StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  resolveStorefrontVisualStyle,
  resolveStorefrontVisualStyleLegacyCascade,
  sanitizeStorefrontVisualStyleSlot,
  type StorefrontVisualStyleConfig,
} from '@/lib/builder/storefront-visual-style';
import {STOREFRONT_RESPONSIVE_AUTHORITY_VERSION,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  resolveStorefrontTypography,
  resolveStorefrontTypographyValueLegacyCascade,
  sanitizeStorefrontTypographyValue,
} from '@/lib/builder/storefront-fidelity-typography';
import {
  readStorefrontFidelityMetadata,
  resolveStorefrontChildOrder,
  resolveStorefrontChildOrderLegacyCascade,
  resolveStorefrontImageArtDirection,
  resolveStorefrontImageArtDirectionLegacyCascade,
  resolveStorefrontSectionOrder,
  resolveStorefrontSectionOrderLegacyCascade,
  sanitizeStorefrontImageArtDirectionSource,
  writeStorefrontFidelityMetadata,
} from '@/lib/builder/storefront-fidelity-engine';

export const STOREFRONT_RESPONSIVE_ISOLATION_VERSION='shoporation.storefront-responsive-isolation.v2' as const;
export const STOREFRONT_RESPONSIVE_AUTHORITY_METADATA_KEY='responsiveAuthorityVersion' as const;

export function hasStorefrontResponsiveAuthorityV2(page:StorefrontPageDocument):boolean{
  return page.metadata?.[STOREFRONT_RESPONSIVE_AUTHORITY_METADATA_KEY]===STOREFRONT_RESPONSIVE_AUTHORITY_VERSION;
}

const VIEWPORTS:readonly StorefrontViewport[]=['desktop','tablet','mobile'];
const SLOT_KEYS=['base','desktop','tablet','mobile'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>structuredClone(value);

function isVisualStyleCandidate(value:unknown):boolean{
  if(!isRecord(value))return false;
  if(SLOT_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key)))return true;
  return Object.keys(sanitizeStorefrontVisualStyleSlot(value)).length>0;
}

export function materializeStorefrontVisualStyle(value:unknown):StorefrontVisualStyleConfig{
  if(!isRecord(value))return{};
  const usesSlots=SLOT_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  const base=usesSlots?sanitizeStorefrontVisualStyleSlot(value.base):sanitizeStorefrontVisualStyleSlot(value);
  return{
    base,
    desktop:resolveStorefrontVisualStyleLegacyCascade(value,'desktop'),
    tablet:resolveStorefrontVisualStyleLegacyCascade(value,'tablet'),
    mobile:resolveStorefrontVisualStyleLegacyCascade(value,'mobile'),
  };
}

function materializeConfig(source:StorefrontComponentNode['config']):StorefrontComponentNode['config']{
  const config=clone(source) as Record<string,unknown>;
  for(const[key,value]of Object.entries(config)){
    if(key==='styleSlots'&&isRecord(value)){
      config[key]=Object.fromEntries(Object.entries(value).map(([slot,slotValue])=>[
        slot,
        isVisualStyleCandidate(slotValue)?materializeStorefrontVisualStyle(slotValue):clone(slotValue),
      ]));
      continue;
    }
    if((key==='style'||key.endsWith('Style'))&&isVisualStyleCandidate(value)){
      config[key]=materializeStorefrontVisualStyle(value);
      continue;
    }
    if(key==='typography'&&isRecord(value)&&SLOT_KEYS.some(slot=>Object.prototype.hasOwnProperty.call(value,slot))){
      config[key]={
        base:sanitizeStorefrontTypographyValue(value.base),
        desktop:resolveStorefrontTypographyValueLegacyCascade(value,'desktop'),
        tablet:resolveStorefrontTypographyValueLegacyCascade(value,'tablet'),
        mobile:resolveStorefrontTypographyValueLegacyCascade(value,'mobile'),
      };
      continue;
    }
    if(key==='artDirection'&&isRecord(value)&&SLOT_KEYS.some(slot=>Object.prototype.hasOwnProperty.call(value,slot))){
      config[key]={
        base:sanitizeStorefrontImageArtDirectionSource(value.base),
        desktop:resolveStorefrontImageArtDirectionLegacyCascade(value,'desktop'),
        tablet:resolveStorefrontImageArtDirectionLegacyCascade(value,'tablet'),
        mobile:resolveStorefrontImageArtDirectionLegacyCascade(value,'mobile'),
      };
    }
  }
  return config as StorefrontComponentNode['config'];
}


function stableStyle(value:Record<string,unknown>):string{
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))));
}

function isMaterializedVisualStyle(value:unknown):boolean{
  if(!isRecord(value)||!SLOT_KEYS.every(key=>isRecord(value[key])))return false;
  const base=sanitizeStorefrontVisualStyleSlot(value.base);
  const desktop=sanitizeStorefrontVisualStyleSlot(value.desktop);
  const tablet=sanitizeStorefrontVisualStyleSlot(value.tablet);
  const mobile=sanitizeStorefrontVisualStyleSlot(value.mobile);
  return stableStyle(base)===stableStyle(sanitizeStorefrontVisualStyleSlot(value.base))
    &&stableStyle(desktop)===stableStyle(resolveStorefrontVisualStyle(value,'desktop'))
    &&stableStyle(tablet)===stableStyle(resolveStorefrontVisualStyle(value,'tablet'))
    &&stableStyle(mobile)===stableStyle(resolveStorefrontVisualStyle(value,'mobile'));
}

export function listUnmaterializedStorefrontVisualSurfaces(page:StorefrontPageDocument):string[]{
  const issues:string[]=[];
  const visit=(node:StorefrontComponentNode)=>{
    const config=node.config as Record<string,unknown>;
    for(const[key,value]of Object.entries(config)){
      if(key==='styleSlots'&&isRecord(value)){
        for(const[slot,slotValue]of Object.entries(value)){
          if(isVisualStyleCandidate(slotValue)&&!isMaterializedVisualStyle(slotValue))issues.push(`${node.id}.styleSlots.${slot}`);
        }
        continue;
      }
      if((key==='style'||key.endsWith('Style'))&&isVisualStyleCandidate(value)&&!isMaterializedVisualStyle(value)){
        issues.push(`${node.id}.${key}`);
      }
    }
    for(const child of node.children??[])visit(child);
  };
  for(const section of page.sections)visit(section);
  return issues.sort();
}

export function listUnmaterializedStorefrontViewportAuthorities(page:StorefrontPageDocument):string[]{
  const issues=[...listUnmaterializedStorefrontVisualSurfaces(page)];
  const complete=(value:unknown)=>isRecord(value)&&VIEWPORTS.every(viewport=>isRecord(value[viewport]));
  const visit=(node:StorefrontComponentNode)=>{
    if(node.responsive&&!VIEWPORTS.every(viewport=>isRecord(node.responsive?.[viewport])))issues.push(`${node.id}.responsive`);
    const typography=node.config.typography;
    if(isRecord(typography)&&SLOT_KEYS.some(slot=>Object.prototype.hasOwnProperty.call(typography,slot))&&!complete(typography))issues.push(`${node.id}.typography`);
    const artDirection=node.config.artDirection;
    if(isRecord(artDirection)&&SLOT_KEYS.some(slot=>Object.prototype.hasOwnProperty.call(artDirection,slot))&&!complete(artDirection))issues.push(`${node.id}.artDirection`);
    for(const child of node.children??[])visit(child);
  };
  for(const section of page.sections)visit(section);
  const fidelity=readStorefrontFidelityMetadata(page);
  if(fidelity?.sectionOrder&&!VIEWPORTS.every(viewport=>Array.isArray(fidelity.sectionOrder?.[viewport])))issues.push('metadata.fidelity.sectionOrder');
  for(const[parentId,order]of Object.entries(fidelity?.nodeOrder??{})){
    if(!VIEWPORTS.every(viewport=>Array.isArray(order[viewport])))issues.push(`metadata.fidelity.nodeOrder.${parentId}`);
  }
  return[...new Set(issues)].sort();
}

export function materializeStorefrontNodeResponsiveStyles(source:StorefrontComponentNode):StorefrontComponentNode{
  const responsive=source.responsive?{
    desktop:resolveStorefrontResponsiveOverrideLegacyCascade(source,'desktop'),
    tablet:resolveStorefrontResponsiveOverrideLegacyCascade(source,'tablet'),
    mobile:resolveStorefrontResponsiveOverrideLegacyCascade(source,'mobile'),
  }:undefined;
  return{
    ...clone(source),
    config:materializeConfig(source.config),
    ...(responsive?{responsive}:{}),
    ...(source.children?{children:source.children.map(materializeStorefrontNodeResponsiveStyles)}:{}),
  };
}

function findNodeById(nodes:readonly StorefrontComponentNode[],id:string):StorefrontComponentNode|undefined{
  for(const node of nodes){
    if(node.id===id)return node;
    const child=findNodeById(node.children??[],id);
    if(child)return child;
  }
  return undefined;
}

export function materializeStorefrontPageResponsiveStyles(source:StorefrontPageDocument):StorefrontPageDocument{
  let next={...clone(source),sections:source.sections.map(materializeStorefrontNodeResponsiveStyles)};
  const fidelity=readStorefrontFidelityMetadata(source);
  if(!fidelity)return{
    ...next,
    metadata:{
      ...(next.metadata??{}),
      [STOREFRONT_RESPONSIVE_AUTHORITY_METADATA_KEY]:STOREFRONT_RESPONSIVE_AUTHORITY_VERSION,
    },
  };

  const sectionOrder=fidelity.sectionOrder?{
    desktop:resolveStorefrontSectionOrderLegacyCascade(source,'desktop'),
    tablet:resolveStorefrontSectionOrderLegacyCascade(source,'tablet'),
    mobile:resolveStorefrontSectionOrderLegacyCascade(source,'mobile'),
  }:undefined;

  const nodeOrder=fidelity.nodeOrder?Object.fromEntries(Object.keys(fidelity.nodeOrder).flatMap(parentId=>{
    const parent=findNodeById(source.sections,parentId);
    if(!parent)return[];
    return[[parentId,{
      desktop:resolveStorefrontChildOrderLegacyCascade(source,parent,'desktop'),
      tablet:resolveStorefrontChildOrderLegacyCascade(source,parent,'tablet'),
      mobile:resolveStorefrontChildOrderLegacyCascade(source,parent,'mobile'),
    }]];
  })):undefined;

  next=writeStorefrontFidelityMetadata(next,{
    ...(fidelity.editMode?{editMode:fidelity.editMode}:{}),
    ...(sectionOrder?{sectionOrder}:{}),
    ...(nodeOrder?{nodeOrder}:{}),
    ...(fidelity.designGuard?{designGuard:clone(fidelity.designGuard)}:{}),
  });
  return{
    ...next,
    metadata:{
      ...(next.metadata??{}),
      [STOREFRONT_RESPONSIVE_AUTHORITY_METADATA_KEY]:STOREFRONT_RESPONSIVE_AUTHORITY_VERSION,
    },
  };
}

export function materializeStorefrontTemplateResponsiveStyles(source:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  return{
    ...clone(source),
    pages:source.pages.map(page=>hasStorefrontResponsiveAuthorityV2(page)?clone(page):materializeStorefrontPageResponsiveStyles(page)),
  };
}

type VisualSurfaceState=Record<string,unknown>;
function collectNodeState(page:StorefrontPageDocument,node:StorefrontComponentNode,viewport:StorefrontViewport,result:VisualSurfaceState){
  result[`${node.id}.responsive`]=resolveStorefrontResponsiveOverride(node,viewport);
  if(node.children?.length)result[`${node.id}.childOrder`]=resolveStorefrontChildOrder(page,node,viewport);
  const config=node.config as Record<string,unknown>;
  for(const[key,value]of Object.entries(config)){
    if(key==='styleSlots'&&isRecord(value)){
      for(const[slot,slotValue]of Object.entries(value)){
        if(isVisualStyleCandidate(slotValue))result[`${node.id}.styleSlots.${slot}`]=resolveStorefrontVisualStyle(slotValue,viewport);
      }
      continue;
    }
    if((key==='style'||key.endsWith('Style'))&&isVisualStyleCandidate(value)){
      result[`${node.id}.${key}`]=resolveStorefrontVisualStyle(value,viewport);
      continue;
    }
    if(key==='typography'&&isRecord(value))result[`${node.id}.typography`]=resolveStorefrontTypography(value,viewport);
    if(key==='artDirection'&&isRecord(value))result[`${node.id}.artDirection`]=resolveStorefrontImageArtDirection(value,viewport);
  }
  for(const child of node.children??[])collectNodeState(page,child,viewport,result);
}

export function collectStorefrontEffectiveVisualState(page:StorefrontPageDocument,viewport:StorefrontViewport):VisualSurfaceState{
  const result:VisualSurfaceState={
    'page.sectionOrder':resolveStorefrontSectionOrder(page,viewport),
  };
  for(const section of page.sections)collectNodeState(page,section,viewport,result);
  return result;
}


export function assertStorefrontViewportIsolation(input:{
  before:StorefrontPageDocument;
  after:StorefrontPageDocument;
  allowedViewports:readonly StorefrontViewport[];
  label?:string;
}):void{
  const allowed=new Set(input.allowedViewports);
  for(const viewport of VIEWPORTS){
    if(allowed.has(viewport))continue;
    const before=collectStorefrontEffectiveVisualState(input.before,viewport);
    const after=collectStorefrontEffectiveVisualState(input.after,viewport);
    const keys=new Set([...Object.keys(before),...Object.keys(after)]);
    for(const key of keys){
      const a=before[key],b=after[key];
      if(JSON.stringify(a)!==JSON.stringify(b)){
        throw new Error(`STOREFRONT_VIEWPORT_ISOLATION_VIOLATION:${input.label??'page'}:${viewport}:${key}`);
      }
    }
  }
}


/**
 * Runtime compatibility boundary.
 * Historical persisted Page Schema documents have no v2 authority marker and
 * are materialized in memory with the legacy cascade before the exact-viewport
 * Runtime consumes them. Current v2 documents pass through unchanged.
 */
export function ensureStorefrontResponsiveAuthority(page:StorefrontPageDocument):StorefrontPageDocument{
  return hasStorefrontResponsiveAuthorityV2(page)?page:materializeStorefrontPageResponsiveStyles(page);
}
