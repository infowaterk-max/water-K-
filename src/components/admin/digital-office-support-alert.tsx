'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';

type LatestTicket={id:string;ticket_number:string;subject:string;priority:string;created_at:string};
type Payload={available:boolean;count:number|null;latest:LatestTicket|null};

export function DigitalOfficeSupportAlert({enabled}:{enabled:boolean}){
  const pathname=usePathname();
  const[status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const[payload,setPayload]=useState<Payload|null>(null);
  const onHome=pathname==='/admin/kommunikacio';

  useEffect(()=>{
    if(!enabled||!onHome){setStatus('idle');setPayload(null);return}
    let active=true;
    const load=async()=>{
      setStatus(previous=>previous==='ready'?'ready':'loading');
      try{
        const response=await fetch('/api/admin/office/support-attention',{cache:'no-store'});
        const body=(await response.json().catch(()=>null))as Payload|null;
        if(!active)return;
        if(!response.ok||!body?.available){setStatus('error');setPayload(null);return}
        setPayload(body);setStatus('ready');
      }catch{if(active){setStatus('error');setPayload(null)}}
    };
    void load();
    const timer=window.setInterval(()=>void load(),60000);
    return()=>{active=false;window.clearInterval(timer)};
  },[enabled,onHome]);

  if(!enabled||!onHome||status==='idle'||status==='loading')return null;
  if(status==='error')return <div className="digitalOfficeSupportAlert isUnavailable" role="status">
    <span className="digitalOfficeSupportAlertIcon" aria-hidden="true">!</span>
    <span><strong>Az ügyfélszolgálati ticketek állapota most nem ellenőrizhető.</strong><small>Nem tekintjük ezt nulla beérkező ügynek. Nyisd meg az Ügyfélszolgálatot az ellenőrzéshez.</small></span>
    <Link href="/admin/kommunikacio/ugyfelszolgalat">Ügyfélszolgálat →</Link>
  </div>;
  if(!payload?.count)return null;

  const latest=payload.latest;
  const urgent=latest?.priority==='urgent';
  return <div className={`digitalOfficeSupportAlert${urgent?' isUrgent':''}`} role="status" aria-live="polite">
    <span className="digitalOfficeSupportAlertIcon" aria-hidden="true">!</span>
    <span>
      <strong>{payload.count===1?'Új ügyfélszolgálati ticket érkezett':`${payload.count} új ügyfélszolgálati ticket vár feldolgozásra`}</strong>
      <small>{latest?`${latest.ticket_number} · ${latest.subject}${urgent?' · sürgős':''}`:'Nyitott ügyfélszolgálati ügy vár feldolgozásra.'}</small>
    </span>
    <Link href={latest?`/admin/kommunikacio/ugyfelszolgalat/${latest.id}`:'/admin/kommunikacio/ugyfelszolgalat'}>Megnyitás →</Link>
  </div>;
}
