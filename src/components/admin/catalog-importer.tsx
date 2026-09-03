'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CatalogChange } from '@/lib/catalog-import';

type Preview={line:number;id:string;sku?:string;status:'error'|'change'|'same';message?:string;before?:{stock:number;grossPrice:number;netPrice:number;active:boolean};after?:{stock:number;grossPrice:number;netPrice:number;active:boolean}};
type PreviewResponse={error?:string;preview?:Preview[];validChanges?:CatalogChange[]};
type ApplyResponse={error?:string;count?:number};

export function CatalogImporter(){
  const router=useRouter();
  const[csv,setCsv]=useState(''),[rows,setRows]=useState<Preview[]>([]),[changes,setChanges]=useState<CatalogChange[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);

  async function preview(){
    if(busy||!csv.trim())return;
    setBusy(true);setMessage('');setIsError(false);
    try{
      const response=await fetch('/api/admin/catalog/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'preview',csv})});
      const payload=await response.json().catch(()=>({}))as PreviewResponse;
      if(!response.ok){setIsError(true);setMessage(payload.error??'Az előnézet nem sikerült.');return}
      setRows(payload.preview??[]);setChanges(payload.validChanges??[]);
      setMessage((payload.validChanges??[]).length?'Az előnézet elkészült. Ellenőrizd a módosításokat jóváhagyás előtt.':'Nincs alkalmazható változás.');
    }catch{
      setIsError(true);setMessage('Hálózati hiba. Az importelőnézet nem készült el.');
    }finally{setBusy(false)}
  }

  async function apply(){
    if(busy||!changes.length)return;
    if(!window.confirm(`Biztosan alkalmazod a(z) ${changes.length} előnézett katalógusmódosítást?`))return;
    setBusy(true);setMessage('');setIsError(false);
    try{
      const response=await fetch('/api/admin/catalog/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'apply',changes})});
      const payload=await response.json().catch(()=>({}))as ApplyResponse;
      if(!response.ok){setIsError(true);setMessage(payload.error??'Az import nem sikerült.');return}
      setMessage(`${payload.count??changes.length} termék módosítva.`);setRows([]);setChanges([]);router.refresh();
    }catch{
      setIsError(true);setMessage('Hálózati hiba. A módosításokat nem tekintjük alkalmazottnak.');
    }finally{setBusy(false)}
  }

  return <section className="featurePanel">
    <span className="eyebrow">Biztonságos CSV import</span><h2>Előnézet nélkül nincs adatírás</h2>
    <p className="muted">Kötelező oszlop: <code>id</code>. Támogatott módosító oszlopok: <code>stock</code>, <code>net_price</code>, <code>gross_price</code>, <code>active</code>.</p>
    <div className="catalogImportLayout">
      <div className="catalogFilePicker"><strong>CSV fájl kiválasztása</strong><span className="muted">UTF-8 CSV, először csak ellenőrzésre kerül.</span><input type="file" accept=".csv,text/csv" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{setCsv(await file.text());setRows([]);setChanges([]);setMessage('');setIsError(false)}catch{setIsError(true);setMessage('A kiválasztott fájl nem olvasható.')}}/></div>
      <div><label><strong>CSV tartalom</strong><textarea className="catalogCsvEditor" rows={10} value={csv} disabled={busy} onChange={e=>{setCsv(e.target.value);setRows([]);setChanges([]);setMessage('');setIsError(false)}} placeholder={'id,stock,net_price,gross_price,active\n...'}/></label></div>
    </div>
    <div className="actions"><button className="btn btnGhost" type="button" disabled={busy||!csv.trim()} onClick={preview}>{busy?'Ellenőrzés…':'Import előnézet'}</button><button className="btn btnPrimary" type="button" disabled={busy||!changes.length||rows.some(row=>row.status==='error')} onClick={apply}>Jóváhagyás és alkalmazás ({changes.length})</button></div>
    {message&&<p className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</p>}
    {rows.length>0&&<div className="tableCard adminTableScroll"><table className="adminTable"><thead><tr><th>Sor</th><th>Termék</th><th>Állapot</th><th>Előtte</th><th>Utána</th></tr></thead><tbody>{rows.map(row=><tr key={`${row.line}-${row.id}`}><td>{row.line}</td><td>{row.sku??row.id}</td><td><span className="badge">{row.status==='error'?'Hiba':row.status==='same'?'Nincs változás':'Módosul'}</span>{row.message&&<div className="muted">{row.message}</div>}</td><td>{row.before?`${row.before.stock} db · ${row.before.netPrice}/${row.before.grossPrice} Ft · ${row.before.active?'aktív':'inaktív'}`:'—'}</td><td>{row.after?`${row.after.stock} db · ${row.after.netPrice}/${row.after.grossPrice} Ft · ${row.after.active?'aktív':'inaktív'}`:'—'}</td></tr>)}</tbody></table></div>}
  </section>;
}
