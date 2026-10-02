import {STOREFRONT_VIEWPORTS,type StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  resolveStorefrontResponsiveOverride,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
} from '@/lib/builder/storefront-runtime';
import {readStorefrontFidelityMetadata,resolveStorefrontChildOrder} from '@/lib/builder/storefront-fidelity-engine';
import {
  clearStorefrontResponsiveOrder,
  setStorefrontNodeViewportStyle,
  setStorefrontResponsiveChildOrder,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {
  inspectStorefrontGridPlacement,
  resetStorefrontResponsiveGridPlacement,
  setStorefrontResponsiveGridPlacement,
  type StorefrontGridPlacement,
} from '@/lib/builder/storefront-fidelity-layout';
import {
  resolveStorefrontVisualStyle,
  sanitizeStorefrontVisualStyleSlot,
  type StorefrontVisualStyleConfig,
  type StorefrontVisualStyleSlot,
} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_RESPONSIVE_LAYOUT_DEPTH_VERSION='shoporation.storefront-responsive-layout-depth.v1' as const;
export const STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION='shoporation.storefront-responsive-inheritance-intelligence.v1' as const;
export const STOREFRONT_RESPONSIVE_INHERITANCE_PLAN_VERSION='shoporation.storefront-responsive-inheritance-plan.v1' as const;
export const STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS=['visibility','grid-placement','container','child-order'] as const;
export type StorefrontResponsiveInheritanceDimension=typeof STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS[number];
export type StorefrontResponsiveInheritanceSource='viewport'|'base'|'component'|'default';
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

export type StorefrontResponsiveInheritanceViewportState={
  viewport:StorefrontViewport;
  visibility:{direct:boolean|null;effective:boolean;source:StorefrontResponsiveInheritanceSource};
  gridPlacement:{direct:StorefrontGridPlacement;effectiveGridSpan:number;source:StorefrontResponsiveInheritanceSource};
  container:{
    kind:'grid'|'stack'|null;
    direct:Record<string,unknown>;
    effective:Record<string,unknown>;
    sources:Record<string,StorefrontResponsiveInheritanceSource>;
  };
  childOrder:{direct:readonly string[]|null;effective:readonly string[];source:StorefrontResponsiveInheritanceSource};
};

export type StorefrontResponsiveInheritanceDiagnostic={
  code:'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE';
  severity:'warning';
  viewport:StorefrontViewport;
  dimension:StorefrontResponsiveInheritanceDimension;
  nodeId:string;
  message:string;
  safeReset:true;
};

export type StorefrontResponsiveInheritancePlan={
  contract:typeof STOREFRONT_RESPONSIVE_INHERITANCE_PLAN_VERSION;
  page:{
    pageKey:string;
    pageType:string;
    templateKey:string;
    templateVersion:number;
  };
  nodeId:string;
  sourceViewport:StorefrontViewport;
  targetViewports:readonly StorefrontViewport[];
  dimensions:readonly StorefrontResponsiveInheritanceDimension[];
  sourceFingerprint:string;
  targetFingerprints:Readonly<Record<StorefrontViewport,string>>;
  operations:readonly {
    targetViewport:StorefrontViewport;
    dimension:StorefrontResponsiveInheritanceDimension;
    action:'copy-direct'|'reset';
    intent:unknown;
  }[];
  hash:string;
};

const canonical=(value:unknown):string=>{
  if(Array.isArray(value))return'['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object'){
    return'{'+Object.keys(value as Record<string,unknown>).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  }
  return JSON.stringify(value);
};

const inheritanceDigest=(value:unknown)=>{
  let hash=2166136261;
  const text=canonical(value);
  for(let index=0;index<text.length;index+=1){hash^=text.charCodeAt(index);hash=Math.imul(hash,16777619);}
  return'fnv1a32:'+(hash>>>0).toString(16).padStart(8,'0');
};

const deepFreeze=<T>(value:T):T=>{
  if(!value||typeof value!=='object'||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child);
  return value;
};

