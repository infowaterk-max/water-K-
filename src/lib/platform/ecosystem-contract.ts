export const PLATFORM_ECOSYSTEM_VERSION='block20.v1';

export const EXTENSION_API_SCOPES=['catalog.read','automation.events.write'] as const;
export type ExtensionApiScope=(typeof EXTENSION_API_SCOPES)[number];

const scopeSet=new Set<string>(EXTENSION_API_SCOPES);

export function normalizeExtensionScopes(value:unknown,allowed?:readonly string[]):ExtensionApiScope[]{
  if(!Array.isArray(value))return[];
  const allowedSet=allowed?new Set(allowed):null;
  return [...new Set(value.filter((item):item is ExtensionApiScope=>typeof item==='string'&&scopeSet.has(item)&&(!allowedSet||allowedSet.has(item))))];
}

export function parseExtensionApiToken(value:string|null){
  if(!value?.startsWith('Bearer shop_ext_'))return null;
  const token=value.slice('Bearer '.length).trim();
  const match=/^shop_ext_([A-Za-z0-9_-]{8,32})_([A-Za-z0-9_-]{24,160})$/.exec(token);
  return match?{token,prefix:match[1],secret:match[2]}:null;
}

function normalizedIpHost(value:string){return value.trim().toLowerCase().replace(/^\[|\]$/g,'');}
function nonPublicIpv4(host:string){
  const parts=host.split('.');
  if(parts.length!==4||parts.some(part=>!/^[0-9]{1,3}$/.test(part)||Number(part)>255))return false;
  const[a,b,c]=parts.map(Number);
  return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0&&c===0)||(a===192&&b===0&&c===2)||(a===192&&b===168)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113)||a>=224;
}
function nonPublicIpv6(host:string){
  const value=normalizedIpHost(host);
  if(!value.includes(':'))return false;
  if(value==='::'||value==='::1')return true;
  if(value.startsWith('::ffff:'))return true;
  const first=value.split(':')[0]??'';
  if(/^f[cd]/.test(first)||/^fe[89ab]/.test(first)||/^ff/.test(first))return true;
  if(value==='100::'||value.startsWith('100::'))return true;
  if(value==='2001:db8::'||value.startsWith('2001:db8:'))return true;
  return false;
}

export function isNonPublicWebhookAddress(value:string){
  const host=normalizedIpHost(value);
  return nonPublicIpv4(host)||nonPublicIpv6(host);
}

export function normalizeWebhookEndpoint(value:unknown){
  if(typeof value!=='string'||value.length>2048)return null;
  try{
    const url=new URL(value.trim());
    const host=normalizedIpHost(url.hostname);
    if(url.protocol!=='https:'||url.username||url.password)return null;
    if(url.port&&url.port!=='443')return null;
    if(!host||host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||isNonPublicWebhookAddress(host))return null;
    url.hash='';
    return url.toString();
  }catch{return null}
}

export function webhookRetryDelayMinutes(attempt:number){
  const safe=Math.max(1,Math.min(5,Math.floor(attempt)));
  return Math.min(60,5*2**(safe-1));
}

export function boundedExtensionEvidence(value:unknown,maxKeys=32):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))return{};
  const sensitive=/(email|name|address|phone|token|secret|password|payment|card|iban|customer_data)/i;
  const result:Record<string,unknown>={};
  for(const[key,raw]of Object.entries(value).slice(0,maxKeys)){
    if(sensitive.test(key)){result[key]='[redacted]';continue;}
    if(raw===null||typeof raw==='boolean'||typeof raw==='number')result[key]=raw;
    else if(typeof raw==='string')result[key]=raw.slice(0,240);
  }
  return result;
}
