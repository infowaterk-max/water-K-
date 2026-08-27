'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const labels:Record<string,string>={draft:'Piszkozat',pending:'Függőben',paid:'Fizetve',processing:'Feldolgozás',shipped:'Átadva',completed:'Teljesítve',cancelled:'Törölve',refunded:'Visszatérítve'};
const allowed:Record<string,string[]>={draft:['pending','cancelled'],pending:['paid','cancelled'],paid:['processing','refunded','cancelled'],processing:['shipped','refunded','cancelled'],shipped:['completed','refunded'],completed:['refunded'],cancelled:[],refunded:[]};

export function OrderStatusControl({id,status}:{id:string;status:string}){
  const router=useRouter(); const options=[status,...(allowed[status]??[])]; const [value,setValue]=useState(status); const [tracking,setTracking]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function save(){setBusy(true);setError('');try{const response=await fetch(`/api/admin/orders/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:value,trackingNumber:value==='shipped'&&tracking?tracking:undefined})});const payload=await response.json();if(!response.ok){setError(payload.error??'Nem sikerült módosítani az állapotot.');return;}router.refresh();}catch{setError('Hálózati hiba.');}finally{setBusy(false)}}
  return <div style={{display:'grid',gap:8}}><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><select value={value} onChange={e=>setValue(e.target.value)}>{options.map(s=><option key={s} value={s}>{labels[s]??s}</option>)}</select>{value==='shipped'&&<input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="Csomagkövetési azonosító"/>}<button className="btn btnGhost" type="button" disabled={busy||value===status} onClick={save}>{busy?'Mentés…':'Mentés'}</button></div>{error&&<small className="errorNotice">{error}</small>}{(allowed[status]??[]).length===0&&<small className="muted">Végállapot; innen csak rendszerfolyam vagy külön üzleti művelet léphet tovább.</small>}</div>;
}