function directChildOrder(document:StorefrontPageDocument,node:StorefrontComponentNode,viewport:StorefrontViewport):readonly string[]|null{
  const configured=readStorefrontFidelityMetadata(document)?.nodeOrder?.[node.id]?.[viewport];
  return Array.isArray(configured)?Object.freeze([...configured]):null;
}

function validateDirectChildOrder(node:StorefrontComponentNode,order:readonly string[]|null){
  if(!order)return;
  const known=new Set((node.children??[]).map(child=>child.id));
  const unique=new Set(order);
  if(unique.size!==order.length||order.some(id=>!known.has(id)))throw new Error('RESPONSIVE_INHERITANCE_CHILD_ORDER_INVALID');
}

function containerPropertySources(node:StorefrontComponentNode,viewport:StorefrontViewport,inspection:StorefrontResponsiveContainerInspection):Record<string,StorefrontResponsiveInheritanceSource>{
  if(!inspection.kind)return{};
  const direct=inspection.direct;
  const base=normalizeResponsiveStyle(node.config.style).base??{};
  const result:Record<string,StorefrontResponsiveInheritanceSource>={};
  const source=(key:string,basePresent:boolean,componentPresent:boolean)=>{
    result[key]=Object.prototype.hasOwnProperty.call(direct,key)?'viewport':basePresent?'base':componentPresent?'component':'default';
  };
  if(inspection.kind==='grid'){
    source('columns',parseColumns(base.gridTemplateColumns)!==undefined,typeof node.config.columns==='number');
    source('gap',spacingToken(base.gap)!==undefined,STOREFRONT_RESPONSIVE_LAYOUT_SPACING.includes(node.config.gap as StorefrontResponsiveLayoutSpacing));
    source('alignItems',alignToken(base.alignItems)!==undefined,STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(node.config.align as StorefrontResponsiveLayoutAlign));
    source('justifyItems',alignToken(base.justifyItems)!==undefined,false);
  }else{
    source('direction',base.flexDirection==='row'||base.flexDirection==='column',node.config.direction==='horizontal'||node.config.direction==='vertical');
    source('wrap',base.flexWrap==='nowrap'||base.flexWrap==='wrap',false);
    source('gap',spacingToken(base.gap)!==undefined,STOREFRONT_RESPONSIVE_LAYOUT_SPACING.includes(node.config.gap as StorefrontResponsiveLayoutSpacing));
    source('alignItems',alignToken(base.alignItems)!==undefined,STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.includes(node.config.align as StorefrontResponsiveLayoutAlign));
    source('justifyContent',justifyToken(base.justifyContent)!==undefined,STOREFRONT_RESPONSIVE_STACK_JUSTIFY.includes(node.config.justify as StorefrontResponsiveStackJustify));
  }
  return result;
}

function inheritanceIntent(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,dimension:StorefrontResponsiveInheritanceDimension){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  const layout=inspectStorefrontResponsiveLayoutDepth(document,nodeId,viewport);
  if(dimension==='visibility')return{direct:layout.visibility.direct};
  if(dimension==='grid-placement')return{direct:layout.gridPlacement.hasOverride?clone(layout.gridPlacement.direct):null};
  if(dimension==='container')return{kind:layout.container.kind,direct:layout.container.hasOverride?clone(layout.container.direct):null};
  const order=directChildOrder(document,located.node,viewport);
  validateDirectChildOrder(located.node,order);
  return{direct:order?clone(order):null};
}

function inheritanceFingerprint(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,dimensions:readonly StorefrontResponsiveInheritanceDimension[]){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  return inheritanceDigest({
    nodeId,
    componentKey:located.node.componentKey,
    componentVersion:located.node.componentVersion,
    childIds:(located.node.children??[]).map(child=>child.id),
    viewport,
    dimensions:Object.fromEntries(dimensions.map(dimension=>[dimension,inheritanceIntent(document,nodeId,viewport,dimension)])),
  });
}

