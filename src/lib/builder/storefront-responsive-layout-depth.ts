import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  resolveStorefrontResponsiveOverride,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {readStorefrontFidelityMetadata,resolveStorefrontChildOrder} from '@/lib/builder/storefront-fidelity-engine';
import {
  clearStorefrontResponsiveOrder,
  setStorefrontNodeViewportStyle,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {
  inspectStorefrontGridPlacement,
  resetStorefrontResponsiveGridPlacement,
} from '@/lib/builder/storefront-fidelity-layout';
import {
  resolveStorefrontVisualStyle,
  sanitizeStorefrontVisualStyleSlot,
  type StorefrontVisualStyleConfig,
  type StorefrontVisualStyleSlot,
} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION='shoporation.storefront-responsive-layout-depth.v1' as const;
export const STOREFRONT_RESPONSIVE_LAYOUT_SPACING=['none','xs','s','m','l','xl','2xl'] as const;
export type StorefrontResponsiveLayoutSpacing=typeof STOREFRONT_RESPONSIVE_LAYOUT_SPACING[number];
export const STOREFRONT_RESPONSIVE_LAYOUT_ALIGN=['start','center','end','stretch'] as const;
export type StorefrontResponsiveLayoutAlign=typeof STOREFRONT_RESPONSIVE_LAYOUT_ALIGN[number];
export const STOREFRONT_RESPONSIVE_STACK_JUSTIFY=['start','center','end','between'] as const;
export type StorefrontResponsiveStackJustify=typeof STOREFRONT_RESPONSIVE_STACK_JUSTIFY[number];

export type StorefrontResponsiveGridContainerPatch={
  columns?:number|null;
  gap?:StorefrontResponsiveLayoutSpacing|null;
  alignItems?:StorefrontResponsiveLayoutAlign|null;
  justifyItems?:StorefrontResponsiveLayoutAlign|null;
};
export type StorefrontResponsiveStackContainerPatch={
  direction?:'row'|'column'|null;
  wrap?:'nowrap'|'wrap'|null;
  gap?:StorefrontResponsiveLayoutSpacing|null;
  alignItems?:StorefrontResponsiveLayoutAlign|null;
  justifyContent?:StorefrontResponsiveStackJustify|null;
};
export type StorefrontResponsiveContainerInspection={
  kind:'grid'|'stack'|null;
  direct:Record<string,unknown>;
  effective:Record<string,unknown>;
  hasOverride:boolean;
};

const VIEWPORT_STYLE_KEYS=['base','desktop','tablet','mobile'] as const;
const GRID_KEYS=['gridTemplateColumns','gap','alignItems','justifyItems'] as const;
const STACK_KEYS=['flexDirection','flexWrap','gap','alignItems','justifyContent'] as const;
const SPACING_FALLBACK:Record<StorefrontResponsiveLayoutSpacing,string>={none:'0',xs:'0.5rem',s:'1rem',m:'1.5rem',l:'2.5rem',xl:'4rem','2xl':'6rem'};
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>structuredClone(value);
const spacingCss=(value:StorefrontResponsiveLayoutSpacing)=>{
  if(!STOREFRONT_RESPONSIVE_LAYOUT_SPACING.includes(value))throw new Error('RESPONSIVE_LAYOUT_SPACING_INVALID');
  return value==='none'?'0':`var(--shoporation-space-${value}, ${SPACING_FALLBACK[value]})`;
};
const spacingToken=(value:unknown):StorefrontResponsiveLayoutSpacing|undefined=>{
  if(value==='0'||value===0)return'none';
  if(typeof value!=='string')return undefined;
  const match=/^var\(--shoporation-space-(xs|s|m|l|xl|2xl)(?:,.*)?\)$/.exec(value.trim());
  return match?.[1] as StorefrontResponsiveLayoutSpacing|undefined;
};
const cssAlign=(value:StorefrontResponsiveLayoutAlign)=>{
  if(!STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(value))throw new Error('RESPONSIVE_LAYOUT_ALIGNMENT_INVALID');
  return value==='start'?'flex-start':value==='end'?'flex-end':value;
};
const alignToken=(value:unknown):StorefrontResponsiveLayoutAlign|undefined=>value==='flex-start'?'start':value==='flex-end'?'end':STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(value as StorefrontResponsiveLayoutAlign)?value as StorefrontResponsiveLayoutAlign:undefined;
const cssJustify=(value:StorefrontResponsiveStackJustify)=>{
  if(!STOREFRONT_RESPONSIVE_STACK_JUSTIFY.includes(value))throw new Error('RESPONSIVE_LAYOUT_JUSTIFY_INVALID');
  return value==='start'?'flex-start':value==='end'?'flex-end':value==='between'?'space-between':value;
};
const justifyToken=(value:unknown):StorefrontResponsiveStackJustify|undefined=>value==='flex-start'?'start':value==='flex-end'?'end':value==='space-between'?'between':STOREFRONT_RESPONSIVE_STACK_JUSTIFY.includes(value as StorefrontResponsiveStackJustify)?value as StorefrontResponsiveStackJustify:undefined;

function findNodeWithParent(document:StorefrontPageDocument,nodeId:string):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null{
  const walk=(nodes:readonly StorefrontComponentNode[],parent:StorefrontComponentNode|null):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return{node,parent};
      const nested=walk(node.children??[],node);if(nested)return nested;
    }
    return null;
  };
  return walk(document.sections,null);
}

