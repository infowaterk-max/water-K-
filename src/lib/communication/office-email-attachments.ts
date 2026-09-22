import 'server-only';
import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {createAdminClient} from '@/lib/supabase/admin';
import {getResendReceivedEmailAttachments,type ResendReceivedAttachment} from './resend-inbound';
import {inspectOfficePrivateAttachmentContent} from '@/lib/office/attachment-content-security';
import {scanOfficePrivateAttachmentMalware} from '@/lib/office/attachment-malware-scanner';
import {
  OFFICE_PRIVATE_ATTACHMENT_BUCKET,
  OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES,
  OFFICE_PRIVATE_ATTACHMENT_MAX_FILES,
  OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES,
  type OfficePrivateAttachmentMimeType,
} from '@/lib/office/private-attachments';

type AdminClient=ReturnType<typeof createAdminClient>;
type StoredAttachment={id:string;storage_bucket:string;storage_path:string;original_name:string;content_type:string;byte_size:number|string;status:string;scan_status:string;sha256:string|null;provider_attachment_id:string|null};
type BeginScan={attachmentId:string;threadId:string;storageBucket:string;storagePath:string;originalName:string;declaredContentType:string;byteSize:number|string;scanNonce:string};
export type CommunicationAttachment={filename:string;content:string};
const OUTBOUND_RAW_TOTAL_MAX_BYTES=25*1024*1024;

function allowedMime(value:string):value is OfficePrivateAttachmentMimeType{return OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.includes(value as OfficePrivateAttachmentMimeType)}

async function boundedBytes(response:Response,expected:number){
  if(!response.body)throw new Error('OFFICE_ATTACHMENT_DOWNLOAD_BODY_MISSING');
  const lengthHeader=response.headers.get('content-length');
  if(lengthHeader){const length=Number(lengthHeader);if(!Number.isSafeInteger(length)||length<1||length>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES)throw new Error('OFFICE_ATTACHMENT_DOWNLOAD_SIZE_INVALID')}
  const reader=response.body.getReader();const chunks:Uint8Array[]=[];let total=0;
  for(;;){const{done,value}=await reader.read();if(done)break;if(!value)continue;total+=value.byteLength;if(total>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES){await reader.cancel();throw new Error('OFFICE_ATTACHMENT_DOWNLOAD_TOO_LARGE')}chunks.push(value)}
  if(total!==expected)throw new Error('OFFICE_ATTACHMENT_DOWNLOAD_SIZE_MISMATCH');
  const out=new Uint8Array(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength}return out;
}

function validateProviderAttachment(item:ResendReceivedAttachment){
  if(!allowedMime(item.content_type))throw new Error('OFFICE_INBOUND_ATTACHMENT_TYPE_INVALID');
  if(item.size<1||item.size>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES)throw new Error('OFFICE_INBOUND_ATTACHMENT_SIZE_INVALID');
  if(item.filename.includes('/')||item.filename.includes('\\'))throw new Error('OFFICE_INBOUND_ATTACHMENT_NAME_INVALID');
  const expires=Date.parse(item.expires_at);if(!Number.isFinite(expires)||expires<=Date.now())throw new Error('OFFICE_INBOUND_ATTACHMENT_URL_EXPIRED');
  const url=new URL(item.download_url);if(url.protocol!=='https:'||url.hostname!=='inbound-cdn.resend.com')throw new Error('OFFICE_INBOUND_ATTACHMENT_URL_INVALID');return url;
}

async function completeScan(db:AdminClient,input:{attachmentId:string;nonce:string;result:'clean'|'infected'|'rejected'|'scan_error';sha256:string|null;detected:string|null;provider:string|null;engineVersion:string|null;signature:string|null;reason:string|null}){
  const{data,error}=await db.rpc('admin_complete_office_attachment_scan_v1',{p_attachment_id:input.attachmentId,p_scan_nonce:input.nonce,p_result:input.result,p_sha256:input.sha256,p_detected_content_type:input.detected,p_provider:input.provider,p_engine_version:input.engineVersion,p_malware_signature:input.signature,p_reason:input.reason});
  if(error)throw error;const evidence=(data??{})as{attachmentId?:string;result?:string;readyForFinalize?:boolean};if(evidence.attachmentId!==input.attachmentId||evidence.result!==input.result)throw new Error('OFFICE_ATTACHMENT_SCAN_COMPLETION_EVIDENCE_INVALID');return evidence;
}

