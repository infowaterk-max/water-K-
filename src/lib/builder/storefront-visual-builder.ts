import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import {
  StorefrontComponentRegistry,
  hasStorefrontRuntimeCapability,
  isAllowedStorefrontBindingPath,
  validateStorefrontPageDocument,
  type StorefrontComponentNode,
  type StorefrontPageDocument,
  type StorefrontRuntimeCapabilityContext,
  type StorefrontRuntimeComponentDefinition,
} from '@/lib/builder/storefront-runtime';
import {isStorefrontManagedConfigKey} from '@/lib/builder/storefront-managed-config';

export const STOREFRONT_VISUAL_BUILDER_VERSION='shoporation.visual-builder.block22.v1' as const;

export type StorefrontBuilderMutation=
  |{type:'config';nodeId:string;key:string;value:unknown}
  |{type:'binding';nodeId:string;slot:string;path:string;fallback?:unknown}
  |{type:'responsive';nodeId:string;viewport:StorefrontViewport;hidden?:boolean;gridSpan?:number|null}
  |{type:'add';parentId:string|null;componentKey:string;componentVersion:number;index?:number;nodeId?:string}
  |{type:'remove';nodeId:string}
  |{type:'duplicate';nodeId:string;newNodeId?:string}
  |{type:'move';nodeId:string;parentId:string|null;index:number};

export type StorefrontBuilderHistory={
  past:StorefrontPageDocument[];
  present:StorefrontPageDocument;
  future:StorefrontPageDocument[];
};

type LocatedNode={node:StorefrontComponentNode;parent:StorefrontComponentNode|null;array:StorefrontComponentNode[];index:number};

const clone=<T>(value:T):T=>structuredClone(value);
const NODE_ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const FORBIDDEN_VALUE_KEYS=new Set(['__proto__','prototype','constructor']);

const valueShape=(value:unknown):string=>{
  if(value===null)return'null';
  if(Array.isArray(value))return`array:${value.map(valueShape).join('|')}`;
  if(typeof value==='object')return`object:${Object.keys(value as Record<string,unknown>).sort().map(key=>`${key}:${valueShape((value as Record<string,unknown>)[key])}`).join('|')}`;
  return typeof value;
};

function assertSafeValue(value:unknown,path='value',depth=0){
  if(depth>8)throw new Error('BUILDER_VALUE_DEPTH_EXCEEDED');
  if(typeof value==='function'||typeof value==='symbol'||typeof value==='bigint')throw new Error('BUILDER_VALUE_TYPE_FORBIDDEN');
  if(Array.isArray(value)){
    if(value.length>100)throw new Error('BUILDER_VALUE_ARRAY_TOO_LARGE');
    value.forEach((item,index)=>assertSafeValue(item,`${path}[${index}]`,depth+1));
    return;
  }
  if(value&&typeof value==='object'){
    const entries=Object.entries(value as Record<string,unknown>);
    if(entries.length>100)throw new Error('BUILDER_VALUE_OBJECT_TOO_LARGE');
    for(const[key,child]of entries){
      if(FORBIDDEN_VALUE_KEYS.has(key))throw new Error('BUILDER_VALUE_KEY_FORBIDDEN');
      assertSafeValue(child,`${path}.${key}`,depth+1);
    }
  }
}

function locateNode(document:StorefrontPageDocument,nodeId:string):LocatedNode|null{
  const walk=(array:StorefrontComponentNode[],parent:StorefrontComponentNode|null):LocatedNode|null=>{
    for(let index=0;index<array.length;index+=1){
      const node=array[index];
      if(node.id===nodeId)return{node,parent,array,index};
      const found=walk(node.children??[],node);
      if(found)return found;
    }
    return null;
  };
  return walk(document.sections,null);
}

