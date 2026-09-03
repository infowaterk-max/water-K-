'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function post(url:string,body?:unknown){
  const r=await fetch(url,{method:'POST',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error??'A művelet nem sikerült.');
  return j;
}

export function AssuranceRunButton(){
  const[busy,setBusy]=useState(false);
  const router=useRouter();
  return <button className="btn btnPrimary" disabled={busy} onClick={async()=>{
    setBusy(true);
    try{await post('/api/admin/assurance/run');router.refresh()}
    catch(error){alert(error instanceof Error?error.message:'Hiba')}
    finally{setBusy(false)}
  }}>{busy?'Ellenőrzés folyamatban…':'Ellenőrzés futtatása'}</button>;
}

export function AssuranceFindingActions({findingId,status,severity}:{findingId:string;status:string;severity:string}){
  const[busy,setBusy]=useState(false);
  const router=useRouter();

  const act=async(action:string)=>{
    let reason='';
    if(action==='accepted_risk'){
      reason=prompt('Kockázatelfogadás indoka:')??'';
      if(!reason)return;
    }
    setBusy(true);
    try{await post('/api/admin/assurance/finding',{findingId,action,reason});router.refresh()}
    catch(error){alert(error instanceof Error?error.message:'Hiba')}
    finally{setBusy(false)}
  };

  return <div className="actions">
    {status==='open'&&<button className="btn btnGhost" disabled={busy} onClick={()=>act('acknowledged')}>Átvettem</button>}
    {['open','acknowledged','accepted_risk'].includes(status)&&<button className="btn" disabled={busy} onClick={()=>act('resolved')}>Megoldottnak jelölés</button>}
    {severity!=='critical'&&['open','acknowledged'].includes(status)&&<button className="btn btnGhost" disabled={busy} onClick={()=>act('accepted_risk')}>Kockázat elfogadása</button>}
  </div>;
}