async function scanAndFinalizeInbound(db:AdminClient,input:{instanceId:string;messageId:string;attachment:StoredAttachment;bytes:Uint8Array}){
  const{data,error}=await db.rpc('service_begin_inbound_office_attachment_scan_v1',{p_instance_id:input.instanceId,p_attachment_id:input.attachment.id});if(error)throw error;
  const begin=(data??{})as BeginScan;if(begin.attachmentId!==input.attachment.id||begin.storageBucket!==OFFICE_PRIVATE_ATTACHMENT_BUCKET||begin.storagePath!==input.attachment.storage_path||!begin.scanNonce||!allowedMime(begin.declaredContentType))throw new Error('OFFICE_INBOUND_ATTACHMENT_SCAN_EVIDENCE_INVALID');
  const inspection=inspectOfficePrivateAttachmentContent(input.bytes,begin.declaredContentType as OfficePrivateAttachmentMimeType,begin.originalName);
  if(!inspection.ok){const removed=await db.storage.from(begin.storageBucket).remove([begin.storagePath]);if(removed.error){await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'scan_error',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:'builtin-content-inspector',engineVersion:'1',signature:null,reason:'inbound_quarantine_delete_failed'}).catch(()=>null);throw new Error('OFFICE_INBOUND_ATTACHMENT_QUARANTINE_DELETE_FAILED')}await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'rejected',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:'builtin-content-inspector',engineVersion:'1',signature:null,reason:inspection.reason??'content_signature_rejected'});throw new Error('OFFICE_INBOUND_ATTACHMENT_CONTENT_REJECTED')}
  const verdict=await scanOfficePrivateAttachmentMalware({bytes:input.bytes,sha256:inspection.sha256,contentType:inspection.detectedContentType,originalName:begin.originalName});
  if(verdict.status==='unavailable'||verdict.status==='error'){await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'scan_error',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,signature:null,reason:verdict.reason});throw new Error('OFFICE_INBOUND_ATTACHMENT_SCANNER_UNAVAILABLE')}
  if(verdict.status==='infected'){const removed=await db.storage.from(begin.storageBucket).remove([begin.storagePath]);if(removed.error){await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'scan_error',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,signature:verdict.signature,reason:'infected_inbound_quarantine_delete_failed'}).catch(()=>null);throw new Error('OFFICE_INBOUND_ATTACHMENT_QUARANTINE_DELETE_FAILED')}await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'infected',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,signature:verdict.signature,reason:'malware_detected'});throw new Error('OFFICE_INBOUND_ATTACHMENT_INFECTED')}
  const completed=await completeScan(db,{attachmentId:begin.attachmentId,nonce:begin.scanNonce,result:'clean',sha256:inspection.sha256,detected:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,signature:null,reason:null});if(completed.readyForFinalize!==true)throw new Error('OFFICE_INBOUND_ATTACHMENT_CLEAN_EVIDENCE_MISSING');
  const{data:finalized,error:finalizeError}=await db.rpc('service_finalize_inbound_office_attachment_v1',{p_instance_id:input.instanceId,p_attachment_id:begin.attachmentId,p_message_id:input.messageId});if(finalizeError)throw finalizeError;const finalEvidence=(finalized??{})as{attachmentId?:string;messageId?:string;ready?:boolean};if(finalEvidence.attachmentId!==begin.attachmentId||finalEvidence.messageId!==input.messageId||finalEvidence.ready!==true)throw new Error('OFFICE_INBOUND_ATTACHMENT_FINALIZE_EVIDENCE_INVALID');
}

