'use client';

import Image from 'next/image';
import { useEffect,useMemo,useState,type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/browser';
import {
  challengeAndVerifyWorkforceTotp,
  enrollWorkforceTotp,
  getWorkforceMfaClientSnapshot,
  nextWorkforceMfaStep,
  unenrollWorkforceTotp,
  type WorkforceMfaClientSnapshot,
  type WorkforceTotpEnrollment,
} from '@/lib/auth/workforce-mfa-client';

type WorkforceContextPayload={
  platformRole:'owner'|'admin'|'operator'|null;
  storeRoles:string[];
  requiredFactors:0|1|2;
  roleLabel:string;
  instanceName:string|null;
};

type Phase='checking'|'password'|'loading'|'enroll'|'challenge'|'error';

const codePattern=/^\d{6}$/;

function contextErrorMessage(code:string){
  if(code==='WORKFORCE_ACCESS_REQUIRED')return'Ehhez a fiókhoz nincs aktív staff vagy admin hozzáférés.';
  if(code==='WORKFORCE_CONTEXT_UNAVAILABLE')return'A staff jogosultság most nem ellenőrizhető. Biztonsági okból a belépés nem folytatható.';
  return'A staff belépés ellenőrzése nem sikerült.';
}

export function WorkforceAuthForm({returnTo}:{returnTo:string}){
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[phase,setPhase]=useState<Phase>('checking');
  const[context,setContext]=useState<WorkforceContextPayload|null>(null);
  const[snapshot,setSnapshot]=useState<WorkforceMfaClientSnapshot|null>(null);
  const[enrollment,setEnrollment]=useState<WorkforceTotpEnrollment|null>(null);
  const[selectedFactorId,setSelectedFactorId]=useState('');
  const[code,setCode]=useState('');
  const[message,setMessage]=useState('A meglévő munkamenet ellenőrzése…');
  const[busy,setBusy]=useState(false);

  const verifiedFactors=useMemo(()=>snapshot?.factors.filter(factor=>factor.status==='verified')??[],[snapshot]);

  function finish(){
    const target=returnTo==='/admin'||returnTo.startsWith('/admin/')?returnTo:'/admin';
    window.location.replace(target);
  }

  async function loadContext(){
    const response=await fetch('/api/auth/workforce-context',{cache:'no-store'});
    if(response.status===401)return null;
    const payload=await response.json().catch(()=>({error:'WORKFORCE_CONTEXT_UNAVAILABLE'})) as WorkforceContextPayload&{error?:string};
    if(!response.ok)throw new Error(payload.error??'WORKFORCE_CONTEXT_UNAVAILABLE');
    return payload;
  }

  async function resolveNext(activeContext:WorkforceContextPayload,successMessage=''){
    const nextSnapshot=await getWorkforceMfaClientSnapshot();
    setSnapshot(nextSnapshot);
    setEnrollment(null);
    setCode('');
    const step=nextWorkforceMfaStep(nextSnapshot,activeContext.requiredFactors);
    const verifiedCount=nextSnapshot.factors.filter(factor=>factor.status==='verified').length;

    if(step==='ready'){
      setMessage(successMessage||'A hitelesítés kész. Továbbítás…');
      finish();
      return;
    }

    if(step==='challenge'){
      const verified=nextSnapshot.factors.filter(factor=>factor.status==='verified');
      if(!verified.length)throw new Error('WORKFORCE_VERIFIED_FACTOR_MISSING');
      setSelectedFactorId(current=>verified.some(factor=>factor.id===current)?current:verified[0].id);
      setPhase('challenge');
      setMessage(successMessage||'Add meg a kiválasztott hitelesítő alkalmazás aktuális hatjegyű kódját.');
      return;
    }

    setPhase('enroll');
    const secondOwnerFactor=activeContext.requiredFactors===2&&verifiedCount===1;
    setMessage(successMessage||(secondOwnerFactor
      ?'Az első TOTP faktor rendben van. Platformtulajdonosként még egy második TOTP faktort is fel kell venned.'
      :'Állíts be egy hitelesítő alkalmazást a folytatáshoz.'));
  }

  async function continueWorkforceSession(){
    setBusy(true);
    setPhase('loading');
    setMessage('Staff jogosultság és MFA állapot ellenőrzése…');
    try{
      const activeContext=await loadContext();
      if(!activeContext){
        setContext(null);
        setSnapshot(null);
        setPhase('password');
        setMessage('');
        return;
      }
      setContext(activeContext);
      await resolveNext(activeContext);
    }catch(error){
      const errorCode=error instanceof Error?error.message:'WORKFORCE_CONTEXT_UNAVAILABLE';
      setPhase('error');
      setMessage(contextErrorMessage(errorCode));
    }finally{
      setBusy(false);
    }
  }

  useEffect(()=>{void continueWorkforceSession()},[]);

  async function submitPassword(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const normalizedEmail=email.trim().toLowerCase();
    if(!normalizedEmail||!password){setMessage('Add meg az e-mail címedet és a jelszavadat.');return;}
    setBusy(true);
    setMessage('');
    try{
      const supabase=createClient();
      const result=await supabase.auth.signInWithPassword({email:normalizedEmail,password});
      if(result.error){setPhase('password');setMessage('A belépés nem sikerült. Ellenőrizd az e-mail címet és a jelszót.');return;}
      const activeContext=await loadContext();
      if(!activeContext)throw new Error('WORKFORCE_CONTEXT_UNAVAILABLE');
      setContext(activeContext);
      await resolveNext(activeContext);
    }catch(error){
      const errorCode=error instanceof Error?error.message:'WORKFORCE_CONTEXT_UNAVAILABLE';
      setPhase('error');
      setMessage(contextErrorMessage(errorCode));
    }finally{
      setBusy(false);
    }
  }

  async function beginEnrollment(){
    if(!context)return;
    setBusy(true);
    setMessage('Új TOTP faktor előkészítése…');
    try{
      const current=await getWorkforceMfaClientSnapshot();
      for(const factor of current.factors.filter(factor=>factor.status!=='verified'))await unenrollWorkforceTotp(factor.id);
      const verifiedCount=current.factors.filter(factor=>factor.status==='verified').length;
      const friendlyName='Shoperation · '+context.roleLabel+' · '+String(verifiedCount+1)+'. faktor';
      const nextEnrollment=await enrollWorkforceTotp(friendlyName);
      setEnrollment(nextEnrollment);
      setCode('');
      setPhase('enroll');
      setMessage('Olvasd be a QR-kódot, vagy add meg kézzel a titkos kulcsot, majd írd be a hatjegyű kódot.');
    }catch{
      setPhase('error');
      setMessage('Az MFA enrollment nem indítható el. A belépés biztonsági okból megállt.');
    }finally{
      setBusy(false);
    }
  }

  async function verifyEnrollment(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!context||!enrollment)return;
    const normalized=code.replace(/\s+/g,'');
    if(!codePattern.test(normalized)){setMessage('Hat számjegyből álló kódot adj meg.');return;}
    setBusy(true);
    try{
      await challengeAndVerifyWorkforceTotp(enrollment.factorId,normalized);
      setEnrollment(null);
      await resolveNext(context,'A TOTP faktor ellenőrzése sikeres.');
    }catch{
      setMessage('A kód nem fogadható el. Ellenőrizd az authenticator alkalmazásban látható aktuális kódot, és próbáld újra.');
      setCode('');
    }finally{
      setBusy(false);
    }
  }

  async function verifyExistingFactor(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!context||!selectedFactorId)return;
    const normalized=code.replace(/\s+/g,'');
    if(!codePattern.test(normalized)){setMessage('Hat számjegyből álló kódot adj meg.');return;}
    setBusy(true);
    try{
      await challengeAndVerifyWorkforceTotp(selectedFactorId,normalized);
      await resolveNext(context,'A második hitelesítési lépcső sikeres.');
    }catch{
      setMessage('A hitelesítési kód hibás vagy lejárt. Kérj új kódot az authenticator alkalmazásból.');
      setCode('');
    }finally{
      setBusy(false);
    }
  }

  async function cancelEnrollment(){
    setBusy(true);
    try{
      if(enrollment)await unenrollWorkforceTotp(enrollment.factorId);
      setEnrollment(null);
      setCode('');
      if(context){
        const current=await getWorkforceMfaClientSnapshot();
        setSnapshot(current);
      }
      setPhase('enroll');
      setMessage('Az enrollment megszakítva, az ellenőrizetlen faktor eltávolítva. Újraindíthatod, vagy kiléphetsz.');
    }catch{
      setPhase('error');
      setMessage('Az enrollment megszakítása közben nem sikerült biztonságosan eltávolítani a faktort. Próbáld újra vagy lépj ki.');
    }finally{
      setBusy(false);
    }
  }

  async function signOutAndReset(){
    setBusy(true);
    try{
      if(enrollment)await unenrollWorkforceTotp(enrollment.factorId).catch(()=>undefined);
      const supabase=createClient();
      await supabase.auth.signOut();
    }finally{
      setContext(null);
      setSnapshot(null);
      setEnrollment(null);
      setSelectedFactorId('');
      setCode('');
      setPassword('');
      setPhase('password');
      setMessage('');
      setBusy(false);
    }
  }

  async function copySecret(){
    if(!enrollment?.secret)return;
    try{
      await navigator.clipboard.writeText(enrollment.secret);
      setMessage('A titkos kulcs a vágólapra másolva. Ne tárold nyilvános vagy megosztott helyen.');
    }catch{
      setMessage('A másolás nem engedélyezett ebben a böngészőben. Jelöld ki és másold ki kézzel a titkos kulcsot.');
    }
  }

  return <section className="workforceAuth" data-workforce-auth="true" aria-live="polite">
    <div className="workforceIntro">
      <span className="eyebrow">Védett munkatársi hozzáférés</span>
      <h2>{context?.roleLabel??'Azonosítsd magad'}</h2>
      <p className="muted">{(context?.instanceName?context.instanceName+' · ':'')+'A hitelesítési követelményt a szerveroldali workforce szerepkör és a Supabase Auth MFA állapota határozza meg.'}</p>
      <div className="assuranceFacts">
        <span>Jelszó → AAL1</span>
        <span>{context?'Elvárt TOTP faktor: '+String(context.requiredFactors):'MFA csak staff jogosultság után'}</span>
        <span>OTP titok nincs böngészőben tartósítva</span>
      </div>
    </div>

    <div className="workforcePanel">
      {(phase==='checking'||phase==='loading')&&<div className="statusPanel"><div className="spinner" aria-hidden="true"/><strong>{message}</strong></div>}

      {phase==='password'&&<form onSubmit={submitPassword} className="workforceForm">
        <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>
        <label>Jelszó<input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label>
        <button className="button" type="submit" disabled={busy}>{busy?'Belépés…':'Tovább a biztonsági ellenőrzéshez'}</button>
      </form>}

      {phase==='enroll'&&<div className="workforceForm">
        {!enrollment?<>
          <div className="notice"><strong>TOTP beállítás szükséges.</strong><p>{message}</p></div>
          <button className="button" type="button" onClick={beginEnrollment} disabled={busy}>{busy?'Előkészítés…':'Hitelesítő alkalmazás beállítása'}</button>
          <button className="btn btnGhost" type="button" onClick={signOutAndReset} disabled={busy}>Kilépés</button>
        </>:<>
          <div className="enrollmentGrid">
            <div className="qrPanel">
              <Image src={enrollment.qrCode} alt="TOTP QR-kód" width={224} height={224} unoptimized priority/>
            </div>
            <div className="secretPanel">
              <span className="eyebrow">Kézi beállítás</span>
              <p className="muted">Ha a QR-kód nem olvasható be, add meg ezt a kulcsot az authenticator alkalmazásban:</p>
              <code className="secretCode">{enrollment.secret}</code>
              <button className="btn btnGhost" type="button" onClick={copySecret}>Kulcs másolása</button>
            </div>
          </div>
          <form onSubmit={verifyEnrollment} className="workforceForm nestedForm">
            <label>Hatjegyű ellenőrző kód<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></label>
            <button className="button" type="submit" disabled={busy}>{busy?'Ellenőrzés…':'Faktor ellenőrzése'}</button>
            <button className="btn btnGhost" type="button" onClick={cancelEnrollment} disabled={busy}>Enrollment megszakítása</button>
          </form>
        </>}
      </div>}

      {phase==='challenge'&&<form onSubmit={verifyExistingFactor} className="workforceForm">
        <div className="notice"><strong>MFA challenge szükséges.</strong><p>{message}</p></div>
        {verifiedFactors.length>1?<fieldset className="factorList"><legend>Hitelesítő faktor</legend>{verifiedFactors.map((factor,index)=><label className="factorChoice" key={factor.id}><input type="radio" name="factor" value={factor.id} checked={selectedFactorId===factor.id} onChange={()=>setSelectedFactorId(factor.id)}/><span>{factor.friendlyName??('Hitelesítő alkalmazás '+String(index+1))}</span></label>)}</fieldset>:null}
        <label>Hatjegyű ellenőrző kód<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,'').slice(0,6))}/></label>
        <button className="button" type="submit" disabled={busy}>{busy?'Ellenőrzés…':'Belépés megerősítése'}</button>
        <button className="btn btnGhost" type="button" onClick={signOutAndReset} disabled={busy}>Másik fiók használata</button>
      </form>}

      {phase==='error'&&<div className="workforceForm">
        <div className="errorNotice" role="alert"><strong>A biztonsági ellenőrzés megállt.</strong><p>{message}</p></div>
        <button className="button" type="button" onClick={continueWorkforceSession} disabled={busy}>{busy?'Ellenőrzés…':'Újrapróbálás'}</button>
        <button className="btn btnGhost" type="button" onClick={signOutAndReset} disabled={busy}>Kilépés</button>
      </div>}

      {message&&phase!=='checking'&&phase!=='loading'&&phase!=='error'&&<p className="flowMessage">{message}</p>}
    </div>

    <style jsx>{`
      .workforceAuth{display:grid;grid-template-columns:minmax(0,.85fr) minmax(22rem,1.15fr);gap:clamp(1rem,3vw,2rem);margin-top:1.5rem;align-items:start}
      .workforceIntro,.workforcePanel{border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:1.25rem;background:var(--shoporation-color-surface,#fff);box-shadow:0 22px 70px rgba(15,23,42,.12)}
      .workforceIntro{padding:clamp(1.15rem,3vw,2rem);position:sticky;top:1rem}
      .workforcePanel{padding:clamp(1.15rem,3vw,2rem);min-width:0}
      .workforceForm{display:grid;gap:1rem}
      .workforceForm label{display:grid;gap:.42rem;font-weight:750}
      .workforceForm input{width:100%;min-height:48px;padding:.75rem .85rem;border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.75rem;background:var(--shoporation-color-background,#fff);color:var(--shoporation-color-text,#111827);font:inherit}
      .workforceForm input:focus{outline:none;border-color:var(--shoporation-color-primary,#2563eb);box-shadow:0 0 0 3px color-mix(in srgb,var(--shoporation-color-primary,#2563eb) 20%,transparent)}
      .workforceForm :global(.button),.workforceForm :global(.btn),.secretPanel :global(.btn){min-height:46px;border-radius:.75rem;font-weight:800}
      .assuranceFacts{display:grid;gap:.55rem;margin-top:1.2rem}
      .assuranceFacts span{display:block;padding:.65rem .75rem;border-radius:.7rem;background:var(--shoporation-color-background,#f5f5f5);font-size:.92rem}
      .statusPanel{display:flex;align-items:center;gap:.85rem;min-height:9rem;justify-content:center;text-align:center}
      .spinner{width:1.25rem;height:1.25rem;border:2px solid var(--shoporation-color-border,#cbd5e1);border-top-color:var(--shoporation-color-primary,#2563eb);border-radius:50%;animation:spin .8s linear infinite}
      .enrollmentGrid{display:grid;grid-template-columns:minmax(12rem,.8fr) minmax(0,1.2fr);gap:1rem;align-items:center}
      .qrPanel{display:grid;place-items:center;padding:1rem;border-radius:1rem;background:#fff;border:1px solid var(--shoporation-color-border,#d1d5db);overflow:hidden}
      .qrPanel :global(img){width:min(100%,224px);height:auto}
      .secretPanel{display:grid;gap:.75rem;min-width:0}
      .secretCode{display:block;padding:.8rem;border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.65rem;background:var(--shoporation-color-background,#f8fafc);overflow-wrap:anywhere;user-select:all;font-size:.9rem}
      .nestedForm{padding-top:.25rem}
      .factorList{display:grid;gap:.55rem;margin:0;padding:.8rem;border:1px solid var(--shoporation-color-border,#d1d5db);border-radius:.8rem}
      .factorChoice{grid-template-columns:auto 1fr!important;align-items:center}
      .factorChoice input{width:1.1rem;height:1.1rem;min-height:0}
      .flowMessage{margin:1rem 0 0;color:var(--shoporation-color-muted-text,#64748b)}
      @keyframes spin{to{transform:rotate(360deg)}}
      @media(max-width:720px){
        .workforceAuth{grid-template-columns:1fr;gap:1rem;margin-top:1rem}
        .workforceIntro{position:static;padding:1rem}
        .workforcePanel{padding:1rem;border-radius:1rem}
        .enrollmentGrid{grid-template-columns:1fr}
        .qrPanel{padding:.75rem}
        .workforceForm :global(.button),.workforceForm :global(.btn),.secretPanel :global(.btn){width:100%;min-height:48px}
      }
    `}</style>
  </section>;
}
