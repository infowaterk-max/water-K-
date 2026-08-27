'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CustomerRoleControl({ id, role, approved }: { id:string; role:string; approved:boolean }) {
  const router=useRouter(); const [busy,setBusy]=useState(false);
  async function update(nextRole:'customer'|'reseller', resellerApproved:boolean){setBusy(true);await fetch(`/api/admin/customers/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({role:nextRole,resellerApproved})});setBusy(false);router.refresh();}
  if(role==='admin') return <span className="badge">Admin</span>;
  if(role==='reseller'&&approved) return <button className="btn btnGhost" type="button" disabled={busy} onClick={()=>update('reseller',false)}>Jóváhagyás visszavonása</button>;
  if(role==='reseller') return <button className="btn btnPrimary" type="button" disabled={busy} onClick={()=>update('reseller',true)}>Viszonteladó jóváhagyása</button>;
  return <button className="btn btnGhost" type="button" disabled={busy} onClick={()=>update('reseller',false)}>Viszonteladóvá tesz</button>;
}
