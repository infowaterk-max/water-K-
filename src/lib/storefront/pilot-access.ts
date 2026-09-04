import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { resolveSupabaseServerKey } from '@/lib/supabase/server-credentials';

export const PILOT_ACCEPTANCE_COOKIE='shoperation_pilot_acceptance';
export const PILOT_ACCEPTANCE_MAX_AGE_SECONDS=2*60*60;
const VERSION='v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function signingKey(){
  const base=(process.env.PILOT_STOREFRONT_SECRET||resolveSupabaseServerKey()||'').trim();
  if(!base)return null;
  return createHmac('sha256',base).update('shoperation:pilot-acceptance:v1').digest();
}

function sign(payload:string){
  const key=signingKey();
  if(!key)return null;
  return createHmac('sha256',key).update(payload).digest('base64url');
}

export function createPilotAcceptanceToken(instanceId:string,now=Date.now()){
  if(!UUID.test(instanceId))throw new Error('invalid_pilot_instance');
  const expires=Math.floor(now/1000)+PILOT_ACCEPTANCE_MAX_AGE_SECONDS;
  const payload=`${VERSION}.${instanceId}.${expires}`;
  const signature=sign(payload);
  if(!signature)throw new Error('pilot_acceptance_secret_missing');
  return `${payload}.${signature}`;
}

export function readPilotAcceptanceToken(value:string|undefined,now=Date.now()):string|null{
  if(!value)return null;
  const [version,instanceId,expiresRaw,signature,...rest]=value.split('.');
  if(rest.length||version!==VERSION||!UUID.test(instanceId||''))return null;
  const expires=Number(expiresRaw);
  if(!Number.isInteger(expires)||expires<=Math.floor(now/1000))return null;
  const payload=`${version}.${instanceId}.${expires}`;
  const expected=sign(payload);
  if(!expected||!signature)return null;
  const actualBuffer=Buffer.from(signature,'base64url'),expectedBuffer=Buffer.from(expected,'base64url');
  if(actualBuffer.length!==expectedBuffer.length||!timingSafeEqual(actualBuffer,expectedBuffer))return null;
  return instanceId;
}

export async function getPilotAcceptanceInstanceId(){
  const store=await cookies();
  return readPilotAcceptanceToken(store.get(PILOT_ACCEPTANCE_COOKIE)?.value);
}
