'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props={id:string;stock:number;grossPrice:number;netPrice:number;resellerGrossPrice:number|null;resellerNetPrice:number|null;unitCostNet:number|null;weightGrams?:number|null;supplierLeadTimeDays:number;safetyStockDays:number;minimumOrderQuantity:number;orderMultiple:number};
export function InventoryEditor({id,stock,grossPrice,netPrice,resellerGrossPrice,resellerNetPrice,unitCostNet,weightGrams,supplierLeadTimeDays,safetyStockDays,minimumOrderQuantity,orderMultiple}:Props){
  const router=useRouter();
  const [s,setS]=useState(stock),[g,setG]=useState(grossPrice),[n,setN]=useState(netPrice);
  const [rg,setRg]=useState(resellerGrossPrice===null?'':String(resellerGrossPrice)),[rn,setRn]=useState(resellerNetPrice===null?'':String(resellerNetPrice)),[cost,setCost]=useState(unitCostNet===null?'':String(unitCostNet)),[weight,setWeight]=useState(weightGrams==null?'':String(weightGrams));
  const [lead,setLead]=useState(supplierLeadTimeDays),[safety,setSafety]=useState(safetyStockDays),[moq,setMoq]=useState(minimumOrderQuantity),[multiple,setMultiple]=useState(orderMultiple);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{if(weightGrams!==undefined)return;let active=true;fetch(`/api/admin/variants/${id}`).then(async response=>response.ok?response.json():null).then((payload:{weightGrams?:number|null}|null)=>{if(active&&payload)setWeight(payload.weightGrams==null?'':String(payload.weightGrams));}).catch(()=>{});return()=>{active=false}},[id,weightGrams]);
  async function save(){setBusy(true);setMessage('');try{const response=await fetch(`/api/admin/variants/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({stock:s,grossPrice:g,netPrice:n,resellerGrossPrice:rg===''?null:Number(rg),resellerNetPrice:rn===''?null:Number(rn),unitCostNet:cost===''?null:Number(cost),weightGrams:weight===''?null:Number(weight),supplierLeadTimeDays:lead,safetyStockDays:safety,minimumOrderQuantity:moq,orderMultiple:multiple})});const payload=await response.json() as {error?:string};if(!response.ok){setMessage(`${payload.error??'Mentési hiba.'} A készlet- és ármódosítást nem tekintjük elmentettnek.`);return;}router.refresh();setMessage('Mentve.');}catch{setMessage('Hálózati hiba. A készlet- és ármódosítást nem tekintjük elmentettnek.');}finally{setBusy(false)}}
  return <div className="inventoryEditor" aria-busy={busy}>
    <div className="inventoryEditorGrid inventoryEditorGridFive">
      <label className="inventoryEditorField"><span>Készlet</span><input aria-label="Készlet" type="number" min="0" value={s} onChange={e=>setS(Number(e.target.value))}/></label>
      <label className="inventoryEditorField"><span>Bruttó B2C ár</span><input aria-label="Bruttó B2C ár" type="number" min="0" value={g} onChange={e=>setG(Number(e.target.value))}/></label>
      <label className="inventoryEditorField"><span>Nettó B2C ár</span><input aria-label="Nettó B2C ár" type="number" min="0" value={n} onChange={e=>setN(Number(e.target.value))}/></label>
      <label className="inventoryEditorField"><span>Nettó egységköltség</span><input aria-label="Nettó egységköltség" type="number" min="0" placeholder="Önköltség nettó" value={cost} onChange={e=>setCost(e.target.value)}/></label>
      <label className="inventoryEditorField"><span>Szállítási súly (g)</span><input aria-label="Szállítási súly grammban" type="number" min="1" placeholder="Súly (g)" value={weight} onChange={e=>setWeight(e.target.value)}/></label>
    </div>
    <div className="inventoryEditorGrid inventoryEditorGridFour">
      <label className="inventoryEditorField"><span>Partner bruttó ár</span><input aria-label="Viszonteladói bruttó ár" type="number" min="0" placeholder="Partner bruttó" value={rg} onChange={e=>setRg(e.target.value)}/></label>
      <label className="inventoryEditorField"><span>Partner nettó ár</span><input aria-label="Viszonteladói nettó ár" type="number" min="0" placeholder="Partner nettó" value={rn} onChange={e=>setRn(e.target.value)}/></label>
      <label className="inventoryEditorField"><span>Beszállítói átfutás (nap)</span><input aria-label="Átfutási idő nap" type="number" min="0" max="365" value={lead} onChange={e=>setLead(Number(e.target.value))}/></label>
      <label className="inventoryEditorField"><span>Biztonsági készlet (nap)</span><input aria-label="Biztonsági készlet nap" type="number" min="0" max="365" value={safety} onChange={e=>setSafety(Number(e.target.value))}/></label>
    </div>
    <div className="inventoryEditorGrid inventoryEditorGridRules">
      <label className="inventoryEditorField"><span>B2B minimum rendelés (db)</span><input aria-label="B2B minimum rendelési mennyiség" type="number" min="1" value={moq} onChange={e=>setMoq(Math.max(1,Number(e.target.value)))}/></label>
      <label className="inventoryEditorField"><span>B2B rendelési egység (db)</span><input aria-label="B2B rendelési többszörös" type="number" min="1" value={multiple} onChange={e=>setMultiple(Math.max(1,Number(e.target.value)))}/></label>
      <button className="btn btnGhost inventorySaveButton" type="button" disabled={busy} onClick={save}>{busy?'Mentés…':'Mentés'}</button>
    </div>
    <small className="muted">B2C rendelésnél a vásárló 1 db-os minimumot és 1 db-os lépést kap. A fenti MOQ és rendelési egység kizárólag az aktív B2B csatornára vonatkozik.</small>
    <small className="muted">Szállítási súly: {weight?`${weight} g`:'nincs megadva'} · Beszerzés: átfutás {lead} nap · biztonsági készlet {safety} nap · B2B MOQ {moq} db · B2B rendelési egység {multiple} db.</small>
    {message&&<small className={message==='Mentve.'?'helperText':'errorNotice'} role="status">{message}</small>}
  </div>;
}
