'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';

type Feedback={text:string;tone:'success'|'warning'|'error'}|null;

export function GrowthRefreshButton(){
  const[busy,setBusy]=useState(false),[feedback,setFeedback]=useState<Feedback>(null);
  const router=useRouter();

  async function run(){
    setBusy(true);setFeedback(null);
    try{
      const r=await fetch('/api/admin/growth/run',{method:'POST'});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'A frissítés nem sikerült.');
      const queued=Number(j.dispatched?.queued??0),blocked=Number(j.dispatched?.blocked??0);
      if(j.partial===true||blocked>0){
        setFeedback({
          tone:'warning',
          text:`Részleges frissítés: ${queued} lépés sorba állítva, ${blocked} blokkolva. A blokkolt tételek ellenőrzést igényelnek.`
        });
      }else{
        setFeedback({tone:'success',text:`A növekedési folyamatok frissültek. ${queued} esedékes lépés sorba állítva.`});
      }
      router.refresh();
    }catch(e){
      setFeedback({tone:'error',text:e instanceof Error?e.message:'A frissítés nem sikerült.'});
    }finally{setBusy(false)}
  }

  const className=feedback?.tone==='error'?'errorNotice':feedback?.tone==='warning'?'warningNotice':'muted';
  return <div>
    <button className="button" type="button" onClick={run} disabled={busy}>{busy?'Frissítés…':'Növekedési folyamatok frissítése'}</button>
    {feedback&&<p className={className} role={feedback.tone==='error'?'alert':'status'}>{feedback.text}</p>}
  </div>;
}
