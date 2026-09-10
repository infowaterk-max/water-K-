'use client';

import{useRouter}from'next/navigation';
import{useEffect,useRef,useState,type FormEvent}from'react';
import{createClient}from'@/lib/supabase/browser';
import{
  OFFICE_PRIVATE_ATTACHMENT_BUCKET,
  OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES,
  OFFICE_PRIVATE_ATTACHMENT_MAX_FILES,
  OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES,
  type OfficePrivateAttachmentUploadReservation,
}from'@/lib/office/private-attachments';

type Option={value:string;label:string};
type MentionOption={userId:string;label:string};
type Props={threadId:string;mentionOptions:MentionOption[];objectOptions:Option[];compact?:boolean};
type ApiError={error?:string};
type PrepareResponse={ok?:boolean;uploads?:OfficePrivateAttachmentUploadReservation[];error?:string};
type AttachmentAvailabilityReason='ready'|'pro_required'|'scanner_unavailable'|'forbidden'|'unknown';
type ScannerStatusResponse={attachmentsEnabled?:boolean;reason?:AttachmentAvailabilityReason};
type Phase='idle'|'uploading'|'scanning'|'finalizing';
type AttachmentAvailability={enabled:boolean;reason:AttachmentAvailabilityReason};
let scannerAvailabilityPromise:Promise<AttachmentAvailability>|null=null;

function scannerAvailability(){
  if(!scannerAvailabilityPromise){
    scannerAvailabilityPromise=fetch('/api/admin/office/attachments/status',{cache:'no-store'})
      .then(async response=>{const payload=(await response.json().catch(()=>({})))as ScannerStatusResponse;return{enabled:response.ok&&payload.attachmentsEnabled===true,reason:payload.reason??'unknown'}})
      .catch(()=>({enabled:false,reason:'unknown' as const}));
  }
  return scannerAvailabilityPromise;
}
function objectFromRef(raw:string){if(!raw)return{objectType:null,objectId:null};const separator=raw.indexOf(':');if(separator<1)return null;const objectType=raw.slice(0,separator),objectId=raw.slice(separator+1);if(!['order','commercial_offer','return_case','support_ticket','task'].includes(objectType)||!objectId)return null;return{objectType,objectId}}
function fileProblem(files:File[]){if(files.length>OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)return`Legfeljebb ${OFFICE_PRIVATE_ATTACHMENT_MAX_FILES} csatolmány küldhető egy üzenettel.`;for(const file of files){if(file.size<1||file.size>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES)return`${file.name}: a fájl legfeljebb 10 MB lehet.`;if(!OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.includes(file.type as(typeof OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES)[number]))return`${file.name}: ez a fájltípus nem engedélyezett.`}return null}
function phaseLabel(phase:Phase){if(phase==='uploading')return'Feltöltés…';if(phase==='scanning')return'Ellenőrzés…';if(phase==='finalizing')return'Küldés…';return'Küldés'}
function attachmentHelp(checked:boolean,availability:AttachmentAvailability){if(!checked)return'A csatolmányok elérhetőségét ellenőrizzük…';if(availability.enabled)return'Legfeljebb 5 fájl, fájlonként 10 MB. A fájlok csak biztonsági ellenőrzés után küldhetők el.';if(availability.reason==='pro_required')return'A biztonságos fájlcsatolmányok Pro funkciók. A szöveges Team Chat továbbra is használható.';if(availability.reason==='scanner_unavailable')return'A fájlcsatolmányok a biztonsági scanner jóváhagyásáig le vannak tiltva.';return'A csatolmányküldés jelenleg nem érhető el.'}

