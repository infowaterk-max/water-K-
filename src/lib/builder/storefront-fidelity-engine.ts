import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {resolveStorefrontVisualStyle,type StorefrontVisualStyleConfig,type StorefrontVisualStyleSlot} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_ENGINE_VERSION='shoporation.visual-builder-fidelity-engine.v1' as const;
export const STOREFRONT_FIDELITY_METADATA_KEY='fidelity' as const;

export const STOREFRONT_BUILDER_EDIT_MODES=['normal','advanced','expert'] as const;
export type StorefrontBuilderEditMode=typeof STOREFRONT_BUILDER_EDIT_MODES[number];

export const STOREFRONT_EDIT_MODE_CAPABILITIES=Object.freeze({
  normal:['content','media','theme-tokens','preset-switch','section-visibility','safe-spacing'],
  advanced:['responsive-grid','responsive-order','style-slots','art-direction','typography','layer-presets','section-composition'],
  expert:['free-section-geometry','layer-geometry','raw-allowlisted-style','responsive-composition','design-guard-override'],
} as const);

export type StorefrontResponsiveSectionOrder=Partial<Record<StorefrontViewport,string[]>>;
export type StorefrontDesignGuardMode='off'|'warn'|'enforce';
export type StorefrontDesignGuardConfig={
  mode:StorefrontDesignGuardMode;
  presetId?:string;
  baselineVersion?:number;
  protectedNodeIds?:string[];
};
export type StorefrontFidelityMetadata={
  engineVersion:typeof STOREFRONT_FIDELITY_ENGINE_VERSION;
  editMode?:StorefrontBuilderEditMode;
  sectionOrder?:StorefrontResponsiveSectionOrder;
  nodeOrder?:Record<string,StorefrontResponsiveSectionOrder>;
  designGuard?:StorefrontDesignGuardConfig;
};

export type StorefrontStyleSlotMap=Record<string,StorefrontVisualStyleConfig>;
export type StorefrontImageArtDirectionSource={
  src?:string;
  objectPosition?:string;
  objectFit?:'cover'|'contain';
  aspectRatio?:string;
  width?:number;
  height?:number;
};
export type StorefrontImageArtDirection={
  base?:StorefrontImageArtDirectionSource;
  desktop?:StorefrontImageArtDirectionSource;
  tablet?:StorefrontImageArtDirectionSource;
  mobile?:StorefrontImageArtDirectionSource;
};

export type StorefrontFidelityNodePreset={
  config?:Record<string,unknown>;
  styleSlots?:StorefrontStyleSlotMap;
  responsive?:StorefrontComponentNode['responsive'];
};
export type StorefrontFidelityPreset={
  presetId:string;
  version:number;
  label:string;
  pageType?:StorefrontPageDocument['pageType'];
  sectionOrder?:StorefrontResponsiveSectionOrder;
  nodeOrder?:Record<string,StorefrontResponsiveSectionOrder>;
  nodes:Record<string,StorefrontFidelityNodePreset>;
  protectedNodeIds?:string[];
};
export type StorefrontFidelityDriftReport={
  score:number;
  changedNodeIds:string[];
  missingNodeIds:string[];
  structuralDrift:boolean;
  sectionOrderDrift:boolean;
};

const SLOT_PATTERN=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const SAFE_ART_DIRECTION_SRC=/^(?:\/|https:\/\/)/;
const VISUAL_CONFIG_KEYS=new Set([
  'style','styleSlots','artDirection','presentation','tone','spacing','width','gap','align','justify','direction','fit','radius','objectPosition',
  'columns','imageRatio','thumbnailPosition','accentStyle','innerStyle','brandStyle','taglineStyle','utilityStyle','mobileToggleStyle',
]);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>structuredClone(value);

export function readStorefrontFidelityMetadata(document:Pick<StorefrontPageDocument,'metadata'>):StorefrontFidelityMetadata|null{
  const value=document.metadata?.[STOREFRONT_FIDELITY_METADATA_KEY];
  if(!isRecord(value)||value.engineVersion!==STOREFRONT_FIDELITY_ENGINE_VERSION)return null;
  return value as StorefrontFidelityMetadata;
}

