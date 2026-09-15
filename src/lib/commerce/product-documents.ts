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
export type AccountProductDocument=StorefrontProductDocument&{
  variantId:string;
  productName:string;
  variantLabel:string|null;
  downloadHref:string;
};
export type OrderProductDocument={
  documentId:string;
  variantId:string;
  productName:string;
  variantLabel:string|null;
  kind:ProductDocumentKind;
  title:string;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
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
type AuthorizedOrderProductDocument={
  documentId:string;
  bucket:string;
  path:string;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
  actorType:'order';
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

/**
 * Account discoverability projection only. Product Document visibility and
 * download authorization remain owned by the Product Documents RPC authority.
 * The order query only determines which purchased variants are relevant to the
 * signed-in customer; it never grants file access by itself.
 */
export async function listAccountProductDocuments(instanceId:string,customerId:string):Promise<AccountProductDocument[]>{
  const admin=createAdminClient();
  const{data,error}=await admin.from('order_items')
    .select('variant_id,product_name,variant_label,orders!inner(customer_id,status,instance_id)')
    .eq('instance_id',instanceId)
    .eq('orders.instance_id',instanceId)
    .eq('orders.customer_id',customerId)
    .in('orders.status',['paid','processing','shipped','completed'])
    .limit(100);
  if(error)throw error;

  const variants=new Map<string,{variantId:string;productName:string;variantLabel:string|null}>();
  for(const raw of data??[]){
    const row=raw as unknown as{variant_id?:string|null;product_name?:string|null;variant_label?:string|null};
    if(!row.variant_id||variants.has(row.variant_id))continue;
    variants.set(row.variant_id,{variantId:row.variant_id,productName:row.product_name?.trim()||'Termék',variantLabel:row.variant_label?.trim()||null});
  }

  const groups=await Promise.all([...variants.values()].map(async variant=>{
    const documents=await listStorefrontProductDocuments(instanceId,variant.variantId,customerId);
    return documents.map(document=>({
      ...document,
      variantId:variant.variantId,
      productName:variant.productName,
      variantLabel:variant.variantLabel,
      downloadHref:`/api/product-documents/${document.documentId}?variantId=${encodeURIComponent(variant.variantId)}`,
    }));
  }));
  const seen=new Set<string>();
  return groups.flat().filter(document=>{if(seen.has(document.documentId))return false;seen.add(document.documentId);return true;});
}

export async function listOrderProductDocuments(instanceId:string,orderId:string,confirmationToken:string):Promise<OrderProductDocument[]>{
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('list_order_product_documents_v1',{
    p_instance_id:instanceId,p_order_id:orderId,p_confirmation_token:confirmationToken,
  });
  if(error)throw error;
  if(!Array.isArray(data))return[];
  return data.flatMap(raw=>{
    const row=(raw??{})as Partial<OrderProductDocument>;
    if(!row.documentId||!row.variantId||!row.title||!row.fileName)return[];
    return[{
      documentId:row.documentId,variantId:row.variantId,productName:row.productName?.trim()||'Termék',variantLabel:row.variantLabel?.trim()||null,
      kind:(row.kind??'other')as ProductDocumentKind,title:row.title,fileName:row.fileName,mediaType:row.mediaType??'application/octet-stream',sizeBytes:Number(row.sizeBytes??0),
    }];
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

export async function authorizeOrderProductDocumentDownload(input:{instanceId:string;documentId:string;orderId:string;variantId:string;confirmationToken:string;requestFingerprint:string}){
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('authorize_order_product_document_download_v1',{
    p_instance_id:input.instanceId,p_document_id:input.documentId,p_order_id:input.orderId,p_variant_id:input.variantId,p_confirmation_token:input.confirmationToken,p_request_fingerprint:input.requestFingerprint,
  });
  if(error||!data)throw error??new Error('ORDER_PRODUCT_DOCUMENT_NOT_AUTHORIZED');
  const authorization=data as Partial<AuthorizedOrderProductDocument>;
  if(authorization.documentId!==input.documentId||authorization.bucket!==PRODUCT_DOCUMENT_BUCKET||!authorization.path||!authorization.fileName||authorization.actorType!=='order'){
    throw new Error('ORDER_PRODUCT_DOCUMENT_AUTHORITY_MISMATCH');
  }
  const{data:signed,error:signedError}=await admin.storage.from(PRODUCT_DOCUMENT_BUCKET).createSignedUrl(authorization.path,SIGNED_DOWNLOAD_SECONDS,{download:authorization.fileName});
  if(signedError||!signed?.signedUrl)throw signedError??new Error('PRODUCT_DOCUMENT_SIGNING_FAILED');
  return{url:signed.signedUrl,expiresInSeconds:SIGNED_DOWNLOAD_SECONDS,fileName:authorization.fileName,mediaType:authorization.mediaType??'application/octet-stream'};
}
