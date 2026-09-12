import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  STOREFRONT_BUILDER_EDIT_MODES,
  STOREFRONT_FIDELITY_ENGINE_VERSION,
  STOREFRONT_FIDELITY_METADATA_KEY,
} from '@/lib/builder/storefront-fidelity-engine';

export const STOREFRONT_FIDELITY_SECURITY_VERSION='shoporation.visual-builder-fidelity-security.v1' as const;

const VIEWPORTS=new Set(['desktop','tablet','mobile']);
const GUARD_MODES=new Set(['off','warn','enforce']);
const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PRESET_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function collectNodes(document:StorefrontPageDocument){
  const nodes=new Map<string,StorefrontComponentNode>();
  const walk=(items:readonly StorefrontComponentNode[])=>items.forEach(node=>{
    nodes.set(node.id,node);
    walk(node.children??[]);
  });
  walk(document.sections);
  return nodes;
}

function assertOrderMap(value:unknown,knownIds:ReadonlySet<string>,scope:string){
  if(value===undefined)return;
  if(!isRecord(value))throw new Error(`FIDELITY_SECURITY_${scope}_OBJECT_REQUIRED`);
  for(const[viewport,rawOrder]of Object.entries(value)){
    if(!VIEWPORTS.has(viewport))throw new Error(`FIDELITY_SECURITY_${scope}_VIEWPORT_INVALID`);
    if(!Array.isArray(rawOrder))throw new Error(`FIDELITY_SECURITY_${scope}_ORDER_REQUIRED`);
    if(rawOrder.length>knownIds.size)throw new Error(`FIDELITY_SECURITY_${scope}_ORDER_TOO_LARGE`);
    const seen=new Set<string>();
    for(const id of rawOrder){
      if(typeof id!=='string'||!ID_PATTERN.test(id)||!knownIds.has(id))throw new Error(`FIDELITY_SECURITY_${scope}_NODE_INVALID`);
      if(seen.has(id))throw new Error(`FIDELITY_SECURITY_${scope}_NODE_DUPLICATE`);
      seen.add(id);
    }
  }
}

export function assertSafeStorefrontFidelityDocument(document:StorefrontPageDocument):void{
  const raw=document.metadata?.[STOREFRONT_FIDELITY_METADATA_KEY];
  if(raw===undefined)return;
  if(!isRecord(raw))throw new Error('FIDELITY_SECURITY_METADATA_OBJECT_REQUIRED');
  if(raw.engineVersion!==STOREFRONT_FIDELITY_ENGINE_VERSION)throw new Error('FIDELITY_SECURITY_ENGINE_VERSION_INVALID');

  if(raw.editMode!==undefined&&!(STOREFRONT_BUILDER_EDIT_MODES as readonly unknown[]).includes(raw.editMode))throw new Error('FIDELITY_SECURITY_EDIT_MODE_INVALID');

  const nodes=collectNodes(document);
  const sectionIds=new Set(document.sections.map(section=>section.id));
  assertOrderMap(raw.sectionOrder,sectionIds,'SECTION');

  if(raw.nodeOrder!==undefined){
    if(!isRecord(raw.nodeOrder))throw new Error('FIDELITY_SECURITY_NODE_ORDER_OBJECT_REQUIRED');
    if(Object.keys(raw.nodeOrder).length>nodes.size)throw new Error('FIDELITY_SECURITY_NODE_ORDER_TOO_LARGE');
    for(const[parentId,orderMap]of Object.entries(raw.nodeOrder)){
      const parent=nodes.get(parentId);if(!parent)throw new Error('FIDELITY_SECURITY_PARENT_NOT_FOUND');
      assertOrderMap(orderMap,new Set((parent.children??[]).map(child=>child.id)),'CHILD');
    }
  }

  if(raw.designGuard!==undefined){
    if(!isRecord(raw.designGuard))throw new Error('FIDELITY_SECURITY_GUARD_OBJECT_REQUIRED');
    if(!GUARD_MODES.has(String(raw.designGuard.mode)))throw new Error('FIDELITY_SECURITY_GUARD_MODE_INVALID');
    if(raw.designGuard.presetId!==undefined&&(typeof raw.designGuard.presetId!=='string'||!PRESET_PATTERN.test(raw.designGuard.presetId)))throw new Error('FIDELITY_SECURITY_PRESET_ID_INVALID');
    if(raw.designGuard.baselineVersion!==undefined&&(typeof raw.designGuard.baselineVersion!=='number'||!Number.isInteger(raw.designGuard.baselineVersion)||raw.designGuard.baselineVersion<1))throw new Error('FIDELITY_SECURITY_BASELINE_VERSION_INVALID');
    if(raw.designGuard.protectedNodeIds!==undefined){
      if(!Array.isArray(raw.designGuard.protectedNodeIds)||raw.designGuard.protectedNodeIds.length>nodes.size)throw new Error('FIDELITY_SECURITY_PROTECTED_NODES_INVALID');
      const seen=new Set<string>();
      for(const id of raw.designGuard.protectedNodeIds){
        if(typeof id!=='string'||!nodes.has(id)||seen.has(id))throw new Error('FIDELITY_SECURITY_PROTECTED_NODE_INVALID');
        seen.add(id);
      }
    }
  }
}
