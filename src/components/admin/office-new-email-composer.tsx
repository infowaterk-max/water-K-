'use client';

import{useState,useTransition}from'react';
import{
  autosaveNewEmailDraftAction,deleteOfficeDraftAction,officeComposerInitialState,saveNewEmailDraftAction,sendNewEmailAction,
  type OfficeComposerActionState,
}from'@/app/admin/kommunikacio/iroda/composer-actions';
import{useOfficeDraftAutosave}from'@/components/admin/use-office-draft-autosave';

type MailboxOption={mailboxKey:string;label:string};
type InitialDraft={id:string;revision:number;toEmail:string|null;subject:string;body:string};
type DraftSnapshot={toEmail:string;subject:string;body:string};

function draftFormData(snapshot:DraftSnapshot,draftId:string,revision:number|null,mailboxKey?:string){
  const data=new FormData();
  if(draftId)data.set('draftId',draftId);
  if(revision)data.set('revision',String(revision));
  data.set('toEmail',snapshot.toEmail);
  data.set('subject',snapshot.subject);
  data.set('body',snapshot.body);
  if(mailboxKey)data.set('mailboxKey',mailboxKey);
  return data;
}

export function OfficeNewEmailComposer({mailboxes,initialDraft,compact=false}:{mailboxes:MailboxOption[];initialDraft?:InitialDraft;compact?:boolean}){
  const[toEmail,setToEmail]=useState(initialDraft?.toEmail??'');
  const[subject,setSubject]=useState(initialDraft?.subject??'');
  const[body,setBody]=useState(initialDraft?.body??'');
  const[mailboxKey,setMailboxKey]=useState(mailboxes[0]?.mailboxKey??'');
  const[operationState,setOperationState]=useState<OfficeComposerActionState>(officeComposerInitialState);
  const[actionPending,startTransition]=useTransition();
  const sendingConfigured=mailboxes.length>0;
  const snapshot:DraftSnapshot={toEmail,subject,body};
  const snapshotKey=JSON.stringify(snapshot);
  const meaningful=toEmail.trim().length>0||subject.trim().length>0||body.trim().length>0;

  const draft=useOfficeDraftAutosave({
    snapshot,
    snapshotKey,
    meaningful,
    initialDraftId:initialDraft?.id,
    initialRevision:initialDraft?.revision??null,
    autosave:({snapshot:next,draftId,revision})=>autosaveNewEmailDraftAction(
      officeComposerInitialState,draftFormData(next,draftId,revision)
    ),
    manualSave:({snapshot:next,draftId,revision})=>saveNewEmailDraftAction(
      officeComposerInitialState,draftFormData(next,draftId,revision)
    ),
  });

  const sendReady=sendingConfigured&&toEmail.trim().length>0&&subject.trim().length>0&&body.trim().length>0;
  const hasBlockingDraftState=draft.status==='conflict';

  function save(){
    setOperationState(officeComposerInitialState);
    void draft.saveNow();
  }

  function send(){
    if(!sendReady||hasBlockingDraftState)return;
    startTransition(async()=>{
      setOperationState(officeComposerInitialState);
      const saveResult=await draft.saveNow();
      if(saveResult&&(saveResult.status==='conflict'||saveResult.status==='error'||saveResult.status==='blocked')){
        setOperationState(saveResult);
        return;
      }
      const safeDraftId=saveResult?.draftId??draft.draftId;
      const safeRevision=saveResult?.revision??draft.revision;
      const result=await sendNewEmailAction(
        officeComposerInitialState,
        draftFormData(snapshot,safeDraftId,safeRevision,mailboxKey),
      );
      setOperationState(result);
      if(result.status==='success'){
        setToEmail('');setSubject('');setBody('');
        draft.reset();
      }
    });
  }

  function remove(){
    if(!draft.draftId||!draft.revision||draft.status!=='saved')return;
    const deletingId=draft.draftId;
    const deletingRevision=draft.revision;
    startTransition(async()=>{
      setOperationState(officeComposerInitialState);
      const data=new FormData();
      data.set('draftId',deletingId);
      data.set('revision',String(deletingRevision));
      const result=await deleteOfficeDraftAction(data);
      setOperationState(result);
      if(result.status==='success'){
        setToEmail('');setSubject('');setBody('');
        draft.reset();
      }
    });
  }

  return <div className={compact?'stackForm':'featurePanel'} aria-busy={actionPending||draft.status==='saving'}>
    {!compact&&<><span className="eyebrow">1:1 operatív e-mail</span><h2>Új üzenet</h2></>}
    <input type="email" value={toEmail} onChange={event=>setToEmail(event.target.value)} maxLength={320} placeholder="Címzett e-mail címe" disabled={actionPending}/>
    <input value={subject} onChange={event=>setSubject(event.target.value)} maxLength={300} placeholder="Tárgy" disabled={actionPending}/>
    <textarea value={body} onChange={event=>setBody(event.target.value)} maxLength={10000} rows={compact?4:6} placeholder="Üzenet" disabled={actionPending}/>
    {sendingConfigured&&<label><span>Küldő Office postafiók</span><select value={mailboxKey} onChange={event=>setMailboxKey(event.target.value)} disabled={actionPending}>{mailboxes.map(mailbox=><option key={mailbox.mailboxKey} value={mailbox.mailboxKey}>{mailbox.label}</option>)}</select></label>}
    {!sendingConfigured&&<div className="adminAuditNotice"><strong>Küldés még nincs aktiválva.</strong><p>A piszkozat automatikusan menthető, de e-mailt csak a később általad jóváhagyott külön Digitális Iroda postafiók beállítása után lehet küldeni. A működő webshop jelenlegi e-mail címeit a rendszer nem használja.</p></div>}

    <div className="adminToolbar">
      <button type="button" className="btn btnGhost" onClick={save} disabled={actionPending||draft.status==='saving'||draft.status==='conflict'||!meaningful}>Piszkozat mentése</button>
      {draft.draftId&&<button type="button" className="btn btnGhost" onClick={remove} disabled={actionPending||draft.status!=='saved'||!draft.revision}>Piszkozat törlése</button>}
      <button type="button" className="btn btnPrimary" onClick={send} disabled={actionPending||draft.status==='conflict'||!sendReady}>Küldés</button>
      {draft.status!=='conflict'&&draft.status!=='error'&&<span className="muted" role="status" aria-live="polite">{draft.message||'Még nincs mentett piszkozat.'}</span>}
    </div>

    {draft.status==='conflict'&&<div className="errorNotice" role="alert"><strong>Piszkozatütközés.</strong><p>{draft.message}</p></div>}
    {draft.status==='error'&&<div className="errorNotice" role="alert"><strong>Az automatikus mentés nem sikerült.</strong><p>{draft.message} A kézi mentéssel újra próbálhatod.</p></div>}
    {operationState.message&&(operationState.status==='blocked'||operationState.status==='error'||operationState.status==='conflict'
      ?<div className="errorNotice" role="alert">{operationState.message}</div>
      :<p className="muted" role="status">{operationState.message}</p>)}
  </div>;
}
