import 'server-only';
import {createHash}from'node:crypto';
import{createAdminClient}from'@/lib/supabase/admin';

export const PRODUCT_DOCUMENT_BUCKET='product-documents-private';
const SIGNED_DOWNLOAD_SECONDS=300;

export type ProductDocumentKind='manual'|'datasheet'|'size_guide'|'warranty_info'|'compatibility'|'installation_guide'|'other';
export type ProductDocumentVisibility='public'|'account';
export type StorefrontProductDocument={
  documentId:string;
  kind:ProductDocumentKind;
  title:string;
  description:string|null;
  sortOrder:number;
  visibility:ProductDocumentVisibility;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
  variantSpecific:boolean;
};

type AuthorizedProductDocument={
  documentId:string;
  bucket:string;
  path:string;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
  visibility:ProductDocumentVisibility;
  actorType:'public'|'account';
};

export function productDocumentRequestFingerprint(parts:Array<string|null|undefined>){
  return createHash('sha256').update(parts.map(value=>value??'').join('\u001f')).digest('hex');
}

export async function listStorefrontProductDocuments(instanceId:string,variantId:string,customerId:string|null):Promise<StorefrontProductDocument[]>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('list_storefront_product_documents_v1',{
    p_instance_id:instanceId,p_variant_id:variantId,p_customer_id:customerId,
  });
  if(error)throw error;
  if(!Array.isArray(data))return[];
  return data.flatMap(raw=>{
    const row=(raw??{})as Partial<StorefrontProductDocument>;
    if(!row.documentId||!row.title||!row.fileName||!['public','account'].includes(String(row.visibility)))return[];
    return[{...row,description:row.description??null,sortOrder:Number(row.sortOrder??0),sizeBytes:Number(row.sizeBytes??0),variantSpecific:row.variantSpecific===true}as StorefrontProductDocument];
  });
}

export async function authorizeProductDocumentDownload(input:{instanceId:string;documentId:string;variantId:string;customerId:string|null;requestFingerprint:string}){
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('authorize_product_document_download_v1',{
    p_instance_id:input.instanceId,p_document_id:input.documentId,p_variant_id:input.variantId,p_customer_id:input.customerId,p_request_fingerprint:input.requestFingerprint,
  });
  if(error||!data)throw error??new Error('PRODUCT_DOCUMENT_NOT_AUTHORIZED');
  const authorization=data as Partial<AuthorizedProductDocument>;
  if(authorization.documentId!==input.documentId||authorization.bucket!==PRODUCT_DOCUMENT_BUCKET||!authorization.path||!authorization.fileName||!['public','account'].includes(String(authorization.actorType))){
    throw new Error('PRODUCT_DOCUMENT_AUTHORITY_MISMATCH');
  }
  const{data:signed,error:signedError}=await admin.storage.from(PRODUCT_DOCUMENT_BUCKET).createSignedUrl(authorization.path,SIGNED_DOWNLOAD_SECONDS,{download:authorization.fileName});
  if(signedError||!signed?.signedUrl)throw signedError??new Error('PRODUCT_DOCUMENT_SIGNING_FAILED');
  return{url:signed.signedUrl,expiresInSeconds:SIGNED_DOWNLOAD_SECONDS,fileName:authorization.fileName,mediaType:authorization.mediaType??'application/octet-stream'};
}
