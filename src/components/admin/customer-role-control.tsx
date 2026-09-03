'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CustomerRoleControl({ id, role, approved }: { id:string; role:string; approved:boolean }) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function update(nextRole:'customer'|'reseller', resellerApproved:boolean, confirmation?:string){
    if(confirmation&&!window.confirm(confirmation))return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/admin/customers/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({role:nextRole,resellerApproved})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'A partnerstátusz módosítása nem sikerült.');
      setMessage('Mentve');router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'A módosítás nem sikerült.');}
    finally{setBusy(false);}
  }

  if(role==='admin') return <span className="badge">Admin</span>;
  if(role==='reseller'&&approved) return <span><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>update('reseller',false,'Biztosan visszavonod ennek az ügyfélnek a viszonteladói jóváhagyását?')}>{busy?'Mentés…':'Jóváhagyás visszavonása'}</button>{message&&<small className="helperText" role="status"> {message}</small>}</span>;
  if(role==='reseller') return <span><button className="btn btnPrimary" type="button" disabled={busy} onClick={()=>update('reseller',true)}>{busy?'Mentés…':'Viszonteladó jóváhagyása'}</button>{message&&<small className="helperText" role="status"> {message}</small>}</span>;
  return <span><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>update('reseller',false,'Biztosan viszonteladói partnerkérelmet hozol létre ehhez a regisztrált ügyfélhez?')}>{busy?'Mentés…':'Viszonteladói partnernek jelölés'}</button>{message&&<small className="helperText" role="status"> {message}</small>}</span>;
}