export function writeStorefrontFidelityMetadata(document:StorefrontPageDocument,next:Omit<StorefrontFidelityMetadata,'engineVersion'>):StorefrontPageDocument{
  return{
    ...clone(document),
    metadata:{
      ...(document.metadata??{}),
      [STOREFRONT_FIDELITY_METADATA_KEY]:{engineVersion:STOREFRONT_FIDELITY_ENGINE_VERSION,...clone(next)},
    },
  };
}

function inherited<T>(value:Partial<Record<'base'|StorefrontViewport,T>>|undefined,viewport:StorefrontViewport):T|undefined{
  if(!value)return undefined;
  if(viewport==='mobile')return value.mobile??value.tablet??value.desktop??value.base;
  if(viewport==='tablet')return value.tablet??value.desktop??value.base;
  return value.desktop??value.base;
}

function uniqueKnownOrder(order:readonly string[]|undefined,known:readonly string[]){
  const knownSet=new Set(known);
  const seen=new Set<string>();
  const result:string[]=[];
  for(const id of order??[]){
    if(!knownSet.has(id)||seen.has(id))continue;
    seen.add(id);result.push(id);
  }
  for(const id of known)if(!seen.has(id))result.push(id);
  return result;
}

export function resolveStorefrontSectionOrder(document:StorefrontPageDocument,viewport:StorefrontViewport):string[]{
  const known=document.sections.map(section=>section.id);
  const metadata=readStorefrontFidelityMetadata(document);
  const configured=inherited(metadata?.sectionOrder,viewport);
  return uniqueKnownOrder(configured,known);
}

export function resolveStorefrontChildOrder(document:StorefrontPageDocument,parent:StorefrontComponentNode,viewport:StorefrontViewport):string[]{
  const known=(parent.children??[]).map(child=>child.id);
  const metadata=readStorefrontFidelityMetadata(document);
  const configured=inherited(metadata?.nodeOrder?.[parent.id],viewport);
  return uniqueKnownOrder(configured,known);
}

export function reorderStorefrontSections(document:StorefrontPageDocument,viewport:StorefrontViewport):StorefrontComponentNode[]{
  const byId=new Map(document.sections.map(section=>[section.id,section]));
  return resolveStorefrontSectionOrder(document,viewport).flatMap(id=>{const section=byId.get(id);return section?[section]:[];});
}

export function sanitizeStorefrontStyleSlots(value:unknown):StorefrontStyleSlotMap{
  if(!isRecord(value))return{};
  const entries=Object.entries(value).slice(0,32);
  const result:StorefrontStyleSlotMap={};
  for(const[slot,style]of entries){
    if(!SLOT_PATTERN.test(slot)||!isRecord(style))continue;
    const next:StorefrontVisualStyleConfig={};
    for(const key of ['base','desktop','tablet','mobile'] as const){
      if(!isRecord(style[key]))continue;
      const resolved=resolveStorefrontVisualStyle({base:style[key]},'desktop');
      if(Object.keys(resolved).length)next[key]=resolved;
    }
    if(Object.keys(next).length)result[slot]=next;
  }
  return result;
}

export function resolveStorefrontStyleSlot(value:unknown,slot:string,viewport:StorefrontViewport):StorefrontVisualStyleSlot{
  if(!SLOT_PATTERN.test(slot))return{};
  const slots=sanitizeStorefrontStyleSlots(value);
  return resolveStorefrontVisualStyle(slots[slot],viewport);
}

function sanitizeArtDirectionSource(value:unknown):StorefrontImageArtDirectionSource{
  if(!isRecord(value))return{};
  const result:StorefrontImageArtDirectionSource={};
  if(typeof value.src==='string'&&SAFE_ART_DIRECTION_SRC.test(value.src.trim()))result.src=value.src.trim();
  if(typeof value.objectPosition==='string'&&value.objectPosition.trim().length<=120)result.objectPosition=value.objectPosition.trim();
  if(value.objectFit==='cover'||value.objectFit==='contain')result.objectFit=value.objectFit;
  if(typeof value.aspectRatio==='string'&&/^[0-9.]+\s*\/\s*[0-9.]+$/.test(value.aspectRatio.trim()))result.aspectRatio=value.aspectRatio.trim();
  if(typeof value.width==='number'&&Number.isFinite(value.width)&&value.width>0)result.width=Math.round(value.width);
  if(typeof value.height==='number'&&Number.isFinite(value.height)&&value.height>0)result.height=Math.round(value.height);
  return result;
}

