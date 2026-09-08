'use client';

import{useCallback,useEffect,useRef,useState}from'react';
import type{OfficeComposerActionState}from'@/app/admin/kommunikacio/iroda/composer-actions';

export type OfficeDraftAutosaveStatus='idle'|'dirty'|'saving'|'saved'|'conflict'|'error';

type SaveAction<T>=(input:{snapshot:T;draftId:string;revision:number|null})=>Promise<OfficeComposerActionState>;

type UseOfficeDraftAutosaveInput<T>={
  snapshot:T;
  snapshotKey:string;
  meaningful:boolean;
  initialDraftId?:string;
  initialRevision?:number|null;
  autosave:SaveAction<T>;
  manualSave:SaveAction<T>;
  delayMs?:number;
};

export function useOfficeDraftAutosave<T>({
  snapshot,snapshotKey,meaningful,initialDraftId='',initialRevision=null,autosave,manualSave,delayMs=1400,
}:UseOfficeDraftAutosaveInput<T>){
  const[draftId,setDraftId]=useState(initialDraftId);
  const[revision,setRevision]=useState<number|null>(initialRevision);
  const[status,setStatus]=useState<OfficeDraftAutosaveStatus>(initialDraftId?'saved':'idle');
  const[message,setMessage]=useState(initialDraftId?'Mentve.':'');

  const draftIdRef=useRef(initialDraftId);
  const revisionRef=useRef<number|null>(initialRevision);
  const latestSnapshotRef=useRef(snapshot);
  const latestKeyRef=useRef(snapshotKey);
  const savedKeyRef=useRef(initialDraftId?snapshotKey:'');
  const meaningfulRef=useRef(meaningful);
  const inFlightRef=useRef<Promise<OfficeComposerActionState>|null>(null);
  const queuedRef=useRef(false);
  const haltedRef=useRef(false);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const autosaveRef=useRef(autosave);
  const manualSaveRef=useRef(manualSave);

  autosaveRef.current=autosave;
  manualSaveRef.current=manualSave;
  latestSnapshotRef.current=snapshot;
  latestKeyRef.current=snapshotKey;
  meaningfulRef.current=meaningful;

  const clearTimer=useCallback(()=>{
    if(timerRef.current){clearTimeout(timerRef.current);timerRef.current=null;}
  },[]);

  const adoptResult=useCallback((result:OfficeComposerActionState,key:string)=>{
    if(result.status==='success'&&result.draftId&&Number.isSafeInteger(result.revision)&&Number(result.revision)>0){
      draftIdRef.current=result.draftId;
      revisionRef.current=Number(result.revision);
      setDraftId(result.draftId);
      setRevision(Number(result.revision));
      savedKeyRef.current=key;
      setStatus('saved');
      setMessage(result.message||'Mentve.');
      return true;
    }
    if(result.status==='conflict'){
      haltedRef.current=true;
      queuedRef.current=false;
      setStatus('conflict');
      setMessage(result.message);
      return false;
    }
    setStatus('error');
    setMessage(result.message||'A piszkozat nem menthető.');
    return false;
  },[]);

  const runSave=useCallback(async(mode:'autosave'|'manual'):Promise<OfficeComposerActionState|null>=>{
    clearTimer();
    if(haltedRef.current)return null;

    if(inFlightRef.current){
      queuedRef.current=true;
      await inFlightRef.current;
      if(haltedRef.current)return null;
      if(mode==='autosave'&&latestKeyRef.current===savedKeyRef.current)return null;
      return runSave(mode);
    }

    if(mode==='autosave'&&latestKeyRef.current===savedKeyRef.current)return null;
    if(!draftIdRef.current&&!meaningfulRef.current)return null;

    const key=latestKeyRef.current;
    const input={snapshot:latestSnapshotRef.current,draftId:draftIdRef.current,revision:revisionRef.current};
    setStatus('saving');
    setMessage(mode==='autosave'?'Automatikus mentés…':'Mentés…');

    const action=mode==='autosave'?autosaveRef.current:manualSaveRef.current;
    const promise=action(input);
    inFlightRef.current=promise;
    let result:OfficeComposerActionState;
    try{
      result=await promise;
      adoptResult(result,key);
    }finally{
      inFlightRef.current=null;
    }

    const followUp=queuedRef.current||latestKeyRef.current!==savedKeyRef.current;
    queuedRef.current=false;
    if(followUp&&!haltedRef.current&&latestKeyRef.current!==savedKeyRef.current){
      await runSave('autosave');
    }
    return result;
  },[adoptResult,clearTimer]);

  useEffect(()=>{
    clearTimer();
    if(haltedRef.current)return;
    if(snapshotKey===savedKeyRef.current){
      setStatus(draftIdRef.current?'saved':'idle');
      return;
    }
    if(!draftIdRef.current&&!meaningful){
      setStatus('idle');setMessage('');return;
    }
    setStatus('dirty');
    setMessage('Nincs mentve.');
    timerRef.current=setTimeout(()=>{void runSave('autosave');},delayMs);
    return clearTimer;
  },[snapshotKey,meaningful,delayMs,clearTimer,runSave]);

  useEffect(()=>()=>clearTimer(),[clearTimer]);

  const saveNow=useCallback(()=>runSave('manual'),[runSave]);

  const reset=useCallback((next?:{draftId?:string;revision?:number|null;snapshotKey?:string})=>{
    clearTimer();
    queuedRef.current=false;
    haltedRef.current=false;
    const nextId=next?.draftId??'';
    const nextRevision=next?.revision??null;
    const nextKey=next?.snapshotKey??'';
    draftIdRef.current=nextId;
    revisionRef.current=nextRevision;
    savedKeyRef.current=nextKey;
    setDraftId(nextId);
    setRevision(nextRevision);
    setStatus(nextId?'saved':'idle');
    setMessage(nextId?'Mentve.':'');
  },[clearTimer]);

  return{draftId,revision,status,message,saveNow,reset};
}
