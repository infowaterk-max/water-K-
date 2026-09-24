'use client';

import{useCallback,useEffect,useMemo,useState}from'react';
import{ShoperationDialog}from'@/components/admin/shoperation-dialog';

type Ownership='undetermined'|'merchant'|'platform'|'shared';
type Severity='low'|'normal'|'high'|'critical';
type Status='submitted'|'triaged'|'merchant_action'|'platform_investigation'|'auto_healing'|'repair_proposed'|'resolved'|'rejected';
type Confidence='low'|'medium'|'high'|'deterministic'|null;
type IncidentRow={
 id:string;incident_number:string;instance_id:string|null;support_ticket_id:string|null;source:string;reporter_role:string;
 title:string;category:string;severity:Severity;status:Status;ownership:Ownership;ownership_reason_code:string|null;triage_confidence:Confidence;
 known_failure_id:string|null;correlation_id:string|null;route_path:string|null;surface_key:string|null;component_key:string|null;
 app_version:string|null;environment:string|null;created_at:string;updated_at:string;triaged_at:string|null;resolved_at:string|null;
};
type RepairKey='observability.recheck'|'storefront.cache.revalidate'|'code.repair.pr';
const ownershipLabel:Record<Ownership,string>={undetermined:'Nincs eldöntve',merchant:'Webshop',platform:'Shoperation',shared:'Közös'};
const severityLabel:Record<Severity,string>={low:'Alacsony',normal:'Normál',high:'Magas',critical:'Kritikus'};
const statusLabel:Record<string,string>={submitted:'Beérkezett',triaged:'Besorolt',merchant_action:'Webshop teendő',platform_investigation:'Shoperation vizsgálat',auto_healing:'Öngyógyítás',repair_proposed:'Javítás javasolva',resolved:'Megoldott',rejected:'Elutasított'};
const sourceLabel:Record<string,string>={customer:'Vásárló',merchant:'Webshop',system:'Rendszer',observability:'Megfigyelés'};
const categoryLabel:Record<string,string>={ui:'Felület',content:'Tartalom',catalog:'Katalógus',commerce:'Kereskedelem',payment:'Fizetés',shipping:'Szállítás',account:'Fiók',integration:'Integráció',performance:'Teljesítmény',security:'Biztonság',data:'Adat',other:'Egyéb'};
const repairLabel:Record<RepairKey,string>={
 'observability.recheck':'Megfigyelési jel újraellenőrzése',
 'storefront.cache.revalidate':'Storefront cache újraérvényesítésének javaslata',
 'code.repair.pr':'Kódjavítási branch / PR javaslat',
};
const stateTone=(value:string)=>value==='critical'||value==='rejected'?'danger':value==='high'||value==='shared'||value==='repair_proposed'?'warning':value==='platform'||value==='resolved'?'success':'neutral';

