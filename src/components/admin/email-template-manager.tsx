'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EmailTemplateManager(){
  const router=useRouter();
  const[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function createEssential(){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/email-builder/system-templates/essential-order-confirmation',{method:'POST',headers:{'content-type':'application/json'}});
      const payload=await response.json().catch(()=>({})) as{error?:string;template?:{id?:string}};
      if(!response.ok||!payload.template?.id){setMessage(payload.error??'A sablon nem hozható létre.');return;}
      router.push(`/admin/email-sablonok/${payload.template.id}/elonezet`);
      router.refresh();
    }catch{setMessage('Hálózati hiba. A sablont nem tekintjük létrehozottnak.');}
    finally{setBusy(false);}
  }
  return <div>
    <button className="btn btnPrimary" type="button" disabled={busy} onClick={createEssential}>{busy?'Piszkozat létrehozása…':'Essential piszkozat létrehozása'}</button>
    {message&&<p className="helperText" role="status">{message}</p>}
  </div>;
}
