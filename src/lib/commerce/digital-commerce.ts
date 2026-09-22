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
export type DigitalDownloadItem={
  entitlementId:string;
  orderId:string;
  orderNumber:string;
  assetId:string;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
  downloadCount:number;
  maxDownloads:number;
  remainingDownloads:number;
  grantedAt:string;
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
const ELIGIBLE_ORDER_STATUSES=new Set(['paid','processing','shipped','completed']);

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

export async function createGuestDigitalAccess(input:{instanceId:string;orderId:string;tokenSeed?:string|null}){
  const rawToken=input.tokenSeed
    ?createHash('sha256').update(`shoperation:digital-guest:v1:${input.tokenSeed}`).digest('hex')
    :randomBytes(32).toString('hex');
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

async function hydrateDownloadItems(instanceId:string,entitlements:Array<{id:string;order_id:string;asset_id:string;download_count:number;max_downloads:number;granted_at:string}>):Promise<DigitalDownloadItem[]>{
  if(!entitlements.length)return[];
  const admin=createAdminClient();
  const assetIds=[...new Set(entitlements.map(row=>row.asset_id))],orderIds=[...new Set(entitlements.map(row=>row.order_id))];
  const[{data:assets,error:assetError},{data:orders,error:orderError}]=await Promise.all([
    admin.from('digital_assets').select('id,original_name,media_type,size_bytes,active').eq('instance_id',instanceId).in('id',assetIds),
    admin.from('orders').select('id,order_number,status').eq('instance_id',instanceId).in('id',orderIds),
  ]);
  if(assetError||orderError)throw assetError??orderError??new Error('DIGITAL_DOWNLOAD_LIST_FAILED');
  const assetById=new Map((assets??[]).map(row=>[row.id,row])),orderById=new Map((orders??[]).map(row=>[row.id,row]));
  return entitlements.flatMap(row=>{
    const asset=assetById.get(row.asset_id),order=orderById.get(row.order_id);
    if(!asset?.active||!order||!ELIGIBLE_ORDER_STATUSES.has(String(order.status)))return[];
    return[{
      entitlementId:row.id,orderId:row.order_id,orderNumber:String(order.order_number),assetId:row.asset_id,
      fileName:String(asset.original_name),mediaType:String(asset.media_type),sizeBytes:Number(asset.size_bytes),
      downloadCount:Number(row.download_count),maxDownloads:Number(row.max_downloads),remainingDownloads:Math.max(0,Number(row.max_downloads)-Number(row.download_count)),grantedAt:row.granted_at,
    }];
  });
}

export async function listAccountDigitalDownloads(instanceId:string,customerId:string):Promise<DigitalDownloadItem[]>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('digital_entitlements')
    .select('id,order_id,asset_id,download_count,max_downloads,granted_at')
    .eq('instance_id',instanceId).eq('customer_id',customerId).eq('status','active').order('granted_at',{ascending:false});
  if(error)throw error;
  return hydrateDownloadItems(instanceId,(data??[])as Array<{id:string;order_id:string;asset_id:string;download_count:number;max_downloads:number;granted_at:string}>);
}

export type AccountDigitalDownloadSurfaceItem=DigitalDownloadItem&{
  status:'available'|'revoked'|'exhausted';
  revokedAt:string|null;
};

export async function listAccountDigitalDownloadSurface(instanceId:string,customerId:string):Promise<AccountDigitalDownloadSurfaceItem[]>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('digital_entitlements')
    .select('id,order_id,asset_id,download_count,max_downloads,granted_at,status,revoked_at')
    .eq('instance_id',instanceId).eq('customer_id',customerId).order('granted_at',{ascending:false});
  if(error)throw error;
  const entitlements=(data??[])as Array<{id:string;order_id:string;asset_id:string;download_count:number;max_downloads:number;granted_at:string;status:'active'|'revoked';revoked_at:string|null}>;
  if(!entitlements.length)return[];
  const assetIds=[...new Set(entitlements.map(row=>row.asset_id))],orderIds=[...new Set(entitlements.map(row=>row.order_id))];
  const[{data:assets,error:assetError},{data:orders,error:orderError}]=await Promise.all([
    admin.from('digital_assets').select('id,original_name,media_type,size_bytes,active').eq('instance_id',instanceId).in('id',assetIds),
    admin.from('orders').select('id,order_number,status').eq('instance_id',instanceId).in('id',orderIds),
  ]);
  if(assetError||orderError)throw assetError??orderError??new Error('DIGITAL_DOWNLOAD_SURFACE_LIST_FAILED');
  const assetById=new Map((assets??[]).map(row=>[row.id,row])),orderById=new Map((orders??[]).map(row=>[row.id,row]));
  return entitlements.flatMap(row=>{
    const asset=assetById.get(row.asset_id),order=orderById.get(row.order_id);
    if(!asset||!order)return[];
    const downloadCount=Number(row.download_count),maxDownloads=Number(row.max_downloads),remainingDownloads=Math.max(0,maxDownloads-downloadCount);
    const revoked=row.status==='revoked'||asset.active!==true||!ELIGIBLE_ORDER_STATUSES.has(String(order.status));
    return[{
      entitlementId:row.id,orderId:row.order_id,orderNumber:String(order.order_number),assetId:row.asset_id,
      fileName:String(asset.original_name),mediaType:String(asset.media_type),sizeBytes:Number(asset.size_bytes),
      downloadCount,maxDownloads,remainingDownloads,grantedAt:row.granted_at,
      status:revoked?'revoked':remainingDownloads<1?'exhausted':'available',
      revokedAt:row.revoked_at??null,
    }];
  });
}

export async function listGuestDigitalDownloads(instanceId:string,orderId:string,guestToken:string):Promise<DigitalDownloadItem[]>{
  const admin=createAdminClient(),tokenHash=hashDigitalGuestToken(guestToken),now=new Date().toISOString();
  const{data:access,error:accessError}=await admin.from('digital_guest_access_tokens').select('id').eq('instance_id',instanceId).eq('order_id',orderId).eq('token_hash',tokenHash).is('revoked_at',null).gt('expires_at',now).maybeSingle();
  if(accessError||!access)throw accessError??new Error('DIGITAL_GUEST_ACCESS_FORBIDDEN');
  const{data,error}=await admin.from('digital_entitlements')
    .select('id,order_id,asset_id,download_count,max_downloads,granted_at')
    .eq('instance_id',instanceId).eq('order_id',orderId).eq('status','active').order('granted_at',{ascending:false});
  if(error)throw error;
  return hydrateDownloadItems(instanceId,(data??[])as Array<{id:string;order_id:string;asset_id:string;download_count:number;max_downloads:number;granted_at:string}>);
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