function redundantDiagnostics(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport):StorefrontResponsiveInheritanceDiagnostic[]{
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  const current=inspectStorefrontResponsiveLayoutDepth(document,nodeId,viewport);
  const issues:StorefrontResponsiveInheritanceDiagnostic[]=[];
  const push=(dimension:StorefrontResponsiveInheritanceDimension)=>issues.push({
    code:'RESPONSIVE_INHERITANCE_REDUNDANT_OVERRIDE',
    severity:'warning',
    viewport,
    dimension,
    nodeId,
    message:`${viewport} ${dimension} override can be reset without changing effective layout.`,
    safeReset:true,
  });

  if(current.visibility.direct!==null){
    const reset=setStorefrontResponsiveVisibility(document,nodeId,viewport,null);
    if(inspectStorefrontResponsiveLayoutDepth(reset,nodeId,viewport).visibility.effective===current.visibility.effective)push('visibility');
  }
  const placementKeys=Object.keys(current.gridPlacement.direct);
  if(current.gridPlacement.hasOverride&&placementKeys.every(key=>key==='span')){
    const reset=resetStorefrontResponsiveGridPlacement(document,nodeId,viewport);
    const after=inspectStorefrontResponsiveLayoutDepth(reset,nodeId,viewport);
    if(after.effectiveGridSpan===current.effectiveGridSpan)push('grid-placement');
  }
  if(current.container.hasOverride){
    const reset=resetStorefrontResponsiveContainerLayout(document,nodeId,viewport);
    const after=inspectStorefrontResponsiveLayoutDepth(reset,nodeId,viewport);
    if(canonical(after.container.effective)===canonical(current.container.effective))push('container');
  }
  const directOrder=directChildOrder(document,located.node,viewport);
  if(directOrder){
    const reset=clearStorefrontResponsiveOrder(document,{viewport,parentId:nodeId});
    const after=inspectStorefrontResponsiveLayoutDepth(reset,nodeId,viewport);
    if(canonical(after.childOrder)===canonical(current.childOrder))push('child-order');
  }
  return issues;
}

export function inspectStorefrontResponsiveInheritance(document:StorefrontPageDocument,nodeId:string){
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  const inspectViewport=(viewport:StorefrontViewport):StorefrontResponsiveInheritanceViewportState=>{
    const layout=inspectStorefrontResponsiveLayoutDepth(document,nodeId,viewport);
    const order=directChildOrder(document,located.node,viewport);
    return{
      viewport,
      visibility:{
        direct:layout.visibility.direct,
        effective:layout.visibility.effective,
        source:layout.visibility.direct===null?'default':'viewport',
      },
      gridPlacement:{
        direct:clone(layout.gridPlacement.direct),
        effectiveGridSpan:layout.effectiveGridSpan,
        source:layout.gridPlacement.hasOverride?'viewport':'default',
      },
      container:{
        kind:layout.container.kind,
        direct:clone(layout.container.direct),
        effective:clone(layout.container.effective),
        sources:containerPropertySources(located.node,viewport,layout.container),
      },
      childOrder:{
        direct:order?clone(order):null,
        effective:clone(layout.childOrder),
        source:order?'viewport':'default',
      },
    };
  };
  const viewports:Record<StorefrontViewport,StorefrontResponsiveInheritanceViewportState>={
    desktop:inspectViewport('desktop'),
    tablet:inspectViewport('tablet'),
    mobile:inspectViewport('mobile'),
  };
  const diagnostics=STOREFRONT_VIEWPORTS.flatMap(viewport=>redundantDiagnostics(document,nodeId,viewport));
  return deepFreeze({
    version:STOREFRONT_RESPONSIVE_INHERITANCE_INTELLIGENCE_VERSION,
    nodeId,
    runtimeSemantics:'base-plus-exact-viewport' as const,
    viewports,
    diagnostics,
  });
}

