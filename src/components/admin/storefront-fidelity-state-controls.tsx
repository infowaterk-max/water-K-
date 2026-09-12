'use client';

import {useState} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {setStorefrontNodeStyleSlot} from '@/lib/builder/storefront-fidelity-builder-operations';
import {sanitizeStorefrontStyleSlots} from '@/lib/builder/storefront-fidelity-engine';
import {
  STOREFRONT_INTERACTION_STATES,
  sanitizeStorefrontInteractionStyle,
  storefrontInteractionSlotName,
  storefrontInteractionTargetsForComponent,
  type StorefrontInteractionState,
  type StorefrontInteractionStyle,
} from '@/lib/builder/storefront-fidelity-interaction-state';
import styles from './storefront-visual-builder.module.css';

const STATE_LABELS:Record<StorefrontInteractionState,string>={hover:'Hover',focus:'Billentyűzet-fókusz',active:'Lenyomott / aktív',disabled:'Tiltott'};
const viewportLabel=(viewport:StorefrontViewport)=>viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil';
const numberOrUndefined=(value:string)=>{if(!value.trim())return undefined;const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;};

function directStateStyle(node:StorefrontComponentNode,viewport:StorefrontViewport,baseSlot:string,state:StorefrontInteractionState):StorefrontInteractionStyle{
  const slots=sanitizeStorefrontStyleSlots(node.config.styleSlots);
  const slot=slots[storefrontInteractionSlotName(baseSlot,state)];
  return sanitizeStorefrontInteractionStyle(slot?.[viewport]);
}

export function StorefrontFidelityStateControls({document,node,viewport,configurable,onApply}:{
  document:StorefrontPageDocument;
  node:StorefrontComponentNode;
  viewport:StorefrontViewport;
  configurable:readonly string[];
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const targets=storefrontInteractionTargetsForComponent(node.componentKey);
  const[state,setState]=useState<StorefrontInteractionState>('hover');
  const[targetSlot,setTargetSlot]=useState(targets[0]?.slot??'root');
  if(!configurable.includes('styleSlots')||!targets.length)return null;
  const target=targets.find(item=>item.slot===targetSlot)??targets[0];
  const current=directStateStyle(node,viewport,target.slot,state);
  const slotName=storefrontInteractionSlotName(target.slot,state);
  const apply=(patch:Partial<StorefrontInteractionStyle>)=>{
    const next={...current,...patch} as StorefrontInteractionStyle;
    for(const[key,value]of Object.entries(next))if(value===''||value===undefined)delete(next as Record<string,unknown>)[key];
    onApply(setStorefrontNodeStyleSlot(document,node.id,slotName,viewport,next),`${viewportLabel(viewport)} ${target.label.toLowerCase()} · ${STATE_LABELS[state]} állapot módosítva.`);
  };
  return <div className={styles.fieldGroup}>
    <strong>Interakciós állapotok</strong>
    <p className={styles.emptyHint}>A hover, fókusz, aktív és tiltott megjelenés viewportonként külön állítható. Csak kötött, sanitizerrel ellenőrzött style slotok kerülnek a közös Runtime-ba.</p>
    {targets.length>1?<label className={styles.field}><span>Interaktív cél</span><select value={target.slot} onChange={event=>setTargetSlot(event.target.value)}>{targets.map(item=><option key={item.slot} value={item.slot}>{item.label}</option>)}</select></label>:null}
    <label className={styles.field}><span>Állapot</span><select value={state} onChange={event=>setState(event.target.value as StorefrontInteractionState)}>{STOREFRONT_INTERACTION_STATES.map(item=><option key={item} value={item}>{STATE_LABELS[item]}</option>)}</select></label>
    <label className={styles.field}><span>Háttérszín</span><input value={String(current.backgroundColor??'')} placeholder="Örökölt" onChange={event=>apply({backgroundColor:event.target.value})}/></label>
    <label className={styles.field}><span>Szövegszín</span><input value={String(current.color??'')} placeholder="Örökölt" onChange={event=>apply({color:event.target.value})}/></label>
    <label className={styles.field}><span>Szegélyszín</span><input value={String(current.borderColor??'')} placeholder="Örökölt" onChange={event=>apply({borderColor:event.target.value})}/></label>
    <label className={styles.field}><span>Árnyék</span><input value={String(current.boxShadow??'')} placeholder="Örökölt" onChange={event=>apply({boxShadow:event.target.value})}/></label>
    <label className={styles.field}><span>Transform</span><input value={String(current.transform??'')} placeholder="pl. translateY(-2px)" onChange={event=>apply({transform:event.target.value})}/></label>
    <label className={styles.field}><span>Filter</span><input value={String(current.filter??'')} placeholder="pl. brightness(1.05)" onChange={event=>apply({filter:event.target.value})}/></label>
    <label className={styles.field}><span>Átlátszóság</span><input type="number" min="0" max="1" step="0.05" value={current.opacity??''} onChange={event=>apply({opacity:numberOrUndefined(event.target.value)})}/></label>
    <label className={styles.field}><span>Betűvastagság</span><input type="number" min="100" max="900" step="50" value={current.fontWeight??''} onChange={event=>apply({fontWeight:numberOrUndefined(event.target.value)})}/></label>
    <label className={styles.field}><span>Szövegdíszítés</span><select value={String(current.textDecoration??'')} onChange={event=>apply({textDecoration:event.target.value})}><option value="">Örökölt</option><option value="none">Nincs</option><option value="underline">Aláhúzás</option><option value="line-through">Áthúzás</option></select></label>
    {Object.keys(current).length?<button type="button" className={styles.addSectionButton} onClick={()=>onApply(setStorefrontNodeStyleSlot(document,node.id,slotName,viewport,{}),`${viewportLabel(viewport)} ${target.label.toLowerCase()} · ${STATE_LABELS[state]} állapot öröklésre állítva.`)}>Állapot visszaállítása öröklésre</button>:null}
  </div>;
}
