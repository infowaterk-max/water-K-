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
function pageSnapshot(page:StorefrontPageDocument){
  return{
    schemaVersion:page.schemaVersion,
    pageKey:page.pageKey,
    pageType:page.pageType,
    templateKey:page.templateKey,
    templateVersion:page.templateVersion,
    metadata:page.metadata??null,
    sectionIds:page.sections.map(section=>section.id),
  };
}

export type StorefrontPageChangeDiff={
  changedNodeIds:string[];
  insertedNodeIds:string[];
  removedNodeIds:string[];
  pageFieldsChanged:boolean;
};

export function diffStorefrontPageDocument(before:StorefrontPageDocument,after:StorefrontPageDocument):StorefrontPageChangeDiff{
  const a=nodeMap(before),b=nodeMap(after);
  const inserted=[...b.keys()].filter(id=>!a.has(id)).sort();
  const removed=[...a.keys()].filter(id=>!b.has(id)).sort();
  const changed=[...a.keys()].filter(id=>b.has(id)&&JSON.stringify(directNodeSnapshot(a.get(id)!))!==JSON.stringify(directNodeSnapshot(b.get(id)!))).sort();
  return{
    changedNodeIds:changed,
    insertedNodeIds:inserted,
    removedNodeIds:removed,
    pageFieldsChanged:JSON.stringify(pageSnapshot(before))!==JSON.stringify(pageSnapshot(after)),
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
}):StorefrontPageChangeDiff{
  const diff=diffStorefrontPageDocument(input.before,input.after);
  if(diff.pageFieldsChanged&&!input.allowPageFields)throw new Error('STOREFRONT_TARGETED_CHANGE_PAGE_FIELDS');
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
  const after={...clone(input.current),sections:input.current.sections.map(visit)};
  assertStorefrontTargetedPageChange({before:input.current,after,allowedNodeIds:input.nodeIds});
  return after;
}
