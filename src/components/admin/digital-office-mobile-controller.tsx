'use client';

import Link from'next/link';
import{usePathname,useSearchParams}from'next/navigation';
import{useEffect,useMemo,useState}from'react';

export function DigitalOfficeMobileController(){
  const pathname=usePathname();
  const searchParams=useSearchParams();
  const threadId=searchParams.get('thread');
  const[contextOpen,setContextOpen]=useState(false);
  const isOfficeInbox=pathname==='/admin/kommunikacio/iroda';
  const backHref=useMemo(()=>{
    const next=new URLSearchParams(searchParams.toString());
    next.delete('thread');
    const query=next.toString();
    return`/admin/kommunikacio/iroda${query?`?${query}`:''}`;
  },[searchParams]);

  useEffect(()=>{setContextOpen(false)},[threadId]);
  useEffect(()=>{
    if(!isOfficeInbox)return;
    const workspace=document.querySelector<HTMLElement>('.digitalOfficeWorkstation');
    if(!workspace)return;
    const view=threadId?(contextOpen?'context':'conversation'):'list';
    workspace.dataset.mobileView=view;
    return()=>{delete workspace.dataset.mobileView};
  },[contextOpen,isOfficeInbox,threadId]);

  if(!isOfficeInbox||!threadId)return null;
  return <div className="digitalOfficeMobileController" aria-label="Ügyféllevelezés mobil nézet">
    <Link href={backHref} className="digitalOfficeMobileBack">← Beérkezett</Link>
    <div className="digitalOfficeMobileSwitch">
      <button type="button" data-active={!contextOpen?'true':'false'} onClick={()=>setContextOpen(false)}>Beszélgetés</button>
      <button type="button" data-active={contextOpen?'true':'false'} onClick={()=>setContextOpen(true)}>Ügyfél és ügy</button>
    </div>
  </div>;
}
