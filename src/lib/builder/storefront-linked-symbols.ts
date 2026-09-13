import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {parseStorefrontSavedBlockFragment} from '@/lib/builder/storefront-saved-blocks';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export type StorefrontGlobalSymbolSlot='header'|'footer';
export type StorefrontReusableSymbol={
  id:string;
  name:string;
  componentKey:string;
  componentVersion:number;
  fragment:StorefrontComponentNode;
  revision:number;
  globalSlot:StorefrontGlobalSymbolSlot|null;
  createdAt:string;
  updatedAt:string;
};
export type StorefrontLinkedSymbolInstance={
  instanceId:string;
  symbolId:string;
  rootNodeId:string;
  baseVersion:number;
  baseNode:StorefrontComponentNode;
};
export type StorefrontLinkedSymbolMetadataV1={version:1;instances:StorefrontLinkedSymbolInstance[]};

const METADATA_KEY='reusableSymbols';
const registry=createStorefrontVisualBuilderComponentRegistry();
const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const equal=(left:unknown,right:unknown):boolean=>{
  if(Object.is(left,right))return true;
  if(Array.isArray(left)&&Array.isArray(right))return left.length===right.length&&left.every((item,index)=>equal(item,right[index]));
  if(isRecord(left)&&isRecord(right)){
    const leftKeys=Object.keys(left);const rightKeys=Object.keys(right);
    return leftKeys.length===rightKeys.length&&leftKeys.every(key=>Object.prototype.hasOwnProperty.call(right,key)&&equal(left[key],right[key]));
  }
  return false;
};
const hash=(value:string)=>{
  let current=0x811c9dc5;
  for(let index=0;index<value.length;index+=1){current^=value.charCodeAt(index);current=Math.imul(current,0x01000193);}
  return(current>>>0).toString(16).padStart(8,'0');
};
const descendantId=(rootNodeId:string,sourceNodeId:string)=>`sym-${hash(`${rootNodeId}:${sourceNodeId}`)}`;
const generatedRootId=(prefix:string,seed?:string)=>seed?`${prefix}-${hash(seed)}`:`${prefix}-${crypto.randomUUID().slice(0,8)}`;

export function assertStorefrontReusableSymbolSource(fragment:StorefrontComponentNode,slot?:StorefrontGlobalSymbolSlot|null){
  const source=parseStorefrontSavedBlockFragment(fragment);
  const definition=registry.get(source.componentKey,source.componentVersion);
  if(!definition)throw new Error('STOREFRONT_SYMBOL_COMPONENT_UNKNOWN');
  const schemaSlot=definition.manifest.schemaSlot;
  if(schemaSlot!=='sections'&&schemaSlot!=='protected.header')throw new Error('STOREFRONT_SYMBOL_TOP_LEVEL_REQUIRED');
  if(slot==='header'&&schemaSlot!=='protected.header')throw new Error('STOREFRONT_GLOBAL_HEADER_INVALID');
  if(slot==='footer'&&(schemaSlot!=='sections'||source.componentKey!=='layout.section'))throw new Error('STOREFRONT_GLOBAL_FOOTER_INVALID');
  return source;
}

export function mapStorefrontSymbolSourceToInstance(source:StorefrontComponentNode,rootNodeId:string):StorefrontComponentNode{
  const parsed=parseStorefrontSavedBlockFragment(source);
  const walk=(node:StorefrontComponentNode,isRoot:boolean):StorefrontComponentNode=>({
    ...clone(node),
    id:isRoot?rootNodeId:descendantId(rootNodeId,node.id),
    children:node.children?.map(child=>walk(child,false)),
  });
  return walk(parsed,true);
}

function parseMetadata(document:StorefrontPageDocument):StorefrontLinkedSymbolMetadataV1{
  const raw=document.metadata?.[METADATA_KEY];
  if(!isRecord(raw)||raw.version!==1||!Array.isArray(raw.instances))return{version:1,instances:[]};
  const instances:StorefrontLinkedSymbolInstance[]=[];
  for(const item of raw.instances){
    if(!isRecord(item)||typeof item.instanceId!=='string'||typeof item.symbolId!=='string'||typeof item.rootNodeId!=='string'||typeof item.baseVersion!=='number')continue;
    try{instances.push({instanceId:item.instanceId,symbolId:item.symbolId,rootNodeId:item.rootNodeId,baseVersion:item.baseVersion,baseNode:parseStorefrontSavedBlockFragment(item.baseNode)});}catch{/* Ignore malformed legacy metadata fail-closed. */}
  }
  return{version:1,instances};
}
function withMetadata(document:StorefrontPageDocument,metadata:StorefrontLinkedSymbolMetadataV1):StorefrontPageDocument{
  const next={...(document.metadata??{})};
  if(metadata.instances.length)next[METADATA_KEY]=metadata;else delete next[METADATA_KEY];
  return{...document,metadata:Object.keys(next).length?next:undefined};
}
export const getStorefrontLinkedSymbolMetadata=(document:StorefrontPageDocument)=>parseMetadata(document);
export const findStorefrontLinkedSymbolInstance=(document:StorefrontPageDocument,rootNodeId:string)=>parseMetadata(document).instances.find(item=>item.rootNodeId===rootNodeId)??null;

