'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrderStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    await fetch(`/api/admin/orders/${id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({status:value}) });
    setBusy(false); router.refresh();
  }
  return <div style={{display:'flex',gap:8,alignItems:'center'}}><select value={value} onChange={(e)=>setValue(e.target.value)}><option value="pending">Függőben</option><option value="paid">Fizetve</option><option value="processing">Feldolgozás</option><option value="shipped">Átadva</option><option value="completed">Teljesítve</option><option value="cancelled">Törölve</option><option value="refunded">Visszatérítve</option></select><button className="btn btnGhost" type="button" disabled={busy||value===status} onClick={save}>{busy?'Mentés…':'Mentés'}</button></div>;
}
