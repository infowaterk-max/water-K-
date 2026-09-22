import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  applyStorefrontFidelityPreset,
  readStorefrontFidelityMetadata,
  resolveStorefrontChildOrder,
  resolveStorefrontSectionOrder,
  sanitizeStorefrontStyleSlots,
  writeStorefrontFidelityMetadata,
  type StorefrontBuilderEditMode,
  type StorefrontDesignGuardMode,
  type StorefrontFidelityPreset,
  type StorefrontImageArtDirection,
  type StorefrontResponsiveSectionOrder,
} from '@/lib/builder/storefront-fidelity-engine';
import {
  sanitizeStorefrontTypographyValue,
  type StorefrontResponsiveTypography,
  type StorefrontTypographyValue,
} from '@/lib/builder/storefront-fidelity-typography';
import {
  sanitizeStorefrontVisualStyleSlot,
  type StorefrontVisualStyleConfig,
  type StorefrontVisualStyleSlot,
} from '@/lib/builder/storefront-visual-style';

export const STOREFRONT_FIDELITY_BUILDER_OPERATIONS_VERSION='shoporation.visual-builder-fidelity-operations.v3' as const;
export const STOREFRONT_LAYER_ANCHORS=['fill','top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'] as const;
export type StorefrontLayerAnchor=typeof STOREFRONT_LAYER_ANCHORS[number];
export type StorefrontLayerViewportGeometry={
  anchor:StorefrontLayerAnchor;
  offsetXPercent?:number;
  offsetYPercent?:number;
  widthPercent?:number|null;
  heightPercent?:number|null;
  zIndex?:number|null;
  opacity?:number|null;
};

const clone=<T>(value:T):T=>structuredClone(value);
const VIEWPORT_STYLE_KEYS=['base','desktop','tablet','mobile'] as const;
const LAYER_POSITION_STYLE_KEYS=['position','top','right','bottom','left','inset','transform'] as const;
const LAYER_OPTIONAL_GEOMETRY_STYLE_KEYS=['width','height','zIndex','opacity'] as const;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const finite=(value:unknown,fallback=0)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;

function currentMetadata(document:StorefrontPageDocument){
  const current=readStorefrontFidelityMetadata(document);
  return{
    editMode:current?.editMode,
    sectionOrder:clone(current?.sectionOrder??{}),
    nodeOrder:clone(current?.nodeOrder??{}),
    designGuard:current?.designGuard?clone(current.designGuard):undefined,
  };
}

function findNode(document:StorefrontPageDocument,nodeId:string):StorefrontComponentNode|null{
  const walk=(nodes:StorefrontPageDocument['sections']):StorefrontComponentNode|null=>{
    for(const node of nodes){if(node.id===nodeId)return node;const found=walk(node.children??[]);if(found)return found;}
    return null;
  };
  return walk(document.sections);
}

function findNodeWithParent(document:StorefrontPageDocument,nodeId:string):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null{
  const walk=(nodes:StorefrontPageDocument['sections'],parent:StorefrontComponentNode|null):{node:StorefrontComponentNode;parent:StorefrontComponentNode|null}|null=>{
    for(const node of nodes){
      if(node.id===nodeId)return{node,parent};
      const found=walk(node.children??[],node);if(found)return found;
    }
    return null;
  };
  return walk(document.sections,null);
}

function mutateNode(document:StorefrontPageDocument,nodeId:string,mutate:(node:StorefrontComponentNode)=>void){
  const next=clone(document);
  const node=findNode(next,nodeId);if(!node)throw new Error('FIDELITY_NODE_NOT_FOUND');
  mutate(node);
  return next;
}

