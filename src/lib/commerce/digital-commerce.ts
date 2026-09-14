import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';

export type FulfillmentMode='physical'|'digital'|'mixed';
export type CheckoutFulfillment={
  mode:FulfillmentMode;
  physicalLines:number;
  digitalLines:number;
  requiresShipping:boolean;
};

type AuthorizedDownload={
  entitlementId:string;
  assetId:string;
  bucket:string;
  path:string;
  fileName:string;
  mediaType:string;
  actorType:'account'|'guest';
  remainingDownloads:number;
};

const SIGNED_DOWNLOAD_SECONDS=300;
const GUEST_ACCESS_SECONDS=60*60*24*7;

export function hashDigitalGuestToken(token:string){
  return createHash('sha256').update(token).digest('hex');
}

export function digitalRequestFingerprint(parts:Array<string|null|undefined>){
  return createHash('sha256').update(parts.map(value=>value??'').join('\u001f')).digest('hex');
}

export async function classifyCheckoutFulfillment(instanceId:string,items:Array<{variant_id:string;quantity:number}>):Promise<CheckoutFulfillment>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('classify_checkout_fulfillment_v1',{p_instance_id:instanceId,p_items:items});
  if(error||!data)throw error??new Error('DIGITAL_COMMERCE_CLASSIFICATION_EMPTY');
  const value=data as Partial<CheckoutFulfillment>;
  if(!['physical','digital','mixed'].includes(String(value.mode))||typeof value.requiresShipping!=='boolean'||!Number.isInteger(value.physicalLines)||!Number.isInteger(value.digitalLines)){
    throw new Error('DIGITAL_COMMERCE_CLASSIFICATION_INVALID');
  }
  return value as CheckoutFulfillment;
}

export async function createGuestDigitalAccess(input:{instanceId:string;orderId:string}){
  const rawToken=randomBytes(32).toString('hex');
  const tokenHash=hashDigitalGuestToken(rawToken);
  const expiresAt=new Date(Date.now()+GUEST_ACCESS_SECONDS*1000);
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('create_digital_guest_access_v1',{
    p_instance_id:input.instanceId,
    p_order_id:input.orderId,
    p_token_hash:tokenHash,
    p_expires_at:expiresAt.toISOString(),
  });
  if(error||data!==true)throw error??new Error('DIGITAL_GUEST_ACCESS_CREATE_FAILED');
  return{token:rawToken,expiresAt};
}

export async function authorizeDigitalDownload(input:{
  instanceId:string;
  orderId:string;
  assetId:string;
  customerId:string|null;
  guestToken?:string|null;
  requestFingerprint?:string|null;
}){
  const guestHash=input.guestToken?hashDigitalGuestToken(input.guestToken):null;
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('authorize_digital_download_v2',{
    p_instance_id:input.instanceId,
    p_asset_id:input.assetId,
    p_order_id:input.orderId,
    p_customer_id:input.customerId,
    p_guest_token_hash:guestHash,
    p_request_fingerprint:input.requestFingerprint??null,
  });
  if(error||!data)throw error??new Error('DIGITAL_DOWNLOAD_NOT_AUTHORIZED');
  const authorization=data as Partial<AuthorizedDownload>;
  if(
    authorization.assetId!==input.assetId||
    !authorization.entitlementId||
    authorization.bucket!=='digital-products-private'||
    !authorization.path||
    !authorization.fileName||
    !['account','guest'].includes(String(authorization.actorType))
  )throw new Error('DIGITAL_DOWNLOAD_AUTHORITY_MISMATCH');
  const{data:signed,error:signedError}=await admin.storage.from(authorization.bucket).createSignedUrl(
    authorization.path,
    SIGNED_DOWNLOAD_SECONDS,
    {download:authorization.fileName},
  );
  if(signedError||!signed?.signedUrl)throw signedError??new Error('DIGITAL_DOWNLOAD_SIGNING_FAILED');
  return{
    url:signed.signedUrl,
    expiresInSeconds:SIGNED_DOWNLOAD_SECONDS,
    remainingDownloads:Number(authorization.remainingDownloads??0),
    fileName:authorization.fileName,
    mediaType:authorization.mediaType??'application/octet-stream',
  };
}

export async function recordDigitalDownloadDenial(input:{
  instanceId:string;
  orderId:string;
  assetId:string;
  actorType:'account'|'guest'|'system';
  reason:string;
  requestFingerprint?:string|null;
}){
  const admin=createAdminClient();
  await admin.rpc('record_digital_download_denial_v1',{
    p_instance_id:input.instanceId,
    p_order_id:input.orderId,
    p_asset_id:input.assetId,
    p_actor_type:input.actorType,
    p_reason:input.reason.slice(0,160),
    p_request_fingerprint:input.requestFingerprint??null,
  });
}
