import 'server-only';
import {createHash} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';

const PREVIEW_TOKEN_PATTERN=/^[A-Za-z0-9_-]{40,128}$/;

/** Read-only tenant resolution for an already valid immutable preview capability. */
export async function resolveStorefrontPreviewInstanceId(token:string):Promise<string|null>{
  if(!PREVIEW_TOKEN_PATTERN.test(token))return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const{data,error}=await admin.from('storefront_preview_sessions')
    .select('instance_id')
    .eq('token_hash',tokenHash)
    .is('revoked_at',null)
    .gt('expires_at',now)
    .maybeSingle();
  if(error||!data?.instance_id)return null;
  return data.instance_id;
}