export function PlatformIncidentCenter(){
 const[rows,setRows]=useState<IncidentRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const[query,setQuery]=useState(''),[ownership,setOwnership]=useState(''),[severity,setSeverity]=useState(''),[status,setStatus]=useState('');
 const[selected,setSelected]=useState<IncidentRow|null>(null),[busy,setBusy]=useState(false),[actionError,setActionError]=useState(''),[actionMessage,setActionMessage]=useState('');
 const[triageOwnership,setTriageOwnership]=useState<Ownership>('undetermined'),[triageStatus,setTriageStatus]=useState<Status>('triaged'),[triageSeverity,setTriageSeverity]=useState<Severity>('normal'),[confidence,setConfidence]=useState<'low'|'medium'|'high'>('medium'),[reasonCode,setReasonCode]=useState('PLATFORM_MANUAL_REVIEW'),[knownFailureId,setKnownFailureId]=useState('');
 const[repairKey,setRepairKey]=useState<RepairKey>('observability.recheck');

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/platform/incidents?limit=200',{credentials:'same-origin',cache:'no-store'});
   const body=await response.json().catch(()=>({})) as{incidents?:IncidentRow[];error?:string};
   if(!response.ok)throw new Error(body.error||'Az incidenslista nem tölthető be.');
   setRows(Array.isArray(body.incidents)?body.incidents:[]);
  }catch(cause){setError(cause instanceof Error?cause.message:'Az incidenslista nem tölthető be.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const filtered=useMemo(()=>{
  const needle=query.trim().toLowerCase();
  return rows.filter(row=>
   (!ownership||row.ownership===ownership)&&
   (!severity||row.severity===severity)&&
   (!status||row.status===status)&&
   (!needle||[row.incident_number,row.title,row.category,row.route_path??'',row.known_failure_id??'',row.correlation_id??'',row.instance_id??''].some(value=>value.toLowerCase().includes(needle)))
  );
 },[rows,query,ownership,severity,status]);

 const counts=useMemo(()=>({
  open:rows.filter(row=>!['resolved','rejected'].includes(row.status)).length,
  critical:rows.filter(row=>row.severity==='critical').length,
  platform:rows.filter(row=>row.ownership==='platform').length,
  shared:rows.filter(row=>row.ownership==='shared').length,
  unknown:rows.filter(row=>row.ownership==='undetermined').length,
 }),[rows]);

 function openIncident(row:IncidentRow){
  setSelected(row);setActionError('');setActionMessage('');
  setTriageOwnership(row.ownership);setTriageStatus(row.status==='submitted'?'triaged':row.status);setTriageSeverity(row.severity);
  setConfidence(row.triage_confidence==='low'||row.triage_confidence==='medium'||row.triage_confidence==='high'?row.triage_confidence:'medium');
  setReasonCode(row.ownership_reason_code||'PLATFORM_MANUAL_REVIEW');setKnownFailureId(row.known_failure_id||'');
  setRepairKey(row.route_path?'storefront.cache.revalidate':'observability.recheck');
 }
 const close=()=>{if(!busy)setSelected(null)};

 async function saveTriage(){
  if(!selected||busy)return;
  setBusy(true);setActionError('');setActionMessage('');
  try{
   const response=await fetch(`/api/platform/incidents/${selected.id}/triage`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    ownership:triageOwnership,reasonCode:reasonCode.trim(),status:triageStatus,severity:triageSeverity,knownFailureId:knownFailureId.trim()||null,confidence,
   })});
   const body=await response.json().catch(()=>({})) as{error?:string};
   if(!response.ok)throw new Error(body.error||'A besorolás nem menthető.');
   setActionMessage('A besorolás auditáltan mentve.');
   await load();
   setSelected(current=>current?{...current,ownership:triageOwnership,ownership_reason_code:reasonCode.trim(),status:triageStatus,severity:triageSeverity,known_failure_id:knownFailureId.trim()||null,triage_confidence:confidence}:current);
  }catch(cause){setActionError(cause instanceof Error?cause.message:'A besorolás nem menthető.')}
  finally{setBusy(false)}
 }

 async function proposeRepair(){
  if(!selected||busy)return;
  setBusy(true);setActionError('');setActionMessage('');
  try{
   const response=await fetch(`/api/platform/incidents/${selected.id}/repair`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({runbookKey:repairKey})});
   const body=await response.json().catch(()=>({})) as{error?:string;repairRequestId?:string;runbookKey?:string;risk?:string;mode?:string;autoApply?:boolean};
   if(!response.ok)throw new Error(body.error||'A javítási javaslat nem hozható létre.');
   if(body.mode!=='propose'||body.autoApply!==false)throw new Error('A javítási javaslat biztonsági bizonyítéka hiányos.');
   setActionMessage(`Javítási javaslat rögzítve: ${body.repairRequestId??'azonosító nélkül'} · ${body.risk??'ismeretlen'} kockázat. Automatikus alkalmazás: nem.`);
  }catch(cause){setActionError(cause instanceof Error?cause.message:'A javítási javaslat nem hozható létre.')}
  finally{setBusy(false)}
 }

 return <>
  {error?<div className="errorNotice" role="alert"><strong>{error}</strong></div>:null}
  <div className="cards adminMetricCards">
   <div className="card"><span className="badge">Nyitott</span><div className="price">{loading?'—':counts.open}</div></div>
   <div className="card"><span className="badge">Kritikus</span><div className="price">{loading?'—':counts.critical}</div></div>
   <div className="card"><span className="badge">Shoperation</span><div className="price">{loading?'—':counts.platform}</div></div>
   <div className="card"><span className="badge">Közös vizsgálat</span><div className="price">{loading?'—':counts.shared}</div></div>
   <div className="card"><span className="badge">Besorolatlan</span><div className="price">{loading?'—':counts.unknown}</div></div>
  </div>

  <section className="card">
   <div className="adminToolbar"><div><span className="eyebrow">Munkasor</span><h2>Technikai incidensek</h2></div><button className="btn btnGhost" type="button" disabled={loading} onClick={()=>void load()}>{loading?'Frissítés…':'Frissítés'}</button></div>
   <div className="adminForm" style={{gridTemplateColumns:'minmax(14rem,2fr) repeat(3,minmax(9rem,1fr))'}}>
    <label>Keresés<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="INC-, cím, útvonal, Known Failure…"/></label>
    <label>Felelős<select value={ownership} onChange={event=>setOwnership(event.target.value)}><option value="">Mind</option>{Object.entries(ownershipLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Súlyosság<select value={severity} onChange={event=>setSeverity(event.target.value)}><option value="">Mind</option>{Object.entries(severityLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Állapot<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">Mind</option>{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   </div>
   <div className="adminTableScroll"><table className="adminTable">
    <thead><tr><th>Incidens</th><th>Forrás</th><th>Probléma</th><th>Súlyosság</th><th>Felelős</th><th>Állapot</th><th>Idő</th><th></th></tr></thead>
    <tbody>{filtered.map(row=><tr key={row.id}>
     <td><strong>{row.incident_number}</strong><div className="muted">{row.environment??'—'} · {row.app_version?.slice(0,12)??'—'}</div></td>
     <td>{sourceLabel[row.source]??row.source}<div className="muted">{row.reporter_role}</div></td>
     <td><strong>{row.title}</strong><div className="muted">{categoryLabel[row.category]??row.category}{row.route_path?` · ${row.route_path}`:''}</div>{row.known_failure_id?<div className="muted">Known Failure: <code>{row.known_failure_id}</code></div>:null}</td>
     <td><span className={`adminStatePill ${stateTone(row.severity)}`}>{severityLabel[row.severity]}</span></td>
     <td><span className={`adminStatePill ${stateTone(row.ownership)}`}>{ownershipLabel[row.ownership]}</span><div className="muted">{row.triage_confidence??'—'}</div></td>
     <td>{statusLabel[row.status]??row.status}</td>
     <td>{new Date(row.created_at).toLocaleString('hu-HU')}</td>
     <td><button className="btn btnGhost" type="button" onClick={()=>openIncident(row)}>Megnyitás</button></td>
    </tr>)}</tbody>
   </table></div>
   {!loading&&filtered.length===0?<p className="muted">A jelenlegi szűrőkkel nincs megjeleníthető incidens.</p>:null}
  </section>

  <div className="adminAuditNotice"><strong>Biztonsági határ:</strong> a központ auditált besorolást és javítási javaslatot készít. Kódjavítás esetén csak branch / PR útvonal indulhat; közvetlen production módosítás nem.</div>

  <ShoperationDialog open={Boolean(selected)} eyebrow={selected?`Incident Intelligence · ${selected.incident_number}`:'Incident Intelligence'} title={selected?.title??'Incidens'} description={selected?`${sourceLabel[selected.source]??selected.source} · ${categoryLabel[selected.category]??selected.category} · ${selected.route_path??'útvonal nélkül'}`:undefined} confirmLabel="Besorolás mentése" cancelLabel="Bezárás" busy={busy} confirmDisabled={!reasonCode.trim()||reasonCode.trim().length<3} onConfirm={()=>void saveTriage()} onClose={close}>
   {selected?<div style={{display:'grid',gap:'14px'}}>
    <div className="auditGuideGrid">
     <div><strong>Korreláció</strong><div className="muted"><code>{selected.correlation_id??'—'}</code></div></div>
     <div><strong>Tenant</strong><div className="muted"><code>{selected.instance_id??'—'}</code></div></div>
     <div><strong>Surface</strong><div className="muted">{selected.surface_key??'—'} · {selected.component_key??'—'}</div></div>
     <div><strong>Known Failure</strong><div className="muted"><code>{selected.known_failure_id??'—'}</code></div></div>
    </div>
    <div className="adminForm" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
     <label>Felelős<select value={triageOwnership} disabled={busy} onChange={event=>setTriageOwnership(event.target.value as Ownership)}>{Object.entries(ownershipLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label>Súlyosság<select value={triageSeverity} disabled={busy} onChange={event=>setTriageSeverity(event.target.value as Severity)}>{Object.entries(severityLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
     <label>Állapot<select value={triageStatus} disabled={busy} onChange={event=>setTriageStatus(event.target.value as Status)}>{['triaged','merchant_action','platform_investigation','repair_proposed','resolved','rejected'].map(value=><option key={value} value={value}>{statusLabel[value]}</option>)}</select></label>
     <label>Bizonyosság<select value={confidence} disabled={busy} onChange={event=>setConfidence(event.target.value as 'low'|'medium'|'high')}><option value="low">Alacsony</option><option value="medium">Közepes</option><option value="high">Magas</option></select></label>
     <label>Indokláskód<input value={reasonCode} maxLength={120} disabled={busy} onChange={event=>setReasonCode(event.target.value)} /></label>
     <label>Known Failure ID<input value={knownFailureId} maxLength={80} disabled={busy} onChange={event=>setKnownFailureId(event.target.value)} placeholder="pl. SQ-KF-024"/></label>
    </div>
    <section className="card" style={{margin:0}}>
     <span className="eyebrow">Javítási javaslat</span>
     <p className="muted">Csak proposal mód. A rendszer nem alkalmaz kód- vagy production változtatást ebből a felületből.</p>
     <div className="actions">
      <select value={repairKey} disabled={busy} onChange={event=>setRepairKey(event.target.value as RepairKey)}>
       <option value="observability.recheck">{repairLabel['observability.recheck']}</option>
       <option value="storefront.cache.revalidate" disabled={!selected.route_path}>{repairLabel['storefront.cache.revalidate']}</option>
       <option value="code.repair.pr">{repairLabel['code.repair.pr']}</option>
      </select>
      <button className="btn btnGhost" type="button" disabled={busy} onClick={()=>void proposeRepair()}>Javaslat rögzítése</button>
     </div>
    </section>
    {actionError?<div className="errorNotice" role="alert"><strong>{actionError}</strong></div>:null}
    {actionMessage?<div className="adminAuditNotice" role="status">{actionMessage}</div>:null}
   </div>:null}
  </ShoperationDialog>
 </>;
}
