'use client';

import{useState,useTransition}from'react';
import{
  autosaveReplyDraftAction,officeComposerInitialState,saveReplyDraftAction,sendCustomerEmailV4Action,
  type OfficeComposerActionState,
}from'@/app/admin/kommunikacio/iroda/composer-actions';
import{useOfficeDraftAutosave}from'@/components/admin/use-office-draft-autosave';

function PendingSpinner(){
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" focusable="false">
    <g>
      <path fill="currentColor" d="M12 2a10 10 0 0 1 9.4 6.58l-1.88.68A8 8 0 0 0 12 4V2Z"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </g>
  </svg>;
}

type ReplySnapshot={ccEmails:string;bccEmails:string;body:string};
type ReplyDraft={id:string;revision:number;ccEmails:string[];bccEmails:string[];body:string};

function replyFormData(threadId:string,snapshot:ReplySnapshot,draftId:string,revision:number|null){
  const form=new FormData();
  form.set('threadId',threadId);
  form.set('ccEmails',snapshot.ccEmails);
  form.set('bccEmails',snapshot.bccEmails);
  form.set('body',snapshot.body);
  if(draftId)form.set('draftId',draftId);
  if(revision)form.set('revision',String(revision));
  return form;
}

export function OfficeCustomerEmailForm({
  threadId,sendingConfigured=false,advancedEmail=false,initialDraft,
}:{threadId:string;sendingConfigured?:boolean;advancedEmail?:boolean;initialDraft?:ReplyDraft}){
  const[ccEmails,setCcEmails]=useState(advancedEmail?initialDraft?.ccEmails.join(', ')??'':'');
  const[bccEmails,setBccEmails]=useState(advancedEmail?initialDraft?.bccEmails.join(', ')??'':'');
  const[body,setBody]=useState(initialDraft?.body??'');
  const[operationState,setOperationState]=useState<OfficeComposerActionState>(officeComposerInitialState);
  const[actionPending,startTransition]=useTransition();
  const snapshot:ReplySnapshot={ccEmails:advancedEmail?ccEmails:'',bccEmails:advancedEmail?bccEmails:'',body};
  const snapshotKey=JSON.stringify(snapshot);
  const meaningful=(advancedEmail?[ccEmails,bccEmails,body]:[body]).some(value=>value.trim().length>0);
  const sendReady=body.trim().length>0;

  const draft=useOfficeDraftAutosave({
    snapshot,
    snapshotKey,
    meaningful,
    initialDraftId:initialDraft?.id,
    initialRevision:initialDraft?.revision??null,
    autosave:({snapshot:next,draftId,revision})=>autosaveReplyDraftAction(
      officeComposerInitialState,replyFormData(threadId,next,draftId,revision)
    ),
    manualSave:({snapshot:next,draftId,revision})=>saveReplyDraftAction(
      officeComposerInitialState,replyFormData(threadId,next,draftId,revision)
    ),
  });

  function save(){
    setOperationState(officeComposerInitialState);
    void draft.saveNow();
  }

  function send(){
    if(!sendReady||!sendingConfigured||draft.status==='conflict')return;
    startTransition(async()=>{
      setOperationState(officeComposerInitialState);
      const saveResult=await draft.saveNow();
      if(saveResult&&(saveResult.status==='conflict'||saveResult.status==='error'||saveResult.status==='blocked')){
        setOperationState(saveResult);
        return;
      }
      const safeDraftId=saveResult?.draftId??draft.draftId;
      const safeRevision=saveResult?.revision??draft.revision;
      const result=await sendCustomerEmailV4Action(
        officeComposerInitialState,
        replyFormData(threadId,snapshot,safeDraftId,safeRevision),
      );
      setOperationState(result);
      if(result.status==='success'){
        setCcEmails('');setBccEmails('');setBody('');
        draft.reset();
      }
    });
  }

  return <div className="stackForm" aria-busy={actionPending||draft.status==='saving'}>
    {advancedEmail?<div className="splitFeature">
      <label className="stackForm"><span>Másolat (CC)</span><input value={ccEmails} onChange={event=>setCcEmails(event.target.value)} maxLength={3300} placeholder="pelda@ceg.hu" disabled={actionPending}/></label>
      <label className="stackForm"><span>Titkos másolat (BCC)</span><input value={bccEmails} onChange={event=>setBccEmails(event.target.value)} maxLength={3300} placeholder="belso@ceg.hu" disabled={actionPending}/></label>
    </div>:<p className="muted">CC/BCC címzettek a Pro ügyféllevelezési csomagban érhetők el.</p>}
    <textarea name="body" required rows={3} maxLength={10000} placeholder="Ügyfélnek" value={body} onChange={event=>setBody(event.target.value)} disabled={actionPending}/>
    {!sendingConfigured&&<div className="adminAuditNotice"><strong>Küldés még nincs aktiválva.</strong><p>A válasz automatikusan piszkozatként menthető. Küldéshez később külön Digitális Iroda postafiókot kell jóváhagyni; a működő webshop jelenlegi e-mail címeit nem használjuk.</p></div>}
    <div className="adminToolbar">
      <button type="button" className="btn btnGhost" onClick={save} disabled={actionPending||draft.status==='saving'||draft.status==='conflict'||!meaningful}>Piszkozat mentése</button>
      <button type="button" className="btn btnPrimary" onClick={send} disabled={actionPending||draft.status==='conflict'||!sendReady||!sendingConfigured}>
        {actionPending?<><PendingSpinner/> Feldolgozás…</>:'E-mail válasz'}
      </button>
      {draft.status!=='conflict'&&draft.status!=='error'&&<span className="muted" role="status" aria-live="polite">{draft.message||'Még nincs mentett válaszpiszkozat.'}</span>}
    </div>
    {draft.status==='conflict'&&<div className="errorNotice" role="alert"><strong>Válaszpiszkozat-ütközés.</strong><p>{draft.message}</p></div>}
    {draft.status==='error'&&<div className="errorNotice" role="alert"><strong>Az automatikus mentés nem sikerült.</strong><p>{draft.message} A kézi mentéssel újra próbálhatod.</p></div>}
    {operationState.message&&(operationState.status==='blocked'||operationState.status==='error'||operationState.status==='conflict'
      ?<div className="errorNotice" role="alert">{operationState.message}</div>
      :<p className="muted" role="status">{operationState.message}</p>)}
  </div>;
}