export function planStorefrontResponsiveInheritancePropagation(input:{
  document:StorefrontPageDocument;
  nodeId:string;
  sourceViewport:StorefrontViewport;
  targetViewports:readonly StorefrontViewport[];
  dimensions:readonly StorefrontResponsiveInheritanceDimension[];
}):StorefrontResponsiveInheritancePlan{
  const{document,nodeId,sourceViewport}=input;
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(!STOREFRONT_VIEWPORTS.includes(sourceViewport))throw new Error('RESPONSIVE_INHERITANCE_SOURCE_VIEWPORT_INVALID');
  if(!input.targetViewports.length)throw new Error('RESPONSIVE_INHERITANCE_TARGET_REQUIRED');
  if(new Set(input.targetViewports).size!==input.targetViewports.length)throw new Error('RESPONSIVE_INHERITANCE_TARGET_DUPLICATE');
  if(input.targetViewports.some(viewport=>!STOREFRONT_VIEWPORTS.includes(viewport)))throw new Error('RESPONSIVE_INHERITANCE_TARGET_VIEWPORT_INVALID');
  if(input.targetViewports.includes(sourceViewport))throw new Error('RESPONSIVE_INHERITANCE_SOURCE_TARGET_CONFLICT');
  if(!input.dimensions.length)throw new Error('RESPONSIVE_INHERITANCE_DIMENSION_REQUIRED');
  if(new Set(input.dimensions).size!==input.dimensions.length)throw new Error('RESPONSIVE_INHERITANCE_DIMENSION_DUPLICATE');
  if(input.dimensions.some(dimension=>!STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS.includes(dimension)))throw new Error('RESPONSIVE_INHERITANCE_DIMENSION_INVALID');

  const targetViewports=STOREFRONT_VIEWPORTS.filter(viewport=>input.targetViewports.includes(viewport));
  const dimensions=STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS.filter(dimension=>input.dimensions.includes(dimension));
  const intents=Object.fromEntries(dimensions.map(dimension=>[dimension,inheritanceIntent(document,nodeId,sourceViewport,dimension)]));
  const operations:Array<StorefrontResponsiveInheritancePlan['operations'][number]>=targetViewports.flatMap(targetViewport=>
    dimensions.map((dimension):StorefrontResponsiveInheritancePlan['operations'][number]=>{
      const intent=intents[dimension] as {direct?:unknown};
      return{
        targetViewport,
        dimension,
        action:intent.direct===null?'reset':'copy-direct',
        intent:clone(intent),
      };
    }),
  );
  const targetFingerprint=(viewport:StorefrontViewport)=>targetViewports.includes(viewport)
    ?inheritanceFingerprint(document,nodeId,viewport,dimensions)
    :'not-target';
  const targetFingerprints:Record<StorefrontViewport,string>={
    desktop:targetFingerprint('desktop'),
    tablet:targetFingerprint('tablet'),
    mobile:targetFingerprint('mobile'),
  };

  const withoutHash:Omit<StorefrontResponsiveInheritancePlan,'hash'>={
    contract:STOREFRONT_RESPONSIVE_INHERITANCE_PLAN_VERSION,
    page:{
      pageKey:document.pageKey,
      pageType:document.pageType,
      templateKey:document.templateKey,
      templateVersion:document.templateVersion,
    },
    nodeId,
    sourceViewport,
    targetViewports:Object.freeze(targetViewports),
    dimensions:Object.freeze(dimensions),
    sourceFingerprint:inheritanceFingerprint(document,nodeId,sourceViewport,dimensions),
    targetFingerprints:Object.freeze(targetFingerprints),
    operations:Object.freeze(operations),
  };
  const plan:StorefrontResponsiveInheritancePlan={...withoutHash,hash:inheritanceDigest(withoutHash)};
  return deepFreeze(plan);
}

function validateInheritancePlanHash(plan:StorefrontResponsiveInheritancePlan){
  const{hash,...withoutHash}=plan;
  if(hash!==inheritanceDigest(withoutHash))throw new Error('RESPONSIVE_INHERITANCE_PLAN_HASH_INVALID');
}

