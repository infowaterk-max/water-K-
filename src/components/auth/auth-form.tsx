'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode='login'|'register';
type AccountType='customer'|'company'|'reseller';

export function AuthForm(){
  const router=useRouter();
  const [mode,setMode]=useState<Mode>('login');
  const [accountType,setAccountType]=useState<AccountType>('customer');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function submit(formData:FormData){
    const supabase=createClient();
    const email=String(formData.get('email')??'').trim();
    const password=String(formData.get('password')??'');
    setBusy(true); setMessage('');
    if(mode==='login'){
      const result=await supabase.auth.signInWithPassword({email,password});
      setBusy(false);
      if(result.error){setMessage(result.error.message);return;}
      setMessage('Sikeres bejelentkezés.'); router.refresh(); return;
    }
    const fullName=String(formData.get('fullName')??'').trim();
    const companyName=String(formData.get('companyName')??'').trim();
    const taxNumber=String(formData.get('taxNumber')??'').trim();
    const result=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName,company_name:companyName,tax_number:taxNumber,account_type:accountType}}});
    setBusy(false);
    if(result.error){setMessage(result.error.message);return;}
    setMessage(accountType==='reseller'?'Regisztráció elküldve. A viszonteladói hozzáférés admin jóváhagyás után aktiválódik.':'Regisztráció elküldve. Ellenőrizd az e-mail-fiókodat.');
  }

  async function resetPassword(formData:FormData){
    const email=String(formData.get('email')??'').trim();
    if(!email){setMessage('Add meg az e-mail címedet.');return;}
    const supabase=createClient();
    const redirectTo=`${window.location.origin}/fiokom`;
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
    setMessage(error?error.message:'Jelszó-visszaállító e-mail elküldve.');
  }

  const companyFields=mode==='register'&&accountType!=='customer';
  return <div className="card authCard">
    <div className="authTabs"><button type="button" onClick={()=>{setMode('login');setMessage('')}}>Bejelentkezés</button><button type="button" onClick={()=>{setMode('register');setMessage('')}}>Regisztráció</button></div>
    <form action={submit} className="checkoutForm">
      {mode==='register'&&<><label>Fióktípus<select value={accountType} onChange={e=>setAccountType(e.target.value as AccountType)} name="accountType"><option value="customer">Lakossági vásárló</option><option value="company">Céges vásárló</option><option value="reseller">Viszonteladói partner</option></select></label><label>Név / kapcsolattartó<input name="fullName" required minLength={2}/></label></>}
      <label>E-mail<input name="email" type="email" required/></label>
      <label>Jelszó<input name="password" type="password" minLength={8} required/></label>
      {companyFields&&<><label>Cégnév<input name="companyName" required/></label><label>Adószám<input name="taxNumber" required minLength={5}/></label></>}
      {mode==='register'&&accountType==='reseller'&&<p className="notice">A viszonteladói fiók regisztrálható azonnal, de a partnerárak és a 25 kg-os kiszerelés csak admin jóváhagyás után érhetők el.</p>}
      <button className="button" type="submit" disabled={busy}>{busy?'Feldolgozás…':mode==='login'?'Belépés':'Fiók létrehozása'}</button>
      {mode==='login'&&<button className="btn btnGhost" type="submit" formAction={resetPassword}>Elfelejtett jelszó</button>}
      {message&&<p className="notice">{message}</p>}
    </form>
  </div>;
}
