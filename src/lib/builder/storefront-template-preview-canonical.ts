import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';

const clone=<T>(value:T):T=>structuredClone(value);
const isRecord=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function setPath(target:Record<string,unknown>,path:string,value:unknown){
  const parts=path.split('.');
  if(parts.length<2)return;
  let cursor=target;
  for(const part of parts.slice(0,-1)){
    const current=cursor[part];
    if(!isRecord(current))cursor[part]={};
    cursor=cursor[part] as Record<string,unknown>;
  }
  cursor[parts.at(-1)!]=clone(value);
}

function shouldPreferAuthoredFallback(path:string,fallback:unknown){
  if(path.startsWith('brand.')||path.startsWith('navigation.'))return fallback!==undefined;
  return Array.isArray(fallback)&&fallback.length>0;
}

function visit(node:StorefrontComponentNode,context:Record<string,unknown>){
  for(const binding of Object.values(node.bindings??{})){
    if(!Object.prototype.hasOwnProperty.call(binding,'fallback'))continue;
    if(!shouldPreferAuthoredFallback(binding.path,binding.fallback))continue;
    setPath(context,binding.path,binding.fallback);
  }
  for(const child of node.children??[])visit(child,context);
}

export function applyAuthoredTemplatePreviewFallbacks(input:{page:StorefrontPageDocument;context:Record<string,unknown>}):Record<string,unknown>{
  const next=clone(input.context);
  for(const section of input.page.sections)visit(section,next);
  return next;
}
