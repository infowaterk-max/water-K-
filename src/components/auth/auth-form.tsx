'use client';

import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode='login'|'register';
type AccountType='customer'|'company'|'reseller';
type AuthFlow='invite'|'recovery';
type FlowStatus='idle'|'checking'|'ready'|'invalid';

export function AuthForm({instanceId}:{instanceId:string|null}){
  const router=useRouter();
  const [mode,setMode]=useState<Mode>('login');
  const [accountType,setAccountType]=useState<AccountType>('customer');
  const [email,setEmail]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [authFlow,setAuthFlow]=useState<AuthFlow|null>(null);
  const [flowStatus,setFlowStatus]=useState<FlowStatus>('idle');

  useEffect(()=>{
    const search=new URLSearchParams(window.location.search);
    const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const queryFlow=search.get('auth_flow');
    const hashFlow=hash.get('type');
    const requestedFlow:AuthFlow|null=queryFlow==='invite'||queryFlow==='recovery'
      ?queryFlow
      :hashFlow==='invite'||hashFlow==='recovery'
        ?hashFlow
        :null;
    const errorCode=hash.get('error_code')??search.get('error_code');
    if(errorCode){
      setMessage(errorCode==='otp_expired'?'A belépési vagy jelszóbeállító link lejárt. Kérj új linket az „Elfelejtett jelszó” gombbal.':'A belépési link nem használható. Kérj új jelszóbeállító linket.');
      return;
    }
    if(!requestedFlow)return;
    setAuthFlow(requestedFlow);
    setFlowStatus('checking');
    const supabase=createClient();
    let active=true;
    const{data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      if(!active)return;
      if(event==='PASSWORD_RECOVERY')setAuthFlow('recovery');
      if(session)setFlowStatus('ready');
    });
    void supabase.auth.getSession().then(({data,error})=>{
      if(!active)return;
      setFlowStatus(!error&&data.session?'ready':'invalid');
    });
    return()=>{active=false;subscription.unsubscribe()};
  },[]);

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
    const redirectTo=`${window.location.origin}/fiokom?auth_flow=recovery`;
    const {error}=await supabase.auth.resetPasswordForEmail(normalizedEmail,{redirectTo});
    setBusy(false);setMessage(error?error.message:'Jelszó-visszaállító e-mail elküldve.');
  }

  async function setFlowPassword(formData:FormData){
    const password=String(formData.get('newPassword')??'');
    const confirmation=String(formData.get('confirmPassword')??'');
    if(password.length<8){setMessage('A jelszó legalább 8 karakter legyen.');return;}
    if(password!==confirmation){setMessage('A két jelszó nem egyezik.');return;}
    setBusy(true);setMessage('');
    const supabase=createClient();
    const{error}=await supabase.auth.updateUser({password});
    setBusy(false);
    if(error){setMessage(error.message);return;}
    const requestedNext=new URLSearchParams(window.location.search).get('next');
    const target=requestedNext?.startsWith('/admin')&&!requestedNext.startsWith('//')?requestedNext:'/fiokom';
    window.history.replaceState(null,'','/fiokom');
    setMessage('A jelszó beállítva.');
    router.replace(target);
    router.refresh();
  }

  if(authFlow){
    return <div className="card authCard">
      <h2>{authFlow==='invite'?'Meghívás befejezése':'Új jelszó beállítása'}</h2>
      {flowStatus==='checking'&&<p className="notice">A biztonságos belépési link ellenőrzése…</p>}
      {flowStatus==='invalid'&&<><p className="errorNotice" role="alert">A link nem érvényes vagy lejárt. Kérj új jelszóbeállító e-mailt a bejelentkezési oldalon.</p><button className="btn btnGhost" type="button" onClick={()=>{window.history.replaceState(null,'','/fiokom');setAuthFlow(null);setFlowStatus('idle')}}>Vissza a bejelentkezéshez</button></>}
      {flowStatus==='ready'&&<form action={setFlowPassword} className="checkoutForm">
        <p className="muted">Állíts be legalább 8 karakteres jelszót. Ezzel később normál módon is be tudsz jelentkezni.</p>
        <label>Új jelszó<input name="newPassword" type="password" minLength={8} required autoComplete="new-password"/></label>
        <label>Új jelszó még egyszer<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password"/></label>
        <button className="button" type="submit" disabled={busy}>{busy?'Mentés…':'Jelszó beállítása'}</button>
      </form>}
      {message&&<p className="notice">{message}</p>}
    </div>;
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
