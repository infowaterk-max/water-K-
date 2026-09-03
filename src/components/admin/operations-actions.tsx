'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';

export function OperationsCycleButton(){
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);
  const router=useRouter();
  async function run(){
    setBusy(true);setMessage('');setIsError(false);
    try{
      const r=await fetch('/api/admin/operations/run',{method:'POST'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){setIsError(true);setMessage(`${j.error??'A műveleti ciklus futtatása nem sikerült.'} A ciklust nem tekintjük lefutottnak.`);return}
      setMessage('Műveleti ciklus lefutott.');
      router.refresh();
    }catch{
      setIsError(true);setMessage('Hálózati hiba. A műveleti ciklust nem tekintjük lefutottnak.');
    }finally{setBusy(false)}
  }
  return <span><button className="btn" disabled={busy} onClick={run}>{busy?'Feldolgozás…':'Műveleti ciklus futtatása'}</button>{message&&<small className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</small>}</span>;
}

export function OrderOperationAction({orderId,status}:{orderId:string;status:string}){
  const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);
  const router=useRouter();
  const next=status==='reserved'?'ready_to_pack':status==='ready_to_pack'?'packed':status==='packed'?'handed_over':status==='handed_over'?'delivered':null;
  if(!next)return null;
  const label=next==='ready_to_pack'?'Csomagolásra kész':next==='packed'?'Csomagolva':next==='handed_over'?'Átadva futárnak':'Kézbesítve';
  async function transition(){
    if(next==='delivered'&&!window.confirm('Biztosan kézbesítettnek jelölöd ezt a rendelést?'))return;
    setBusy(true);setMessage('');setIsError(false);
    try{
      const r=await fetch('/api/admin/operations/transition',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orderId,targetStatus:next})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){setIsError(true);setMessage(`${j.error??'Az állapotváltás nem sikerült.'} A rendelési művelet állapotát nem tekintjük módosítottnak.`);return}
      setMessage('Műveleti állapot mentve.');
      router.refresh();
    }catch{
      setIsError(true);setMessage('Hálózati hiba. A rendelési művelet állapotát nem tekintjük módosítottnak.');
    }finally{setBusy(false)}
  }
  return <span><button className="btn btnGhost" disabled={busy} onClick={transition}>{busy?'Mentés…':label}</button>{message&&<small className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</small>}</span>;
}
