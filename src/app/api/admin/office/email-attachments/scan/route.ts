import{NextResponse}from'next/server';
import{z}from'zod';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasCurrentPlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{inspectOfficePrivateAttachmentContent}from'@/lib/office/attachment-content-security';
import{scanOfficePrivateAttachmentMalware}from'@/lib/office/attachment-malware-scanner';
import{OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES,type OfficePrivateAttachmentMimeType,OFFICE_PRIVATE_ATTACHMENT_MAX_FILES}from'@/lib/office/private-attachments';

const schema=z.object({draftId:z.string().uuid(),attachmentIds:z.array(z.string().uuid()).min(1).max(OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)}).superRefine((value,ctx)=>{if(new Set(value.attachmentIds).size!==value.attachmentIds.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Duplikált csatolmány.'})});
type BeginResult={attachmentId?:string;storageBucket?:string;storagePath?:string;originalName?:string;declaredContentType?:string;byteSize?:number|string;scanNonce?:string};
type CompleteResult={attachmentId?:string;result?:string;readyForFinalize?:boolean};

async function completeScan(db:ReturnType<typeof createAdminClient>,input:{attachmentId:string;scanNonce:string;result:'clean'|'infected'|'rejected'|'scan_error';sha256:string|null;detectedContentType:string|null;provider:string|null;engineVersion:string|null;malwareSignature:string|null;reason:string|null}){
  const{data,error}=await db.rpc('admin_complete_office_attachment_scan_v1',{p_attachment_id:input.attachmentId,p_scan_nonce:input.scanNonce,p_result:input.result,p_sha256:input.sha256,p_detected_content_type:input.detectedContentType,p_provider:input.provider,p_engine_version:input.engineVersion,p_malware_signature:input.malwareSignature,p_reason:input.reason});
  if(error)throw new Error(`scan_completion_failed:${String(error.message??'unknown')}`);
  const result=(data??{})as CompleteResult;if(result.attachmentId!==input.attachmentId||result.result!==input.result)throw new Error('scan_completion_evidence_invalid');return result;
}

export async function POST(request:Request){
  const actor=await getAdminRequestUser('support.manage');if(!actor)return NextResponse.json({error:'Nincs jogosultság.'},{status:403});
  if(!(await hasCurrentPlanFeature('officeCommunication')))return NextResponse.json({error:'Az ügyfél-e-mail csatolmányok ehhez a csomaghoz nem érhetők el.'},{status:403});
  let scope;try{scope=await requireCurrentStoreContext('support.manage')}catch{return NextResponse.json({error:'Nincs jogosultság ehhez a webshophoz.'},{status:403})}
  let raw:unknown;try{raw=await request.json()}catch{return NextResponse.json({error:'Érvénytelen kérés.'},{status:400})};const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:'Érvénytelen csatolmány-ellenőrzési kérés.'},{status:400});
  const db=createAdminClient();
  for(const attachmentId of parsed.data.attachmentIds){
    const{data,error}=await db.rpc('admin_begin_office_email_attachment_scan_v1',{p_instance_id:scope.instanceId,p_actor:actor.id,p_draft_id:parsed.data.draftId,p_attachment_id:attachmentId});
    if(error){const reason=String(error.message??'');if(reason.includes('OFFICE_EMAIL_ATTACHMENT_SCAN_RESERVATION_INVALID'))return NextResponse.json({error:'A csatolmány-előjegyzés nem érvényes vagy lejárt.'},{status:409});if(reason.includes('OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'))return NextResponse.json({error:'A feltöltött fájl nem igazolható a karantén tárhelyen.'},{status:409});return NextResponse.json({error:'A fájl biztonsági ellenőrzése nem indítható el.'},{status:409})}
    const item=(data??{})as BeginResult;const declared=item.declaredContentType;if(item.attachmentId!==attachmentId||!item.storageBucket||!item.storagePath||!item.originalName||!item.scanNonce||!declared||!OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.includes(declared as OfficePrivateAttachmentMimeType))return NextResponse.json({error:'A karantén-fájl adatai nem igazolhatók.'},{status:500});
    const downloaded=await db.storage.from(item.storageBucket).download(item.storagePath);
    if(downloaded.error||!downloaded.data){await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'scan_error',sha256:null,detectedContentType:null,provider:null,engineVersion:null,malwareSignature:null,reason:'quarantine_download_failed'}).catch(()=>null);return NextResponse.json({error:'A karanténban lévő fájl nem olvasható biztonsági ellenőrzésre.'},{status:503})}
    const bytes=new Uint8Array(await downloaded.data.arrayBuffer());const expectedSize=Number(item.byteSize??0);
    if(!Number.isSafeInteger(expectedSize)||expectedSize<1||bytes.byteLength!==expectedSize){await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'rejected',sha256:'0'.repeat(64),detectedContentType:'application/octet-stream',provider:'builtin-content-inspector',engineVersion:'1',malwareSignature:null,reason:'uploaded_size_mismatch'}).catch(()=>null);await db.storage.from(item.storageBucket).remove([item.storagePath]).catch(()=>null);return NextResponse.json({error:`${item.originalName}: a feltöltött fájl mérete nem egyezik az előjegyzett fájllal.`},{status:422})}
    const inspection=inspectOfficePrivateAttachmentContent(bytes,declared as OfficePrivateAttachmentMimeType,item.originalName);
    if(!inspection.ok){const removed=await db.storage.from(item.storageBucket).remove([item.storagePath]);if(removed.error){await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'scan_error',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:'builtin-content-inspector',engineVersion:'1',malwareSignature:null,reason:'quarantine_delete_failed'}).catch(()=>null);return NextResponse.json({error:`${item.originalName}: a veszélyes vagy álcázott fájl karanténban maradt, letöltése tiltott.`},{status:500})}await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'rejected',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:'builtin-content-inspector',engineVersion:'1',malwareSignature:null,reason:inspection.reason??'content_signature_rejected'});return NextResponse.json({error:`${item.originalName}: a fájl valódi tartalma vagy szerkezete nem engedélyezett.`},{status:422})}
    const verdict=await scanOfficePrivateAttachmentMalware({bytes,sha256:inspection.sha256,contentType:inspection.detectedContentType,originalName:item.originalName});
    if(verdict.status==='unavailable'||verdict.status==='error'){await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'scan_error',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,malwareSignature:null,reason:verdict.reason});return NextResponse.json({error:'A vírusellenőrző jelenleg nincs biztonságosan konfigurálva vagy nem érhető el. A fájl karanténban marad és nem küldhető el.'},{status:503})}
    if(verdict.status==='infected'){const removed=await db.storage.from(item.storageBucket).remove([item.storagePath]);if(removed.error){await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'scan_error',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,malwareSignature:verdict.signature,reason:'infected_quarantine_delete_failed'}).catch(()=>null);return NextResponse.json({error:`${item.originalName}: fertőzésgyanús fájl karanténban maradt; hozzáférése tiltott.`},{status:500})}await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'infected',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,malwareSignature:verdict.signature,reason:'malware_detected'});return NextResponse.json({error:`${item.originalName}: a vírusellenőrző veszélyes fájlt észlelt. A fájlt elutasítottuk.`},{status:422})}
    const completed=await completeScan(db,{attachmentId,scanNonce:item.scanNonce,result:'clean',sha256:inspection.sha256,detectedContentType:inspection.detectedContentType,provider:verdict.provider,engineVersion:verdict.engineVersion,malwareSignature:null,reason:null});if(completed.readyForFinalize!==true)return NextResponse.json({error:'A tiszta fájl scan-bizonyítéka nem igazolható.'},{status:500});
  }
  return NextResponse.json({ok:true,scanned:parsed.data.attachmentIds.length},{headers:{'Cache-Control':'no-store'}});
}
