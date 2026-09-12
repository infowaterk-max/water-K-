import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const EDITABLE=new Set([
  'recipeKey','defaultServings','eyebrow','title','copy','actionLabel','showClaims','style',
]);

function locate(nodes:StorefrontComponentNode[],nodeId:string):StorefrontComponentNode|null{
  for(const node of nodes){
    if(node.id===nodeId)return node;
    const child=locate(node.children??[],nodeId);
    if(child)return child;
  }
  return null;
}

export function setStorefrontRecipeCommerceConfig(document:StorefrontPageDocument,nodeId:string,key:string,value:unknown):StorefrontPageDocument{
  if(!EDITABLE.has(key))throw new Error('RECIPE_COMMERCE_CONFIG_KEY_FORBIDDEN');
  const next=structuredClone(document);
  const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.recipe'||node.componentVersion!==1)throw new Error('RECIPE_COMMERCE_NODE_NOT_FOUND');
  JSON.stringify(value);
  node.config={...node.config,[key]:structuredClone(value)};
  return next;
}

export function bindStorefrontRecipeCommerceData(document:StorefrontPageDocument,nodeId:string):StorefrontPageDocument{
  const next=structuredClone(document);
  const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.recipe'||node.componentVersion!==1)throw new Error('RECIPE_COMMERCE_NODE_NOT_FOUND');
  node.bindings={
    ...node.bindings,
    recipes:{path:'catalog.recipeDefinitions'},
    catalog:{path:'catalog.recipeProducts'},
  };
  return next;
}
