'use client';

import{useActionState,useEffect,useState}from'react';
import{sendCustomerEmailAction}from'@/app/admin/kommunikacio/iroda/actions';

const initialState={status:'idle' as const,message:''};

function PendingSpinner(){
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" focusable="false">
    <g>
      <path fill="currentColor" d="M12 2a10 10 0 0 1 9.4 6.58l-1.88.68A8 8 0 0 0 12 4V2Z"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </g>
  </svg>;
}

export function OfficeCustomerEmailForm({threadId}:{threadId:string}){
  const[state,formAction,pending]=useActionState(sendCustomerEmailAction,initialState);
  const[body,setBody]=useState('');
  useEffect(()=>{if(state.status==='success')setBody('');},[state.status]);
  return <form action={formAction} className="stackForm" aria-busy={pending}>
    <input type="hidden" name="threadId" value={threadId}/>
    <textarea name="body" required rows={2} maxLength={4000} placeholder="Ügyfélnek" value={body} onChange={event=>setBody(event.target.value)} disabled={pending}/>
    <button className="btn btnPrimary" disabled={pending||body.trim().length===0}>
      {pending?<><PendingSpinner/> Küldés…</>:'E-mail válasz'}
    </button>
    {state.message&&(state.status==='blocked'||state.status==='error'
      ?<div className="errorNotice" role="alert">{state.message}</div>
      :<p className="muted" role="status">{state.message}</p>)}
  </form>;
}
