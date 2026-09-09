'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Version={id:string;versionNumber:number;schemaVersion:number;activatedAt:string;createdAt:string;isActive:boolean};
type Props={template:{id:string;name:string;status:string;activeVersionId:string|null};versions:Version[];draftMatchesActive:boolean};

const date=(value:string)=>new Intl.DateTimeFormat('hu-HU',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));

export function EmailPublicationPanel({template,versions,draftMatchesActive}:Props){
  const router=useRouter();
  const[confirmation,setConfirmation]=useState('');
  const[busy,setBusy]=useState('');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function activate(){
    if(confirmation!=='AKTIVÁLÁS')return;
    setBusy('activate');setMessage('');setError('');
    try{
      const response=await fetch(`/api/admin/email-builder/templates/${template.id}/activate`,{method:'POST'});
      const data=await response.json().catch(()=>null) as {error?:string;details?:string[];activeVersion?:{versionNumber:number}}|null;
      if(!response.ok)throw new Error([data?.error,...(data?.details??[])].filter(Boolean).join(' · ')||'Az aktiválás sikertelen.');
      setConfirmation('');setMessage(`v${data?.activeVersion?.versionNumber??''} aktiválva.`);router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'Az aktiválás sikertelen.');}
    finally{setBusy('');}
  }

  async function restore(version:Version){
    if(!window.confirm(`A v${version.versionNumber} verzió tartalma kerüljön vissza a piszkozatba? Az aktív e-mail ettől nem változik meg.`))return;
    setBusy(version.id);setMessage('');setError('');
    try{
      const response=await fetch(`/api/admin/email-builder/templates/${template.id}/versions/${version.id}/restore-draft`,{method:'POST'});
      const data=await response.json().catch(()=>null) as {error?:string}|null;
      if(!response.ok)throw new Error(data?.error||'A verzió nem tölthető vissza.');
      setMessage(`A v${version.versionNumber} verzió visszatöltve piszkozatként.`);router.refresh();
    }catch(err){setError(err instanceof Error?err.message:'A verzió nem tölthető vissza.');}
    finally{setBusy('');}
  }

  const activationDisabled=template.status==='archived'||draftMatchesActive||confirmation!=='AKTIVÁLÁS'||Boolean(busy);
  return <div style={{display:'grid',gap:22}}>
    {message&&<div className="notice"><strong>Sikeres művelet</strong><p>{message}</p></div>}
    {error&&<div className="errorNotice" role="alert"><strong>A művelet nem hajtható végre.</strong><div>{error}</div></div>}

    <section className="card" style={{padding:22}}>
      <span className="eyebrow">Publikálás</span>
      <h2 style={{marginBottom:8}}>Piszkozat aktiválása</h2>
      <p className="muted">Az aktiválás új, megváltoztathatatlan verziót készít a jelenlegi piszkozatból, és ezt állítja be éles verziónak. A korábbi verziók megmaradnak.</p>
      {draftMatchesActive?<div className="notice"><strong>Nincs publikálandó változás.</strong><p>A piszkozat tartalma megegyezik a jelenlegi aktív verzióval.</p></div>:<>
        <label style={{display:'grid',gap:7,maxWidth:420,marginTop:18}}><strong>Megerősítés</strong><span className="muted">Írd be pontosan: <code>AKTIVÁLÁS</code></span><input value={confirmation} onChange={event=>setConfirmation(event.target.value)} placeholder="AKTIVÁLÁS" style={{minHeight:42,padding:'0 12px',border:'1px solid #d9d5cb',borderRadius:10}}/></label>
        <div className="actions" style={{marginTop:14}}><button className="btn btnPrimary" type="button" disabled={activationDisabled} onClick={activate}>{busy==='activate'?'Aktiválás…':template.activeVersionId?'Új verzió aktiválása':'Első verzió aktiválása'}</button></div>
      </>}
      <p className="muted" style={{marginTop:14}}>Ez a művelet már az éles rendelés-visszaigazolásra hat. Aktiválás előtt mindig ellenőrizd az előnézetet.</p>
    </section>

    <section className="card" style={{padding:22}}>
      <span className="eyebrow">Verzióelőzmények</span>
      <h2 style={{marginBottom:8}}>Immutable verziók</h2>
      <p className="muted">Egy aktivált verzió nem módosítható és nem törölhető. Korábbi verzió tartalma csak piszkozatként tölthető vissza; ettől az aktív levél nem változik meg.</p>
      {versions.length===0?<div className="notice"><strong>Még nincs aktív verzió.</strong><p>Az első aktiváláskor jön létre a v1.</p></div>:<div className="tableCard" style={{marginTop:16}}><table className="adminTable"><thead><tr><th>Verzió</th><th>Schema</th><th>Aktiválva</th><th>Állapot</th><th>Művelet</th></tr></thead><tbody>{versions.map(version=><tr key={version.id}><td><strong>v{version.versionNumber}</strong><div className="muted">{version.id.slice(0,8)}…</div></td><td>v{version.schemaVersion}</td><td>{date(version.activatedAt)}</td><td>{version.isActive?<span className="badge">Aktív</span>:<span className="badge">Korábbi</span>}</td><td><button type="button" className="btn btnGhost" disabled={Boolean(busy)} onClick={()=>restore(version)}>{busy===version.id?'Visszatöltés…':'Visszaállítás piszkozatba'}</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
