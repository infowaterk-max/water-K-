'use client';

import{createClient}from'@/lib/supabase/browser';
import{
  OFFICE_PRIVATE_ATTACHMENT_BUCKET,
  OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES,
  OFFICE_PRIVATE_ATTACHMENT_MAX_FILES,
  OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES,
  type OfficePrivateAttachmentUploadReservation,
}from'./private-attachments';

export type OfficeEmailAttachmentAvailabilityReason='ready'|'plan_required'|'scanner_unavailable'|'forbidden'|'unknown';
export type OfficeEmailAttachmentAvailability={enabled:boolean;reason:OfficeEmailAttachmentAvailabilityReason};
type StatusResponse={attachmentsEnabled?:boolean;reason?:OfficeEmailAttachmentAvailabilityReason};
type PrepareResponse={ok?:boolean;uploads?:OfficePrivateAttachmentUploadReservation[];error?:string};
type ApiResponse={ok?:boolean;error?:string};
let availabilityPromise:Promise<OfficeEmailAttachmentAvailability>|null=null;

export function officeEmailAttachmentProblem(files:File[]){
  if(files.length>OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)return`Legfeljebb ${OFFICE_PRIVATE_ATTACHMENT_MAX_FILES} csatolmány küldhető egy e-maillel.`;
  for(const file of files){
    if(file.size<1||file.size>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES)return`${file.name}: a fájl legfeljebb 10 MB lehet.`;
    if(!OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES)[number]))return`${file.name}: ez a fájltípus nem engedélyezett.`;
  }
  return null;
}

export function getOfficeEmailAttachmentAvailability(){
  if(!availabilityPromise){
    availabilityPromise=fetch('/api/admin/office/email-attachments/status',{cache:'no-store'})
      .then(async response=>{const payload=(await response.json().catch(()=>({})))as StatusResponse;return{enabled:response.ok&&payload.attachmentsEnabled===true,reason:payload.reason??'unknown'}})
      .catch(()=>({enabled:false,reason:'unknown' as const}));
  }
  return availabilityPromise;
}

export async function uploadAndScanOfficeEmailAttachments(draftId:string,files:File[]){
  if(files.length===0)return[];
  const problem=officeEmailAttachmentProblem(files);if(problem)throw new Error(problem);
  const prepareResponse=await fetch('/api/admin/office/email-attachments/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draftId,files:files.map(file=>({name:file.name,contentType:file.type,size:file.size}))})});
  const prepared=(await prepareResponse.json().catch(()=>({})))as PrepareResponse;
  if(!prepareResponse.ok||!prepared.uploads||prepared.uploads.length!==files.length)throw new Error(prepared.error||'A csatolmányok biztonságos feltöltése nem készíthető elő.');
  const supabase=createClient();
  for(let index=0;index<files.length;index+=1){
    const file=files[index],upload=prepared.uploads[index];
    const{error}=await supabase.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type});
    if(error)throw new Error(`${file.name}: a feltöltés nem sikerült.`);
  }
  const attachmentIds=prepared.uploads.map(upload=>upload.attachmentId);
  const scanResponse=await fetch('/api/admin/office/email-attachments/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draftId,attachmentIds})});
  const scanned=(await scanResponse.json().catch(()=>({})))as ApiResponse;if(!scanResponse.ok)throw new Error(scanned.error||'A csatolmány biztonsági ellenőrzése nem sikerült.');
  return attachmentIds;
}
