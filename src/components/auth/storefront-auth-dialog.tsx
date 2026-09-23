'use client';

import type{CSSProperties,ReactNode}from'react';
import{useEffect,useId,useRef,useState}from'react';
import{createClient}from'@/lib/supabase/browser';
import{AuthForm,type AuthMode}from'@/components/auth/auth-form';
import styles from'./storefront-auth-dialog.module.css';

export function StorefrontAuthDialog({open,onClose,instanceId=null,initialMode='login',onAuthenticated,returnTo,title='Belépés vagy regisztráció'}:{open:boolean;onClose:()=>void;instanceId?:string|null;initialMode?:AuthMode;onAuthenticated?:()=>void;returnTo?:string|null;title?:string}){
 const dialogRef=useRef<HTMLDialogElement|null>(null),closeRef=useRef<HTMLButtonElement|null>(null),restoreFocusRef=useRef<HTMLElement|null>(null),titleId=useId();
 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(open&&!dialog.open){restoreFocusRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;dialog.showModal();queueMicrotask(()=>closeRef.current?.focus())}if(!open&&dialog.open)dialog.close()},[open]);
 function handleClose(){const restore=restoreFocusRef.current;restoreFocusRef.current=null;onClose();if(restore?.isConnected)queueMicrotask(()=>restore.focus())}
 return <dialog ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose()}} onClose={handleClose}>
  <div className={styles.panel} data-storefront-auth-dialog="true" data-template-aware-auth="true">
   <div className={styles.head}><div><span className={styles.kicker}>Vásárlói fiók</span><h2 id={titleId}>{title}</h2></div><button ref={closeRef} type="button" className={styles.close} aria-label="Bezárás" onClick={onClose}>×</button></div>
   <AuthForm instanceId={instanceId} initialMode={initialMode} returnTo={returnTo} onAuthenticated={()=>{onAuthenticated?.();onClose()}}/>
  </div>
 </dialog>;
}

export function StorefrontAccountAuthTrigger({label,symbol,count,showLabel=false,style}:{label:string;symbol:ReactNode;count?:string;showLabel?:boolean;style?:CSSProperties}){
 const[open,setOpen]=useState(false);
 async function activate(){
  const representativePreview=window.location.pathname==='/storefront-template-preview'||window.location.pathname==='/visual-fidelity-qa';
  if(representativePreview){setOpen(true);return}
  const{data:{user}}=await createClient().auth.getUser();
  if(user){window.location.assign('/fiokom');return}
  setOpen(true);
 }
 return <>
  <button type="button" data-storefront-account-auth-trigger="true" aria-label={label} title={label} style={style} onClick={activate}>
   <span aria-hidden="true" style={{display:'grid',placeItems:'center'}}>{symbol}</span>{showLabel?<span data-storefront-utility-label="true" style={{whiteSpace:'nowrap'}}>{label}</span>:null}{count?<small className={styles.count}>{count}</small>:null}
  </button>
  <StorefrontAuthDialog open={open} onClose={()=>setOpen(false)} returnTo="/fiokom" title="Belépés a fiókodba"/>
 </>;
}