export function OfficePrivateMessageForm({threadId,mentionOptions,objectOptions,compact=false}:Props){
  const router=useRouter();
  const textareaRef=useRef<HTMLTextAreaElement|null>(null);
  const[busy,setBusy]=useState(false);const[phase,setPhase]=useState<Phase>('idle');const[message,setMessage]=useState<string|null>(null);const[toolsOpen,setToolsOpen]=useState(false);const[availability,setAvailability]=useState<AttachmentAvailability>({enabled:false,reason:'unknown'});const[scannerChecked,setScannerChecked]=useState(false);
  const toolsId=`team-chat-tools-${threadId}`;
  useEffect(()=>{let active=true;scannerAvailability().then(result=>{if(!active)return;setAvailability(result);setScannerChecked(true)});return()=>{active=false}},[]);

  function autosize(event:FormEvent<HTMLTextAreaElement>){
    const textarea=event.currentTarget;
    textarea.style.height='auto';
    textarea.style.height=`${Math.min(textarea.scrollHeight,132)}px`;
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;const form=event.currentTarget;const data=new FormData(form);const body=String(data.get('body')??'').trim();const mentionUserIds=[...new Set(data.getAll('mentionUserId').map(value=>String(value)).filter(Boolean))].slice(0,10);const object=objectFromRef(String(data.get('objectRef')??''));const files=availability.enabled?data.getAll('attachment').filter((value):value is File=>value instanceof File&&value.size>0):[];
    if(!body){setMessage('Írj üzenetet a küldéshez.');return}if(!object){setMessage('A kapcsolt üzleti objektum adata érvénytelen.');return}const problem=fileProblem(files);if(problem){setMessage(problem);return}
    setBusy(true);setMessage(null);
    try{
      let attachmentIds:string[]=[];
      if(files.length){
        setPhase('uploading');
        const prepareResponse=await fetch('/api/admin/office/attachments/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId,files:files.map(file=>({name:file.name,contentType:file.type,size:file.size}))})});
        const prepared=(await prepareResponse.json().catch(()=>({})))as PrepareResponse;
        if(!prepareResponse.ok||!prepared.uploads||prepared.uploads.length!==files.length)throw new Error(prepared.error||'A csatolmányok biztonságos feltöltése nem készíthető elő.');
        const supabase=createClient();
        for(let index=0;index<files.length;index+=1){const file=files[index],upload=prepared.uploads[index];const{error}=await supabase.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).uploadToSignedUrl(upload.path,upload.token,file,{contentType:file.type});if(error)throw new Error(`${file.name}: a feltöltés nem sikerült.`)}
        attachmentIds=prepared.uploads.map(upload=>upload.attachmentId);
        setPhase('scanning');
        const scanResponse=await fetch('/api/admin/office/attachments/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId,attachmentIds})});const scanned=(await scanResponse.json().catch(()=>({})))as ApiError;if(!scanResponse.ok)throw new Error(scanned.error||'A csatolmány biztonsági ellenőrzése nem sikerült. A fájl nem küldhető el.');
      }
      setPhase('finalizing');
      if(attachmentIds.length){const finalizeResponse=await fetch('/api/admin/office/attachments/finalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId,body,mentionUserIds,objectType:object.objectType,objectId:object.objectId,attachmentIds})});const finalized=(await finalizeResponse.json().catch(()=>({})))as ApiError;if(!finalizeResponse.ok)throw new Error(finalized.error||'A privát üzenet nem véglegesíthető.');}
      else{const textResponse=await fetch('/api/admin/office/chat/message',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId,body,mentionUserIds,objectType:object.objectType,objectId:object.objectId})});const sent=(await textResponse.json().catch(()=>({})))as ApiError;if(!textResponse.ok)throw new Error(sent.error||'A belső üzenet nem küldhető el.');}
      form.reset();if(textareaRef.current)textareaRef.current.style.height='';setToolsOpen(false);setMessage(files.length?'Az üzenet és a tisztának minősített csatolmányok elküldve.':'Az üzenet elküldve.');router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'A privát üzenet küldése nem sikerült.');}
    finally{setBusy(false);setPhase('idle');}
  }

  return <form className={`stackForm teamChatMessageComposer${compact?' teamChatCompactComposer':''}`} onSubmit={submit}>
    <div className="teamChatComposerSurface">
      <button type="button" className="teamChatToolsButton" aria-expanded={toolsOpen} aria-controls={toolsId} aria-label="Említés, csatolmány vagy üzleti objektum hozzáadása" onClick={()=>setToolsOpen(value=>!value)}>＋</button>
      <textarea ref={textareaRef} className="teamChatComposerInput" name="body" required rows={1} maxLength={10000} placeholder="Írj üzenetet…" onInput={autosize} onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
      <button className="btn btnPrimary teamChatSendButton" disabled={busy}>{busy?phaseLabel(phase):'Küldés'}</button>
    </div>
    <div id={toolsId} className="teamChatComposerTools" data-open={toolsOpen?'true':'false'}>
      <header><div><strong>Hozzáadás az üzenethez</strong><small>Említés, üzleti kapcsolat vagy fájl</small></div><button type="button" aria-label="Eszközök bezárása" onClick={()=>setToolsOpen(false)}>×</button></header>
      {mentionOptions.length>0&&<label><span>@ Említés</span><select name="mentionUserId" multiple size={Math.min(4,Math.max(2,mentionOptions.length))}>{mentionOptions.map(option=><option key={option.userId} value={option.userId}>{option.label}</option>)}</select></label>}
      {objectOptions.length>0&&<label><span>Kapcsolt üzleti objektum</span><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{objectOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
      <label><span>📎 Csatolmány {availability.reason==='pro_required'?'· Pro':''}</span><input name="attachment" type="file" multiple accept={OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.join(',')} disabled={!availability.enabled||busy}/><small className="muted">{attachmentHelp(scannerChecked,availability)}</small></label>
    </div>
    {message&&<p className="teamChatComposerStatus muted" role="status">{message}</p>}
  </form>;
}