export async function persistResendInboundAttachments(db:AdminClient,input:{instanceId:string;threadId:string;messageId:string;emailId:string;expectedCount:number}){
  if(input.expectedCount===0)return{expected:0,ready:0};const providerItems=await getResendReceivedEmailAttachments(input.emailId);if(providerItems.length!==input.expectedCount)throw new Error('OFFICE_INBOUND_ATTACHMENT_COUNT_MISMATCH');if(providerItems.length>OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)throw new Error('OFFICE_INBOUND_ATTACHMENT_COUNT_INVALID');for(const item of providerItems)validateProviderAttachment(item);
  const{error:prepareError}=await db.rpc('service_prepare_inbound_office_attachments_v1',{p_instance_id:input.instanceId,p_thread_id:input.threadId,p_message_id:input.messageId,p_provider_email_id:input.emailId,p_files:providerItems.map(item=>({providerAttachmentId:item.id,name:item.filename,contentType:item.content_type,size:item.size}))});if(prepareError)throw prepareError;
  const providerIds=providerItems.map(item=>item.id);const{data,error}=await db.from('office_message_attachments').select('id,storage_bucket,storage_path,original_name,content_type,byte_size,status,scan_status,sha256,provider_attachment_id').eq('instance_id',input.instanceId).eq('source','provider_inbound').eq('provider_email_id',input.emailId).in('provider_attachment_id',providerIds);if(error)throw error;const stored=(data??[])as StoredAttachment[];if(stored.length!==providerItems.length)throw new Error('OFFICE_INBOUND_ATTACHMENT_RESERVATION_EVIDENCE_MISSING');
  let ready=0;for(const providerItem of providerItems){const row=stored.find(item=>item.provider_attachment_id===providerItem.id);if(!row)throw new Error('OFFICE_INBOUND_ATTACHMENT_RESERVATION_EVIDENCE_MISSING');if(row.status==='ready'&&row.scan_status==='clean'){ready++;continue}if(row.status!=='pending'||!['awaiting_upload','scan_error'].includes(row.scan_status))throw new Error('OFFICE_INBOUND_ATTACHMENT_QUARANTINE_STATE_INVALID');const url=validateProviderAttachment(providerItem);const response=await fetch(url,{method:'GET',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`OFFICE_INBOUND_ATTACHMENT_DOWNLOAD_HTTP_${response.status}`);const bytes=await boundedBytes(response,providerItem.size);
    if(row.scan_status==='awaiting_upload'){const uploaded=await db.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).upload(row.storage_path,bytes,{contentType:providerItem.content_type,upsert:false,cacheControl:'0'});if(uploaded.error){const existing=await db.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).download(row.storage_path);if(existing.error||!existing.data)throw uploaded.error;const existingBytes=new Uint8Array(await existing.data.arrayBuffer());if(existingBytes.byteLength!==bytes.byteLength||createHash('sha256').update(existingBytes).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('OFFICE_INBOUND_ATTACHMENT_EXISTING_OBJECT_MISMATCH')}}
    await scanAndFinalizeInbound(db,{instanceId:input.instanceId,messageId:input.messageId,attachment:row,bytes});ready++}
  return{expected:providerItems.length,ready};
}

export async function officeAttachmentsForJob(db:AdminClient,instanceId:string,jobId:string):Promise<CommunicationAttachment[]>{
  const{data:message,error:messageError}=await db.from('office_messages').select('id,thread_id,attachment_count').eq('instance_id',instanceId).eq('communication_job_id',jobId).eq('kind','email_out').maybeSingle();if(messageError)throw messageError;if(!message)return[];const expected=Number(message.attachment_count??0);if(expected===0)return[];if(expected<0||expected>OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_COUNT_INVALID');
  const{data,error}=await db.from('office_message_attachments').select('id,storage_bucket,storage_path,original_name,content_type,byte_size,status,scan_status,sha256,provider_attachment_id').eq('instance_id',instanceId).eq('thread_id',message.thread_id).eq('message_id',message.id).eq('source','customer_outbound').eq('status','ready').eq('scan_status','clean').order('created_at',{ascending:true});if(error)throw error;const rows=(data??[])as StoredAttachment[];if(rows.length!==expected)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_EVIDENCE_MISSING');
  let total=0;const attachments:CommunicationAttachment[]=[];for(const row of rows){const size=Number(row.byte_size);if(!Number.isSafeInteger(size)||size<1||size>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES||!row.sha256)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_METADATA_INVALID');total+=size;if(total>OUTBOUND_RAW_TOTAL_MAX_BYTES)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_TOTAL_TOO_LARGE');if(row.storage_bucket!==OFFICE_PRIVATE_ATTACHMENT_BUCKET)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_BUCKET_INVALID');const downloaded=await db.storage.from(row.storage_bucket).download(row.storage_path);if(downloaded.error||!downloaded.data)throw downloaded.error??new Error('OFFICE_OUTBOUND_ATTACHMENT_DOWNLOAD_FAILED');const bytes=new Uint8Array(await downloaded.data.arrayBuffer());if(bytes.byteLength!==size)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_SIZE_MISMATCH');const digest=createHash('sha256').update(bytes).digest('hex');if(digest!==row.sha256)throw new Error('OFFICE_OUTBOUND_ATTACHMENT_HASH_MISMATCH');attachments.push({filename:row.original_name,content:Buffer.from(bytes).toString('base64')})}return attachments;
}
