import 'server-only';
import {createHash}from'node:crypto';
import {createAdminClient}from'@/lib/supabase/admin';

export const ORDER_DOCUMENT_BUCKET='order-documents-private';
export const ORDER_DOCUMENT_SIGNED_DOWNLOAD_SECONDS=300;

export type AccountOrderDocument={
  documentId:string;
  orderId:string;
  orderNumber:string;
  kind:'invoice'|'warranty'|'certificate'|'service_record'|'merchant_attachment'|'other';
  title:string;
  description:string|null;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
  createdAt:string;
};

export type AccountInvoiceDocument={
  orderId:string;
  orderNumber:string;
  invoiceNumber:string;
  invoiceUrl:string|null;
  createdAt:string;
};

type AuthorizedOrderDocument={
  documentId:string;
  orderId:string;
  bucket:string;
  path:string;
  fileName:string;
  mediaType:string;
  sizeBytes:number;
};

export function orderDocumentRequestFingerprint(parts:Array<string|null|undefined>){
  return createHash('sha256').update(parts.map(value=>value??'').join('\u001f')).digest('hex');
}

export async function listAccountOrderDocuments(instanceId:string,customerId:string):Promise<{documents:AccountOrderDocument[];invoices:AccountInvoiceDocument[]}>{
  const admin=createAdminClient();
  const[{data:documentData,error:documentError},{data:invoiceData,error:invoiceError}]=await Promise.all([
    admin.rpc('list_account_order_documents_v1',{p_instance_id:instanceId,p_customer_id:customerId}),
    admin.from('orders').select('id,order_number,invoice_number,invoice_url,invoiced_at,created_at').eq('instance_id',instanceId).eq('customer_id',customerId).not('invoice_number','is',null).order('created_at',{ascending:false}),
  ]);
  if(documentError)throw documentError;
  if(invoiceError)throw invoiceError;
  const raw=Array.isArray(documentData)?documentData:[];
  const documents=raw.flatMap((item):AccountOrderDocument[]=>{
    const value=(item??{})as Partial<AccountOrderDocument>;
    if(!value.documentId||!value.orderId||!value.orderNumber||!value.kind||!value.title||!value.fileName||!value.mediaType||!value.createdAt)return[];
    const sizeBytes=Number(value.sizeBytes??0);if(!Number.isFinite(sizeBytes)||sizeBytes<1)return[];
    return[{...value,sizeBytes,description:value.description??null}as AccountOrderDocument];
  });
  const invoices=(invoiceData??[]).flatMap(row=>{
    if(!row.id||!row.order_number||!row.invoice_number)return[];
    return[{orderId:String(row.id),orderNumber:String(row.order_number),invoiceNumber:String(row.invoice_number),invoiceUrl:row.invoice_url?String(row.invoice_url):null,createdAt:String(row.invoiced_at??row.created_at)}];
  });
  return{documents,invoices};
}

export async function authorizeAccountOrderDocumentDownload(input:{instanceId:string;documentId:string;customerId:string;requestFingerprint:string}){
  const admin=createAdminClient();
  const{data,error}=await admin.rpc('authorize_order_customer_document_download_v1',{
    p_instance_id:input.instanceId,
    p_document_id:input.documentId,
    p_customer_id:input.customerId,
    p_request_fingerprint:input.requestFingerprint,
  });
  if(error||!data)throw error??new Error('ORDER_DOCUMENT_NOT_AUTHORIZED');
  const authorized=data as Partial<AuthorizedOrderDocument>;
  if(authorized.documentId!==input.documentId||authorized.bucket!==ORDER_DOCUMENT_BUCKET||!authorized.path||!authorized.fileName)throw new Error('ORDER_DOCUMENT_AUTHORITY_MISMATCH');
  const{data:signed,error:signedError}=await admin.storage.from(ORDER_DOCUMENT_BUCKET).createSignedUrl(authorized.path,ORDER_DOCUMENT_SIGNED_DOWNLOAD_SECONDS,{download:authorized.fileName});
  if(signedError||!signed?.signedUrl)throw signedError??new Error('ORDER_DOCUMENT_SIGNING_FAILED');
  return{url:signed.signedUrl,fileName:authorized.fileName,mediaType:authorized.mediaType??'application/octet-stream',sizeBytes:Number(authorized.sizeBytes??0),expiresInSeconds:ORDER_DOCUMENT_SIGNED_DOWNLOAD_SECONDS};
}
