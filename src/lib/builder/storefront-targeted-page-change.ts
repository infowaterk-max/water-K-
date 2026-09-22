import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_TARGETED_PAGE_CHANGE_VERSION='shoporation.storefront-targeted-page-change.v1' as const;
const clone=<T>(value:T):T=>structuredClone(value);

type NodeMap=Map<string,StorefrontComponentNode>;
function collectNodes(nodes:readonly StorefrontComponentNode[],result:NodeMap){
  for(const node of nodes){
    if(result.has(node.id))throw new Error(`STOREFRONT_TARGETED_CHANGE_DUPLICATE_NODE:${node.id}`);
    result.set(node.id,node);
    collectNodes(node.children??[],result);
  }
}
function nodeMap(page:StorefrontPageDocument):NodeMap{
  const result:NodeMap=new Map();
  collectNodes(page.sections,result);
  return result;
}
function directNodeSnapshot(node:StorefrontComponentNode){
  return{
    componentKey:node.componentKey,
    componentVersion:node.componentVersion,
    config:node.config,
    bindings:node.bindings??null,
    responsive:node.responsive??null,
    childIds:(node.children??[]).map(child=>child.id),
  };
}
const PAGE_FIELDS=['schemaVersion','pageKey','pageType','templateKey','templateVersion'] as const;
export type StorefrontTargetedPageField=typeof PAGE_FIELDS[number]|'sections';
const FORBIDDEN_METADATA_KEYS=new Set(['__proto__','prototype','constructor']);

const jsonEqual=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function changedPageFields(before:StorefrontPageDocument,after:StorefrontPageDocument):StorefrontTargetedPageField[]{
  const changed:StorefrontTargetedPageField[]=[];
  for(const field of PAGE_FIELDS)if(!jsonEqual(before[field],after[field]))changed.push(field);
  if(!jsonEqual(before.sections.map(section=>section.id),after.sections.map(section=>section.id)))changed.push('sections');
  return changed;
}
function changedMetadataKeys(before:StorefrontPageDocument,after:StorefrontPageDocument):string[]{
  const a=before.metadata??{},b=after.metadata??{};
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  return [...keys].filter(key=>
    Object.prototype.hasOwnProperty.call(a,key)!==Object.prototype.hasOwnProperty.call(b,key)
    ||!jsonEqual(a[key],b[key])
  ).sort();
}

export type StorefrontPageChangeDiff={
  changedNodeIds:string[];
  insertedNodeIds:string[];
  removedNodeIds:string[];
  pageFieldsChanged:boolean;
  changedPageFields:StorefrontTargetedPageField[];
  changedMetadataKeys:string[];
};

export function diffStorefrontPageDocument(before:StorefrontPageDocument,after:StorefrontPageDocument):StorefrontPageChangeDiff{
  const a=nodeMap(before),b=nodeMap(after);
  const inserted=[...b.keys()].filter(id=>!a.has(id)).sort();
  const removed=[...a.keys()].filter(id=>!b.has(id)).sort();
  const changed=[...a.keys()].filter(id=>b.has(id)&&JSON.stringify(directNodeSnapshot(a.get(id)!))!==JSON.stringify(directNodeSnapshot(b.get(id)!))).sort();
  const pageFields=changedPageFields(before,after);
  const metadataKeys=changedMetadataKeys(before,after);
  return{
    changedNodeIds:changed,
    insertedNodeIds:inserted,
    removedNodeIds:removed,
    pageFieldsChanged:pageFields.length>0||metadataKeys.length>0,
    changedPageFields:pageFields,
    changedMetadataKeys:metadataKeys,
  };
}

function addDescendants(node:StorefrontComponentNode,result:Set<string>){
  result.add(node.id);
  for(const child of node.children??[])addDescendants(child,result);
}
function expandAllowed(before:StorefrontPageDocument,after:StorefrontPageDocument,allowed:readonly string[]):Set<string>{
  const result=new Set<string>();
  const beforeMap=nodeMap(before),afterMap=nodeMap(after);
  for(const id of allowed){
    const node=afterMap.get(id)??beforeMap.get(id);
    if(!node)throw new Error(`STOREFRONT_TARGETED_CHANGE_ALLOWED_NODE_MISSING:${id}`);
    addDescendants(node,result);
  }
  return result;
}

