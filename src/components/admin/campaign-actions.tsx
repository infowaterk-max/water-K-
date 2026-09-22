'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';

export function CampaignActions({campaignId,status}:{campaignId:string;status:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');

  async function act(action:'submit_review'|'approve'|'queue'|'cancel'){
    if(action==='queue'&&!window.confirm('A jogosult címzettek kommunikációs sorba kerülnek. Folytatod?'))return;
    if(action==='cancel'&&!window.confirm('Biztosan törlöd ezt a kampányt?'))return;
    setBusy(true);
    setMsg('');
    try{
      const r=await fetch('/api/admin/campaigns/manage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId,action})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){
        setMsg(`${b.error??'Sikertelen művelet.'} A kampány állapotát nem tekintjük módosítottnak.`);
        return;
      }
      setMsg(action==='queue'?`${b.queued??0} címzett sorba téve.`:'Mentve.');
      router.refresh();
    }catch{
      setMsg('Hálózati hiba. A kampány állapotát nem tekintjük módosítottnak.');
    }finally{
      setBusy(false);
    }
  }

  return <div className="adminToolbar">
    {status==='draft'&&<button className="btn" disabled={busy} onClick={()=>act('submit_review')}>Ellenőrzésre küldés</button>}
    {status==='review'&&<button className="btn btnPrimary" disabled={busy} onClick={()=>act('approve')}>Kampány jóváhagyása</button>}
    {status==='approved'&&<button className="btn btnPrimary" disabled={busy} onClick={()=>act('queue')}>Címzettek sorba állítása</button>}
    {['draft','review','approved'].includes(status)&&<button className="textLink" disabled={busy} onClick={()=>act('cancel')}>Törlés</button>}
    {msg&&<span className="muted" role="status">{msg}</span>}
  </div>;
}
