import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

export const STOREFRONT_EXISTING_COMMERCE_BINDINGS_VERSION='shoporation.storefront-existing-commerce-bindings.v1' as const;
type BindingTarget={enginePath?:string;catalog:boolean;modelPath?:Partial<Record<StorefrontPageDocument['pageType'],string>>};
const TARGETS:Readonly<Record<string,BindingTarget>>=Object.freeze({
  'guided.finder':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'guided.results':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'guided.explanation':{enginePath:'commerce.existingEngines.finders',catalog:true},
  'composer.builder':{enginePath:'commerce.existingEngines.composers',catalog:true},
  'configurator.builder':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'configurator.slot-list':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'compatibility.status':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'compatibility.evidence':{enginePath:'commerce.existingEngines.configurators',catalog:true},
  'commerce.downloads-tile':{catalog:false,modelPath:{product:'commerce.digitalCommerce.productDownloads'}},
  'commerce.fulfillment-summary':{catalog:false,modelPath:{product:'commerce.digitalCommerce.productFulfillment',cart:'commerce.digitalCommerce.cartFulfillment',checkout:'commerce.digitalCommerce.checkoutFulfillment'}},
  'commerce.product-documents':{catalog:false,modelPath:{product:'commerce.digitalCommerce.productDocuments'}},
  'commerce.account-downloads':{catalog:false,modelPath:{account:'commerce.digitalCommerce.accountDownloads'}},
  'commerce.account-documents':{catalog:false,modelPath:{account:'commerce.digitalCommerce.accountDocuments'}},
  'commerce.documents-center':{catalog:false,modelPath:{account:'commerce.digitalCommerce.documentsCenter'}},
  'commerce.post-purchase-guidance':{catalog:false,modelPath:{checkout:'commerce.digitalCommerce.postPurchase',account:'commerce.digitalCommerce.postPurchase'}},
});
function decorate(node:StorefrontComponentNode,pageType:StorefrontPageDocument['pageType']):StorefrontComponentNode{
  const target=TARGETS[node.componentKey];
  const children=node.children?.map(child=>decorate(child,pageType));
  if(!target)return children?{...node,children}:node;
  const modelPath=target.modelPath?.[pageType];
  return{...node,bindings:{...node.bindings,...(target.enginePath?{engineConfigs:{path:target.enginePath}}:{}),...(target.catalog?{catalog:{path:'catalog.existingCommerceProducts'}}:{}),...(modelPath?{model:{path:modelPath}}:{})},...(children?{children}:{})};
}
export function bindStorefrontExistingCommerceRuntime(document:StorefrontPageDocument):StorefrontPageDocument{return{...document,sections:document.sections.map(section=>decorate(section,document.pageType))};}
