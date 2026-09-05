'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';

const manualPayments=new Set(['cash_on_delivery','bank_transfer']);
const eligibleStatuses=new Set(['paid','processing','shipped','completed']);
const paymentLabel:Record<string,string>={cash_on_delivery:'Utánvét',bank_transfer:'Banki átutalás',kh_card:'K&H bankkártya',stripe:'Stripe',simplepay:'SimplePay',barion:'Barion'};
const money=(value:number)=>`${new Intl.NumberFormat('hu-HU').format(Math.round(value))} Ft`;

export function AdminOrderRefundControl({
  id,orderNumber,status,paymentMethod,totalGrossHuf,
}:{
  id:string;
  orderNumber:string;
  status:string;
  paymentMethod:string|null;
  totalGrossHuf:number;
}){
  const router=useRouter();
  const[dialog,setDialog]=useState(false);
  const[reference,setReference]=useState('');
  const[note,setNote]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[isError,setIsError]=useState(false);
  const payment=paymentMethod??'';

  if(status==='refunded'){
    return <section className="card" style={{marginTop:28}}><span className="eyebrow">Pénzügy</span><h2>Teljes visszatérítés rögzítve</h2><p className="muted">A rendelés kereskedelmi állapota visszatérített. A kapcsolódó visszatérítési ügy és auditnyom a rendszerben megmarad.</p></section>;
  }
  if(!eligibleStatuses.has(status))return null;

  if(!manualPayments.has(payment)){
    return <section className="card" style={{marginTop:28}}><span className="eyebrow">Pénzügy · visszatérítés</span><h2>Szolgáltatói refund szükséges</h2><p className="muted">{paymentLabel[payment]??payment||'Online fizetés'} esetén az admin nem írhatja át kézzel a rendelést visszatérítettre. A pénzvisszatérítés csak az ellenőrzött fizetési szolgáltatói folyamat után rögzíthető; ez a felület nem indít K&H vagy más kártyás tranzakciót.</p></section>;
  }

  async function refund(){
    if(busy)return;
    setBusy(true);setMessage('');setIsError(false);
    try{
      const response=await fetch(`/api/admin/orders/${id}/refund`,{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({refundReference:reference,adminNote:note}),
      });
      const body=await response.json().catch(()=>({}))as{error?:string;refundAmount?:number};
      if(!response.ok){
        setIsError(true);
        setMessage(body.error??'A teljes visszatérítés rögzítése nem sikerült.');
        return;
      }
      setDialog(false);
      setMessage(`Teljes visszatérítés rögzítve: ${money(Number(body.refundAmount??totalGrossHuf))}.`);
      router.refresh();
    }catch{
      setIsError(true);
      setMessage('Hálózati hiba. A visszatérítést nem tekintjük rögzítettnek.');
    }finally{
      setBusy(false);
    }
  }

  return <section className="card" style={{marginTop:28}}>
    <span className="eyebrow">Pénzügy · visszatérítés</span>
    <h2>Adminisztrátori teljes visszatérítés</h2>
    <p className="muted">{paymentLabel[payment]??payment} rendelés. Itt a teljes <strong>{money(totalGrossHuf)}</strong> visszatérítés ténye rögzíthető közvetlenül az adminból; ehhez nem kell az ügyfélnek külön visszáru kérelmet indítania.</p>
    {payment==='cash_on_delivery'&&<p className="warningNotice"><strong>Utánvétes rendelés:</strong> ez a művelet nem indít bankkártyás vagy K&H tranzakciót. A Shoperation a manuálisan rendezett pénzügyi visszatérítést rögzíti és a rendelést visszatérített állapotba teszi.</p>}
    <button className="btn btnGhost" type="button" disabled={busy} onClick={()=>{setDialog(true);setMessage('');setIsError(false)}}>Teljes visszatérítés rögzítése</button>
    {message&&<p className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</p>}
    {dialog&&<div className="adminModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setDialog(false)}}>
      <section className="adminModal" role="dialog" aria-modal="true" aria-labelledby={`refund-${id}`}>
        <span className="eyebrow">Teljes visszatérítés</span>
        <h3 id={`refund-${id}`}>{orderNumber}</h3>
        <p>A teljes rendelési összeg, <strong>{money(totalGrossHuf)}</strong>, visszatérítettként kerül rögzítésre. A rendelés állapota <strong>Visszatérítve</strong> lesz.</p>
        <label className="adminModalField">Pénzügyi hivatkozás <span className="muted">(opcionális)</span><input value={reference} onChange={e=>setReference(e.target.value)} maxLength={200} disabled={busy} placeholder="Pl. banki vagy belső bizonylatszám"/></label>
        <label className="adminModalField">Admin megjegyzés <span className="muted">(opcionális)</span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} rows={4} disabled={busy} placeholder="A visszatérítés oka vagy belső megjegyzés"/></label>
        <p className="muted">A pénzügyi refund nem jelent automatikus fizikai visszáru-készletezést; a készletkezelés a teljesítési állapot szabályai szerint külön történik.</p>
        <div className="adminModalActions"><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>setDialog(false)}>Mégse</button><button className="btn btnPrimary" type="button" disabled={busy} onClick={refund}>{busy?'Rögzítés…':`Teljes ${money(totalGrossHuf)} visszatérítés`}</button></div>
      </section>
    </div>}
  </section>;
}
