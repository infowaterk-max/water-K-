import type {StorefrontGridSpan,StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {sanitizeStorefrontVisualStyleSlot,type StorefrontVisualStyleConfig,type StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_LAYOUT_VERSION='shoporation.visual-builder-fidelity-layout.v1' as const;

export const STOREFRONT_GRID_SELF_ALIGNMENTS=['auto','start','center','end','stretch'] as const;
export type StorefrontGridSelfAlignment=typeof STOREFRONT_GRID_SELF_ALIGNMENTS[number];
export type StorefrontGridPlacement={
  span?:number;
  start?:number;
  end?:number;
  order?:number;
  alignSelf?:StorefrontGridSelfAlignment;
  justifySelf?:StorefrontGridSelfAlignment;
};
export type StorefrontGridPlacementInspection={
  direct:StorefrontGridPlacement;
  hasOverride:boolean;
};

const VIEWPORT_STYLE_KEYS=['base','desktop','tablet','mobile'] as const;
const GRID_PLACEMENT_STYLE_KEYS=['gridColumn','order','alignSelf','justifySelf'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>structuredClone(value);
const integer=(value:unknown,min:number,max:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=max?value:undefined;

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode|null{
  const walk=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return node;
      const nested=walk(node.children??[]);if(nested)return nested;
    }
    return null;
  };
  return walk(document.sections);
}

function mutateNode(document:StorefrontPageDocument,nodeId:string,mutate:(node:StorefrontComponentNode)=>void){
  const next=clone(document);
  const node=findNode(next,nodeId);if(!node)throw new Error('FIDELITY_LAYOUT_NODE_NOT_FOUND');
  mutate(node);
  return next;
}

function normalizeResponsiveStyle(value:unknown):StorefrontVisualStyleConfig{
  if(!isRecord(value))return{};
  const responsive=VIEWPORT_STYLE_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!responsive){
    const base=sanitizeStorefrontVisualStyleSlot(value);
    return Object.keys(base).length?{base}:{};
  }
  const result:StorefrontVisualStyleConfig={};
  for(const key of VIEWPORT_STYLE_KEYS){
    const slot=sanitizeStorefrontVisualStyleSlot(value[key]);
    if(Object.keys(slot).length)result[key]=slot;
  }
  return result;
}

function directViewportStyle(node:StorefrontComponentNode,viewport:StorefrontViewport){
  const style=normalizeResponsiveStyle(node.config.style);
  return{style,slot:{...(style[viewport]??{})}};
}

function cleanViewportStyle(node:StorefrontComponentNode,viewport:StorefrontViewport,style:StorefrontVisualStyleConfig,slot:StorefrontVisualStyleSlot){
  const sanitized=sanitizeStorefrontVisualStyleSlot(slot);
  if(Object.keys(sanitized).length)style[viewport]=sanitized;else delete style[viewport];
  if(Object.keys(style).length)node.config={...node.config,style};else{
    const config={...node.config};delete config.style;node.config=config;
  }
}

export function sanitizeStorefrontGridPlacement(value:StorefrontGridPlacement):StorefrontGridPlacement{
  const result:StorefrontGridPlacement={};
  const span=integer(value.span,1,12);if(span!==undefined)result.span=span;
  const start=integer(value.start,1,12);if(start!==undefined)result.start=start;
  const end=integer(value.end,2,13);if(end!==undefined&&(start===undefined||end>start))result.end=end;
  const order=integer(value.order,-20,20);if(order!==undefined)result.order=order;
  if(value.alignSelf&&STOREFRONT_GRID_SELF_ALIGNMENTS.includes(value.alignSelf))result.alignSelf=value.alignSelf;
  if(value.justifySelf&&STOREFRONT_GRID_SELF_ALIGNMENTS.includes(value.justifySelf))result.justifySelf=value.justifySelf;
  return result;
}

function gridColumnValue(value:StorefrontGridPlacement){
  if(value.start!==undefined&&value.end!==undefined)return`${value.start} / ${value.end}`;
  if(value.start!==undefined&&value.span!==undefined)return`${value.start} / span ${value.span}`;
  if(value.start!==undefined)return`${value.start} / auto`;
  if(value.end!==undefined&&value.span!==undefined)return`span ${value.span} / ${value.end}`;
  if(value.end!==undefined)return`auto / ${value.end}`;
  return undefined;
}

function parseGridColumn(value:unknown):Pick<StorefrontGridPlacement,'start'|'end'>{
  if(typeof value!=='string')return{};
  const direct=value.match(/^(\d+)\s*\/\s*(\d+)$/);if(direct)return{start:Number(direct[1]),end:Number(direct[2])};
  const start=value.match(/^(\d+)\s*\/\s*(?:span\s+\d+|auto)$/);if(start)return{start:Number(start[1])};
  const end=value.match(/^(?:span\s+\d+|auto)\s*\/\s*(\d+)$/);if(end)return{end:Number(end[1])};
  return{};
}

export function inspectStorefrontGridPlacement(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport):StorefrontGridPlacementInspection{
  const node=findNode(document,nodeId);if(!node)throw new Error('FIDELITY_LAYOUT_NODE_NOT_FOUND');
  const directResponsive=node.responsive?.[viewport];
  const directStyle=directViewportStyle(node,viewport).slot;
  const parsed=parseGridColumn(directStyle.gridColumn);
  const direct:StorefrontGridPlacement={...parsed};
  if(typeof directResponsive?.gridSpan==='number')direct.span=directResponsive.gridSpan;
  if(typeof directStyle.order==='number')direct.order=directStyle.order;
  if(typeof directStyle.alignSelf==='string'&&STOREFRONT_GRID_SELF_ALIGNMENTS.includes(directStyle.alignSelf as StorefrontGridSelfAlignment))direct.alignSelf=directStyle.alignSelf as StorefrontGridSelfAlignment;
  if(typeof directStyle.justifySelf==='string'&&STOREFRONT_GRID_SELF_ALIGNMENTS.includes(directStyle.justifySelf as StorefrontGridSelfAlignment))direct.justifySelf=directStyle.justifySelf as StorefrontGridSelfAlignment;
  return{direct,hasOverride:Object.keys(direct).length>0};
}

export function setStorefrontResponsiveGridPlacement(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,value:StorefrontGridPlacement|null){
  return mutateNode(document,nodeId,node=>{
    const nextResponsive={...(node.responsive??{})};
    const viewportResponsive={...(nextResponsive[viewport]??{})};
    const{style,slot}=directViewportStyle(node,viewport);
    for(const key of GRID_PLACEMENT_STYLE_KEYS)delete slot[key];
    if(value===null){
      delete viewportResponsive.gridSpan;
    }else{
      const sanitized=sanitizeStorefrontGridPlacement(value);
      if(sanitized.span!==undefined)viewportResponsive.gridSpan=sanitized.span as StorefrontGridSpan;else delete viewportResponsive.gridSpan;
      const gridColumn=gridColumnValue(sanitized);if(gridColumn)slot.gridColumn=gridColumn;
      if(sanitized.order!==undefined)slot.order=sanitized.order;
      if(sanitized.alignSelf&&sanitized.alignSelf!=='auto')slot.alignSelf=sanitized.alignSelf;
      if(sanitized.justifySelf&&sanitized.justifySelf!=='auto')slot.justifySelf=sanitized.justifySelf;
    }
    if(Object.keys(viewportResponsive).length)nextResponsive[viewport]=viewportResponsive;else delete nextResponsive[viewport];
    node.responsive=Object.keys(nextResponsive).length?nextResponsive:undefined;
    cleanViewportStyle(node,viewport,style,slot);
  });
}

export function resetStorefrontResponsiveGridPlacement(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport){
  return setStorefrontResponsiveGridPlacement(document,nodeId,viewport,null);
}

function sanitizedTrackWeights(value:readonly number[]){
  if(value.length<1||value.length>12)throw new Error('FIDELITY_GRID_TRACK_COUNT_INVALID');
  const tracks=value.map(weight=>{
    if(!Number.isFinite(weight)||weight<0.25||weight>8)throw new Error('FIDELITY_GRID_TRACK_WEIGHT_INVALID');
    return Number(weight.toFixed(2));
  });
  return tracks;
}

export function gridTrackTemplateFromWeights(value:readonly number[]){
  return sanitizedTrackWeights(value).map(weight=>`minmax(0, ${weight}fr)`).join(' ');
}

export function setStorefrontCustomGridTracks(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,weights:readonly number[]|null){
  return mutateNode(document,nodeId,node=>{
    if(node.componentKey!=='layout.grid')throw new Error('FIDELITY_CUSTOM_TRACKS_GRID_REQUIRED');
    const{style,slot}=directViewportStyle(node,viewport);
    delete slot.gridTemplateColumns;
    if(weights!==null)slot.gridTemplateColumns=gridTrackTemplateFromWeights(weights);
    cleanViewportStyle(node,viewport,style,slot);
  });
}

export function inspectStorefrontCustomGridTracks(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport){
  const node=findNode(document,nodeId);if(!node)throw new Error('FIDELITY_LAYOUT_NODE_NOT_FOUND');
  if(node.componentKey!=='layout.grid')return{hasOverride:false,weights:[] as number[]};
  const value=directViewportStyle(node,viewport).slot.gridTemplateColumns;
  if(typeof value!=='string')return{hasOverride:false,weights:[] as number[]};
  const matches=[...value.matchAll(/minmax\(0,\s*([0-9.]+)fr\)/g)];
  if(!matches.length||matches.map(match=>match[0]).join(' ')!==value)return{hasOverride:true,weights:[] as number[]};
  return{hasOverride:true,weights:matches.map(match=>Number(match[1]))};
}
