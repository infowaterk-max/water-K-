import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const ID_PATTERN=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const KEY_PATTERN=/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const MAX_FRAGMENT_BYTES=262_144;
const MAX_FRAGMENT_NODES=200;
const MAX_FRAGMENT_DEPTH=20;

type IdFactory=(node:StorefrontComponentNode,attempt:number)=>string;

const asRecord=(value:unknown,code:string):Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(code);
  return value as Record<string,unknown>;
};

const jsonClone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;

export function parseStorefrontSavedBlockFragment(value:unknown):StorefrontComponentNode{
  const serialized=JSON.stringify(value);
  if(!serialized||new TextEncoder().encode(serialized).length>MAX_FRAGMENT_BYTES)throw new Error('STOREFRONT_SAVED_BLOCK_FRAGMENT_TOO_LARGE');
  let count=0;
  const ids=new Set<string>();
  const walk=(candidate:unknown,depth:number):StorefrontComponentNode=>{
    if(depth>MAX_FRAGMENT_DEPTH)throw new Error('STOREFRONT_SAVED_BLOCK_FRAGMENT_TOO_DEEP');
    count+=1;
    if(count>MAX_FRAGMENT_NODES)throw new Error('STOREFRONT_SAVED_BLOCK_FRAGMENT_TOO_MANY_NODES');
    const record=asRecord(candidate,'STOREFRONT_SAVED_BLOCK_FRAGMENT_INVALID');
    const id=record.id;
    const componentKey=record.componentKey;
    const componentVersion=record.componentVersion;
    if(typeof id!=='string'||!ID_PATTERN.test(id)||ids.has(id))throw new Error('STOREFRONT_SAVED_BLOCK_NODE_ID_INVALID');
    ids.add(id);
    if(typeof componentKey!=='string'||!KEY_PATTERN.test(componentKey))throw new Error('STOREFRONT_SAVED_BLOCK_COMPONENT_KEY_INVALID');
    if(typeof componentVersion!=='number'||!Number.isInteger(componentVersion)||componentVersion<1)throw new Error('STOREFRONT_SAVED_BLOCK_COMPONENT_VERSION_INVALID');
    asRecord(record.config,'STOREFRONT_SAVED_BLOCK_CONFIG_INVALID');
    if(record.bindings!==undefined)asRecord(record.bindings,'STOREFRONT_SAVED_BLOCK_BINDINGS_INVALID');
    if(record.responsive!==undefined)asRecord(record.responsive,'STOREFRONT_SAVED_BLOCK_RESPONSIVE_INVALID');
    if(record.children!==undefined&&!Array.isArray(record.children))throw new Error('STOREFRONT_SAVED_BLOCK_CHILDREN_INVALID');
    const node=jsonClone(record) as StorefrontComponentNode;
    if(node.children)node.children=node.children.map(child=>walk(child,depth+1));
    return node;
  };
  return walk(value,0);
}

export function assertStorefrontSavedBlockFragment(value:unknown):asserts value is StorefrontComponentNode{
  parseStorefrontSavedBlockFragment(value);
}

const collectIds=(nodes:readonly StorefrontComponentNode[],target:Set<string>)=>{
  for(const node of nodes){
    target.add(node.id);
    collectIds(node.children??[],target);
  }
};

const defaultIdFactory:IdFactory=(node)=>`${node.componentKey.replace(/[^a-z0-9._:-]+/gi,'-')}-${crypto.randomUUID().slice(0,8)}`.toLowerCase().slice(0,127);

export function cloneStorefrontSavedBlockWithFreshIds(
  fragment:StorefrontComponentNode,
  existingIds:ReadonlySet<string>=new Set<string>(),
  idFactory:IdFactory=defaultIdFactory,
):StorefrontComponentNode{
  const source=parseStorefrontSavedBlockFragment(fragment);
  const reserved=new Set(existingIds);
  const clone=(node:StorefrontComponentNode):StorefrontComponentNode=>{
    let nextId='';
    for(let attempt=0;attempt<32;attempt+=1){
      const candidate=idFactory(node,attempt);
      if(ID_PATTERN.test(candidate)&&!reserved.has(candidate)){
        nextId=candidate;
        reserved.add(candidate);
        break;
      }
    }
    if(!nextId)throw new Error('STOREFRONT_SAVED_BLOCK_ID_GENERATION_FAILED');
    return{
      ...jsonClone(node),
      id:nextId,
      children:node.children?.map(clone),
    };
  };
  return clone(source);
}

export function insertStorefrontSavedBlock(
  document:StorefrontPageDocument,
  fragment:StorefrontComponentNode,
  options:{index?:number;idFactory?:IdFactory}={},
):{document:StorefrontPageDocument;insertedNodeId:string}{
  const ids=new Set<string>();
  collectIds(document.sections,ids);
  const cloned=cloneStorefrontSavedBlockWithFreshIds(fragment,ids,options.idFactory);
  const index=options.index===undefined?document.sections.length:Math.max(0,Math.min(document.sections.length,Math.trunc(options.index)));
  return{
    document:{...document,sections:[...document.sections.slice(0,index),cloned,...document.sections.slice(index)]},
    insertedNodeId:cloned.id,
  };
}
