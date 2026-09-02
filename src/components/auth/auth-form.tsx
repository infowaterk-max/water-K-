'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode='login'|'register';
type AccountType='customer'|'company'|'reseller';

export function AuthForm({instanceId}:{instanceId:string|null}){
  const router=useRouter();
  const [mode,setMode]=useState<Mode>('login');
  const [accountType,setAccountType]=useState<AccountType>('customer');
  const [email,setEmail]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(formData:FormData){
    const supabase=createClient();
    const normalizedEmail=email.trim();
    const password=String(formData.get('password')??'');
    setBusy(true);setMessage('');
    if(mode==='login'){
      const result=await supabase.auth.signInWithPassword({email:normalizedEmail,password});
      setBusy(false);
      if(result.error){setMessage(result.error.message);return;}
      setMessage('Sikeres bejelentkezés.');router.refresh();return;
    }
    if(!instanceId){setBusy(false);setMessage('Ehhez a regisztrációhoz nincs aktív webshop.');return;}
    const fullName=String(formData.get('fullName')??'').trim();
    const companyName=String(formData.get('companyName')??'').trim();
    const taxNumber=String(formData.get('taxNumber')??'').trim();
    const result=await supabase.auth.signUp({
      email:normalizedEmail,
      password,
      options:{data:{
        full_name:fullName,
        company_name:companyName,
        tax_number:taxNumber,
        account_type:accountType,
        requested_instance_id:instanceId,
      }},
    });
    setBusy(false);
    if(result.error){setMessage(result.error.message);return;}
    setMessage(accountType==='reseller'?'Partnerigény elküldve ehhez a webshophoz. A viszonteladói árak admin jóváhagyás után aktiválódnak.':'Regisztráció elküldve. Ellenőrizd az e-mail-fiókodat.');
  }

  async function resetPassword(){
    const normalizedEmail=email.trim();
    if(!normalizedEmail){setMessage('Add meg az e-mail címedet.');return;}
    setBusy(true);
    const supabase=createClient();
    const redirectTo=`${window.location.origin}/fiokom`;
    const {error}=await supabase.auth.resetPasswordForEmail(normalizedEmail,{redirectTo});
    setBusy(false);setMessage(error?error.message:'Jelszó-visszaállító e-mail elküldve.');
  }

  const companyFields=mode==='register'&&accountType!=='customer';
  return <div className="card authCard">
    <div className="authTabs"><button type="button" onClick={()=>{setMode('login');setMessage('')}}>Bejelentkezés</button><button type="button" onClick={()=>{setMode('register');setMessage('')}}>Regisztráció</button></div>
    <form action={submit} className="checkoutForm">
      {mode==='register'&&<><label>Fióktípus<select value={accountType} onChange={e=>setAccountType(e.target.value as AccountType)} name="accountType"><option value="customer">Lakossági vásárló</option><option value="company">Céges vásárló</option><option value="reseller">Viszonteladói partner</option></select></label><label>Név / kapcsolattartó<input name="fullName" required minLength={2}/></label></>}
      <label>E-mail<input name="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Jelszó<input name="password" type="password" minLength={8} required/></label>
      {companyFields&&<><label>Cégnév<input name="companyName" required/></label><label>Adószám<input name="taxNumber" required minLength={5}/></label></>}
      {mode==='register'&&accountType==='reseller'&&<p className="notice">A partnerigény ehhez a webshophoz kötődik. A partnerárak és a csak viszonteladóknak szánt termékek kizárólag jóváhagyás után érhetők el.</p>}
      <button className="button" type="submit" disabled={busy||(mode==='register'&&!instanceId)}>{busy?'Feldolgozás…':mode==='login'?'Belépés':'Fiók létrehozása'}</button>
      {mode==='login'&&<button className="btn btnGhost" type="button" disabled={busy} onClick={resetPassword}>Elfelejtett jelszó</button>}
      {message&&<p className="notice">{message}</p>}
    </form>
  </div>;
}
