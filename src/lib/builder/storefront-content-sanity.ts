export const STOREFRONT_CONTENT_SANITY_VERSION='shoporation.storefront-content-sanity.v1' as const;

export type StorefrontContentSanityIssue={
  code:'LITERAL_ESCAPE_TOKEN'|'SERIALIZATION_GARBAGE'|'UNRESOLVED_PLACEHOLDER';
  path:string;
  value:string;
};

const RAW_ESCAPE=/\\(?:n|r|t)/;
const OBJECT_GARBAGE=/\[object Object\]/i;
const NULLISH_TEXT=/^(?:undefined|null)$/i;
const SERIALIZED_TEXT=/^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/;
const UNRESOLVED_PLACEHOLDER=/\{\{[^{}]+\}\}|\$\{[^{}]+\}|<%=?[^%]+%>|__+[A-Z0-9][A-Z0-9_ .-]*__+/;

export function normalizeStorefrontShopperText(value:unknown,fallback=''):string{
  if(typeof value!=='string')return fallback;
  const normalized=value
    .replace(/\\r\\n/g,'\n')
    .replace(/\\n/g,'\n')
    .replace(/\\r/g,'\n')
    .replace(/\\t/g,' ');
  const trimmed=normalized.trim();
  if(OBJECT_GARBAGE.test(normalized)||NULLISH_TEXT.test(trimmed)||SERIALIZED_TEXT.test(trimmed)||UNRESOLVED_PLACEHOLDER.test(normalized))return fallback;
  return normalized;
}

export function inspectStorefrontShopperContent(value:unknown,path='package'):StorefrontContentSanityIssue[]{
  const issues:StorefrontContentSanityIssue[]=[];
  const visit=(input:unknown,currentPath:string)=>{
    if(typeof input==='string'){
      const trimmed=input.trim();
      if(RAW_ESCAPE.test(input))issues.push({code:'LITERAL_ESCAPE_TOKEN',path:currentPath,value:input});
      if(OBJECT_GARBAGE.test(input)||NULLISH_TEXT.test(trimmed)||SERIALIZED_TEXT.test(trimmed))issues.push({code:'SERIALIZATION_GARBAGE',path:currentPath,value:input});
      if(UNRESOLVED_PLACEHOLDER.test(input))issues.push({code:'UNRESOLVED_PLACEHOLDER',path:currentPath,value:input});
      return;
    }
    if(Array.isArray(input)){input.forEach((item,index)=>visit(item,`${currentPath}[${index}]`));return;}
    if(input&&typeof input==='object'){
      for(const[key,item]of Object.entries(input as Record<string,unknown>))visit(item,`${currentPath}.${key}`);
    }
  };
  visit(value,path);
  return issues;
}
