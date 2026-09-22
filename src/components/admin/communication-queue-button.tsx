'use client';

import { useState } from 'react';

type Kind='payment_followup'|'repeat_30d'|'winback_90d';
export function CommunicationQueueButton({kind,reference,label}:{kind:Kind;reference:string;label:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function enqueue(){setBusy(true);setMessage('');try{const response=await fetch('/api/admin/communication/enqueue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,reference})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Nem sikerült sorba tenni.');setMessage('Sorba téve');}catch(error){setMessage(error instanceof Error?error.message:'Nem sikerült sorba tenni.');}finally{setBusy(false);}}
 return <span><button type="button" className="btn btnGhost" disabled={busy} onClick={enqueue}>{busy?'Folyamatban…':label}</button>{message&&<small className="muted" role="status"> {message}</small>}</span>;
}