function mutateNode(document:StorefrontPageDocument,nodeId:string,mutate:(node:StorefrontComponentNode)=>void){
  const next=clone(document);
  const located=findNodeWithParent(next,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  mutate(located.node);
  return next;
}

function normalizeResponsiveStyle(value:unknown):StorefrontVisualStyleConfig{
  if(!isRecord(value))return{};
  const slotted=VIEWPORT_STYLE_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!slotted){const base=sanitizeStorefrontVisualStyleSlot(value);return Object.keys(base).length?{base}:{}};
  const result:StorefrontVisualStyleConfig={};
  for(const key of VIEWPORT_STYLE_KEYS){const slot=sanitizeStorefrontVisualStyleSlot(value[key]);if(Object.keys(slot).length)result[key]=slot;}
  return result;
}

function directViewportStyle(node:StorefrontComponentNode,viewport:StorefrontViewport):StorefrontVisualStyleSlot{
  return{...(normalizeResponsiveStyle(node.config.style)[viewport]??{})};
}

function parseColumns(value:unknown):number|undefined{
  if(typeof value!=='string')return undefined;
  const match=/^repeat\((\d+),\s*minmax\(0,\s*1fr\)\)$/.exec(value.trim());
  if(!match)return undefined;
  const columns=Number(match[1]);return Number.isInteger(columns)&&columns>=1&&columns<=12?columns:undefined;
}

function gridInspection(node:StorefrontComponentNode,viewport:StorefrontViewport):StorefrontResponsiveContainerInspection{
  const directStyle=directViewportStyle(node,viewport);
  const effectiveStyle=resolveStorefrontVisualStyle(node.config.style,viewport);
  const direct:Record<string,unknown>={};
  const effective:Record<string,unknown>={};
  const directColumns=parseColumns(directStyle.gridTemplateColumns);if(directColumns!==undefined)direct.columns=directColumns;
  const effectiveColumns=parseColumns(effectiveStyle.gridTemplateColumns)??(typeof node.config.columns==='number'?Math.max(1,Math.min(12,Math.round(node.config.columns))):12);effective.columns=effectiveColumns;
  const directGap=spacingToken(directStyle.gap);if(directGap)direct.gap=directGap;
  const effectiveGap=spacingToken(effectiveStyle.gap)??(STOREFRONT_RESPONSIVE_LAYOUT_SPACING.includes(node.config.gap as StorefrontResponsiveLayoutSpacing)?node.config.gap:'m');effective.gap=effectiveGap;
  const directAlign=alignToken(directStyle.alignItems);if(directAlign)direct.alignItems=directAlign;
  const effectiveAlign=alignToken(effectiveStyle.alignItems)??(STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(node.config.align as StorefrontResponsiveLayoutAlign)?node.config.align:'stretch');effective.alignItems=effectiveAlign;
  const directJustify=alignToken(directStyle.justifyItems);if(directJustify)direct.justifyItems=directJustify;
  effective.justifyItems=alignToken(effectiveStyle.justifyItems)??'stretch';
  return{kind:'grid',direct,effective,hasOverride:Object.keys(direct).length>0};
}

