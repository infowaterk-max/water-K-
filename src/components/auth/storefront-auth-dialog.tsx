'use client';

import type{CSSProperties}from'react';
import{useEffect,useRef,useState}from'react';
import{useRouter}from'next/navigation';
import{createClient}from'@/lib/supabase/browser';
import{AuthForm,type AuthMode}from'@/components/auth/auth-form';
import styles from'./storefront-auth-dialog.module.css';

export function StorefrontAuthDialog({open,onClose,instanceId=null,initialMode='login',onAuthenticated,returnTo,title='Belépés vagy regisztráció'}:{open:boolean;onClose:()=>void;instanceId?:string|null;initialMode?:AuthMode;onAuthenticated?:()=>void;returnTo?:string|null;title?:string}){
 const dialogRef=useRef<HTMLDialogElement|null>(null);
 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close()},[open]);
 return <dialog ref={dialogRef} className={styles.dialog} aria-label={title} onCancel={event=>{event.preventDefault();onClose()}} onClose={onClose}>
  <div className={styles.panel} data-storefront-auth-dialog="true">
   <div className={styles.head}><div><span className={styles.kicker}>Vásárlói fiók</span><h2>{title}</h2></div><button type="button" className={styles.close} aria-label="Bezárás" onClick={onClose}>×</button></div>
   <AuthForm instanceId={instanceId} initialMode={initialMode} returnTo={returnTo} onAuthenticated={()=>{onAuthenticated?.();onClose()}}/>
  </div>
 </dialog>;
}

export function StorefrontAccountAuthTrigger({label,symbol,count,showLabel=false,style}:{label:string;symbol:string;count?:string;showLabel?:boolean;style?:CSSProperties}){
 const router=useRouter();
 const[open,setOpen]=useState(false);
 async function activate(){
  const{data:{user}}=await createClient().auth.getUser();
  if(user){router.push('/fiokom');return}
  setOpen(true);
 }
 return <>
  <button type="button" aria-label={label} title={label} style={style} onClick={activate}>
   <span aria-hidden="true">{symbol}</span>{showLabel?<span style={{whiteSpace:'nowrap'}}>{label}</span>:null}{count?<small className={styles.count}>{count}</small>:null}
  </button>
  <StorefrontAuthDialog open={open} onClose={()=>setOpen(false)} returnTo="/fiokom" title="Belépés a fiókodba"/>
 </>;
}
