'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';

export function ProcurementOrderForm({variants}:{variants:{id:string;name:string;suggested:number;unitCost:number|null}[]}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget,f=new FormData(form),variantId=String(f.get('variantId')||''),quantity=Number(f.get('quantity')||0),unitCostNetHuf=Number(f.get('unitCostNetHuf')||0);
    setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/admin/procurement',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({supplierName:String(f.get('supplierName')||''),expectedAt:String(f.get('expectedAt')||'')||undefined,paymentTermsDays:Number(f.get('paymentTermsDays')||8),notes:String(f.get('notes')||'')||undefined,items:[{variantId,quantity,unitCostNetHuf}]})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${b.error??'A beszerzés nem hozható létre.'} A beszerzést nem tekintjük létrehozottnak.`);return}
      setMessage(`${b.orderNumber} létrehozva.`);
      form.reset();
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A beszerzést nem tekintjük létrehozottnak.');
    }finally{
      setBusy(false);
    }
  }
  const first=variants[0];
  return <form className="featurePanel" onSubmit={submit}><span className="eyebrow">Új beszerzés</span><h2>Beszerzési rendelés létrehozása</h2><label>Beszállító<input name="supplierName" required placeholder="Beszállító neve"/></label><label>Termék<select name="variantId" defaultValue={first?.id}>{variants.map(v=><option key={v.id} value={v.id}>{v.name}{v.suggested?` · javaslat ${v.suggested} db`:''}</option>)}</select></label><div className="cards"><label>Mennyiség<input name="quantity" type="number" min="1" required defaultValue={first?.suggested||1}/></label><label>Nettó egységköltség<input name="unitCostNetHuf" type="number" min="0" required defaultValue={first?.unitCost??0}/></label></div><div className="cards"><label>Várható érkezés<input name="expectedAt" type="date"/></label><label>Fizetési határidő az érkezéstől<input name="paymentTermsDays" type="number" min="0" max="365" defaultValue="8"/></label></div><label>Megjegyzés<textarea name="notes" rows={3}/></label><button className="btn btnPrimary" disabled={busy}>{busy?'Létrehozás…':'Piszkozat létrehozása'}</button>{message&&<p className="muted" role="status">{message}</p>}<p className="muted">A létrehozás még nem jelent megrendelést a beszállítónál. A folyamat: piszkozat → jóváhagyva → megrendelve → részleges vagy teljes bevételezés.</p></form>;
}

export function ProcurementStatusButton({id,status}:{id:string;status:string}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const next=status==='draft'?'approved':status==='approved'?'ordered':status==='ordered'||status==='partially_received'?'received':null,label=status==='draft'?'Jóváhagyás':status==='approved'?'Megrendelve':status==='ordered'||status==='partially_received'?'Minden fennmaradó bevételezése':null;
  if(!next||!label)return null;
  async function run(){
    if(next==='received'&&!window.confirm('Biztosan bevételezed az összes fennmaradó mennyiséget?'))return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/procurement/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:next})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${b.error??'Sikertelen művelet.'} A beszerzési állapotot nem tekintjük módosítottnak.`);return}
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A beszerzési állapotot nem tekintjük módosítottnak.');
    }finally{
      setBusy(false);
    }
  }
  return <span><button className="btn btnGhost" type="button" disabled={busy} onClick={run}>{busy?'Mentés…':label}</button>{message&&<small className="muted" role="status">{message}</small>}</span>;
}

export function PartialReceiptForm({id,items}:{id:string;items:{id:string;name:string;ordered:number;received:number}[]}){
  const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const open=items.filter(x=>x.received<x.ordered);
  if(!open.length)return null;
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget),payload=open.map(x=>({itemId:x.id,quantity:Number(f.get(`qty-${x.id}`)||0)})).filter(x=>x.quantity>0);
    if(!payload.length){setMessage('Adj meg legalább egy bevételezendő mennyiséget.');return}
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/procurement/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'partial_receipt',items:payload})});
      const b=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${b.error??'A részleges bevételezés nem sikerült.'} A bevételezést nem tekintjük rögzítettnek.`);return}
      setMessage('Bevételezés rögzítve.');router.refresh();
    }catch{
      setMessage('Hálózati hiba. A bevételezést nem tekintjük rögzítettnek.');
    }finally{
      setBusy(false);
    }
  }
  return <form onSubmit={submit} style={{display:'grid',gap:6,minWidth:260}}><strong>Részleges bevételezés</strong>{open.map(x=><label key={x.id}>{x.name}<small className="muted"> · {x.received}/{x.ordered} db</small><input name={`qty-${x.id}`} type="number" min="0" max={x.ordered-x.received} defaultValue="0"/></label>)}<button className="btn btnPrimary" disabled={busy}>{busy?'Bevételezés…':'Megadott mennyiség bevételezése'}</button>{message&&<small className="muted" role="status">{message}</small>}</form>;
}
