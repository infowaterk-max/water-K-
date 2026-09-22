'use client';
import{useEffect,useState}from'react';
import{useRouter}from'next/navigation';

export function SupportTicketActions({id,status,priority,adminNote}:{id:string;status:string;priority:string;adminNote:string|null}){
 const router=useRouter(),[busy,setBusy]=useState(false),[note,setNote]=useState(adminNote??''),[p,setP]=useState(priority),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);
 useEffect(()=>{setP(priority);setNote(adminNote??'')},[priority,adminNote]);
 async function save(nextStatus=status){
  if(busy)return;
  if(nextStatus==='closed'&&status!=='resolved'&&!window.confirm('Az ügy még nincs megoldott állapotban. Biztosan lezárod?'))return;
  setBusy(true);setMessage('');setIsError(false);
  try{
   const r=await fetch(`/api/admin/support/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:nextStatus,priority:p,adminNote:note||null})});
   const b=await r.json().catch(()=>({}));
   if(!r.ok){setIsError(true);setMessage(b.error??'Mentési hiba.');return}
   setMessage('Mentve.');router.refresh();
  }catch{setIsError(true);setMessage('Hálózati hiba. A módosítást nem tekintjük elmentettnek.')}
  finally{setBusy(false)}
 }
 return <div style={{display:'grid',gap:8,minWidth:320}} aria-busy={busy}>
  <select aria-label="Prioritás" value={p} onChange={e=>setP(e.target.value)} disabled={busy}><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select>
  <textarea aria-label="Belső megjegyzés" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Belső megjegyzés" disabled={busy}/>
  <div className="actions"><button className="btn btnGhost" disabled={busy} onClick={()=>save('in_progress')}>Folyamatban</button><button className="btn btnGhost" disabled={busy} onClick={()=>save('waiting_customer')}>Ügyfélre vár</button><button className="btn btnPrimary" disabled={busy} onClick={()=>save('resolved')}>Megoldva</button><button className="btn btnGhost" disabled={busy} onClick={()=>save('closed')}>Lezárás</button></div>
  {message&&<small className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</small>}
 </div>;
}
