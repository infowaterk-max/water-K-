'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

const WORKFORCE_LOGIN_URL='/api/auth/workforce-login?next=%2Fadmin';

function initials(value:string){
  const seed=value.split('@')[0]?.trim()||'M';
  const parts=seed.split(/[._\-\s]+/).filter(Boolean);
  const letters=(parts.length>1?parts.slice(0,2).map(part=>part[0]):seed.slice(0,2).split('')).join('');
  return letters.toUpperCase()||'M';
}

export function AdminProfileMenu({email,roleLabel}:{email?:string|null;roleLabel:string}){
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);
  const identity=email?.trim()||'Munkatársi fiók';

  async function logout(){
    if(busy)return;
    setBusy(true);
    setError(null);
    try{
      const supabase=createClient();
      const{error:signOutError}=await supabase.auth.signOut();
      if(signOutError){
        setError('A kijelentkezés nem sikerült. Próbáld újra.');
        setBusy(false);
        return;
      }
      window.location.replace(WORKFORCE_LOGIN_URL);
    }catch{
      setError('A kijelentkezés nem sikerült. Próbáld újra.');
      setBusy(false);
    }
  }

  return <details className="adminProfileMenu">
    <summary className="adminProfileSummary" aria-label="Profil és kijelentkezés">
      <span className="adminProfileAvatar" aria-hidden="true">{initials(identity)}</span>
      <span className="adminProfileIdentity"><strong>{identity}</strong><small>{roleLabel}</small></span>
      <span className="adminProfileChevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="adminProfilePanel">
      <div className="adminProfileDetails"><strong>{identity}</strong><span>{roleLabel}</span></div>
      <button className="adminProfileLogout" type="button" disabled={busy} onClick={()=>void logout()}>{busy?'Kijelentkezés…':'Kijelentkezés'}</button>
      {error&&<p className="adminProfileError" role="alert">{error}</p>}
    </div>
  </details>;
}