const ABSENT=Symbol('absent');
type MergeValue=unknown|typeof ABSENT;
const mergeValue=(base:MergeValue,local:MergeValue,remote:MergeValue):MergeValue=>{
  if(equal(local,base))return remote===ABSENT?ABSENT:clone(remote);
  if(equal(remote,base))return local===ABSENT?ABSENT:clone(local);
  if(isRecord(base)&&isRecord(local)&&isRecord(remote)){
    const result:Record<string,unknown>={};
    const keys=new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)]);
    for(const key of keys){
      const merged=mergeValue(
        Object.prototype.hasOwnProperty.call(base,key)?base[key]:ABSENT,
        Object.prototype.hasOwnProperty.call(local,key)?local[key]:ABSENT,
        Object.prototype.hasOwnProperty.call(remote,key)?remote[key]:ABSENT,
      );
      if(merged!==ABSENT)result[key]=merged;
    }
    return result;
  }
  return local===ABSENT?ABSENT:clone(local);
};

function mergeChildren(base:readonly StorefrontComponentNode[],local:readonly StorefrontComponentNode[],remote:readonly StorefrontComponentNode[]):StorefrontComponentNode[]{
  const baseById=new Map(base.map(node=>[node.id,node]));
  const localById=new Map(local.map(node=>[node.id,node]));
  const remoteById=new Map(remote.map(node=>[node.id,node]));
  const result:StorefrontComponentNode[]=[];
  for(const remoteNode of remote){
    const baseNode=baseById.get(remoteNode.id);const localNode=localById.get(remoteNode.id);
    if(!baseNode){result.push(localNode?mergeNode(remoteNode,localNode,remoteNode):clone(remoteNode));continue;}
    if(!localNode)continue;
    result.push(mergeNode(baseNode,localNode,remoteNode));
  }
  for(const localNode of local){
    if(remoteById.has(localNode.id))continue;
    const baseNode=baseById.get(localNode.id);
    if(!baseNode||!equal(localNode,baseNode))result.push(clone(localNode));
  }
  return result;
}
function mergeNode(base:StorefrontComponentNode,local:StorefrontComponentNode,remote:StorefrontComponentNode):StorefrontComponentNode{
  const mergedConfig=mergeValue(base.config,local.config,remote.config);
  const mergedBindings=mergeValue(base.bindings??ABSENT,local.bindings??ABSENT,remote.bindings??ABSENT);
  const mergedResponsive=mergeValue(base.responsive??ABSENT,local.responsive??ABSENT,remote.responsive??ABSENT);
  const merged:StorefrontComponentNode={
    ...clone(remote),
    id:local.id,
    componentKey:equal(local.componentKey,base.componentKey)?remote.componentKey:local.componentKey,
    componentVersion:equal(local.componentVersion,base.componentVersion)?remote.componentVersion:local.componentVersion,
    config:(mergedConfig===ABSENT?{}:mergedConfig) as Record<string,unknown>,
    children:mergeChildren(base.children??[],local.children??[],remote.children??[]),
  };
  if(mergedBindings!==ABSENT)merged.bindings=mergedBindings as StorefrontComponentNode['bindings'];else delete merged.bindings;
  if(mergedResponsive!==ABSENT)merged.responsive=mergedResponsive as StorefrontComponentNode['responsive'];else delete merged.responsive;
  if(!merged.children?.length)delete merged.children;
  return merged;
}

export function linkStorefrontReusableSymbolAtRoot(document:StorefrontPageDocument,symbol:StorefrontReusableSymbol,rootNodeId:string):StorefrontPageDocument{
  assertStorefrontReusableSymbolSource(symbol.fragment);
  const index=document.sections.findIndex(node=>node.id===rootNodeId);
  if(index<0)throw new Error('STOREFRONT_SYMBOL_LINK_ROOT_NOT_FOUND');
  const mapped=mapStorefrontSymbolSourceToInstance(symbol.fragment,rootNodeId);
  const sections=[...document.sections];sections[index]=mapped;
  const metadata=parseMetadata(document);
  const entry:StorefrontLinkedSymbolInstance={instanceId:rootNodeId,symbolId:symbol.id,rootNodeId,baseVersion:symbol.revision,baseNode:clone(mapped)};
  return withMetadata({...document,sections},{version:1,instances:[...metadata.instances.filter(item=>item.rootNodeId!==rootNodeId),entry]});
}

