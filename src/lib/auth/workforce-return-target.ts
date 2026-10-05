import {normalizeStorefrontReturnTarget} from '@/lib/auth/storefront-return-target';

const WORKFORCE_RETURN_BASE='https://shoporation.invalid';

export function normalizeWorkforceReturnTarget(value:string|null|undefined):string|null{
  const candidate=normalizeStorefrontReturnTarget(value);
  if(!candidate)return null;
  try{
    const parsed=new URL(candidate,WORKFORCE_RETURN_BASE);
    const allowed=parsed.pathname==='/admin'
      ||parsed.pathname.startsWith('/admin/')
      ||parsed.pathname==='/storefront-template-preview';
    return allowed?candidate:null;
  }catch{return null}
}

export function workforceLoginHref(value:string|null|undefined){
  const target=normalizeWorkforceReturnTarget(value)??'/admin';
  return `/api/auth/workforce-login?next=${encodeURIComponent(target)}`;
}