function normalizeResponsiveStyle(value:unknown):StorefrontVisualStyleConfig{
  if(!isRecord(value))return{};
  const slotted=VIEWPORT_STYLE_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!slotted){
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

function normalizeResponsiveTypography(value:unknown):StorefrontResponsiveTypography{
  if(!isRecord(value))return{};
  const slotted=VIEWPORT_STYLE_KEYS.some(key=>Object.prototype.hasOwnProperty.call(value,key));
  if(!slotted){
    const base=sanitizeStorefrontTypographyValue(value);
    return Object.keys(base).length?{base}:{};
  }
  const result:StorefrontResponsiveTypography={};
  for(const key of VIEWPORT_STYLE_KEYS){
    const slot=sanitizeStorefrontTypographyValue(value[key]);
    if(Object.keys(slot).length)result[key]=slot;
  }
  return result;
}

function layerPositionStyle(input:StorefrontLayerViewportGeometry):StorefrontVisualStyleSlot{
  const x=clamp(finite(input.offsetXPercent),-50,50);
  const y=clamp(finite(input.offsetYPercent),-50,50);
  const style:StorefrontVisualStyleSlot={position:'absolute'};
  if(input.anchor==='fill')Object.assign(style,{inset:'0',width:'100%',height:'100%',transform:'none'});
  else{
    const [vertical,horizontal]=input.anchor==='center'?['center','center']:input.anchor.split('-') as [string,string];
    if(vertical==='top')style.top=`${y}%`;
    else if(vertical==='bottom')style.bottom=`${y}%`;
    else style.top=`calc(50% + ${y}%)`;
    if(horizontal==='left')style.left=`${x}%`;
    else if(horizontal==='right')style.right=`${x}%`;
    else style.left=`calc(50% + ${x}%)`;
    if(vertical==='center'&&horizontal==='center')style.transform='translate(-50%, -50%)';
    else if(vertical==='center')style.transform='translateY(-50%)';
    else if(horizontal==='center')style.transform='translateX(-50%)';
    else style.transform='none';
  }
  if(typeof input.widthPercent==='number')style.width=`${clamp(input.widthPercent,5,100)}%`;
  if(typeof input.heightPercent==='number')style.height=`${clamp(input.heightPercent,5,100)}%`;
  if(typeof input.zIndex==='number')style.zIndex=Math.round(clamp(input.zIndex,0,20));
  if(typeof input.opacity==='number')style.opacity=clamp(input.opacity,0,1);
  return sanitizeStorefrontVisualStyleSlot(style);
}

export function setStorefrontFidelityEditMode(document:StorefrontPageDocument,editMode:StorefrontBuilderEditMode){
  return writeStorefrontFidelityMetadata(document,{...currentMetadata(document),editMode});
}

export function setStorefrontDesignGuardMode(document:StorefrontPageDocument,mode:StorefrontDesignGuardMode){
  const current=currentMetadata(document);
  return writeStorefrontFidelityMetadata(document,{
    ...current,
    designGuard:{...(current.designGuard??{}),mode},
  });
}

export function setStorefrontResponsiveSectionOrder(document:StorefrontPageDocument,viewport:StorefrontViewport,order:readonly string[]){
  const current=currentMetadata(document);
  const known=new Set(document.sections.map(section=>section.id));
  const next=[...new Set(order.filter(id=>known.has(id)))];
  return writeStorefrontFidelityMetadata(document,{
    ...current,
    sectionOrder:{...(current.sectionOrder??{}),[viewport]:next},
  });
}

export function moveStorefrontSectionAtViewport(document:StorefrontPageDocument,viewport:StorefrontViewport,nodeId:string,targetIndex:number){
  const order=resolveStorefrontSectionOrder(document,viewport);
  const from=order.indexOf(nodeId);if(from<0)throw new Error('FIDELITY_SECTION_NOT_FOUND');
  const next=[...order];next.splice(from,1);next.splice(Math.max(0,Math.min(next.length,Math.trunc(targetIndex))),0,nodeId);
  return setStorefrontResponsiveSectionOrder(document,viewport,next);
}

export function setStorefrontResponsiveChildOrder(document:StorefrontPageDocument,parentId:string,viewport:StorefrontViewport,order:readonly string[]){
  const parent=findNode(document,parentId);if(!parent)throw new Error('FIDELITY_PARENT_NOT_FOUND');
  const known=new Set((parent.children??[]).map(child=>child.id));
  const next=[...new Set(order.filter(id=>known.has(id)))];
  const current=currentMetadata(document);
  return writeStorefrontFidelityMetadata(document,{
    ...current,
    nodeOrder:{...(current.nodeOrder??{}),[parentId]:{...((current.nodeOrder??{})[parentId]??{}),[viewport]:next}},
  });
}

export function moveStorefrontChildAtViewport(document:StorefrontPageDocument,parentId:string,viewport:StorefrontViewport,nodeId:string,targetIndex:number){
  const parent=findNode(document,parentId);if(!parent)throw new Error('FIDELITY_PARENT_NOT_FOUND');
  const order=resolveStorefrontChildOrder(document,parent,viewport);
  const from=order.indexOf(nodeId);if(from<0)throw new Error('FIDELITY_CHILD_NOT_FOUND');
  const next=[...order];next.splice(from,1);next.splice(Math.max(0,Math.min(next.length,Math.trunc(targetIndex))),0,nodeId);
  return setStorefrontResponsiveChildOrder(document,parentId,viewport,next);
}

export function clearStorefrontResponsiveOrder(document:StorefrontPageDocument,input:{viewport:StorefrontViewport;parentId?:string|null}){
  const current=currentMetadata(document);
  if(input.parentId){
    const parentOrder={...((current.nodeOrder??{})[input.parentId]??{})};delete parentOrder[input.viewport];
    const nodeOrder={...(current.nodeOrder??{}),[input.parentId]:parentOrder};
    if(!Object.keys(parentOrder).length)delete nodeOrder[input.parentId];
    return writeStorefrontFidelityMetadata(document,{...current,nodeOrder});
  }
  const sectionOrder={...(current.sectionOrder??{})};delete sectionOrder[input.viewport];
  return writeStorefrontFidelityMetadata(document,{...current,sectionOrder});
}

export function setStorefrontNodeTypography(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,value:StorefrontTypographyValue){
  return mutateNode(document,nodeId,node=>{
    if(!['content.heading','content.text','content.button'].includes(node.componentKey))throw new Error('FIDELITY_TYPOGRAPHY_COMPONENT_UNSUPPORTED');
    const current=normalizeResponsiveTypography(node.config.typography);
    const sanitized=sanitizeStorefrontTypographyValue(value);
    if(Object.keys(sanitized).length)current[viewport]=sanitized;else delete current[viewport];
    node.config={...node.config,typography:current};
  });
}

export function setStorefrontNodeViewportStyle(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,value:StorefrontVisualStyleSlot){
  return mutateNode(document,nodeId,node=>{
    const current=normalizeResponsiveStyle(node.config.style);
    const sanitized=sanitizeStorefrontVisualStyleSlot(value);
    if(Object.keys(sanitized).length)current[viewport]=sanitized;else delete current[viewport];
    node.config={...node.config,style:current};
  });
}

export function setStorefrontLayerViewportGeometry(document:StorefrontPageDocument,nodeId:string,viewport:StorefrontViewport,value:StorefrontLayerViewportGeometry|null){
  const located=findNodeWithParent(document,nodeId);
  if(!located)throw new Error('FIDELITY_NODE_NOT_FOUND');
  if(located.node.componentKey!=='visual.layer')throw new Error('FIDELITY_LAYER_REQUIRED');
  if(located.parent?.componentKey!=='visual.layered-canvas')throw new Error('FIDELITY_LAYER_CANVAS_PARENT_REQUIRED');
  return mutateNode(document,nodeId,node=>{
    const current=normalizeResponsiveStyle(node.config.style);
    const slot={...(current[viewport]??{})};
    for(const key of LAYER_POSITION_STYLE_KEYS)delete slot[key];
    if(value===null){
      for(const key of LAYER_OPTIONAL_GEOMETRY_STYLE_KEYS)delete slot[key];
    }else{
      if(value.widthPercent===null)delete slot.width;
      if(value.heightPercent===null)delete slot.height;
      if(value.zIndex===null)delete slot.zIndex;
      if(value.opacity===null)delete slot.opacity;
      Object.assign(slot,layerPositionStyle(value));
    }
    const sanitized=sanitizeStorefrontVisualStyleSlot(slot);
    if(Object.keys(sanitized).length)current[viewport]=sanitized;else delete current[viewport];
    node.config={...node.config,style:current};
  });
}

export function setStorefrontNodeStyleSlot(document:StorefrontPageDocument,nodeId:string,slot:string,viewport:StorefrontViewport,value:StorefrontVisualStyleSlot){
  return mutateNode(document,nodeId,node=>{
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(slot))throw new Error('FIDELITY_STYLE_SLOT_INVALID');
    const slots=sanitizeStorefrontStyleSlots(node.config.styleSlots);
    const current=normalizeResponsiveStyle(slots[slot]);
    const sanitized=sanitizeStorefrontVisualStyleSlot(value);
    if(Object.keys(sanitized).length)current[viewport]=sanitized;else delete current[viewport];
    if(Object.keys(current).length)slots[slot]=current;else delete slots[slot];
    node.config={...node.config,styleSlots:slots};
  });
}

