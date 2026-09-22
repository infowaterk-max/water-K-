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

function shouldPreferAuthoredFallback(fallback:unknown){
  if(fallback===undefined)return false;
  if(Array.isArray(fallback))return fallback.length>0;
  if(isRecord(fallback))return Object.keys(fallback).length>0;
  return true;
}

function visit(node:StorefrontComponentNode,context:Record<string,unknown>){
  for(const binding of Object.values(node.bindings??{})){
    if(!Object.prototype.hasOwnProperty.call(binding,'fallback'))continue;
    if(!shouldPreferAuthoredFallback(binding.fallback))continue;
    setPath(context,binding.path,binding.fallback);
  }
  for(const child of node.children??[])visit(child,context);
}

/**
 * Template preview must showcase the authored Page Schema rather than generic
 * fixture scalars. Generic demo data remains useful only where the schema has
 * no meaningful fallback (notably empty business-data arrays).
 */
export function applyAuthoredTemplatePreviewFallbacks(input:{page:StorefrontPageDocument;context:Record<string,unknown>}):Record<string,unknown>{
  const next=clone(input.context);
  for(const section of input.page.sections)visit(section,next);
  return next;
}
