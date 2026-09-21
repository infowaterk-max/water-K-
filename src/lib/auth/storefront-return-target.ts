export function normalizeStorefrontReturnTarget(value:string|null|undefined):string|null{
  if(!value)return null;
  const candidate=value.trim();
  if(!candidate.startsWith('/')||candidate.startsWith('//')||candidate.includes('\\')||/[\u0000-\u001f\u007f]/.test(candidate))return null;
  try{
    const base='https://shoporation.invalid';
    const parsed=new URL(candidate,base);
    if(parsed.origin!==base||!parsed.pathname.startsWith('/'))return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }catch{return null}
}

export function storefrontReturnPath(pathname:string,search=''){
  return normalizeStorefrontReturnTarget(`${pathname}${search}`)??'/';
}

export function storefrontAuthHref(returnTo:string){
  const safe=normalizeStorefrontReturnTarget(returnTo);
  return safe?`/fiokom?next=${encodeURIComponent(safe)}`:'/fiokom';
}
