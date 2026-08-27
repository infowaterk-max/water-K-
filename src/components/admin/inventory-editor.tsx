'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InventoryEditor({ id, stock, grossPrice, netPrice }: { id:string; stock:number; grossPrice:number; netPrice:number }) {
  const router=useRouter(); const [s,setS]=useState(stock); const [g,setG]=useState(grossPrice); const [n,setN]=useState(netPrice); const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);await fetch(`/api/admin/variants/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({stock:s,grossPrice:g,netPrice:n})});setBusy(false);router.refresh();}
  return <div style={{display:'grid',gridTemplateColumns:'90px 120px 120px auto',gap:8,alignItems:'center'}}><input aria-label="Készlet" type="number" min="0" value={s} onChange={e=>setS(Number(e.target.value))}/><input aria-label="Bruttó ár" type="number" min="0" value={g} onChange={e=>setG(Number(e.target.value))}/><input aria-label="Nettó ár" type="number" min="0" value={n} onChange={e=>setN(Number(e.target.value))}/><button className="btn btnGhost" type="button" disabled={busy} onClick={save}>{busy?'Mentés…':'Mentés'}</button></div>;
}
