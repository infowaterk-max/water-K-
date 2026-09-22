'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { MerchantDecisionCard } from '@/lib/decisioning/merchant-intelligence';

type Explanation={mode:'ai'|'evidence';summary:string;why:string;nextSteps:string[];model?:string};

export function MerchantDecisionPanel({cards}:{cards:MerchantDecisionCard[]}){
  const[busy,setBusy]=useState<string|null>(null);
  const[explanations,setExplanations]=useState<Record<string,Explanation>>({});
  const[errors,setErrors]=useState<Record<string,string>>({});

  async function explain(key:string){
    setBusy(key);setErrors(previous=>({...previous,[key]:''}));
    try{
      const response=await fetch('/api/admin/decisioning/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
      const body=await response.json().catch(()=>({})) as Partial<Explanation>&{error?:string};
      if(!response.ok||!body.summary||!body.why||!Array.isArray(body.nextSteps))throw new Error(body.error||'A magyarázat most nem érhető el.');
      setExplanations(previous=>({...previous,[key]:body as Explanation}));
    }catch(error){setErrors(previous=>({...previous,[key]:error instanceof Error?error.message:'A magyarázat most nem érhető el.'}));}
    finally{setBusy(null);}
  }

  return <section className="card">
    <span className="eyebrow">Block 18 · Human-in-the-loop</span>
    <h2>Döntési intelligencia</h2>
    <p className="muted">A javaslatok az aktuális webshop canonical commerce és operational bizonyítékaiból készülnek. Az AI csak magyaráz: nem ír árat, készletet, promóciót, rendelést vagy ügyfélállapotot.</p>
    <div className="buttonRow"><Link className="btn btnGhost" href="/admin/optimalizalas">Prediktív optimalizáció és guardrail-ek</Link></div>
    <div className="cards">
      {cards.map(card=>{
        const explanation=explanations[card.key],error=errors[card.key];
        return <article className="card" key={card.key}>
          <span className="badge">Prioritás {card.priority} · {card.confidence==='high'?'magas':card.confidence==='medium'?'közepes':'alacsony'} bizonyosság</span>
          <h3>{card.title}</h3>
          <p>{card.summary}</p>
          <p className="muted"><strong>Javaslat:</strong> {card.recommendation}</p>
          <p className="muted"><strong>Authority:</strong> {card.authority}</p>
          {card.evidence.length>0&&<details><summary>Forrásbizonyíték</summary><div className="integrationList">{card.evidence.map((item,index)=><div key={`${card.key}-${index}`}><span>{item.label}</span><strong>{String(item.value)}</strong><small className="muted">{item.source}</small></div>)}</div></details>}
          <div className="buttonRow">
            <button className="button" type="button" onClick={()=>explain(card.key)} disabled={busy===card.key}>{busy===card.key?'Elemzés…':explanation?'AI magyarázat frissítése':'AI magyarázat'}</button>
            <Link className="btn btnGhost" href={card.href}>Bizonyíték / műveleti központ</Link>
          </div>
          {error&&<p className="errorNotice" role="alert">{error}</p>}
          {explanation&&<div className="notice" role="status">
            <strong>{explanation.mode==='ai'?'AI-asszisztált magyarázat':'Bizonyíték-alapú fallback'}</strong>
            <p>{explanation.summary}</p><p>{explanation.why}</p>
            <ul>{explanation.nextSteps.map((step,index)=><li key={index}>{step}</li>)}</ul>
            {explanation.mode==='ai'&&explanation.model&&<p className="muted">Modell: {explanation.model}</p>}
          </div>}
        </article>;
      })}
    </div>
  </section>;
}
