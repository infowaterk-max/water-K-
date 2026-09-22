import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontInstallableTemplatePackage} from '@/lib/builder/storefront-template-installation';
import {
  resolveStorefrontVisualStyle,
  resolveStorefrontVisualStyleLegacyCascade,
  sanitizeStorefrontVisualStyleSlot,
  type StorefrontVisualStyleConfig,
} from '@/lib/builder/storefront-visual-style';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';

export const STOREFRONT_RESPONSIVE_ISOLATION_VERSION='shoporation.storefront-responsive-isolation.v1' as const;

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

export function materializeStorefrontNodeResponsiveStyles(source:StorefrontComponentNode):StorefrontComponentNode{
  return{
    ...clone(source),
    config:materializeConfig(source.config),
    ...(source.children?{children:source.children.map(materializeStorefrontNodeResponsiveStyles)}:{}),
  };
}

export function materializeStorefrontPageResponsiveStyles(source:StorefrontPageDocument):StorefrontPageDocument{
  return{...clone(source),sections:source.sections.map(materializeStorefrontNodeResponsiveStyles)};
}

export function materializeStorefrontTemplateResponsiveStyles(source:StorefrontInstallableTemplatePackage):StorefrontInstallableTemplatePackage{
  return{...clone(source),pages:source.pages.map(materializeStorefrontPageResponsiveStyles)};
}

type VisualSurfaceState=Record<string,unknown>;
function collectNodeState(node:StorefrontComponentNode,viewport:StorefrontViewport,result:VisualSurfaceState){
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
    }
  }
  for(const child of node.children??[])collectNodeState(child,viewport,result);
}

export function collectStorefrontEffectiveVisualState(page:StorefrontPageDocument,viewport:StorefrontViewport):VisualSurfaceState{
  const result:VisualSurfaceState={};
  for(const section of page.sections)collectNodeState(section,viewport,result);
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