export function insertStorefrontReusableSymbol(document:StorefrontPageDocument,symbol:StorefrontReusableSymbol,rootNodeId=generatedRootId('symbol')):{document:StorefrontPageDocument;insertedNodeId:string}{
  assertStorefrontReusableSymbolSource(symbol.fragment);
  if(document.sections.some(node=>node.id===rootNodeId))throw new Error('STOREFRONT_SYMBOL_ROOT_ID_CONFLICT');
  const mapped=mapStorefrontSymbolSourceToInstance(symbol.fragment,rootNodeId);
  const metadata=parseMetadata(document);
  const entry:StorefrontLinkedSymbolInstance={instanceId:rootNodeId,symbolId:symbol.id,rootNodeId,baseVersion:symbol.revision,baseNode:clone(mapped)};
  return{document:withMetadata({...document,sections:[...document.sections,mapped]},{version:1,instances:[...metadata.instances,entry]}),insertedNodeId:rootNodeId};
}

export function rebaseStorefrontReusableSymbolInstances(document:StorefrontPageDocument,symbols:readonly StorefrontReusableSymbol[]):StorefrontPageDocument{
  const metadata=parseMetadata(document);if(!metadata.instances.length)return clone(document);
  const symbolsById=new Map(symbols.map(symbol=>[symbol.id,symbol]));
  const sections=[...document.sections];const nextInstances:StorefrontLinkedSymbolInstance[]=[];
  for(const instance of metadata.instances){
    const index=sections.findIndex(node=>node.id===instance.rootNodeId);const symbol=symbolsById.get(instance.symbolId);
    if(index<0)continue;
    if(!symbol){nextInstances.push(instance);continue;}
    const remote=mapStorefrontSymbolSourceToInstance(symbol.fragment,instance.rootNodeId);
    const merged=mergeNode(instance.baseNode,sections[index]!,remote);
    sections[index]=merged;
    nextInstances.push({...instance,baseVersion:symbol.revision,baseNode:clone(remote)});
  }
  return withMetadata({...document,sections},{version:1,instances:nextInstances});
}

export function detachStorefrontReusableSymbol(document:StorefrontPageDocument,rootNodeId:string,symbols:readonly StorefrontReusableSymbol[]=[]):StorefrontPageDocument{
  const rebased=symbols.length?rebaseStorefrontReusableSymbolInstances(document,symbols):clone(document);
  const metadata=parseMetadata(rebased);
  if(!metadata.instances.some(item=>item.rootNodeId===rootNodeId))return rebased;
  return withMetadata(rebased,{version:1,instances:metadata.instances.filter(item=>item.rootNodeId!==rootNodeId)});
}

export function materializeStorefrontGlobalSymbols(document:StorefrontPageDocument,symbols:readonly StorefrontReusableSymbol[]):StorefrontPageDocument{
  let sections=[...document.sections];
  const header=symbols.find(symbol=>symbol.globalSlot==='header');
  if(header){
    assertStorefrontReusableSymbolSource(header.fragment,'header');
    const existingIndex=sections.findIndex(node=>node.componentKey==='system.header');
    const rootId=existingIndex>=0?sections[existingIndex]!.id:generatedRootId('global-header',document.pageKey);
    const mapped=mapStorefrontSymbolSourceToInstance(header.fragment,rootId);
    if(existingIndex>=0)sections[existingIndex]=mapped;else sections=[mapped,...sections];
  }
  const footer=symbols.find(symbol=>symbol.globalSlot==='footer');
  if(footer){
    assertStorefrontReusableSymbolSource(footer.fragment,'footer');
    const generatedId=generatedRootId('global-footer',document.pageKey);
    const sourceIndex=sections.findIndex(node=>node.id===footer.fragment.id);
    const existingIndex=sourceIndex>=0?sourceIndex:sections.findIndex(node=>node.id===generatedId);
    const rootId=sourceIndex>=0?footer.fragment.id:generatedId;
    const mapped=mapStorefrontSymbolSourceToInstance(footer.fragment,rootId);
    if(existingIndex>=0){sections.splice(existingIndex,1);sections.push(mapped);}else sections.push(mapped);
  }
  return{...document,sections};
}

export function materializeStorefrontReusableSymbols(document:StorefrontPageDocument,symbols:readonly StorefrontReusableSymbol[]):StorefrontPageDocument{
  return materializeStorefrontGlobalSymbols(rebaseStorefrontReusableSymbolInstances(document,symbols),symbols);
}
