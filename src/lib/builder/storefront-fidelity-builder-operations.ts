import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  applyStorefrontFidelityPreset,
  readStorefrontFidelityMetadata,
  resolveStorefrontChildOrder,
  resolveStorefrontSectionOrder,
  writeStorefrontFidelityMetadata,
  type StorefrontBuilderEditMode,
  type StorefrontDesignGuardMode,
  type StorefrontFidelityPreset,
  type StorefrontImageArtDirection,
  type StorefrontResponsiveSectionOrder,
} from '@/lib/builder/storefront-fidelity-engine';

export const STOREFRONT_FIDELITY_BUILDER_OPERATIONS_VERSION='shoporation.visual-builder-fidelity-operations.v1' as const;

const clone=<T>(value:T):T=>structuredClone(value);

function currentMetadata(document:StorefrontPageDocument){
  const current=readStorefrontFidelityMetadata(document);
  return{
    editMode:current?.editMode,
    sectionOrder:clone(current?.sectionOrder??{}),
    nodeOrder:clone(current?.nodeOrder??{}),
    designGuard:current?.designGuard?clone(current.designGuard):undefined,
  };
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

function findParent(document:StorefrontPageDocument,parentId:string){
  const walk=(nodes:StorefrontPageDocument['sections']):StorefrontPageDocument['sections'][number]|null=>{
    for(const node of nodes){if(node.id===parentId)return node;const found=walk(node.children??[]);if(found)return found;}
    return null;
  };
  return walk(document.sections);
}

export function setStorefrontResponsiveChildOrder(document:StorefrontPageDocument,parentId:string,viewport:StorefrontViewport,order:readonly string[]){
  const parent=findParent(document,parentId);if(!parent)throw new Error('FIDELITY_PARENT_NOT_FOUND');
  const known=new Set((parent.children??[]).map(child=>child.id));
  const next=[...new Set(order.filter(id=>known.has(id)))];
  const current=currentMetadata(document);
  return writeStorefrontFidelityMetadata(document,{
    ...current,
    nodeOrder:{...(current.nodeOrder??{}),[parentId]:{...((current.nodeOrder??{})[parentId]??{}),[viewport]:next}},
  });
}

export function moveStorefrontChildAtViewport(document:StorefrontPageDocument,parentId:string,viewport:StorefrontViewport,nodeId:string,targetIndex:number){
  const parent=findParent(document,parentId);if(!parent)throw new Error('FIDELITY_PARENT_NOT_FOUND');
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

export function setStorefrontImageArtDirection(document:StorefrontPageDocument,nodeId:string,value:StorefrontImageArtDirection){
  const next=clone(document);
  const walk=(nodes:StorefrontPageDocument['sections']):boolean=>{
    for(const node of nodes){
      if(node.id===nodeId){
        if(node.componentKey!=='content.image')throw new Error('FIDELITY_ART_DIRECTION_IMAGE_REQUIRED');
        node.config={...node.config,artDirection:clone(value)};return true;
      }
      if(walk(node.children??[]))return true;
    }
    return false;
  };
  if(!walk(next.sections))throw new Error('FIDELITY_NODE_NOT_FOUND');
  return next;
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
