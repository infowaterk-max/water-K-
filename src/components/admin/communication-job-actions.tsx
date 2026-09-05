'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Action='cancel'|'reschedule'|'retry'|'approve';
type Props={
  jobId:string;
  status:string;
  scheduledAt:string;
  approved:boolean;
  requiresApproval:boolean;
  allowApproval?:boolean;
};

function ActionSpinner(){
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" focusable="false">
    <g>
      <path fill="currentColor" d="M12 2a10 10 0 0 1 9.4 6.58l-1.88.68A8 8 0 0 0 12 4V2Z"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </g>
  </svg>;
}

export function CommunicationJobActions({jobId,status,scheduledAt,approved,requiresApproval,allowApproval=true}:Props){
  const router=useRouter();
  const[busyAction,setBusyAction]=useState<Action|null>(null);
  const[message,setMessage]=useState('');
  const[dialog,setDialog]=useState<'cancel'|'reschedule'|null>(null);
  const[rescheduleValue,setRescheduleValue]=useState(scheduledAt.slice(0,16));

  async function act(action:Action,next?:string){
    if(busyAction)return;
    setBusyAction(action);setMessage('');
    try{
      const response=await fetch('/api/admin/communication/manage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jobId,action,scheduledAt:next})});
      const body=await response.json().catch(()=>({}))as{error?:string};
      if(!response.ok){setMessage(body.error??'A művelet sikertelen.');return}
      setDialog(null);
      setMessage(action==='approve'?'Jóváhagyva.':action==='cancel'?'Törölve.':action==='retry'?'Újrapróbálás elindítva.':'Átütemezve.');
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A műveletet nem tekintjük végrehajtottnak.');
    }finally{setBusyAction(null)}
  }

  function confirmReschedule(){
    const parsed=new Date(rescheduleValue);
    if(Number.isNaN(parsed.getTime())){setMessage('Érvénytelen időpont.');return}
    void act('reschedule',parsed.toISOString());
  }

  const mutable=['pending','failed','blocked'].includes(status);
  const busy=busyAction!==null;
  return <div className="communicationJobActions">
    {mutable&&<div className="adminToolbar communicationActionBar">
      {status==='pending'&&requiresApproval&&!approved&&allowApproval&&<button type="button" className="btn btnPrimary" disabled={busy} onClick={()=>void act('approve')}>{busyAction==='approve'?<><ActionSpinner/> Jóváhagyás…</>:'Jóváhagyás'}</button>}
      <button type="button" className="btn" disabled={busy} onClick={()=>{setMessage('');setRescheduleValue(scheduledAt.slice(0,16));setDialog('reschedule')}}>{busyAction==='reschedule'?<><ActionSpinner/> Mentés…</>:'Átütemezés'}</button>
      {['failed','blocked'].includes(status)&&<button type="button" className="btn" disabled={busy} onClick={()=>void act('retry')}>{busyAction==='retry'?<><ActionSpinner/> Újrapróbálás…</>:'Újrapróbálás'}</button>}
      <button type="button" className="textLink" disabled={busy} onClick={()=>{setMessage('');setDialog('cancel')}}>{busyAction==='cancel'?<><ActionSpinner/> Törlés…</>:'Törlés'}</button>
    </div>}
    {message&&<span className="helperText" role="status">{message}</span>}
    {dialog&&<div className="adminModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setDialog(null)}}>
      <section className="adminModal" role="dialog" aria-modal="true" aria-labelledby={`communication-${dialog}-${jobId}`}>
        {dialog==='cancel'?<>
          <span className="eyebrow">Küldési sor</span>
          <h3 id={`communication-cancel-${jobId}`}>Kiküldési feladat törlése</h3>
          <p className="muted">Biztosan törlöd ezt a kiküldési feladatot? A művelet a kommunikációs auditnaplóban megmarad.</p>
          <div className="adminModalActions">
            <button type="button" className="btn btnGhost" disabled={busy} onClick={()=>setDialog(null)}>Mégse</button>
            <button type="button" className="btn btnPrimary" disabled={busy} onClick={()=>void act('cancel')}>{busyAction==='cancel'?<><ActionSpinner/> Törlés…</>:'Kiküldési feladat törlése'}</button>
          </div>
        </>:<>
          <span className="eyebrow">Küldési sor</span>
          <h3 id={`communication-reschedule-${jobId}`}>Új küldési időpont</h3>
          <label className="adminModalField">Időpont<input type="datetime-local" value={rescheduleValue} disabled={busy} onChange={event=>setRescheduleValue(event.target.value)}/></label>
          <div className="adminModalActions">
            <button type="button" className="btn btnGhost" disabled={busy} onClick={()=>setDialog(null)}>Mégse</button>
            <button type="button" className="btn btnPrimary" disabled={busy||!rescheduleValue} onClick={confirmReschedule}>{busyAction==='reschedule'?<><ActionSpinner/> Mentés…</>:'Új időpont mentése'}</button>
          </div>
        </>}
      </section>
    </div>}
  </div>;
}
