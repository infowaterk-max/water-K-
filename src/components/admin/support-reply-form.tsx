'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';

export function SupportReplyForm({ticketId,closed=false}:{ticketId:string;closed?:boolean}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget,f=new FormData(form);
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/support/${ticketId}/messages`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:String(f.get('message')||'')})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${b.error??'A válasz nem küldhető el.'} A választ nem tekintjük rögzítettnek.`);return}
      form.reset();
      setMessage('Ügyfélszolgálati válasz rögzítve.');
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A választ nem tekintjük rögzítettnek.');
    }finally{
      setBusy(false);
    }
  }
  return <form className="featurePanel" onSubmit={submit}>
    <span className="eyebrow">Válasz az ügyfélnek</span>
    <textarea name="message" rows={6} minLength={2} maxLength={4000} required disabled={closed} placeholder={closed?'A lezárt ügyhöz előbb nyisd újra az ügyet.':'Írd meg az ügyfélnek küldendő választ…'}/>
    <button className="btn btnPrimary" disabled={busy||closed}>{busy?'Küldés…':'Válasz rögzítése'}</button>
    {message&&<p className="muted" role="status">{message}</p>}
    <p className="muted">A válasz bekerül az ügyfél fiókjában látható beszélgetésbe. Külső e-mail értesítés külön kommunikációs integrációval kapcsolható hozzá.</p>
  </form>;
}