export function resolveStorefrontImageArtDirection(value:unknown,viewport:StorefrontViewport):StorefrontImageArtDirectionSource{
  if(!isRecord(value))return{};
  const base=sanitizeArtDirectionSource(value.base);
  const desktop={...base,...sanitizeArtDirectionSource(value.desktop)};
  const tablet={...desktop,...sanitizeArtDirectionSource(value.tablet)};
  const mobile={...tablet,...sanitizeArtDirectionSource(value.mobile)};
  return viewport==='desktop'?desktop:viewport==='tablet'?tablet:mobile;
}

function mergeViewportStyle(value:unknown,viewport:StorefrontViewport,patch:StorefrontVisualStyleSlot){
  if(!Object.keys(patch).length)return value;
  if(!isRecord(value))return{base:patch};
  const usesSlots=['base','desktop','tablet','mobile'].some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!usesSlots)return{...value,...patch};
  const slot=isRecord(value[viewport])?value[viewport] as Record<string,unknown>:{};
  return{...value,[viewport]:{...slot,...patch}};
}

function applyArtDirection(node:StorefrontComponentNode,viewport:StorefrontViewport){
  if(node.componentKey!=='content.image'||!node.config.artDirection)return;
  const art=resolveStorefrontImageArtDirection(node.config.artDirection,viewport);
  if(art.src)node.config.src=art.src;
  if(art.objectPosition)node.config.objectPosition=art.objectPosition;
  if(art.objectFit)node.config.fit=art.objectFit;
  if(art.width)node.config.width=art.width;
  if(art.height)node.config.height=art.height;
  if(art.aspectRatio)node.config.style=mergeViewportStyle(node.config.style,viewport,{aspectRatio:art.aspectRatio});
}

/**
 * Materializes viewport-specific composition before the canonical Runtime validates
 * and renders it. This does not create a parallel renderer; it only resolves the
 * additive fidelity metadata into the existing Page Schema tree.
 */
export function materializeStorefrontFidelityPage(document:StorefrontPageDocument,viewport:StorefrontViewport):StorefrontPageDocument{
  const next=clone(document);
  const metadata=readStorefrontFidelityMetadata(next);
  if(metadata?.sectionOrder){
    const byId=new Map(next.sections.map(section=>[section.id,section]));
    next.sections=resolveStorefrontSectionOrder(next,viewport).flatMap(id=>{const section=byId.get(id);return section?[section]:[];});
  }
  const walk=(node:StorefrontComponentNode)=>{
    applyArtDirection(node,viewport);
    if(node.children?.length){
      const byId=new Map(node.children.map(child=>[child.id,child]));
      const order=resolveStorefrontChildOrder(next,node,viewport);
      node.children=order.flatMap(id=>{const child=byId.get(id);return child?[child]:[];});
      node.children.forEach(walk);
    }
  };
  next.sections.forEach(walk);
  return next;
}

function findNode(document:StorefrontPageDocument,id:string):StorefrontComponentNode|undefined{
  const visit=(nodes:readonly StorefrontComponentNode[]):StorefrontComponentNode|undefined=>{
    for(const node of nodes){if(node.id===id)return node;const nested=visit(node.children??[]);if(nested)return nested;}
    return undefined;
  };
  return visit(document.sections);
}

function patchVisualConfig(current:Record<string,unknown>,patch:Record<string,unknown>|undefined){
  if(!patch)return current;
  const next={...current};
  for(const[key,value]of Object.entries(patch))if(VISUAL_CONFIG_KEYS.has(key))next[key]=clone(value);
  return next;
}

