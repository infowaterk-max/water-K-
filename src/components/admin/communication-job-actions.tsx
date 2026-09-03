'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props={jobId:string;status:string;scheduledAt:string;approved:boolean;allowApproval?:boolean};

export function CommunicationJobActions({jobId,status,scheduledAt,approved,allowApproval=true}:Props){
  const router=useRouter();
  const[busy,setBusy]=useState(false),[message,setMessage]=useState('');

  async function act(action:'cancel'|'reschedule'|'retry'|'approve'){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      let next:string|undefined;
      if(action==='reschedule'){
        const value=window.prompt('Új időpont (pl. 2026-08-28 10:00):',scheduledAt.slice(0,16).replace('T',' '));
        if(!value)return;
        const parsed=new Date(value);
        if(Number.isNaN(parsed.getTime())){setMessage('Érvénytelen időpont.');return}
        next=parsed.toISOString();
      }
      if(action==='cancel'&&!window.confirm('Biztosan törlöd ezt a kiküldési feladatot?'))return;
      const response=await fetch('/api/admin/communication/manage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jobId,action,scheduledAt:next})});
      const body=await response.json().catch(()=>({}))as{error?:string};
      if(!response.ok){setMessage(body.error??'A művelet sikertelen.');return}
      setMessage(action==='approve'?'Jóváhagyva.':'Mentve.');
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A műveletet nem tekintjük végrehajtottnak.');
    }finally{setBusy(false)}
  }

  const mutable=['pending','failed','blocked'].includes(status);
  return <div>
    {mutable&&<div className="adminToolbar">
      {status==='pending'&&!approved&&allowApproval&&<button className="btn btnPrimary" disabled={busy} onClick={()=>act('approve')}>Jóváhagyás</button>}
      <button className="btn" disabled={busy} onClick={()=>act('reschedule')}>Átütemezés</button>
      {['failed','blocked'].includes(status)&&<button className="btn" disabled={busy} onClick={()=>act('retry')}>Újrapróbálás</button>}
      <button className="textLink" disabled={busy} onClick={()=>act('cancel')}>Törlés</button>
    </div>}
    {message&&<span className="helperText" role="status">{message}</span>}
  </div>;
}
