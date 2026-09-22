'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Props={fullName:string;companyName:string;taxNumber:string;businessIdentityLocked?:boolean;businessName?:string|null;businessTaxNumber?:string|null};

export function ProfileForm({fullName,companyName,taxNumber,businessIdentityLocked=false,businessName=null,businessTaxNumber=null}:Props){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  async function save(formData:FormData){
    setBusy(true); setMessage('');
    const supabase=createClient();
    const payload=businessIdentityLocked
      ?{full_name:String(formData.get('fullName')??'').trim()||null}
      :{full_name:String(formData.get('fullName')??'').trim()||null,company_name:String(formData.get('companyName')??'').trim()||null,tax_number:String(formData.get('taxNumber')??'').trim()||null};
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setBusy(false);setMessage('A munkamenet lejárt. Jelentkezz be újra.');return;}
    const {error}=await supabase.from('profiles').update(payload).eq('id',user.id);
    setBusy(false);
    if(error){setMessage('A profil mentése nem sikerült.');return;}
    setMessage('A profiladatok elmentve.'); router.refresh();
  }

  return <form action={save} className="checkoutForm">
    <label>Név / kapcsolattartó<input name="fullName" defaultValue={fullName} minLength={2}/></label>
    <label>Cégnév<input name="companyName" defaultValue={businessIdentityLocked?(businessName??companyName):companyName} readOnly={businessIdentityLocked} aria-readonly={businessIdentityLocked}/></label>
    <label>Adószám<input name="taxNumber" defaultValue={businessIdentityLocked?(businessTaxNumber??taxNumber):taxNumber} readOnly={businessIdentityLocked} aria-readonly={businessIdentityLocked}/></label>
    {businessIdentityLocked&&<p className="muted">A jóváhagyott B2B cégnév és adószám itt nem módosítható. A változtatást a B2B szervezet oldalán kell jóváhagyásra küldeni.</p>}
    <button className="btn btnPrimary" disabled={busy}>{busy?'Mentés…':'Profil mentése'}</button>
    {message&&<p className="notice">{message}</p>}
  </form>;
}
