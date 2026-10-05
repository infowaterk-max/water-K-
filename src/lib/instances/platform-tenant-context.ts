import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {resolveSupabaseServerKey} from '@/lib/supabase/server-credentials';

export const PLATFORM_TENANT_CONTEXT_COOKIE='shoperation_platform_tenant_context';
export const PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS=2*60*60;
const VERSION='v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingKey(){
  const base=(process.env.PLATFORM_TENANT_CONTEXT_SECRET||resolveSupabaseServerKey()||'').trim();
  if(!base)return null;
  return createHmac('sha256',base).update('shoperation:platform-tenant-context:v1').digest();
}

function sign(payload:string){
  const key=signingKey();
  if(!key)return null;
  return createHmac('sha256',key).update(payload).digest('base64url');
}

export type PlatformTenantContext={actorId:string;instanceId:string;expires:number};

export function createPlatformTenantContextToken(actorId:string,instanceId:string,now=Date.now()){
  if(!UUID.test(actorId)||!UUID.test(instanceId))throw new Error('invalid_platform_tenant_context');
  const expires=Math.floor(now/1000)+PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS;
  const payload=`${VERSION}.${actorId}.${instanceId}.${expires}`;
  const signature=sign(payload);
  if(!signature)throw new Error('platform_tenant_context_secret_missing');
  return `${payload}.${signature}`;
}

export function readPlatformTenantContextToken(value:string|undefined,now=Date.now()):PlatformTenantContext|null{
  if(!value)return null;
  const[version,actorId,instanceId,expiresRaw,signature,...rest]=value.split('.');
  if(rest.length||version!==VERSION||!UUID.test(actorId||'')||!UUID.test(instanceId||''))return null;
  const expires=Number(expiresRaw);
  if(!Number.isInteger(expires)||expires<=Math.floor(now/1000))return null;
  const payload=`${version}.${actorId}.${instanceId}.${expires}`;
  const expected=sign(payload);
  if(!expected||!signature)return null;
  const actualBuffer=Buffer.from(signature,'base64url'),expectedBuffer=Buffer.from(expected,'base64url');
  if(actualBuffer.length!==expectedBuffer.length||!timingSafeEqual(actualBuffer,expectedBuffer))return null;
  return{actorId,instanceId,expires};
}

export async function getPlatformTenantContextInstanceId(actorId:string){
  if(!UUID.test(actorId))return null;
  const store=await cookies();
  const context=readPlatformTenantContextToken(store.get(PLATFORM_TENANT_CONTEXT_COOKIE)?.value);
  return context?.actorId===actorId?context.instanceId:null;
}

export async function setPlatformTenantContext(actorId:string,instanceId:string){
  const token=createPlatformTenantContextToken(actorId,instanceId);
  const store=await cookies();
  store.set(PLATFORM_TENANT_CONTEXT_COOKIE,token,{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:PLATFORM_TENANT_CONTEXT_MAX_AGE_SECONDS,
  });
}

export async function clearPlatformTenantContext(){
  const store=await cookies();
  store.set(PLATFORM_TENANT_CONTEXT_COOKIE,'',{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:0,
  });
}