function collectNodeIds(document:StorefrontPageDocument){
  const ids=new Set<string>();
  const walk=(nodes:readonly StorefrontComponentNode[])=>nodes.forEach(node=>{ids.add(node.id);walk(node.children??[])});
  walk(document.sections);
  return ids;
}

function uniqueNodeId(document:StorefrontPageDocument,base:string){
  const ids=collectNodeIds(document);
  const safe=(base.toLowerCase().replace(/[^a-z0-9._:-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96)||'component');
  if(!ids.has(safe))return safe;
  for(let index=2;index<10_000;index+=1){const candidate=`${safe}-${index}`;if(!ids.has(candidate))return candidate;}
  throw new Error('BUILDER_NODE_ID_EXHAUSTED');
}

function definitionFor(registry:StorefrontComponentRegistry,node:Pick<StorefrontComponentNode,'componentKey'|'componentVersion'>){
  const definition=registry.get(node.componentKey,node.componentVersion);
  if(!definition)throw new Error('BUILDER_COMPONENT_NOT_REGISTERED');
  return definition;
}

function assertCapability(definition:StorefrontRuntimeComponentDefinition,capability:StorefrontRuntimeCapabilityContext){
  if(!hasStorefrontRuntimeCapability(definition.manifest.capability,capability))throw new Error('BUILDER_COMPONENT_CAPABILITY_REQUIRED');
}

function assertPageType(definition:StorefrontRuntimeComponentDefinition,document:StorefrontPageDocument){
  if(!definition.manifest.pageTypes.includes(document.pageType))throw new Error('BUILDER_COMPONENT_PAGE_TYPE_NOT_ALLOWED');
}

function assertParentAccepts(parent:StorefrontComponentNode|null,definition:StorefrontRuntimeComponentDefinition,registry:StorefrontComponentRegistry){
  if(!parent){if(definition.manifest.schemaSlot!=='sections')throw new Error('BUILDER_TOP_LEVEL_SECTION_REQUIRED');return;}
  const parentDefinition=definitionFor(registry,parent);
  if(!parentDefinition.allowsChildren)throw new Error('BUILDER_PARENT_CHILDREN_NOT_ALLOWED');
  if(parentDefinition.allowedChildren&&!parentDefinition.allowedChildren.includes(definition.manifest.componentKey))throw new Error('BUILDER_COMPONENT_CHILD_NOT_ALLOWED');
  if(definition.manifest.schemaSlot==='protected.header'||definition.manifest.schemaSlot==='protected.navigation')throw new Error('BUILDER_PROTECTED_COMPONENT_INJECTION_FORBIDDEN');
}

function cloneNodeWithFreshIds(node:StorefrontComponentNode,document:StorefrontPageDocument,rootOverride?:string):StorefrontComponentNode{
  const used=collectNodeIds(document);
  const assigned=new Set<string>();
  const next=(base:string)=>{
    let candidate=(base.toLowerCase().replace(/[^a-z0-9._:-]+/g,'-').slice(0,96)||'component');
    if(!used.has(candidate)&&!assigned.has(candidate)){assigned.add(candidate);return candidate;}
    let index=2;while(used.has(`${candidate}-${index}`)||assigned.has(`${candidate}-${index}`))index+=1;
    candidate=`${candidate}-${index}`;assigned.add(candidate);return candidate;
  };
  const walk=(source:StorefrontComponentNode,forced?:string):StorefrontComponentNode=>({
    ...clone(source),
    id:forced??next(`${source.id}-copy`),
    children:(source.children??[]).map(child=>walk(child)),
  });
  const forced=rootOverride?next(rootOverride):undefined;
  return walk(node,forced);
}

function strictBuilderValidation(document:StorefrontPageDocument,registry:StorefrontComponentRegistry,capability:StorefrontRuntimeCapabilityContext){
  const validation=validateStorefrontPageDocument(document,registry,capability);
  const fatal=validation.violations.filter(item=>item.severity==='error');
  if(fatal.length)throw new Error(`BUILDER_DOCUMENT_INVALID:${fatal.map(item=>item.code).join(',')}`);
}

export function listStorefrontBuilderInsertableComponents(input:{
  document:StorefrontPageDocument;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
  parentId?:string|null;
}){
  const parent=input.parentId?locateNode(input.document,input.parentId)?.node??null:null;
  if(input.parentId&&!parent)throw new Error('BUILDER_PARENT_NOT_FOUND');
  return input.registry.list().filter(definition=>{
    if(definition.protectedSystem)return false;
    if(!definition.manifest.pageTypes.includes(input.document.pageType))return false;
    if(!hasStorefrontRuntimeCapability(definition.manifest.capability,input.capability))return false;
    try{assertParentAccepts(parent,definition,input.registry);return true}catch{return false}
  }).map(definition=>({
    componentKey:definition.manifest.componentKey,
    componentVersion:definition.manifest.componentVersion,
    schemaSlot:definition.manifest.schemaSlot,
    configurable:[...definition.manifest.configurable],
    bindingSlots:[...(definition.bindingSlots??[])],
    responsiveMode:definition.manifest.responsiveMode,
    capability:{minPlan:definition.manifest.capability.minPlan,features:[...definition.manifest.capability.features]},
  })).sort((a,b)=>a.componentKey.localeCompare(b.componentKey)||a.componentVersion-b.componentVersion);
}

export function applyStorefrontBuilderMutation(input:{
  document:StorefrontPageDocument;
  mutation:StorefrontBuilderMutation;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}):StorefrontPageDocument{
  const document=clone(input.document);
  const mutation=input.mutation;

  if(mutation.type==='config'){
    const located=locateNode(document,mutation.nodeId);if(!located)throw new Error('BUILDER_NODE_NOT_FOUND');
    const definition=definitionFor(input.registry,located.node);assertCapability(definition,input.capability);
    if(!definition.manifest.configurable.includes(mutation.key))throw new Error('BUILDER_CONFIG_KEY_NOT_EDITABLE');
    assertSafeValue(mutation.value);
    const previous=located.node.config[mutation.key];
    if(previous!==undefined&&mutation.value!==null&&valueShape(previous)!==valueShape(mutation.value))throw new Error('BUILDER_CONFIG_SHAPE_CHANGE_FORBIDDEN');
    located.node.config={...located.node.config,[mutation.key]:clone(mutation.value)};
  }

  if(mutation.type==='binding'){
    const located=locateNode(document,mutation.nodeId);if(!located)throw new Error('BUILDER_NODE_NOT_FOUND');
    const definition=definitionFor(input.registry,located.node);assertCapability(definition,input.capability);
    if(!(definition.bindingSlots??[]).includes(mutation.slot))throw new Error('BUILDER_BINDING_SLOT_NOT_EDITABLE');
    if(!isAllowedStorefrontBindingPath(mutation.path))throw new Error('BUILDER_BINDING_PATH_NOT_ALLOWED');
    assertSafeValue(mutation.fallback);
    located.node.bindings={...located.node.bindings,[mutation.slot]:{path:mutation.path,...(mutation.fallback!==undefined?{fallback:clone(mutation.fallback)}:{})}};
  }

  if(mutation.type==='responsive'){
    const located=locateNode(document,mutation.nodeId);if(!located)throw new Error('BUILDER_NODE_NOT_FOUND');
    const definition=definitionFor(input.registry,located.node);assertCapability(definition,input.capability);
    if(mutation.gridSpan!==undefined&&mutation.gridSpan!==null){
      if(definition.manifest.responsiveMode==='fixed')throw new Error('BUILDER_GRID_SPAN_NOT_SUPPORTED');
      if(!Number.isInteger(mutation.gridSpan)||mutation.gridSpan<1||mutation.gridSpan>12)throw new Error('BUILDER_GRID_SPAN_INVALID');
    }
    const current=located.node.responsive?.[mutation.viewport]??{};
    const next={...current};
    if(mutation.hidden!==undefined)next.hidden=mutation.hidden;
    if(mutation.gridSpan===null)delete next.gridSpan;
    else if(mutation.gridSpan!==undefined)next.gridSpan=mutation.gridSpan as 1|2|3|4|5|6|7|8|9|10|11|12;
    located.node.responsive={...located.node.responsive,[mutation.viewport]:next};
  }

  if(mutation.type==='add'){
    const parent=mutation.parentId?locateNode(document,mutation.parentId)?.node??null:null;
    if(mutation.parentId&&!parent)throw new Error('BUILDER_PARENT_NOT_FOUND');
    const definition=input.registry.get(mutation.componentKey,mutation.componentVersion);if(!definition)throw new Error('BUILDER_COMPONENT_NOT_REGISTERED');
    assertCapability(definition,input.capability);assertPageType(definition,document);assertParentAccepts(parent,definition,input.registry);
    const nodeId=mutation.nodeId??uniqueNodeId(document,`${mutation.componentKey.replace(/\./g,'-')}`);
    if(!NODE_ID_PATTERN.test(nodeId)||collectNodeIds(document).has(nodeId))throw new Error('BUILDER_NODE_ID_INVALID');
    const node:StorefrontComponentNode={id:nodeId,componentKey:mutation.componentKey,componentVersion:mutation.componentVersion,config:{},...(definition.allowsChildren?{children:[]}:{})};
    const array=parent?(parent.children??(parent.children=[])):document.sections;
    const index=mutation.index===undefined?array.length:Math.max(0,Math.min(array.length,Math.trunc(mutation.index)));
    array.splice(index,0,node);
  }

  if(mutation.type==='remove'){
    const located=locateNode(document,mutation.nodeId);if(!located)throw new Error('BUILDER_NODE_NOT_FOUND');
    if(definitionFor(input.registry,located.node).protectedSystem)throw new Error('BUILDER_PROTECTED_COMPONENT_REMOVE_FORBIDDEN');
    located.array.splice(located.index,1);
  }

  if(mutation.type==='duplicate'){
    const located=locateNode(document,mutation.nodeId);if(!located)throw new Error('BUILDER_NODE_NOT_FOUND');
    if(definitionFor(input.registry,located.node).protectedSystem)throw new Error('BUILDER_PROTECTED_COMPONENT_DUPLICATE_FORBIDDEN');
    const duplicate=cloneNodeWithFreshIds(located.node,document,mutation.newNodeId);
    located.array.splice(located.index+1,0,duplicate);
  }

  if(mutation.type==='move'){
    const source=locateNode(document,mutation.nodeId);if(!source)throw new Error('BUILDER_NODE_NOT_FOUND');
    const sourceDefinition=definitionFor(input.registry,source.node);
    if(sourceDefinition.protectedSystem)throw new Error('BUILDER_PROTECTED_COMPONENT_MOVE_FORBIDDEN');
    const targetParent=mutation.parentId?locateNode(document,mutation.parentId)?.node??null:null;
    if(mutation.parentId&&!targetParent)throw new Error('BUILDER_PARENT_NOT_FOUND');
    if(targetParent&&targetParent.id===source.node.id)throw new Error('BUILDER_MOVE_CYCLE_FORBIDDEN');
    const descendants=new Set<string>();const walk=(node:StorefrontComponentNode)=>{for(const child of node.children??[]){descendants.add(child.id);walk(child)}};walk(source.node);
    if(targetParent&&descendants.has(targetParent.id))throw new Error('BUILDER_MOVE_CYCLE_FORBIDDEN');
    assertParentAccepts(targetParent,sourceDefinition,input.registry);
    source.array.splice(source.index,1);
    const targetArray=targetParent?(targetParent.children??(targetParent.children=[])):document.sections;
    const index=Math.max(0,Math.min(targetArray.length,Math.trunc(mutation.index)));
    targetArray.splice(index,0,source.node);
  }

  strictBuilderValidation(document,input.registry,input.capability);
  return document;
}

const nodeMap=(document:StorefrontPageDocument)=>{
  const map=new Map<string,{node:StorefrontComponentNode;parentId:string|null}>();
  const walk=(nodes:readonly StorefrontComponentNode[],parentId:string|null)=>nodes.forEach(node=>{map.set(node.id,{node,parentId});walk(node.children??[],node.id)});
  walk(document.sections,null);return map;
};

/** Server-side guard for an untrusted Builder working copy before persistence. */
export function validateStorefrontBuilderWorkingCopy(input:{
  previous:StorefrontPageDocument;
  next:StorefrontPageDocument;
  registry:StorefrontComponentRegistry;
  capability:StorefrontRuntimeCapabilityContext;
}){
  const{previous,next,registry,capability}=input;
  if(previous.schemaVersion!==next.schemaVersion||previous.pageKey!==next.pageKey||previous.pageType!==next.pageType||previous.templateKey!==next.templateKey||previous.templateVersion!==next.templateVersion)throw new Error('BUILDER_DOCUMENT_IDENTITY_IMMUTABLE');
  strictBuilderValidation(next,registry,capability);
  const before=nodeMap(previous),after=nodeMap(next);
  for(const[id,{node,parentId}]of before){
    const definition=definitionFor(registry,node);
    const candidate=after.get(id);
    if(definition.protectedSystem){
      if(!candidate)throw new Error('BUILDER_PROTECTED_COMPONENT_REMOVE_FORBIDDEN');
      if(candidate.parentId!==parentId||candidate.node.componentKey!==node.componentKey||candidate.node.componentVersion!==node.componentVersion)throw new Error('BUILDER_PROTECTED_COMPONENT_MOVE_FORBIDDEN');
    }
  }
  for(const[id,{node}]of after){
    const definition=definitionFor(registry,node);assertCapability(definition,capability);assertPageType(definition,next);
    const previousNode=before.get(id)?.node;
    for(const[key,value]of Object.entries(node.config)){
      assertSafeValue(value);
      if(definition.manifest.configurable.includes(key)||isStorefrontManagedConfigKey(node.componentKey,key))continue;
      if(!previousNode||!(key in previousNode.config)||JSON.stringify(previousNode.config[key])!==JSON.stringify(value))throw new Error('BUILDER_UNKNOWN_CONFIG_MUTATION_FORBIDDEN');
    }
    for(const[slot,binding]of Object.entries(node.bindings??{})){
      if(!(definition.bindingSlots??[]).includes(slot)||!isAllowedStorefrontBindingPath(binding.path))throw new Error('BUILDER_BINDING_MUTATION_FORBIDDEN');
      assertSafeValue(binding.fallback);
    }
  }
  return true;
}

export function createStorefrontBuilderHistory(document:StorefrontPageDocument):StorefrontBuilderHistory{return{past:[],present:clone(document),future:[]}}
export function pushStorefrontBuilderHistory(history:StorefrontBuilderHistory,next:StorefrontPageDocument):StorefrontBuilderHistory{return{past:[...history.past,clone(history.present)].slice(-50),present:clone(next),future:[]}}
export function undoStorefrontBuilderHistory(history:StorefrontBuilderHistory):StorefrontBuilderHistory{
  const previous=history.past.at(-1);if(!previous)return history;
  return{past:history.past.slice(0,-1),present:clone(previous),future:[clone(history.present),...history.future].slice(0,50)};
}
export function redoStorefrontBuilderHistory(history:StorefrontBuilderHistory):StorefrontBuilderHistory{
  const next=history.future[0];if(!next)return history;
  return{past:[...history.past,clone(history.present)].slice(-50),present:clone(next),future:history.future.slice(1)};
}
