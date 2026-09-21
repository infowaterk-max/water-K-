'use client';

import{useState}from'react';
import{StorefrontAuthDialog}from'@/components/auth/storefront-auth-dialog';
import type{AuthMode}from'@/components/auth/auth-form';

export function PostPurchaseAccountOpportunity({instanceId,confirmationToken,orderNumber,initiallySignedIn}:{instanceId:string;confirmationToken:string;orderNumber:string;initiallySignedIn:boolean}){
 const[authOpen,setAuthOpen]=useState(false),[authMode,setAuthMode]=useState<AuthMode>('register'),[signedIn,setSignedIn]=useState(initiallySignedIn),[state,setState]=useState<'idle'|'claiming'|'claimed'|'error'>('idle'),[message,setMessage]=useState('');
 async function claim(){
  setState('claiming');setMessage('');
  try{
   const response=await fetch('/api/orders/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirmationToken})});
   const payload=await response.json() as{ok?:boolean;error?:string};
   if(!response.ok||payload.ok!==true){setState('error');setMessage(payload.error??'A rendelés kapcsolása nem sikerült.');return}
   setState('claimed');setMessage('A rendelést biztonságosan hozzákapcsoltuk a fiókodhoz.');
  }catch{setState('error');setMessage('A rendelés kapcsolása átmenetileg nem sikerült.')}
 }
 if(state==='claimed')return <section className="card confirmationNextStep" data-post-purchase-account-opportunity="claimed"><span className="badge">Fiókhoz kapcsolva</span><h2>Ez a rendelés már a fiókodban van.</h2><p className="muted">{orderNumber} és a következő rendeléseid egy helyen követhetők.</p></section>;
 return <><section className="card confirmationNextStep" data-post-purchase-account-opportunity="true"><span className="badge">Opcionális fiók</span><h2>Szeretnéd ezt és a következő rendeléseidet egy helyen látni?</h2><p className="muted">A rendelés vendégként is érvényes. A fiókhoz kapcsolás csak hitelesített bejelentkezés és ennek a rendelésnek a biztonságos hivatkozása alapján történik.</p>{message?<p className={state==='error'?'errorNotice':'notice'} role={state==='error'?'alert':'status'}>{message}</p>:null}<div className="actions">{signedIn?<button className="btn btnPrimary" type="button" disabled={state==='claiming'} onClick={()=>void claim()}>{state==='claiming'?'Kapcsolás…':'Rendelés hozzákapcsolása'}</button>:<><button className="btn btnPrimary" type="button" onClick={()=>{setAuthMode('register');setAuthOpen(true)}}>Fiók létrehozása</button><button className="btn btnGhost" type="button" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Bejelentkezés</button></>}</div></section><StorefrontAuthDialog open={authOpen} onClose={()=>setAuthOpen(false)} instanceId={instanceId} returnTo={`/rendeles-sikeres?token=${encodeURIComponent(confirmationToken)}`} initialMode={authMode} title={authMode==='register'?'Fiók létrehozása ehhez a rendeléshez':'Belépés ehhez a rendeléshez'} onAuthenticated={()=>{setSignedIn(true);setAuthOpen(false);void claim()}}/></>;
}
