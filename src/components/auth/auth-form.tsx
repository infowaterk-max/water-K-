'use client';

import { useEffect,useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { normalizeStorefrontReturnTarget } from '@/lib/auth/storefront-return-target';
import { isValidHuTaxNumber,normalizeHuTaxNumber } from '@/lib/commerce/hu-tax-number';

export type AuthMode='login'|'register';
type Mode=AuthMode;
type AccountType='customer'|'company'|'reseller';
type AuthFlow='invite'|'recovery';
type FlowStatus='idle'|'checking'|'ready'|'invalid';

export function AuthForm({instanceId,initialMode='login',onAuthenticated,returnTo}:{instanceId:string|null;initialMode?:AuthMode;onAuthenticated?:()=>void;returnTo?:string|null}){
  const [mode,setMode]=useState<Mode>(initialMode);
  const [accountType,setAccountType]=useState<AccountType>('customer');
  const [email,setEmail]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [authFlow,setAuthFlow]=useState<AuthFlow|null>(null);
  const [flowStatus,setFlowStatus]=useState<FlowStatus>('idle');

  function safeRequestedNext(){return typeof window==='undefined'?null:normalizeStorefrontReturnTarget(new URLSearchParams(window.location.search).get('next'));}
  function navigateAuthenticatedTarget(target:string|null){
    if(typeof window==='undefined')return;
    if(target){window.location.replace(target);return;}
    window.location.reload();
  }
  function finishAuthenticatedIntent(){
    if(onAuthenticated){onAuthenticated();return;}
    navigateAuthenticatedTarget(normalizeStorefrontReturnTarget(returnTo)??safeRequestedNext());
  }

  useEffect(()=>{setMode(initialMode)},[initialMode]);

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
      setMessage('Sikeres bejelentkezés.');
      finishAuthenticatedIntent();return;
    }
    let registrationInstanceId=instanceId;
    if(!registrationInstanceId){
      try{const context=await fetch('/api/storefront/auth-context',{cache:'no-store'}).then(response=>response.ok?response.json():null) as {instanceId?:string|null}|null;registrationInstanceId=context?.instanceId??null}catch{registrationInstanceId=null}
    }
    if(!registrationInstanceId){setBusy(false);setMessage('Ehhez a regisztrációhoz nincs aktív webshop.');return;}
    const fullName=String(formData.get('fullName')??'').trim();
    const companyName=String(formData.get('companyName')??'').trim();
    const rawTaxNumber=String(formData.get('taxNumber')??'').trim();
    const taxNumber=accountType==='customer'?'':normalizeHuTaxNumber(rawTaxNumber);
    if(accountType!=='customer'&&!isValidHuTaxNumber(taxNumber)){setBusy(false);setMessage('Az adószám formátuma vagy ellenőrzőszáma hibás. Formátum: 12345676-1-12.');return;}
    const registrationReturn=normalizeStorefrontReturnTarget(returnTo)??safeRequestedNext();
    const result=await supabase.auth.signUp({
      email:normalizedEmail,
      password,
      options:{emailRedirectTo:registrationReturn?`${window.location.origin}${registrationReturn}`:undefined,data:{
        full_name:fullName,
        company_name:companyName,
        tax_number:taxNumber,
        account_type:accountType,
        requested_instance_id:registrationInstanceId,
      }},
    });
    setBusy(false);
    if(result.error){setMessage(result.error.message);return;}
    if(result.data.session){finishAuthenticatedIntent();return;}
    setMessage(accountType==='reseller'?'Viszonteladói regisztráció rögzítve. A partnerjogosultság csak kereskedői jóváhagyás után aktiválódhat.':'Regisztráció elküldve. Ellenőrizd az e-mail-fiókodat.');
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
    const target=safeRequestedNext()??'/fiokom';
    window.history.replaceState(null,'','/fiokom');
    setMessage('A jelszó beállítva.');
    window.location.replace(target);
  }

  if(authFlow){
    return <div className="card authCard storefrontAuthSurface" data-storefront-auth-surface="true">
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
      <style jsx>{`
        .storefrontAuthSurface{width:min(100%,34rem);max-width:34rem;margin:2rem auto;padding:clamp(1.15rem,3vw,2rem);background:linear-gradient(145deg,var(--shoporation-color-surface,#fff),var(--shoporation-color-background,#f5f5f5));color:var(--shoporation-color-text,#111827);border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:1.25rem;box-shadow:0 28px 90px rgba(0,0,0,.24)}
        .storefrontAuthSurface :global(.authTabs){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-bottom:1.25rem;padding:.3rem;background:var(--shoporation-color-background,#f5f5f5);border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.9rem}
        .storefrontAuthSurface :global(.authTabs button),.storefrontAuthSurface :global(.button),.storefrontAuthSurface :global(.btn){min-height:44px;border-radius:.7rem;font:inherit;font-weight:800}
        .storefrontAuthSurface :global(.authTabs button){min-width:0;padding:.65rem .4rem;border:1px solid var(--shoporation-color-border,#d1d5db);background:var(--shoporation-color-surface-muted,#eee);color:var(--shoporation-color-text,#111827);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:clip;font-size:clamp(.78rem,3.4vw,.95rem);line-height:1.15;letter-spacing:-.01em}
        .storefrontAuthSurface :global(.checkoutForm){display:grid;gap:1rem}
        .storefrontAuthSurface :global(label){display:grid;gap:.42rem;color:var(--shoporation-color-text,#111827);font-weight:700}
        .storefrontAuthSurface :global(input),.storefrontAuthSurface :global(select){width:100%;min-height:48px;padding:.72rem .85rem;border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.72rem;background:var(--shoporation-color-background,#fff);color:var(--shoporation-color-text,#111827);font:inherit;outline:none}
        .storefrontAuthSurface :global(input:focus),.storefrontAuthSurface :global(select:focus){border-color:var(--shoporation-color-primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--shoporation-color-primary,#2563eb) 22%,transparent)}
        .storefrontAuthSurface :global(.button){border:0;background:var(--shoporation-color-primary,#2563eb);color:var(--shoporation-color-primary-contrast,#fff);cursor:pointer;padding:.75rem 1rem}
        .storefrontAuthSurface :global(.btnGhost){border:1px solid var(--shoporation-color-border,#d1d5db);background:transparent;color:var(--shoporation-color-text,#111827);cursor:pointer}
        .storefrontAuthSurface :global(.notice){color:var(--shoporation-color-muted-text,#6b7280)}
        @media(max-width:640px){.storefrontAuthSurface{max-width:none;margin:1rem -.25rem;padding:1rem;border-radius:1rem;min-height:min(72vh,42rem)}.storefrontAuthSurface :global(.authTabs){position:sticky;top:.5rem;z-index:1}.storefrontAuthSurface :global(.authTabs button){font-size:clamp(.78rem,3.35vw,.92rem);padding-inline:.32rem}}@media(max-width:360px){.storefrontAuthSurface :global(.authTabs){gap:.3rem;padding:.22rem}.storefrontAuthSurface :global(.authTabs button){font-size:.78rem;padding-inline:.22rem;letter-spacing:-.02em}}
      `}</style>
    </div>;
  }

  const companyFields=mode==='register'&&accountType!=='customer';
  return <div className="card authCard storefrontAuthSurface" data-storefront-auth-surface="true">
    <div className="authTabs"><button type="button" onClick={()=>{setMode('login');setMessage('')}}>Bejelentkezés</button><button type="button" onClick={()=>{setMode('register');setMessage('')}}>Regisztráció</button></div>
    <form action={submit} className="checkoutForm">
      {mode==='register'&&<><label>Fióktípus<select value={accountType} onChange={e=>setAccountType(e.target.value as AccountType)} name="accountType"><option value="customer">Lakossági vásárló</option><option value="company">Céges vásárló</option><option value="reseller">Viszonteladói partner</option></select></label><label>Név / kapcsolattartó<input name="fullName" required minLength={2}/></label></>}
      <label>E-mail<input name="email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Jelszó<input name="password" type="password" minLength={8} required/></label>
      {companyFields&&<><label>Cégnév<input name="companyName" required/></label><label>Adószám<input name="taxNumber" required minLength={5}/></label></>}
      {mode==='register'&&accountType==='reseller'&&<p className="notice">A partnerigény ehhez a webshophoz kötődik. A partnerárak és a csak viszonteladóknak szánt termékek kizárólag jóváhagyás után érhetők el.</p>}
      <button className="button" type="submit" disabled={busy}>{busy?'Feldolgozás…':mode==='login'?'Belépés':'Fiók létrehozása'}</button>
      {mode==='login'&&<button className="btn btnGhost" type="button" disabled={busy} onClick={resetPassword}>Elfelejtett jelszó</button>}
      {message&&<p className="notice">{message}</p>}
    </form>
      <style jsx>{`
        .storefrontAuthSurface{width:min(100%,34rem);max-width:34rem;margin:2rem auto;padding:clamp(1.15rem,3vw,2rem);background:linear-gradient(145deg,var(--shoporation-color-surface,#fff),var(--shoporation-color-background,#f5f5f5));color:var(--shoporation-color-text,#111827);border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:1.25rem;box-shadow:0 28px 90px rgba(0,0,0,.24)}
        .storefrontAuthSurface :global(.authTabs){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-bottom:1.25rem;padding:.3rem;background:var(--shoporation-color-background,#f5f5f5);border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.9rem}
        .storefrontAuthSurface :global(.authTabs button),.storefrontAuthSurface :global(.button),.storefrontAuthSurface :global(.btn){min-height:44px;border-radius:.7rem;font:inherit;font-weight:800}
        .storefrontAuthSurface :global(.authTabs button){min-width:0;padding:.65rem .4rem;border:1px solid var(--shoporation-color-border,#d1d5db);background:var(--shoporation-color-surface-muted,#eee);color:var(--shoporation-color-text,#111827);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:clip;font-size:clamp(.78rem,3.4vw,.95rem);line-height:1.15;letter-spacing:-.01em}
        .storefrontAuthSurface :global(.checkoutForm){display:grid;gap:1rem}
        .storefrontAuthSurface :global(label){display:grid;gap:.42rem;color:var(--shoporation-color-text,#111827);font-weight:700}
        .storefrontAuthSurface :global(input),.storefrontAuthSurface :global(select){width:100%;min-height:48px;padding:.72rem .85rem;border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.72rem;background:var(--shoporation-color-background,#fff);color:var(--shoporation-color-text,#111827);font:inherit;outline:none}
        .storefrontAuthSurface :global(input:focus),.storefrontAuthSurface :global(select:focus){border-color:var(--shoporation-color-primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--shoporation-color-primary,#2563eb) 22%,transparent)}
        .storefrontAuthSurface :global(.button){border:0;background:var(--shoporation-color-primary,#2563eb);color:var(--shoporation-color-primary-contrast,#fff);cursor:pointer;padding:.75rem 1rem}
        .storefrontAuthSurface :global(.btnGhost){border:1px solid var(--shoporation-color-border,#d1d5db);background:transparent;color:var(--shoporation-color-text,#111827);cursor:pointer}
        .storefrontAuthSurface :global(.notice){color:var(--shoporation-color-muted-text,#6b7280)}
        @media(max-width:640px){.storefrontAuthSurface{max-width:none;margin:1rem -.25rem;padding:1rem;border-radius:1rem;min-height:min(72vh,42rem)}.storefrontAuthSurface :global(.authTabs){position:sticky;top:.5rem;z-index:1}.storefrontAuthSurface :global(.authTabs button){font-size:clamp(.78rem,3.35vw,.92rem);padding-inline:.32rem}}@media(max-width:360px){.storefrontAuthSurface :global(.authTabs){gap:.3rem;padding:.22rem}.storefrontAuthSurface :global(.authTabs button){font-size:.78rem;padding-inline:.22rem;letter-spacing:-.02em}}
      `}</style>
  </div>;
}
