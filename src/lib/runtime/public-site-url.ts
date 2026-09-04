type RuntimeEnv={
  VERCEL_ENV?:string;
  VERCEL_PROJECT_PRODUCTION_URL?:string;
  VERCEL_URL?:string;
  NEXT_PUBLIC_SITE_URL?:string;
};

function normalizeAbsoluteUrl(value:string|undefined):string|null{
  const raw=value?.trim();
  if(!raw)return null;
  try{
    const url=new URL(raw);
    if(!['http:','https:'].includes(url.protocol))return null;
    return url.toString().replace(/\/$/,'');
  }catch{return null}
}

function vercelHostUrl(value:string|undefined):string|null{
  const host=value?.trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  return host?`https://${host}`:null;
}

function isLoopback(url:string):boolean{
  try{
    const host=new URL(url).hostname.toLowerCase();
    return host==='localhost'||host==='127.0.0.1'||host==='::1'||host.endsWith('.localhost');
  }catch{return false}
}

export function getServerPublicSiteUrl(env:RuntimeEnv=process.env):string|null{
  const configured=normalizeAbsoluteUrl(env.NEXT_PUBLIC_SITE_URL);
  const production=vercelHostUrl(env.VERCEL_PROJECT_PRODUCTION_URL);
  const deployment=vercelHostUrl(env.VERCEL_URL);

  if(env.VERCEL_ENV==='production'){
    if(configured&&!isLoopback(configured))return configured;
    return production??deployment??null;
  }

  return configured??deployment??production;
}
