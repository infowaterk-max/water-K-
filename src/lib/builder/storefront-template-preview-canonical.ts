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

function getPath(target:Record<string,unknown>,path:string):unknown{
  let current:unknown=target;
  for(const part of path.split('.')){
    if(!isRecord(current)||!Object.prototype.hasOwnProperty.call(current,part))return undefined;
    current=current[part];
  }
  return current;
}

function mergePreviewProductActionAuthority(authored:unknown[],preview:unknown):unknown[]{
  const previewRows=Array.isArray(preview)?preview:[];
  return authored.map((value,index)=>{
    if(!isRecord(value))return clone(value);
    const current=isRecord(previewRows[index])?previewRows[index]:{};
    const rawIdentity=typeof value.id==='string'&&value.id.trim()?value.id.trim():`product-${index+1}`;
    const unitPrice=typeof value.price==='number'&&Number.isFinite(value.price)?value.price:
      typeof current.unitPrice==='number'&&Number.isFinite(current.unitPrice)?current.unitPrice:0;
    const availableQuantity=typeof current.availableQuantity==='number'&&Number.isFinite(current.availableQuantity)?Math.max(0,Math.floor(current.availableQuantity)):12;
    return{
      ...clone(value),
      productId:`preview-${rawIdentity}`,
      variantId:`preview-${rawIdentity}-variant`,
      slug:`preview-${rawIdentity}`,
      unitPrice,
      availableQuantity,
      minimumQuantity:1,
      orderMultiple:1,
    };
  });
}


function shouldPreferAuthoredFallback(fallback:unknown){
  if(fallback===undefined)return false;
  if(Array.isArray(fallback))return fallback.length>0;
  if(isRecord(fallback))return Object.keys(fallback).length>0;
  return true;
}

function visit(node:StorefrontComponentNode,context:Record<string,unknown>){
  for(const[slot,binding]of Object.entries(node.bindings??{})){
    if(!Object.prototype.hasOwnProperty.call(binding,'fallback'))continue;
    if(!shouldPreferAuthoredFallback(binding.fallback))continue;
    if(
      slot==='products'
      &&node.componentKey==='commerce.product-grid'
      &&node.config.showPurchaseActions===true
      &&Array.isArray(binding.fallback)
      &&binding.fallback.length>0
    ){
      setPath(context,binding.path,mergePreviewProductActionAuthority(binding.fallback,getPath(context,binding.path)));
      continue;
    }
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
