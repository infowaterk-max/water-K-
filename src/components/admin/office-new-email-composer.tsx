'use client';

import{useState,useTransition}from'react';
import{
  deleteOfficeDraftAction,officeComposerInitialState,saveNewEmailDraftAction,sendNewEmailAction,
  type OfficeComposerActionState,
}from'@/app/admin/kommunikacio/iroda/composer-actions';

type MailboxOption={mailboxKey:string;label:string};
type InitialDraft={id:string;toEmail:string|null;subject:string;body:string};

export function OfficeNewEmailComposer({mailboxes,initialDraft,compact=false}:{mailboxes:MailboxOption[];initialDraft?:InitialDraft;compact?:boolean}){
  const[draftId,setDraftId]=useState(initialDraft?.id??'');
  const[toEmail,setToEmail]=useState(initialDraft?.toEmail??'');
  const[subject,setSubject]=useState(initialDraft?.subject??'');
  const[body,setBody]=useState(initialDraft?.body??'');
  const[mailboxKey,setMailboxKey]=useState(mailboxes[0]?.mailboxKey??'');
  const[state,setState]=useState<OfficeComposerActionState>(officeComposerInitialState);
  const[pending,startTransition]=useTransition();
  const sendingConfigured=mailboxes.length>0;

  function formData(){
    const data=new FormData();
    if(draftId)data.set('draftId',draftId);
    data.set('toEmail',toEmail);
    data.set('subject',subject);
    data.set('body',body);
    if(mailboxKey)data.set('mailboxKey',mailboxKey);
    return data;
  }

  function save(){
    startTransition(async()=>{
      const result=await saveNewEmailDraftAction(officeComposerInitialState,formData());
      setState(result);
      if(result.status==='success'&&result.draftId)setDraftId(result.draftId);
    });
  }

  function send(){
    startTransition(async()=>{
      const result=await sendNewEmailAction(officeComposerInitialState,formData());
      setState(result);
      if(result.status==='success'){
        setDraftId('');setToEmail('');setSubject('');setBody('');
      }
    });
  }

  function remove(){
    if(!draftId)return;
    startTransition(async()=>{
      const data=new FormData();data.set('draftId',draftId);
      const result=await deleteOfficeDraftAction(data);
      setState(result);
      if(result.status==='success'){
        setDraftId('');setToEmail('');setSubject('');setBody('');
      }
    });
  }

  const sendReady=sendingConfigured&&toEmail.trim().length>0&&subject.trim().length>0&&body.trim().length>0;
  return <div className={compact?'stackForm':'featurePanel'} aria-busy={pending}>
    {!compact&&<><span className="eyebrow">1:1 operatív e-mail</span><h2>Új üzenet</h2></>}
    <input type="email" value={toEmail} onChange={event=>setToEmail(event.target.value)} maxLength={320} placeholder="Címzett e-mail címe" disabled={pending}/>
    <input value={subject} onChange={event=>setSubject(event.target.value)} maxLength={300} placeholder="Tárgy" disabled={pending}/>
    <textarea value={body} onChange={event=>setBody(event.target.value)} maxLength={10000} rows={compact?4:6} placeholder="Üzenet" disabled={pending}/>
    {sendingConfigured&&<label><span>Küldő Office postafiók</span><select value={mailboxKey} onChange={event=>setMailboxKey(event.target.value)} disabled={pending}>{mailboxes.map(mailbox=><option key={mailbox.mailboxKey} value={mailbox.mailboxKey}>{mailbox.label}</option>)}</select></label>}
    {!sendingConfigured&&<div className="adminAuditNotice"><strong>Küldés még nincs aktiválva.</strong><p>A piszkozat menthető, de e-mailt csak a később általad jóváhagyott külön Digitális Iroda postafiók beállítása után lehet küldeni. A működő webshop jelenlegi e-mail címeit a rendszer nem használja.</p></div>}
    <div className="adminToolbar">
      <button type="button" className="btn btnGhost" onClick={save} disabled={pending}>Piszkozat mentése</button>
      {draftId&&<button type="button" className="btn btnGhost" onClick={remove} disabled={pending}>Piszkozat törlése</button>}
      <button type="button" className="btn btnPrimary" onClick={send} disabled={pending||!sendReady}>Küldés</button>
    </div>
    {state.message&&(state.status==='blocked'||state.status==='error'?<div className="errorNotice" role="alert">{state.message}</div>:<p className="muted" role="status">{state.message}</p>)}
  </div>;
}
