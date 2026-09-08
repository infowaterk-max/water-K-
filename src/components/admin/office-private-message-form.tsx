'use client';

import{useRouter}from'next/navigation';
import{useState,type FormEvent}from'react';
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

type Props={
  threadId:string;
  mentionOptions:MentionOption[];
  objectOptions:Option[];
};

type ApiError={error?:string};
type PrepareResponse={ok?:boolean;uploads?:OfficePrivateAttachmentUploadReservation[];error?:string};

function objectFromRef(raw:string){
  if(!raw)return{objectType:null,objectId:null};
  const separator=raw.indexOf(':');
  if(separator<1)return null;
  const objectType=raw.slice(0,separator);
  const objectId=raw.slice(separator+1);
  if(!['order','commercial_offer','return_case','support_ticket','task'].includes(objectType)||!objectId)return null;
  return{objectType,objectId};
}

function fileProblem(files:File[]){
  if(files.length>OFFICE_PRIVATE_ATTACHMENT_MAX_FILES)return`Legfeljebb ${OFFICE_PRIVATE_ATTACHMENT_MAX_FILES} csatolmány küldhető egy üzenettel.`;
  for(const file of files){
    if(file.size<1||file.size>OFFICE_PRIVATE_ATTACHMENT_MAX_BYTES)return`${file.name}: a fájl legfeljebb 10 MB lehet.`;
    if(!OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES)[number]))return`${file.name}: ez a fájltípus nem engedélyezett.`;
  }
  return null;
}

export function OfficePrivateMessageForm({threadId,mentionOptions,objectOptions}:Props){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState<string|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    const form=event.currentTarget;
    const data=new FormData(form);
    const body=String(data.get('body')??'').trim();
    const mentionUserIds=[...new Set(data.getAll('mentionUserId').map(value=>String(value)).filter(Boolean))].slice(0,10);
    const object=objectFromRef(String(data.get('objectRef')??''));
    const files=data.getAll('attachment').filter((value):value is File=>value instanceof File&&value.size>0);
    if(!body){setMessage('Írj üzenetet a küldéshez.');return}
    if(!object){setMessage('A kapcsolt üzleti objektum adata érvénytelen.');return}
    const problem=fileProblem(files);
    if(problem){setMessage(problem);return}

    setBusy(true);
    setMessage(null);
    try{
      let attachmentIds:string[]=[];
      if(files.length){
        const prepareResponse=await fetch('/api/admin/office/attachments/prepare',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            threadId,
            files:files.map(file=>({name:file.name,contentType:file.type,size:file.size})),
          }),
        });
        const prepared=(await prepareResponse.json().catch(()=>({})))as PrepareResponse;
        if(!prepareResponse.ok||!prepared.uploads||prepared.uploads.length!==files.length){
          throw new Error(prepared.error||'A csatolmányok biztonságos feltöltése nem készíthető elő.');
        }

        const supabase=createClient();
        for(let index=0;index<files.length;index+=1){
          const file=files[index];
          const upload=prepared.uploads[index];
          const{error}=await supabase.storage.from(OFFICE_PRIVATE_ATTACHMENT_BUCKET).uploadToSignedUrl(
            upload.path,
            upload.token,
            file,
            {contentType:file.type,upsert:false},
          );
          if(error)throw new Error(`${file.name}: a feltöltés nem sikerült.`);
        }
        attachmentIds=prepared.uploads.map(upload=>upload.attachmentId);
      }

      const finalizeResponse=await fetch('/api/admin/office/attachments/finalize',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          threadId,
          body,
          mentionUserIds,
          objectType:object.objectType,
          objectId:object.objectId,
          attachmentIds,
        }),
      });
      const finalized=(await finalizeResponse.json().catch(()=>({})))as ApiError;
      if(!finalizeResponse.ok)throw new Error(finalized.error||'A privát üzenet nem véglegesíthető.');

      form.reset();
      setMessage(files.length?'Az üzenet és a csatolmányok elküldve.':'Az üzenet elküldve.');
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:'A privát üzenet küldése nem sikerült.');
    }finally{
      setBusy(false);
    }
  }

  return <form className="stackForm" onSubmit={submit}>
    <input type="hidden" name="threadId" value={threadId}/>
    {mentionOptions.length>0&&<label><span>@ Említés</span><select name="mentionUserId" multiple size={Math.min(5,Math.max(2,mentionOptions.length))}>{mentionOptions.map(option=><option key={option.userId} value={option.userId}>{option.label}</option>)}</select></label>}
    <label className="stackForm"><span>Kapcsolt üzleti objektum</span><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{objectOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    <label className="stackForm"><span>Csatolmányok</span><input name="attachment" type="file" multiple accept={OFFICE_PRIVATE_ATTACHMENT_MIME_TYPES.join(',')}/><span className="muted">Legfeljebb 5 fájl, fájlonként 10 MB. Kép, PDF, TXT, CSV, DOCX vagy XLSX.</span></label>
    <textarea name="body" required rows={3} maxLength={10000} placeholder="Privát belső üzenet"/>
    {message&&<p className="muted" role="status">{message}</p>}
    <button className="btn btnGhost" disabled={busy}>{busy?'Küldés folyamatban…':'Belső üzenet küldése'}</button>
  </form>;
}
