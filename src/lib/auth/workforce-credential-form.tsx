'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/browser';
import {normalizeWorkforceReturnTarget,workforceLoginHref} from '@/lib/auth/workforce-return-target';

type Flow='invite'|'recovery';
type Status='checking'|'ready'|'invalid';

export function WorkforceCredentialForm({flow,returnTo}:{flow:Flow;returnTo:string}){
  const[status,setStatus]=useState<Status>('checking');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('A biztonságos workforce link ellenőrzése…');

  useEffect(()=>{
    const search=new URLSearchParams(window.location.search);
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const errorCode=hash.get('error_code')??search.get('error_code');
    const hashType=hash.get('type');
    const hasLinkEvidence=hashType===flow||Boolean(search.get('code'))||Boolean(search.get('token_hash'))||Boolean(hash.get('access_token')&&hash.get('refresh_token'));
    if(errorCode){
      setStatus('invalid');
      setMessage(errorCode==='otp_expired'?'A workforce link lejárt. Kérj új meghívót vagy jelszó-visszaállító linket.':'A workforce link nem használható.');
      return;
    }
    if(!hasLinkEvidence){
      setStatus('invalid');
      setMessage('A workforce credential mód csak meghívó vagy jelszó-visszaállító linkből nyitható meg.');
      return;
    }
    const supabase=createClient();
    let active=true;
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!active)return;
      if(event==='PASSWORD_RECOVERY'||session){
        setStatus('ready');
        setMessage('');
      }
    });
    void supabase.auth.getSession().then(({data,error})=>{
      if(!active)return;
      if(!error&&data.session){setStatus('ready');setMessage('');}
      else{setStatus('invalid');setMessage('A workforce link nem érvényes vagy lejárt.');}
    });
    return()=>{active=false;subscription.unsubscribe()};
  },[]);

  async function setPassword(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const password=String(data.get('newPassword')??'');
    const confirmation=String(data.get('confirmPassword')??'');
    if(password.length<8){setMessage('A jelszó legalább 8 karakter legyen.');return;}
    if(password!==confirmation){setMessage('A két jelszó nem egyezik.');return;}
    setBusy(true);setMessage('');
    try{
      const supabase=createClient();
      const{error}=await supabase.auth.updateUser({password});
      if(error){setMessage(error.message);return;}
      const target=normalizeWorkforceReturnTarget(returnTo)??'/admin';
      window.location.replace(workforceLoginHref(target));
    }catch{
      setMessage('A jelszó beállítása most nem sikerült.');
    }finally{
      setBusy(false);
    }
  }

  if(status==='invalid')return <section className="card authCard" data-workforce-credential="invalid">
    <div className="errorNotice" role="alert"><strong>A workforce hitelesítési link nem használható.</strong><p>{message}</p></div>
    <a className="btn btnGhost" href={workforceLoginHref(returnTo)}>Vissza a staff/admin belépéshez</a>
  </section>;

  return <section className="card authCard" data-workforce-credential={flow}>
    {status==='checking'?<p className="notice">{message}</p>:<form onSubmit={setPassword} className="checkoutForm">
      <p className="muted">{flow==='invite'?'Állíts be jelszót a meghívott workforce fiókhoz.':'Állíts be új workforce jelszót.'} A mentés után a canonical staff/admin belépés folytatja a szerepkör- és MFA-ellenőrzést.</p>
      <label>Új jelszó<input name="newPassword" type="password" minLength={8} required autoComplete="new-password"/></label>
      <label>Új jelszó még egyszer<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password"/></label>
      <button className="button" type="submit" disabled={busy}>{busy?'Mentés…':'Jelszó beállítása'}</button>
      {message&&<p className="notice">{message}</p>}
    </form>}
  </section>;
}
