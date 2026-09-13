import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_EXISTING_COMMERCE_BINDINGS_VERSION='shoporation.storefront-existing-commerce-bindings.v1' as const;
const TARGETS:Readonly<Record<string,{enginePath?:string;catalog:boolean}>>=Object.freeze({
  'guided.finder':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'guided.results':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'guided.explanation':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'composer.builder':{enginePath:'commerce.existingEngines.composers',catalog:true},
  'configurator.builder':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'configurator.slot-list':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'compatibility.status':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'compatibility.evidence':{enginePath:'commerce.existingEngines.configurators',catalog:true},
});
function decorate(node:StorefrontComponentNode):StorefrontComponentNode{
  const target=TARGETS[node.componentKey];
  const children=node.children?.map(decorate);
  if(!target)return children?{...node,children}:node;
  return{...node,bindings:{...node.bindings,...(target.enginePath?{engineConfigs:{path:target.enginePath}}:{}),...(target.catalog?{catalog:{path:'catalog.existingCommerceProducts'}}:{})},...(children?{children}:{})};
}
export function bindStorefrontExistingCommerceRuntime(document:StorefrontPageDocument):StorefrontPageDocument{return{...document,sections:document.sections.map(decorate)};}
