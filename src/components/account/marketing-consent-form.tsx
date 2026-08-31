'use client';

import { useState } from 'react';

export function MarketingConsentForm({initialConsent}:{initialConsent:boolean}){
 const [consent,setConsent]=useState(initialConsent); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('');
 async function change(next:boolean){setSaving(true);setMessage('');try{const response=await fetch('/api/account/marketing-consent',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({consent:next})});const body=await response.json();if(!response.ok)throw new Error(body.error||'A beállítás nem menthető.');setConsent(next);setMessage(next?'A marketing-hozzájárulás aktív.':'A marketing-hozzájárulást visszavontad.');}catch(error){setMessage(error instanceof Error?error.message:'A beállítás nem menthető.');}finally{setSaving(false);}}
 return <div><p className="muted">E-mailben küldött ajánlatok és webáruházi újdonságok. A rendelési és fiókbiztonsági üzenetek ettől függetlenek.</p><label className="consentRow"><input type="checkbox" checked={consent} disabled={saving} onChange={event=>change(event.target.checked)}/><span>{consent?'Marketing e-maileket kérek':'Marketing e-maileket nem kérek'}</span></label>{message&&<p className="muted" role="status">{message}</p>}<p className="muted">A hozzájárulás bármikor visszavonható. A változtatás időpontját és a szabályzat verzióját auditálhatóan rögzítjük.</p></div>;
}