export function setStorefrontImageArtDirection(document:StorefrontPageDocument,nodeId:string,value:StorefrontImageArtDirection){
  return mutateNode(document,nodeId,node=>{
    if(node.componentKey!=='content.image')throw new Error('FIDELITY_ART_DIRECTION_IMAGE_REQUIRED');
    node.config={...node.config,artDirection:clone(value)};
  });
}

export function applyStorefrontFidelityPresetFromBuilder(document:StorefrontPageDocument,preset:StorefrontFidelityPreset){
  return applyStorefrontFidelityPreset(document,preset);
}

export function resetStorefrontFidelityComposition(document:StorefrontPageDocument,preset:StorefrontFidelityPreset){
  const reset=applyStorefrontFidelityPreset(document,preset);
  const metadata=readStorefrontFidelityMetadata(reset);
  return writeStorefrontFidelityMetadata(reset,{
    editMode:metadata?.editMode??'normal',
    sectionOrder:clone(preset.sectionOrder??{} as StorefrontResponsiveSectionOrder),
    nodeOrder:clone(preset.nodeOrder??{}),
    designGuard:{mode:metadata?.designGuard?.mode??'warn',presetId:preset.presetId,baselineVersion:preset.version,protectedNodeIds:clone(preset.protectedNodeIds??[])},
  });
}