export function applyStorefrontFidelityPreset(document:StorefrontPageDocument,preset:StorefrontFidelityPreset):StorefrontPageDocument{
  if(!preset.presetId.trim()||!Number.isInteger(preset.version)||preset.version<1)throw new Error('FIDELITY_PRESET_IDENTITY_INVALID');
  if(preset.pageType&&preset.pageType!==document.pageType)throw new Error('FIDELITY_PRESET_PAGE_TYPE_MISMATCH');
  const next=clone(document);
  for(const[id,patch]of Object.entries(preset.nodes)){
    const node=findNode(next,id);if(!node)continue;
    node.config=patchVisualConfig(node.config,patch.config);
    if(patch.styleSlots)node.config.styleSlots=sanitizeStorefrontStyleSlots(patch.styleSlots);
    if(patch.responsive)node.responsive={...(node.responsive??{}),...clone(patch.responsive)};
  }
  const current=readStorefrontFidelityMetadata(next);
  return writeStorefrontFidelityMetadata(next,{
    ...(current?{editMode:current.editMode,designGuard:current.designGuard}:{}),
    ...(preset.sectionOrder?{sectionOrder:clone(preset.sectionOrder)}:{}),
    ...(preset.nodeOrder?{nodeOrder:clone(preset.nodeOrder)}:{}),
    designGuard:{
      mode:current?.designGuard?.mode??'warn',
      presetId:preset.presetId,
      baselineVersion:preset.version,
      protectedNodeIds:clone(preset.protectedNodeIds??[]),
    },
  });
}

function stableVisualSnapshot(node:StorefrontComponentNode){
  const visualConfig=Object.fromEntries(Object.entries(node.config).filter(([key])=>VISUAL_CONFIG_KEYS.has(key)).sort(([a],[b])=>a.localeCompare(b)));
  return JSON.stringify({componentKey:node.componentKey,componentVersion:node.componentVersion,visualConfig,responsive:node.responsive??{}});
}

export function evaluateStorefrontFidelityDrift(document:StorefrontPageDocument,preset:StorefrontFidelityPreset):StorefrontFidelityDriftReport{
  const changedNodeIds:string[]=[];const missingNodeIds:string[]=[];
  for(const[id,patch]of Object.entries(preset.nodes)){
    const current=findNode(document,id);if(!current){missingNodeIds.push(id);continue;}
    const expected=clone(current);
    expected.config=patchVisualConfig(expected.config,patch.config);
    if(patch.styleSlots)expected.config.styleSlots=sanitizeStorefrontStyleSlots(patch.styleSlots);
    if(patch.responsive)expected.responsive={...(expected.responsive??{}),...clone(patch.responsive)};
    if(stableVisualSnapshot(current)!==stableVisualSnapshot(expected))changedNodeIds.push(id);
  }
  const currentMeta=readStorefrontFidelityMetadata(document);
  const sectionOrderDrift=(Boolean(preset.sectionOrder)&&JSON.stringify(currentMeta?.sectionOrder??{})!==JSON.stringify(preset.sectionOrder))||(Boolean(preset.nodeOrder)&&JSON.stringify(currentMeta?.nodeOrder??{})!==JSON.stringify(preset.nodeOrder));
  const protectedIds=new Set(preset.protectedNodeIds??[]);
  const structuralDrift=missingNodeIds.some(id=>protectedIds.has(id));
  const denominator=Math.max(1,Object.keys(preset.nodes).length+(preset.sectionOrder?1:0)+(preset.nodeOrder?1:0));
  const weighted=changedNodeIds.length+missingNodeIds.length+(sectionOrderDrift?1:0)+(structuralDrift?1:0);
  const score=Math.min(100,Math.round(weighted/denominator*100));
  return{score,changedNodeIds,missingNodeIds,structuralDrift,sectionOrderDrift};
}

export function evaluateStorefrontDesignGuard(document:StorefrontPageDocument,preset:StorefrontFidelityPreset){
  const report=evaluateStorefrontFidelityDrift(document,preset);
  const guard=readStorefrontFidelityMetadata(document)?.designGuard;
  const mode=guard?.mode??'off';
  return{
    mode,
    report,
    allowed:mode!=='enforce'||(!report.structuralDrift&&report.score===0),
    warning:mode==='warn'&&report.score>0,
  };
}
