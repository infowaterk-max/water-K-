'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';

export function IntegrationJobRetry({jobId,kind}:{jobId:string;kind:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function retry(){
    if(!window.confirm('Biztosan újraindítod ezt az integrációs feladatot? A rendszer ellenőrzi, hogy nincs-e már aktív példány.'))return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/integration-jobs/${jobId}/retry`,{method:'POST'});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${b.error??'Az újraindítás nem sikerült.'} Az újrapróbálást nem tekintjük elindítottnak.`);return}
      setMessage(b.alreadyActive?'Már van aktív feladat, nem készült másolat.':'Újrapróbálás sorba állítva.');
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. Az újrapróbálást nem tekintjük elindítottnak.');
    }finally{
      setBusy(false);
    }
  }
  return <div style={{display:'grid',gap:6,justifyItems:'start'}}><button type="button" className="btn btnGhost" disabled={busy} onClick={retry}>{busy?'Indítás…':'Újrapróbálás'}</button>{message&&<small className="muted" role="status">{message}</small>}<span className="srOnly">Feladattípus: {kind}</span></div>;
}
