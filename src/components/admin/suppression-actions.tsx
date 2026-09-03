'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';

export function SuppressionCreate(){
  const router=useRouter();
  const[email,setEmail]=useState('');
  const[note,setNote]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  async function submit(){
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/communication/suppression',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'block',email,note})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok){setMessage(`${body.error??'A tiltás sikertelen.'} A tiltást nem tekintjük rögzítettnek.`);return}
      setEmail('');setNote('');setMessage('A cím letiltva.');router.refresh();
    }catch{
      setMessage('Hálózati hiba. A tiltást nem tekintjük rögzítettnek.');
    }finally{
      setBusy(false);
    }
  }
  return <div className="card"><h3>Kézi tiltás</h3><div className="field"><label>E-mail cím</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="vasarlo@pelda.hu"/></div><div className="field"><label>Megjegyzés</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Tiltás oka"/></div><button className="btn btnPrimary" disabled={busy||!email} onClick={submit}>Cím letiltása</button>{message&&<p className="muted" role="status">{message}</p>}</div>;
}

export function SuppressionRelease({id}:{id:string}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  async function release(){
    if(!window.confirm('Biztosan feloldod ezt a címet a tiltólistáról?'))return;
    const note=window.prompt('Feloldás megjegyzése (opcionális):');
    if(note===null)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/communication/suppression',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'release',suppressionId:id,note})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok){setMessage(`${body.error??'A feloldás sikertelen.'} A feloldást nem tekintjük végrehajtottnak.`);return}
      setMessage('Feloldva.');router.refresh();
    }catch{
      setMessage('Hálózati hiba. A feloldást nem tekintjük végrehajtottnak.');
    }finally{
      setBusy(false);
    }
  }
  return <div><button className="btn" disabled={busy} onClick={release}>Feloldás</button>{message&&<span className="muted" role="status">{message}</span>}</div>;
}
