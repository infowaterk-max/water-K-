'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';
export function ResellerRequestButton(){
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),router=useRouter();
 async function request(){
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/account/reseller-request',{method:'POST'}),b=await r.json().catch(()=>({}));
   setMessage(r.ok?(b.approved?'A B2B partnerfiók már aktív.':'A B2B szervezeti partnerfiók létrejött és jóváhagyásra vár.'):(b.error??'A B2B partnerfiók nem igényelhető.'));
   if(r.ok)router.refresh();
  }catch{setMessage('Hálózati hiba.')}
  finally{setBusy(false)}
 }
 return <div><button type="button" className="btn btnGhost" disabled={busy} onClick={request}>{busy?'Létrehozás…':'B2B partnerfiók igénylése'}</button>{message&&<p className="muted" role="status">{message}</p>}</div>
}
