'use client';

import {useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/browser';
import {workforceLoginHref} from '@/lib/auth/workforce-return-target';

const PLATFORM_TARGET='/admin/platform';

export function PlatformActivationForm(){
  const[email,setEmail]=useState('');
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const data=new FormData(event.currentTarget);
    const normalizedEmail=email.trim().toLowerCase();
    const password=String(data.get('password')??'');
    const fullName=String(data.get('fullName')??'').trim();
    if(!normalizedEmail||password.length<8||fullName.length<2)return;
    setBusy(true);setMessage('');
    try{
      const eligibility=await fetch('/api/platform/activation',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({email:normalizedEmail}),
      }).then(async response=>({ok:response.ok,data:await response.json().catch(()=>({eligible:false}))})).catch(()=>({ok:false,data:{eligible:false}}));
      if(!eligibility.ok||eligibility.data?.eligible!==true){
        setMessage('Ehhez az e-mail címhez nincs aktív Shoperation platformtulajdonosi meghívás.');
        return;
      }
      const supabase=createClient();
      const result=await supabase.auth.signUp({
        email:normalizedEmail,
        password,
        options:{
          emailRedirectTo:`${window.location.origin}/platform`,
          data:{full_name:fullName,platform_activation:true},
        },
      });
      if(result.error){setMessage(result.error.message);return;}
      if(result.data.session){window.location.replace(workforceLoginHref(PLATFORM_TARGET));return;}
      setMessage('A tulajdonosi fiók létrejött. Erősítsd meg az e-mail címedet, majd használd a staff/admin belépést.');
    }finally{
      setBusy(false);
    }
  }

  return <section className="card authCard" data-platform-activation="true">
    <h2>Első platformtulajdonosi aktiválás</h2>
    <p className="muted">Csak előre engedélyezett platformtulajdonosi e-mail címmel használható. Meglévő workforce fiókkal ne itt jelentkezz be.</p>
    <form onSubmit={submit} className="checkoutForm">
      <label>Teljes név<input name="fullName" required minLength={2} autoComplete="name"/></label>
      <label>E-mail<input name="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email"/></label>
      <label>Jelszó<input name="password" type="password" minLength={8} required autoComplete="new-password"/></label>
      <button className="button" type="submit" disabled={busy}>{busy?'Aktiválás…':'Tulajdonosi fiók aktiválása'}</button>
      {message&&<p className="notice">{message}</p>}
    </form>
  </section>;
}
