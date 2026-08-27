'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';
export function GrowthRefreshButton(){const[busy,setBusy]=useState(false),[message,setMessage]=useState('');const router=useRouter();async function run(){setBusy(true);setMessage('');try{const r=await fetch('/api/admin/growth/run',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'A frissítés nem sikerült.');setMessage('A növekedési folyamatok frissültek.');router.refresh()}catch(e){setMessage(e instanceof Error?e.message:'A frissítés nem sikerült.')}finally{setBusy(false)}}return <div><button className="button" type="button" onClick={run} disabled={busy}>{busy?'Frissítés…':'Növekedési folyamatok frissítése'}</button>{message&&<p className="muted" role="status">{message}</p>}</div>}
