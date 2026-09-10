'use client';

import{createContext,useContext,useEffect,useMemo,useState,type ReactNode}from'react';

type PresenceMap=Record<string,string>;
type PresenceResponse={presence?:Array<{userId:string;lastSeenAt:string}>};
type PresenceStatus='online'|'offline'|'unknown';
const PresenceContext=createContext<PresenceMap>({});

export function TeamChatPresenceProvider({children}:{children:ReactNode}){
  const[presence,setPresence]=useState<PresenceMap>({});
  useEffect(()=>{
    let cancelled=false;
    async function sync(){
      try{
        await fetch('/api/admin/office/chat/presence',{method:'POST',cache:'no-store'});
        const response=await fetch('/api/admin/office/chat/presence',{cache:'no-store'});
        if(!response.ok)return;
        const payload=(await response.json())as PresenceResponse;
        if(cancelled)return;
        const next:PresenceMap={};
        for(const row of payload.presence??[])next[row.userId]=row.lastSeenAt;
        setPresence(next);
      }catch{}
    }
    void sync();
    const timer=window.setInterval(()=>void sync(),45000);
    const onVisibility=()=>{if(document.visibilityState==='visible')void sync()};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);
  return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>;
}

export function TeamChatPresenceIndicator({userId,showLabel=true}:{userId:string;showLabel?:boolean}){
  const presence=useContext(PresenceContext);
  const status=useMemo<PresenceStatus>(()=>{
    const value=presence[userId];
    if(!value)return Object.keys(presence).length?'offline':'unknown';
    const age=Date.now()-Date.parse(value);
    return Number.isFinite(age)&&age<=105000?'online':'offline';
  },[presence,userId]);
  return <span className="teamChatPresence" data-status={status} title={status==='online'?'Online':status==='offline'?'Offline':'Állapot ellenőrzése'}><i aria-hidden="true"/>{showLabel&&<span>{status==='online'?'Online':status==='offline'?'Offline':'…'}</span>}</span>;
}