function stackInspection(node:StorefrontComponentNode,viewport:StorefrontViewport):StorefrontResponsiveContainerInspection{
  const directStyle=directViewportStyle(node,viewport);
  const effectiveStyle=resolveStorefrontVisualStyle(node.config.style,viewport);
  const direct:Record<string,unknown>={};
  const effective:Record<string,unknown>={};
  if(directStyle.flexDirection==='row'||directStyle.flexDirection==='column')direct.direction=directStyle.flexDirection;
  effective.direction=(effectiveStyle.flexDirection==='row'||effectiveStyle.flexDirection==='column')?effectiveStyle.flexDirection:(node.config.direction==='horizontal'?'row':'column');
  if(directStyle.flexWrap==='nowrap'||directStyle.flexWrap==='wrap')direct.wrap=directStyle.flexWrap;
  effective.wrap=(effectiveStyle.flexWrap==='nowrap'||effectiveStyle.flexWrap==='wrap')?effectiveStyle.flexWrap:'nowrap';
  const directGap=spacingToken(directStyle.gap);if(directGap)direct.gap=directGap;
  const effectiveGap=spacingToken(effectiveStyle.gap)??(STOREFRONT_RESPONSIVE_LAYOUT_SPACING.includes(node.config.gap as StorefrontResponsiveLayoutSpacing)?node.config.gap:'m');effective.gap=effectiveGap;
  const directAlign=alignToken(directStyle.alignItems);if(directAlign)direct.alignItems=directAlign;
  const configuredAlign=STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(node.config.align as StorefrontResponsiveLayoutAlign)?node.config.align as StorefrontResponsiveLayoutAlign:'stretch';
  effective.alignItems=alignToken(effectiveStyle.alignItems)??configuredAlign;
  const directJustify=justifyToken(directStyle.justifyContent);if(directJustify)direct.justifyContent=directJustify;
  const configuredJustify=STOREFRONT_RESPONSIVE_STACK_JUSTIFY.includes(node.config.justify as StorefrontResponsiveStackJustify)?node.config.justify as StorefrontResponsiveStackJustify:'start';
  effective.justifyContent=justifyToken(effectiveStyle.justifyContent)??configuredJustify;
  return{kind:'stack',direct,effective,hasOverride:Object.keys(direct).length>0};
}

export function inspectStorefrontResponsiveContainerLayout(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport):StorefrontResponsiveContainerInspection{
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(located.node.componentKey==='layout.grid')return gridInspection(located.node,viewport);
  if(located.node.componentKey==='layout.stack')return stackInspection(located.node,viewport);
  return{kind:null,direct:{},effective:{},hasOverride:false};
}

function patchContainerStyle(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,keys:readonly string[],patch:Record<string,unknown>){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  const slot=directViewportStyle(located.node,viewport);
  for(const[key,value]of Object.entries(patch)){
    if(!keys.includes(key))continue;
    if(value===null||value===undefined)delete slot[key];else slot[key]=value as string|number;
  }
  return setStorefrontNodeViewportStyle(document,nodeId,viewport,slot);
}

export function setStorefrontResponsiveGridContainerLayout(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,patch:StorefrontResponsiveGridContainerPatch){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(located.node.componentKey!=='layout.grid')throw new Error('RESPONSIVE_LAYOUT_GRID_REQUIRED');
  const stylePatch:Record<string,unknown>={};
  if(patch.columns!==undefined){
    if(patch.columns===null)stylePatch.gridTemplateColumns=null;
    else{
      if(!Number.isInteger(patch.columns)||patch.columns<1||patch.columns>12)throw new Error('RESPONSIVE_LAYOUT_GRID_COLUMNS_INVALID');
      stylePatch.gridTemplateColumns=`repeat(${patch.columns}, minmax(0, 1fr))`;
    }
  }
  if(patch.gap!==undefined)stylePatch.gap=patch.gap===null?null:spacingCss(patch.gap);
  if(patch.alignItems!==undefined)stylePatch.alignItems=patch.alignItems===null?null:cssAlign(patch.alignItems);
  if(patch.justifyItems!==undefined)stylePatch.justifyItems=patch.justifyItems===null?null:cssAlign(patch.justifyItems);
  return patchContainerStyle(document,nodeId,viewport,GRID_KEYS,stylePatch);
}

