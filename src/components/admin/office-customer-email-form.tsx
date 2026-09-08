'use client';

import{useEffect,useState,useTransition}from'react';
import{
  officeComposerInitialState,saveReplyDraftAction,sendCustomerEmailV3Action,
  type OfficeComposerActionState,
}from'@/app/admin/kommunikacio/iroda/composer-actions';

function PendingSpinner(){
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" focusable="false">
    <g>
      <path fill="currentColor" d="M12 2a10 10 0 0 1 9.4 6.58l-1.88.68A8 8 0 0 0 12 4V2Z"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </g>
  </svg>;
}

export function OfficeCustomerEmailForm({threadId,sendingConfigured=false,initialDraft}:{threadId:string;sendingConfigured?:boolean;initialDraft?:{id:string;body:string}}){
  const[body,setBody]=useState(initialDraft?.body??'');
  const[draftId,setDraftId]=useState(initialDraft?.id??'');
  const[state,setState]=useState<OfficeComposerActionState>(officeComposerInitialState);
  const[pending,startTransition]=useTransition();

  useEffect(()=>{
    if(state.status==='success'&&state.message.includes('küldési sorba')){
      setBody('');setDraftId('');
    }
  },[state]);

  function data(){
    const form=new FormData();form.set('threadId',threadId);form.set('body',body);if(draftId)form.set('draftId',draftId);return form;
  }
  function save(){
    startTransition(async()=>{
      const result=await saveReplyDraftAction(officeComposerInitialState,data());
      setState(result);if(result.status==='success'&&result.draftId)setDraftId(result.draftId);
    });
  }
  function send(){
    startTransition(async()=>setState(await sendCustomerEmailV3Action(officeComposerInitialState,data())));
  }

  return <div className="stackForm" aria-busy={pending}>
    <textarea name="body" required rows={3} maxLength={10000} placeholder="Ügyfélnek" value={body} onChange={event=>setBody(event.target.value)} disabled={pending}/>
    {!sendingConfigured&&<div className="adminAuditNotice"><strong>Küldés még nincs aktiválva.</strong><p>A válasz piszkozatként menthető. Küldéshez később külön Digitális Iroda postafiókot kell jóváhagyni; a működő webshop jelenlegi e-mail címeit nem használjuk.</p></div>}
    <div className="adminToolbar">
      <button type="button" className="btn btnGhost" onClick={save} disabled={pending||body.trim().length===0}>Piszkozat mentése</button>
      <button type="button" className="btn btnPrimary" onClick={send} disabled={pending||body.trim().length===0||!sendingConfigured}>
        {pending?<><PendingSpinner/> Feldolgozás…</>:'E-mail válasz'}
      </button>
    </div>
    {state.message&&(state.status==='blocked'||state.status==='error'
      ?<div className="errorNotice" role="alert">{state.message}</div>
      :<p className="muted" role="status">{state.message}</p>)}
  </div>;
}
