'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function IntegrationJobControl({id,disabled}:{id:string;disabled?:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function run(){
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/admin/integrations/${id}/run`,{method:'POST'});
      const payload=await response.json() as {error?:string};
      if(!response.ok){setMessage(payload.error??'Nem sikerült futtatni.');return;}
      router.refresh();
    }catch{setMessage('Hálózati hiba.');}finally{setBusy(false);}
  }
  return <div><button className="btn btnGhost" type="button" onClick={run} disabled={busy||disabled}>{busy?'Futtatás…':'Újrapróbálás'}</button>{message&&<small className="errorNotice">{message}</small>}</div>;
}
