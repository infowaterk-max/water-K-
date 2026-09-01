'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode='login'|'activate';

export function PlatformAuthForm(){
  const router=useRouter();
  const [mode,setMode]=useState<Mode>('login');
  const [email,setEmail]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(formData:FormData){
    const normalizedEmail=email.trim().toLowerCase();
    const password=String(formData.get('password')??'');
    const supabase=createClient();
    setBusy(true); setMessage('');

    if(mode==='login'){
      const result=await supabase.auth.signInWithPassword({email:normalizedEmail,password});
      setBusy(false);
      if(result.error){setMessage('A belépés nem sikerült. Ellenőrizd az e-mail címet és a jelszót.');return;}
      router.push('/admin/iranyitokozpont');
      router.refresh();
      return;
    }

    const fullName=String(formData.get('fullName')??'').trim();
    const eligibility=await fetch('/api/platform/activation',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({email:normalizedEmail}),
    }).then(async response=>({ok:response.ok,data:await response.json().catch(()=>({eligible:false}))})).catch(()=>({ok:false,data:{eligible:false}}));

    if(!eligibility.ok || eligibility.data?.eligible!==true){
      setBusy(false);
      setMessage('Ehhez az e-mail címhez nincs aktív Shoperation platformtulajdonosi meghívás.');
      return;
    }

    const result=await supabase.auth.signUp({
      email:normalizedEmail,
      password,
      options:{
        emailRedirectTo:`${window.location.origin}/platform`,
        data:{full_name:fullName,platform_activation:true},
      },
    });
    setBusy(false);
    if(result.error){setMessage(result.error.message);return;}
    if(result.data.session){
      router.push('/admin/iranyitokozpont');
      router.refresh();
      return;
    }
    setMessage('A tulajdonosi fiók létrejött. Nyisd meg a Supabase megerősítő e-mailt, majd jelentkezz be itt.');
    setMode('login');
  }

  async function resetPassword(){
    const normalizedEmail=email.trim().toLowerCase();
    if(!normalizedEmail){setMessage('Add meg az e-mail címedet.');return;}
    setBusy(true);
    const supabase=createClient();
    const {error}=await supabase.auth.resetPasswordForEmail(normalizedEmail,{redirectTo:`${window.location.origin}/platform`});
    setBusy(false);
    setMessage(error?'A jelszó-visszaállítás nem sikerült.':'Jelszó-visszaállító e-mail elküldve.');
  }

  return <div className="card authCard">
    <div className="authTabs">
      <button type="button" onClick={()=>{setMode('login');setMessage('')}}>Platform belépés</button>
      <button type="button" onClick={()=>{setMode('activate');setMessage('')}}>Első aktiválás</button>
    </div>
    <form action={submit} className="checkoutForm">
      {mode==='activate'&&<label>Teljes név<input name="fullName" required minLength={2} autoComplete="name"/></label>}
      <label>E-mail<input name="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
      <label>Jelszó<input name="password" type="password" minLength={8} required autoComplete={mode==='login'?'current-password':'new-password'}/></label>
      {mode==='activate'&&<p className="notice">Az első aktiválás csak előre engedélyezett Shoperation platformtulajdonosi e-mail címmel használható.</p>}
      <button className="button" type="submit" disabled={busy}>{busy?'Feldolgozás…':mode==='login'?'Belépés a Shoperationbe':'Tulajdonosi fiók aktiválása'}</button>
      {mode==='login'&&<button className="btn btnGhost" type="button" disabled={busy} onClick={resetPassword}>Elfelejtett jelszó</button>}
      {message&&<p className="notice">{message}</p>}
    </form>
  </div>;
}
