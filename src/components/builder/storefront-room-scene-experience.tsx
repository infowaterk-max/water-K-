'use client';

import {useMemo,useState} from 'react';
import type {InteractiveSceneHotspot,InteractiveSceneProductProjection} from '@/lib/commerce/interactive-scene';
import {buildRoomSceneComposerReadModel} from '@/lib/commerce/room-scene-composer';

function initialSelected(hotspots:readonly InteractiveSceneHotspot[],products:readonly InteractiveSceneProductProjection[]){
  const byProduct=new Map(products.map(product=>[product.productId,product]));
  const selected:Record<string,string>={};
  for(const hotspot of hotspots){
    const variants=(byProduct.get(hotspot.productId)?.variants??[]).filter(variant=>variant.eligible&&variant.channelVisible);
    if(hotspot.defaultVariantId&&variants.some(variant=>variant.variantId===hotspot.defaultVariantId))selected[hotspot.id]=hotspot.defaultVariantId;
    else if(variants.length===1&&variants[0])selected[hotspot.id]=variants[0].variantId;
  }
  return selected;
}

export function StorefrontRoomSceneExperience({tenantId,sceneKey,hotspots,products,title}:{
  tenantId:string;
  sceneKey:string;
  hotspots:readonly InteractiveSceneHotspot[];
  products:readonly InteractiveSceneProductProjection[];
  title:string;
}){
  const[selectedVariants,setSelectedVariants]=useState<Record<string,string>>(()=>initialSelected(hotspots,products));
  const[includedOptional,setIncludedOptional]=useState<string[]>([]);
  const model=useMemo(()=>buildRoomSceneComposerReadModel({
    tenantId,
    scene:{sceneKey,kind:'room',hotspots},
    products,
    selectedVariants,
    includedOptionalHotspotIds:includedOptional,
  }),[tenantId,sceneKey,hotspots,products,selectedVariants,includedOptional]);
  const includedSet=new Set(includedOptional);
  return <section data-room-scene-composer-v1 data-room-composer-status={model.status} style={{display:'grid',gap:'.85rem',padding:'1rem',border:'1px solid var(--shoporation-color-border,#ddd)',borderRadius:'var(--shoporation-radius-m,1rem)'}}>
    <div style={{display:'grid',gap:'.25rem'}}><strong>{title||'A teljes enteriőr'}</strong><small>Válaszd ki a valós katalógusváltozatokat. Több változat esetén a Shoperation nem választ helyetted.</small></div>
    <div style={{display:'grid',gap:'.65rem'}}>{model.slots.map(slot=>{
      const active=slot.required||includedSet.has(slot.hotspotId);
      const selected=slot.variants.find(variant=>variant.variantId===selectedVariants[slot.hotspotId]);
      return <article key={slot.hotspotId} data-room-slot={slot.hotspotId} style={{display:'grid',gap:'.45rem',padding:'.8rem',background:'var(--shoporation-color-surface,#f5f5f5)',borderRadius:'.75rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:'.75rem',alignItems:'baseline',flexWrap:'wrap'}}><a href={slot.href} style={{color:'inherit',fontWeight:700}}>{slot.label}</a><small>{slot.required?'Kötelező elem':'Opcionális elem'}</small></div>
        {!slot.required?<label style={{display:'flex',gap:'.5rem',alignItems:'center'}}><input type="checkbox" checked={includedSet.has(slot.hotspotId)} onChange={event=>setIncludedOptional(current=>event.target.checked?[...new Set([...current,slot.hotspotId])]:current.filter(id=>id!==slot.hotspotId))}/><span>Hozzáadom a teljes szetthez</span></label>:null}
        {active?<label style={{display:'grid',gap:'.25rem'}}><span>Változat</span><select value={selectedVariants[slot.hotspotId]??''} onChange={event=>setSelectedVariants(current=>({...current,[slot.hotspotId]:event.target.value}))}><option value="">Válassz változatot…</option>{slot.variants.map(variant=><option key={variant.variantId} value={variant.variantId} disabled={!variant.available}>{variant.label} · {variant.priceDisplay} · {variant.stockLabel}</option>)}</select></label>:null}
        {active&&selected?<small>{selected.priceDisplay} · {selected.stockLabel}</small>:null}
      </article>;
    })}</div>
    <div style={{display:'grid',gap:'.3rem',borderTop:'1px solid var(--shoporation-color-border,#ddd)',paddingTop:'.8rem'}}>
      <strong>{model.subtotalDisplay?`Jelenlegi részösszeg: ${model.subtotalDisplay}`:'A teljes szett még nincs összeállítva.'}</strong>
      <small>A részösszeg nem ár-authority. A végleges ár, csatorna és készlet a kosár-integrációnál újraellenőrzendő.</small>
      <span aria-live="polite" style={{fontWeight:700}}>{model.ready?'A teljes szett összeállítása érvényes.':'Válaszd ki az összes szükséges és elérhető változatot.'}</span>
    </div>
  </section>;
}
