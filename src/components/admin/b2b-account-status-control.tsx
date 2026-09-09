'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Status='pending'|'approved'|'suspended';

export function B2BAccountStatusControl({id,status}:{id:string;status:Status}){
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),router=useRouter();
  async function setStatus(next:Status){
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/admin/b2b/accounts/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error??'A módosítás nem sikerült.');
      setMessage('Mentve.');router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'A módosítás nem sikerült.')}
    finally{setBusy(false)}
  }
  return <div><div className="actions">
    {status!=='approved'&&<button className="btn btnGhost" disabled={busy} onClick={()=>setStatus('approved')}>Jóváhagyás</button>}
    {status!=='suspended'&&<button className="btn btnGhost" disabled={busy} onClick={()=>setStatus('suspended')}>Felfüggesztés</button>}
    {status!=='pending'&&<button className="btn btnGhost" disabled={busy} onClick={()=>setStatus('pending')}>Vissza várakozóra</button>}
  </div>{message&&<span className="muted" role="status">{message}</span>}</div>;
}