export function setStorefrontResponsiveStackContainerLayout(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,patch:StorefrontResponsiveStackContainerPatch){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(located.node.componentKey!=='layout.stack')throw new Error('RESPONSIVE_LAYOUT_STACK_REQUIRED');
  const stylePatch:Record<string,unknown>={};
  if(patch.direction!==undefined){
    if(patch.direction!==null&&patch.direction!=='row'&&patch.direction!=='column')throw new Error('RESPONSIVE_LAYOUT_STACK_DIRECTION_INVALID');
    stylePatch.flexDirection=patch.direction;
  }
  if(patch.wrap!==undefined){
    if(patch.wrap!==null&&patch.wrap!=='nowrap'&&patch.wrap!=='wrap')throw new Error('RESPONSIVE_LAYOUT_STACK_WRAP_INVALID');
    stylePatch.flexWrap=patch.wrap;
  }
  if(patch.gap!==undefined)stylePatch.gap=patch.gap===null?null:spacingCss(patch.gap);
  if(patch.alignItems!==undefined)stylePatch.alignItems=patch.alignItems===null?null:cssAlign(patch.alignItems);
  if(patch.justifyContent!==undefined)stylePatch.justifyContent=patch.justifyContent===null?null:cssJustify(patch.justifyContent);
  return patchContainerStyle(document,nodeId,viewport,STACK_KEYS,stylePatch);
}

export function resetStorefrontResponsiveContainerLayout(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(located.node.componentKey==='layout.grid')return patchContainerStyle(document,nodeId,viewport,GRID_KEYS,Object.fromEntries(GRID_KEYS.map(key=>[key,null])));
  if(located.node.componentKey==='layout.stack')return patchContainerStyle(document,nodeId,viewport,STACK_KEYS,Object.fromEntries(STACK_KEYS.map(key=>[key,null])));
  return clone(document);
}

export function setStorefrontResponsiveVisibility(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,hidden:boolean|null){
  return mutateNode(document,nodeId,node=>{
    const responsive={...(node.responsive??{})};
    const slot={...(responsive[viewport]??{})};
    if(hidden===null)delete slot.hidden;else slot.hidden=hidden;
    if(Object.keys(slot).length)responsive[viewport]=slot;else delete responsive[viewport];
    node.responsive=Object.keys(responsive).length?responsive:undefined;
  });
}

export function inspectStorefrontResponsiveLayoutDepth(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  const node=located.node;
  const visibilityDirect=node.responsive?.[viewport]?.hidden;
  const resolved=resolveStorefrontResponsiveOverride(node,viewport);
  const childOrder=node.children?.length?resolveStorefrontChildOrder(document,node,viewport):[];
  return{
    version:STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION,
    editMode:readStorefrontFidelityMetadata(document)?.editMode??'normal',
    nodeId,
    parentId:located.parent?.id??null,
    parentComponentKey:located.parent?.componentKey??null,
    visibility:{direct:visibilityDirect??null,effective:resolved.hidden},
    effectiveGridSpan:resolved.gridSpan,
    gridPlacement:inspectStorefrontGridPlacement(document,nodeId,viewport),
    container:inspectStorefrontResponsiveContainerLayout(document,nodeId,viewport),
    childOrder,
  } as const;
}

export function resetStorefrontResponsiveLayoutDepth(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  let next=setStorefrontResponsiveVisibility(document,nodeId,viewport,null);
  next=resetStorefrontResponsiveGridPlacement(next,nodeId,viewport);
  next=resetStorefrontResponsiveContainerLayout(next,nodeId,viewport);
  if(located.node.children?.length)next=clearStorefrontResponsiveOrder(next,{viewport,parentId:nodeId});
  return next;
}
