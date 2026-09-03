'use client';

import{useState}from'react';
import{useRouter}from'next/navigation';
import type{Product}from'@/lib/catalog';
import type{RecommendationRule}from'@/lib/recommendations/server';

export function RecommendationManager({products,rules}:{products:Product[];rules:RecommendationRule[]}){
  const router=useRouter(),[source,setSource]=useState('all'),[target,setTarget]=useState(products[0]?.id??''),[placement,setPlacement]=useState<'cart'|'post_purchase'>('cart'),[priority,setPriority]=useState(100),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const name=(id:string|null)=>id?products.find(p=>p.id===id)?.name??'Ismeretlen termék':'Minden kosár';

  async function create(){
    if(!target)return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/admin/recommendations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sourceVariantId:source==='all'?null:source,recommendedVariantId:target,placement,priority})});
      const p=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${p.error??'Mentési hiba.'} Az ajánlási szabályt nem tekintjük elmentettnek.`);return}
      setMessage('Ajánlás mentve.');router.refresh();
    }catch{
      setMessage('Hálózati hiba. Az ajánlási szabályt nem tekintjük elmentettnek.');
    }finally{
      setBusy(false);
    }
  }

  async function mutate(id:string,body?:Record<string,unknown>,method='PATCH'){
    if(method==='DELETE'&&!window.confirm('Biztosan törlöd ezt az ajánlási szabályt?'))return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/recommendations/${id}`,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
      const p=await r.json().catch(()=>({}));
      if(!r.ok){setMessage(`${p.error??'Műveleti hiba.'} A szabály módosítását nem tekintjük végrehajtottnak.`);return}
      router.refresh();
    }catch{
      setMessage('Hálózati hiba. A szabály módosítását nem tekintjük végrehajtottnak.');
    }finally{
      setBusy(false);
    }
  }

  return <><section className="featurePanel"><span className="eyebrow">Új ajánlási szabály</span><h2>Mit ajánljon a webshop?</h2><p className="muted">Kapcsolj össze termékeket a kosárban vagy a rendelés utáni oldalon. Az alacsonyabb prioritásszám előrébb kerül.</p><div className="form-grid"><label>Kiinduló termék<select value={source} onChange={e=>setSource(e.target.value)}><option value="all">Minden kosár / általános</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Ajánlott termék<select value={target} onChange={e=>setTarget(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Megjelenés<select value={placement} onChange={e=>setPlacement(e.target.value as typeof placement)}><option value="cart">Kosár cross-sell</option><option value="post_purchase">Rendelés utáni ajánlat</option></select></label><label>Prioritás<input type="number" min="0" max="10000" value={priority} onChange={e=>setPriority(Number(e.target.value))}/></label></div><button className="btn btnPrimary" type="button" disabled={busy||!target||(source!=='all'&&source===target)} onClick={create}>{busy?'Mentés…':'Szabály hozzáadása'}</button>{source!=='all'&&source===target&&<p className="errorNotice">Egy termék nem ajánlhatja saját magát.</p>}{message&&<p className="helperText" role="status">{message}</p>}</section><section className="featurePanel"><span className="eyebrow">Aktív ajánlások</span><h2>Ajánlási sorrend</h2><div className="integrationList">{rules.length?rules.map(rule=><div key={rule.id}><span><strong>{name(rule.sourceVariantId)} → {name(rule.recommendedVariantId)}</strong><br/><span className="muted">{rule.placement==='cart'?'Kosár':'Rendelés után'} · prioritás {rule.priority} · {rule.active?'aktív':'szüneteltetve'}</span></span><span className="actions"><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>mutate(rule.id,{active:!rule.active})}>{rule.active?'Szüneteltetés':'Aktiválás'}</button><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>mutate(rule.id,undefined,'DELETE')}>Törlés</button></span></div>):<p className="muted">Még nincs kézzel beállított szabály. A webshop addig automatikus raktárkészlet-alapú ajánlást használ.</p>}</div></section></>;
}
