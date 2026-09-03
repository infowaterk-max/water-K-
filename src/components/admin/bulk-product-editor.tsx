'use client';
import{useState}from'react';
import{useRouter}from'next/navigation';
import type{Product}from'@/lib/catalog';

type Operation='set_stock'|'adjust_stock'|'set_gross'|'set_net'|'activate'|'deactivate';
const operationLabel:Record<Operation,string>={set_stock:'készlet beállítása',adjust_stock:'készlet módosítása',set_gross:'bruttó ár beállítása',set_net:'nettó ár beállítása',activate:'aktiválás',deactivate:'inaktiválás'};

export function BulkProductEditor({products}:{products:Product[]}){
  const router=useRouter();
  const[selected,setSelected]=useState<string[]>([]),[operation,setOperation]=useState<Operation>('adjust_stock'),[value,setValue]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[isError,setIsError]=useState(false);
  const noValue=operation==='activate'||operation==='deactivate';

  async function apply(){
    if(busy||!selected.length)return;
    if(!window.confirm(`Biztosan végrehajtod ezt a műveletet: ${operationLabel[operation]} · ${selected.length} termék?`))return;
    setBusy(true);setMessage('');setIsError(false);
    try{
      const r=await fetch('/api/admin/catalog/bulk',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ids:selected,operation,...(!noValue?{value}:{})})});
      const p=await r.json().catch(()=>({}))as{error?:string;count?:number};
      if(!r.ok){setIsError(true);setMessage(p.error??'A művelet nem sikerült.');return}
      setMessage(`${p.count??selected.length} termék módosítva.`);setSelected([]);router.refresh();
    }catch{
      setIsError(true);setMessage('Hálózati hiba. A tömeges módosítást nem tekintjük végrehajtottnak.');
    }finally{setBusy(false)}
  }

  return <section className="featurePanel">
    <span className="eyebrow">Atomi tömeges szerkesztés</span><h2>Jelöld ki a termékeket és válassz műveletet.</h2>
    <div className="form-grid"><label>Művelet<select value={operation} disabled={busy} onChange={e=>{setOperation(e.target.value as Operation);setMessage('');setIsError(false)}}><option value="adjust_stock">Készlet növelése/csökkentése</option><option value="set_stock">Készlet beállítása</option><option value="set_gross">Bruttó ár beállítása</option><option value="set_net">Nettó ár beállítása</option><option value="activate">Aktiválás</option><option value="deactivate">Inaktiválás</option></select></label>{!noValue&&<label>Érték<input type="number" value={value} disabled={busy} onChange={e=>setValue(Number(e.target.value))}/></label>}</div>
    <div className="adminToolbar"><button className="btn btnGhost" type="button" disabled={busy||products.length===0} onClick={()=>setSelected(selected.length===products.length?[]:products.map(p=>p.id))}>{selected.length===products.length&&products.length?'Kijelölés törlése':'Összes kijelölése'}</button><button className="btn btnPrimary" type="button" disabled={busy||!selected.length} onClick={apply}>{busy?'Mentés…':`Alkalmazás ${selected.length} termékre`}</button></div>
    {message&&<p className={isError?'errorNotice':'helperText'} role={isError?'alert':'status'}>{message}</p>}
    <div className="integrationList">{products.map(p=><label key={p.id} className="card"><span><input type="checkbox" disabled={busy} checked={selected.includes(p.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,p.id]:current.filter(id=>id!==p.id))}/> <strong>{p.name}</strong></span><span className="muted">{p.stock} db · nettó {p.netPrice} Ft · bruttó {p.grossPrice} Ft</span></label>)}</div>
    {!products.length&&<p className="muted">Nincs módosítható termék az aktuális webshopban.</p>}
    <p className="muted">A művelet egyetlen, az aktuális webshopra korlátozott adatbázis-tranzakcióban fut. Ha bármelyik tétel hibás, egyik változás sem kerül mentésre.</p>
  </section>;
}