function applyInheritanceOperation(document:StorefrontPageDocument,nodeId:string,operation:StorefrontResponsiveInheritancePlan['operations'][number]){
  const target=operation.targetViewport;
  const intent=operation.intent as {direct?:unknown;kind?:unknown};
  if(operation.dimension==='visibility'){
    const direct=intent.direct;
    if(direct!==null&&typeof direct!=='boolean')throw new Error('RESPONSIVE_INHERITANCE_VISIBILITY_INTENT_INVALID');
    return setStorefrontResponsiveVisibility(document,nodeId,target,direct as boolean|null);
  }
  if(operation.dimension==='grid-placement'){
    if(intent.direct===null)return resetStorefrontResponsiveGridPlacement(document,nodeId,target);
    if(!isRecord(intent.direct))throw new Error('RESPONSIVE_INHERITANCE_GRID_INTENT_INVALID');
    return setStorefrontResponsiveGridPlacement(document,nodeId,target,clone(intent.direct) as StorefrontGridPlacement);
  }
  if(operation.dimension==='container'){
    let next=resetStorefrontResponsiveContainerLayout(document,nodeId,target);
    if(intent.direct===null)return next;
    if(!isRecord(intent.direct))throw new Error('RESPONSIVE_INHERITANCE_CONTAINER_INTENT_INVALID');
    if(intent.kind==='grid')return setStorefrontResponsiveGridContainerLayout(next,nodeId,target,clone(intent.direct) as StorefrontResponsiveGridContainerPatch);
    if(intent.kind==='stack')return setStorefrontResponsiveStackContainerLayout(next,nodeId,target,clone(intent.direct) as StorefrontResponsiveStackContainerPatch);
    if(Object.keys(intent.direct).length)throw new Error('RESPONSIVE_INHERITANCE_CONTAINER_KIND_INVALID');
    return next;
  }
  const located=findNodeWithParent(document,nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(intent.direct===null)return clearStorefrontResponsiveOrder(document,{viewport:target,parentId:nodeId});
  if(!Array.isArray(intent.direct)||intent.direct.some(id=>typeof id!=='string'))throw new Error('RESPONSIVE_INHERITANCE_CHILD_ORDER_INTENT_INVALID');
  validateDirectChildOrder(located.node,intent.direct as string[]);
  return setStorefrontResponsiveChildOrder(document,nodeId,target,intent.direct as string[]);
}

export function applyStorefrontResponsiveInheritancePropagation(document:StorefrontPageDocument,plan:StorefrontResponsiveInheritancePlan){
  validateInheritancePlanHash(plan);
  if(plan.contract!==STOREFRONT_RESPONSIVE_INHERITANCE_PLAN_VERSION)throw new Error('RESPONSIVE_INHERITANCE_PLAN_CONTRACT_INVALID');
  if(document.pageKey!==plan.page.pageKey||document.pageType!==plan.page.pageType||document.templateKey!==plan.page.templateKey||document.templateVersion!==plan.page.templateVersion)throw new Error('RESPONSIVE_INHERITANCE_PLAN_PAGE_DRIFT');
  const located=findNodeWithParent(document,plan.nodeId);if(!located)throw new Error('RESPONSIVE_LAYOUT_NODE_NOT_FOUND');
  if(inheritanceFingerprint(document,plan.nodeId,plan.sourceViewport,plan.dimensions)!==plan.sourceFingerprint)throw new Error('RESPONSIVE_INHERITANCE_PLAN_STALE_SOURCE');
  for(const target of plan.targetViewports){
    if(inheritanceFingerprint(document,plan.nodeId,target,plan.dimensions)!==plan.targetFingerprints[target])throw new Error('RESPONSIVE_INHERITANCE_PLAN_STALE_TARGET');
  }
  let next=clone(document);
  for(const operation of plan.operations)next=applyInheritanceOperation(next,plan.nodeId,operation);
  return next;
}