export function assertStorefrontTargetedPageChange(input:{
  before:StorefrontPageDocument;
  after:StorefrontPageDocument;
  allowedNodeIds:readonly string[];
  allowPageFields?:boolean;
  allowedPageFields?:readonly StorefrontTargetedPageField[];
  allowedMetadataKeys?:readonly string[];
}):StorefrontPageChangeDiff{
  const diff=diffStorefrontPageDocument(input.before,input.after);
  if(diff.pageFieldsChanged&&!input.allowPageFields){
    if(!input.allowedPageFields?.length&&!input.allowedMetadataKeys?.length)throw new Error('STOREFRONT_TARGETED_CHANGE_PAGE_FIELDS');
    const allowedPageFields=new Set(input.allowedPageFields??[]);
    const allowedMetadataKeys=new Set(input.allowedMetadataKeys??[]);
    for(const field of diff.changedPageFields){
      if(!allowedPageFields.has(field))throw new Error(`STOREFRONT_TARGETED_CHANGE_PAGE_FIELD_SCOPE_VIOLATION:${field}`);
    }
    for(const key of diff.changedMetadataKeys){
      if(!allowedMetadataKeys.has(key))throw new Error(`STOREFRONT_TARGETED_CHANGE_METADATA_SCOPE_VIOLATION:${key}`);
    }
  }
  const allowed=expandAllowed(input.before,input.after,input.allowedNodeIds);
  for(const id of [...diff.changedNodeIds,...diff.insertedNodeIds,...diff.removedNodeIds]){
    if(!allowed.has(id))throw new Error(`STOREFRONT_TARGETED_CHANGE_SCOPE_VIOLATION:${id}`);
  }
  return diff;
}

export function replaceStorefrontPageNodesById(input:{
  current:StorefrontPageDocument;
  source:StorefrontPageDocument;
  nodeIds:readonly string[];
  metadataPatch?:Readonly<Record<string,unknown>>;
}):StorefrontPageDocument{
  if(input.current.pageKey!==input.source.pageKey||input.current.pageType!==input.source.pageType){
    throw new Error('STOREFRONT_TARGETED_CHANGE_PAGE_IDENTITY_MISMATCH');
  }
  const sourceMap=nodeMap(input.source);
  const targets=new Set(input.nodeIds);
  for(const id of targets)if(!sourceMap.has(id))throw new Error(`STOREFRONT_TARGETED_CHANGE_SOURCE_NODE_MISSING:${id}`);
  const visit=(node:StorefrontComponentNode):StorefrontComponentNode=>{
    if(targets.has(node.id))return clone(sourceMap.get(node.id)!);
    return{...clone(node),...(node.children?{children:node.children.map(visit)}:{})};
  };
  let after:StorefrontPageDocument={...clone(input.current),sections:input.current.sections.map(visit)};
  const metadataKeys=Object.keys(input.metadataPatch??{});
  if(metadataKeys.length){
    const metadata=clone(input.current.metadata??{});
    for(const key of metadataKeys){
      if(FORBIDDEN_METADATA_KEYS.has(key))throw new Error(`STOREFRONT_TARGETED_CHANGE_METADATA_KEY_FORBIDDEN:${key}`);
      const value=input.metadataPatch?.[key];
      if(value===undefined)delete metadata[key];
      else metadata[key]=clone(value);
    }
    after={...after,metadata:Object.keys(metadata).length?metadata:undefined};
  }
  assertStorefrontTargetedPageChange({
    before:input.current,
    after,
    allowedNodeIds:input.nodeIds,
    allowedMetadataKeys:metadataKeys,
  });
  return after;
}
