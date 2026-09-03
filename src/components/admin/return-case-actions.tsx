'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';

export function ReturnCaseActions({id,status,refundAmount,refundReference,inventoryRestockedAt}:{id:string;status:string;refundAmount:number|null;refundReference:string|null;inventoryRestockedAt?:string|null}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false),[amount,setAmount]=useState(refundAmount===null?'':String(refundAmount)),[reference,setReference]=useState(refundReference??'');
 async function update(next:string,restock=false){
  if(busy)return;
  const numericAmount=amount===''?null:Number(amount);
  if(next==='refunded'&&(numericAmount===null||!Number.isFinite(numericAmount)||numericAmount<=0)){setIsError(true);setMessage('A visszatérítés lezárásához adj meg pozitív visszatérítési összeget.');return}
  if(next==='refunded'&&!window.confirm('Biztosan visszatérítettnek jelölöd? Ezt csak a tényleges banki vagy pénzügyi visszatérítés után használd.'))return;
  if(restock&&!window.confirm('Biztosan visszahelyezed a tételeket a készletre? Csak fizikailag visszaérkezett és újraértékesíthető terméknél folytasd.'))return;
  if(next==='rejected'&&!window.confirm('Biztosan elutasítod ezt a visszáru igényt?'))return;
  setBusy(true);setMessage('');setIsError(false);
  try{
   const r=await fetch(`/api/admin/returns/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next,refundAmount:numericAmount,refundReference:reference||null,restock})});
   const b=await r.json().catch(()=>({}));
   if(!r.ok){setIsError(true);setMessage(b.error??'A módosítás nem sikerült.');return}
   setMessage(restock?'Készlet visszaállítva.':'Mentve.');router.refresh();
  }catch{setIsError(true);setMessage('Hálózati hiba. A módosítást nem tekintjük végrehajtottnak.')}
  finally{setBusy(false)}
 }
 const received=['received','refund_pending','refunded','closed'].includes(status);
 return <div style={{display:'grid',gap:8,minWidth:280}}>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
   <input aria-label="Visszatérítés összege" type="number" min="0" placeholder="Összeg Ft" value={amount} onChange={e=>setAmount(e.target.value)} disabled={busy}/>
   <input aria-label="Visszatérítés hivatkozása" placeholder="Banki hivatkozás" value={reference} onChange={e=>setReference(e.target.value)} disabled={busy}/>
  </div>
  <div className="actions">
   {status==='requested'&&<><button className="btn btnGhost" disabled={busy} onClick={()=>update('approved')}>Jóváhagyás</button><button className="btn btnGhost" disabled={busy} onClick={()=>update('rejected')}>Elutasítás</button></>}
   {status==='approved'&&<button className="btn btnGhost" disabled={busy} onClick={()=>update('received')}>Visszaérkezett</button>}
   {status==='received'&&<button className="btn btnGhost" disabled={busy} onClick={()=>update('refund_pending')}>Visszatérítés indul</button>}
   {['received','refund_pending'].includes(status)&&<button className="btn btnPrimary" disabled={busy} onClick={()=>update('refunded')}>Visszatérítve</button>}
   {status!=='closed'&&status!=='requested'&&<button className="btn btnGhost" disabled={busy} onClick={()=>update('closed')}>Lezárás</button>}
   {received&&!inventoryRestockedAt&&<button className="btn btnPrimary" disabled={busy} onClick={()=>update(status,true)}>Újraértékesíthető · készletre</button>}
  </div>
  {inventoryRestockedAt&&<small className="muted">A termék készlete már vissza lett állítva.</small>}
  {message&&<small className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</small>}
 </div>;
}
