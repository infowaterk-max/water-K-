'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InventoryEditor({id,stock,grossPrice,netPrice,resellerGrossPrice,resellerNetPrice}:{id:string;stock:number;grossPrice:number;netPrice:number;resellerGrossPrice:number|null;resellerNetPrice:number|null}){
  const router=useRouter();
  const [s,setS]=useState(stock);const [g,setG]=useState(grossPrice);const [n,setN]=useState(netPrice);
  const [rg,setRg]=useState(resellerGrossPrice===null?'':String(resellerGrossPrice));const [rn,setRn]=useState(resellerNetPrice===null?'':String(resellerNetPrice));
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function save(){
    setBusy(true);setMessage('');
    try{
      const response=await fetch(`/api/admin/variants/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({stock:s,grossPrice:g,netPrice:n,resellerGrossPrice:rg===''?null:Number(rg),resellerNetPrice:rn===''?null:Number(rn)})});
      const payload=await response.json() as {error?:string};
      if(!response.ok){setMessage(payload.error??'Mentési hiba.');return;}
      router.refresh();setMessage('Mentve.');
    }catch{setMessage('Hálózati hiba.');}finally{setBusy(false);}
  }
  return <div style={{display:'grid',gap:8,minWidth:480}}>
    <div style={{display:'grid',gridTemplateColumns:'90px 120px 120px',gap:8}}><input aria-label="Készlet" type="number" min="0" value={s} onChange={e=>setS(Number(e.target.value))}/><input aria-label="Bruttó ár" type="number" min="0" value={g} onChange={e=>setG(Number(e.target.value))}/><input aria-label="Nettó ár" type="number" min="0" value={n} onChange={e=>setN(Number(e.target.value))}/></div>
    <div style={{display:'grid',gridTemplateColumns:'120px 120px auto',gap:8}}><input aria-label="Viszonteladói bruttó ár" type="number" min="0" placeholder="Partner bruttó" value={rg} onChange={e=>setRg(e.target.value)}/><input aria-label="Viszonteladói nettó ár" type="number" min="0" placeholder="Partner nettó" value={rn} onChange={e=>setRn(e.target.value)}/><button className="btn btnGhost" type="button" disabled={busy} onClick={save}>{busy?'Mentés…':'Mentés'}</button></div>
    {message&&<small className="muted">{message}</small>}
  </div>;
}
