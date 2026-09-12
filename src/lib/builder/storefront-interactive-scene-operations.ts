import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const EDITABLE=new Set([
  'eyebrow','title','copy','sceneKey','sceneKind','backgroundImage','backgroundAlt','hotspots',
  'showSetSummary','setTitle','setCtaLabel','setCtaHref','emptyLabel','hotspotStyle','style',
]);

function locate(nodes:StorefrontComponentNode[],nodeId:string):StorefrontComponentNode|null{
  for(const node of nodes){
    if(node.id===nodeId)return node;
    const child=locate(node.children??[],nodeId);
    if(child)return child;
  }
  return null;
}

export function setStorefrontInteractiveSceneConfig(document:StorefrontPageDocument,nodeId:string,key:string,value:unknown):StorefrontPageDocument{
  if(!EDITABLE.has(key))throw new Error('INTERACTIVE_SCENE_CONFIG_KEY_FORBIDDEN');
  const next=structuredClone(document);
  const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.interactive-scene'||node.componentVersion!==1)throw new Error('INTERACTIVE_SCENE_NODE_NOT_FOUND');
  JSON.stringify(value);
  node.config={...node.config,[key]:structuredClone(value)};
  return next;
}

export function bindStorefrontInteractiveSceneProducts(document:StorefrontPageDocument,nodeId:string):StorefrontPageDocument{
  const next=structuredClone(document);
  const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.interactive-scene'||node.componentVersion!==1)throw new Error('INTERACTIVE_SCENE_NODE_NOT_FOUND');
  node.bindings={...node.bindings,products:{path:'catalog.interactiveSceneProducts'}};
  return next;
}
