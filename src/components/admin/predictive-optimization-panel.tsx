'use client';
import { useEffect,useMemo,useState } from 'react';
import type { CommerceAutonomyPolicy,PredictiveCommerceSignal } from '@/lib/optimization/predictive-commerce-core';

type Run={id:string;prediction_key:string;action_kind:string;status:string;proposal_id?:string|null;runbook_instance_id?:string|null;created_at:string;compensated_at?:string|null};
type Payload={signals:PredictiveCommerceSignal[];policy:CommerceAutonomyPolicy;control:{exists:boolean;globalPaused:boolean;circuitOpenUntil:string|null};runs:Run[]};
const modeLabel:Record<string,string>={off:'Kikapcsolva',supervised:'Felügyelt',bounded:'Korlátozott autonóm'};
const statusLabel:Record<string,string>={blocked:'Blokkolva',supervised:'Felügyelt',approval_required:'Jóváhagyás kell',awaiting_approval:'Jóváhagyásra vár',retry:'Újrapróbálható',dead_letter:'Kézi kivizsgálás',completed:'Végrehajtva',compensated:'Kompenzálva'};

export function PredictiveOptimizationPanel(){
  const[data,setData]=useState<Payload|null>(null);const[error,setError]=useState('');const[busy,setBusy]=useState('');
  const[draft,setDraft]=useState<CommerceAutonomyPolicy|null>(null);
  async function load(){
    setError('');try{const response=await fetch('/api/admin/optimization',{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error||'A Block 19 állapot nem tölthető be.');setData(body);setDraft(body.policy)}catch(e){setError(e instanceof Error?e.message:'A Block 19 állapot nem tölthető be.')}
  }
  useEffect(()=>{void load()},[]);
  const runByPrediction=useMemo(()=>new Map((data?.runs??[]).map(run=>[run.prediction_key,run])),[data]);
  async function save(){if(!draft)return;setBusy('save');setError('');try{const response=await fetch('/api/admin/optimization',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});const body=await response.json();if(!response.ok)throw new Error(body.error||'A policy nem menthető.');await load()}catch(e){setError(e instanceof Error?e.message:'A policy nem menthető.')}finally{setBusy('')}}
  async function execute(key:string){setBusy(key);setError('');try{const response=await fetch('/api/admin/optimization',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'execute',predictionKey:key})});const body=await response.json();if(!response.ok&&response.status!==202)throw new Error(body.error||'A guardrail kiértékelés nem sikerült.');await load()}catch(e){setError(e instanceof Error?e.message:'A guardrail kiértékelés nem sikerült.')}finally{setBusy('')}}
  async function compensate(runId:string){setBusy(runId);setError('');try{const response=await fetch('/api/admin/optimization',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'compensate',runId})});const body=await response.json();if(!response.ok)throw new Error(body.error||'A kompenzáció nem sikerült.');await load()}catch(e){setError(e instanceof Error?e.message:'A kompenzáció nem sikerült.')}finally{setBusy('')}}
  async function emergencyStop(){setBusy('kill');setError('');try{const response=await fetch('/api/admin/optimization',{method:'DELETE'});const body=await response.json();if(!response.ok)throw new Error(body.error||'A vészleállítás nem sikerült.');await load()}catch(e){setError(e instanceof Error?e.message:'A vészleállítás nem sikerült.')}finally{setBusy('')}}
  if(!data||!draft)return <section className="card"><h2>Prediktív optimalizáció</h2><p className={error?'errorNotice':'muted'}>{error||'Bizonyítékok betöltése…'}</p></section>;
  return <div className="cards">
    {error&&<div className="errorNotice" role="alert">{error}</div>}
    <section className="card">
      <span className="eyebrow">Block 19 · Guardrail-first</span><h2>Autonómia policy</h2>
      <p className="muted">Alapállapot: fail-closed. Csak az explicit allowlistelt Block 17 workflow-k futhatnak unattended; ár-, promóció-, készlet- és merchandising-mutatiók jóváhagyás alatt maradnak.</p>
      <div className="adminFormGrid">
        <label>Üzemmód<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as CommerceAutonomyPolicy['mode']})}><option value="off">Kikapcsolva</option><option value="supervised">Felügyelt</option><option value="bounded">Korlátozott autonóm</option></select></label>
        <label>Minimum confidence<input type="number" min="0" max="1" step="0.01" value={draft.minConfidence} onChange={e=>setDraft({...draft,minConfidence:Number(e.target.value)})}/></label>
        <label>Maximum risk score<input type="number" min="0" max="100" value={draft.maxRiskScore} onChange={e=>setDraft({...draft,maxRiskScore:Number(e.target.value)})}/></label>
        <label>Maximum hatás (nettó Ft)<input type="number" min="0" value={draft.maxImpactNetHuf} onChange={e=>setDraft({...draft,maxImpactNetHuf:Number(e.target.value)})}/></label>
        <label>Margin floor %<input type="number" min="0" max="100" step="0.1" value={draft.marginFloorPercent} onChange={e=>setDraft({...draft,marginFloorPercent:Number(e.target.value)})}/></label>
        <label>Inventory floor<input type="number" min="0" value={draft.inventoryFloorQuantity} onChange={e=>setDraft({...draft,inventoryFloorQuantity:Number(e.target.value)})}/></label>
        <label>Max. promotion %<input type="number" min="0" max="100" step="0.1" value={draft.maxDiscountPercent} onChange={e=>setDraft({...draft,maxDiscountPercent:Number(e.target.value)})}/></label>
        <label>Max. budget (nettó Ft)<input type="number" min="0" value={draft.maxBudgetNetHuf} onChange={e=>setDraft({...draft,maxBudgetNetHuf:Number(e.target.value)})}/></label>
        <label>Stale limit (perc)<input type="number" min="1" max="1440" value={draft.staleAfterMinutes} onChange={e=>setDraft({...draft,staleAfterMinutes:Number(e.target.value)})}/></label>
      </div>
      <label className="checkRow"><input type="checkbox" checked={!draft.killSwitch} onChange={e=>setDraft({...draft,killSwitch:!e.target.checked})}/> Tenant kill switch feloldva</label>
      <label className="checkRow"><input type="checkbox" checked={draft.allowedActions.includes('workflow.inventory-pressure')} onChange={e=>setDraft({...draft,allowedActions:e.target.checked?[...new Set([...draft.allowedActions,'workflow.inventory-pressure' as const])]:draft.allowedActions.filter(a=>a!=='workflow.inventory-pressure')})}/> Készletnyomás runbook unattended engedélyezve</label>
      <label className="checkRow"><input type="checkbox" checked={draft.allowedActions.includes('workflow.customer-value-risk')} onChange={e=>setDraft({...draft,allowedActions:e.target.checked?[...new Set([...draft.allowedActions,'workflow.customer-value-risk' as const])]:draft.allowedActions.filter(a=>a!=='workflow.customer-value-risk')})}/> Customer-value runbook unattended engedélyezve</label>
      <p className="muted">Automation control: {data.control.exists?(data.control.globalPaused?'szüneteltetve':'aktív'):'nincs inicializálva'}{data.control.circuitOpenUntil?` · circuit open: ${new Date(data.control.circuitOpenUntil).toLocaleString('hu-HU')}`:''}</p>
      <div className="buttonRow"><button className="button" type="button" onClick={save} disabled={busy==='save'}>{busy==='save'?'Mentés…':'Policy mentése'}</button><button className="btn btnGhost" type="button" onClick={emergencyStop} disabled={busy==='kill'}>{busy==='kill'?'Leállítás…':'Vészleállítás + automation pause'}</button></div>
    </section>
    <section className="card"><h2>Prediktív jelzések</h2><p className="muted">A forecast determinisztikus, canonical evidence-ből készül. A prediction és execution külön réteg.</p>
      <div className="cards">{data.signals.map(signal=>{const run=runByPrediction.get(signal.key);return <article className="card" key={signal.key}><span className="badge">{signal.riskClass} · risk {signal.riskScore} · confidence {(signal.confidence*100).toFixed(0)}%</span><h3>{signal.title}</h3><p>{signal.summary}</p><p className="muted"><strong>Várható kimenet:</strong> {signal.expectedOutcome}</p><p className="muted"><strong>Javaslat:</strong> {signal.recommendation}</p><p className="muted"><strong>Authority:</strong> {signal.authority} · <strong>Action:</strong> {signal.actionKind}</p><details><summary>Evidence trace</summary><div className="integrationList">{signal.evidence.map((item,index)=><div key={index}><span>{item.label}</span><strong>{String(item.value)}</strong><small>{item.source}</small></div>)}</div></details><div className="buttonRow"><button className="button" type="button" disabled={busy===signal.key} onClick={()=>execute(signal.key)}>{busy===signal.key?'Kiértékelés…':'Guardrail kiértékelés / végrehajtás'}</button>{run?.proposal_id&&<a className="btn btnGhost" href="/admin/intezkedesek">Jóváhagyási javaslat</a>}</div>{run&&<p className="muted">Legutóbbi állapot: {statusLabel[run.status]??run.status} · {new Date(run.created_at).toLocaleString('hu-HU')}</p>}{run?.runbook_instance_id&&!run.compensated_at&&<button className="btn btnGhost" type="button" disabled={busy===run.id} onClick={()=>compensate(run.id)}>Emberi override / kompenzáció</button>}</article>})}</div>
      {data.signals.length===0&&<p className="muted">Nincs aktuális, bizonyíték-alapú Block 19 prediktív jelzés.</p>}
    </section>
    <section className="card"><h2>Autonómia bizonyíték</h2><p className="muted">Aktuális policy: {modeLabel[data.policy.mode]??data.policy.mode} · kill switch: {data.policy.killSwitch?'bekapcsolva':'feloldva'}.</p><div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Idő</th><th>Predikció</th><th>Action</th><th>Státusz</th></tr></thead><tbody>{data.runs.map(run=><tr key={run.id}><td>{new Date(run.created_at).toLocaleString('hu-HU')}</td><td><code>{run.prediction_key}</code></td><td>{run.action_kind}</td><td>{statusLabel[run.status]??run.status}</td></tr>)}</tbody></table></div>{data.runs.length===0&&<p className="muted">Még nincs Block 19 execution evidence.</p>}</section>
  </div>;
}
