import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const EDITABLE=new Set(['releaseKey','showCountdown','showStockCount','eyebrow','title','copy','scheduledLabel','liveLabel','endedLabel','style']);
function locate(nodes:StorefrontComponentNode[],nodeId:string):StorefrontComponentNode|null{for(const node of nodes){if(node.id===nodeId)return node;const child=locate(node.children??[],nodeId);if(child)return child;}return null;}

export function setStorefrontReleaseCommerceConfig(document:StorefrontPageDocument,nodeId:string,key:string,value:unknown):StorefrontPageDocument{
  if(!EDITABLE.has(key))throw new Error('RELEASE_COMMERCE_CONFIG_KEY_FORBIDDEN');
  const next=structuredClone(document);const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.release'||node.componentVersion!==1)throw new Error('RELEASE_COMMERCE_NODE_NOT_FOUND');
  JSON.stringify(value);node.config={...node.config,[key]:structuredClone(value)};return next;
}

export function bindStorefrontReleaseCommerceData(document:StorefrontPageDocument,nodeId:string):StorefrontPageDocument{
  const next=structuredClone(document);const node=locate(next.sections,nodeId);
  if(!node||node.componentKey!=='commerce.release'||node.componentVersion!==1)throw new Error('RELEASE_COMMERCE_NODE_NOT_FOUND');
  node.bindings={...node.bindings,releases:{path:'commerce.releases'}};return next;
}
