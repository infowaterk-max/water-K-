'use client';

import {useEffect,useState} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import type {StorefrontBuilderEditMode} from '@/lib/builder/storefront-fidelity-engine';
import {
  STOREFRONT_GRID_SELF_ALIGNMENTS,
  inspectStorefrontCustomGridTracks,
  inspectStorefrontGridPlacement,
  resetStorefrontResponsiveGridPlacement,
  setStorefrontCustomGridTracks,
  setStorefrontResponsiveGridPlacement,
  type StorefrontGridPlacement,
  type StorefrontGridSelfAlignment,
} from '@/lib/builder/storefront-fidelity-layout';
import styles from './storefront-visual-builder.module.css';

const viewportLabel=(viewport:StorefrontViewport)=>viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil';
const numberOrUndefined=(value:string)=>{const parsed=Number(value);return value.trim()!==''&&Number.isFinite(parsed)?parsed:undefined;};
const ALIGN_LABELS:Record<StorefrontGridSelfAlignment,string>={auto:'Örökölt',start:'Kezdet',center:'Közép',end:'Vég',stretch:'Nyújtás'};

export function StorefrontFidelityLayoutControls({document,node,viewport,editMode,onApply}:{
  document:StorefrontPageDocument;
  node:StorefrontComponentNode;
  viewport:StorefrontViewport;
  editMode:StorefrontBuilderEditMode;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const placement=inspectStorefrontGridPlacement(document,node.id,viewport);
  const tracks=inspectStorefrontCustomGridTracks(document,node.id,viewport);
  const expert=editMode==='expert';
  const[trackDraft,setTrackDraft]=useState(tracks.weights.join(', '));
  useEffect(()=>setTrackDraft(tracks.weights.join(', ')),[node.id,viewport,tracks.hasOverride,tracks.weights.join(',')]);

  const applyPlacement=(patch:Partial<StorefrontGridPlacement>)=>{
    const next={...placement.direct,...patch};
    for(const[key,value]of Object.entries(next))if(value===undefined||(value==='auto'))delete(next as Record<string,unknown>)[key];
    onApply(setStorefrontResponsiveGridPlacement(document,node.id,viewport,next),`${viewportLabel(viewport)} grid-elhelyezés módosítva.`);
  };
  const applyTracks=()=>{
    const weights=trackDraft.split(',').map(item=>Number(item.trim())).filter(value=>Number.isFinite(value));
    if(!trackDraft.trim()){
      onApply(setStorefrontCustomGridTracks(document,node.id,viewport,null),`${viewportLabel(viewport)} custom track öröklésre állítva.`);
      return;
    }
    if(weights.length!==trackDraft.split(',').length||weights.length<1||weights.length>12||weights.some(weight=>weight<.25||weight>8))return;
    onApply(setStorefrontCustomGridTracks(document,node.id,viewport,weights),`${viewportLabel(viewport)} custom grid track módosítva.`);
  };

  return <div className={styles.fieldGroup}>
    <strong>{viewportLabel(viewport)} grid és igazítás</strong>
    <p className={styles.emptyHint}>A 12 oszlopos grid ugyanazon Page Schema responsive override-jait használja. Az üres mező örököl; nincs külön mobil DOM vagy második layout engine.</p>
    <div className={styles.metaGrid}>
      <span><small>Grid override</small><b>{placement.hasOverride?'Egyedi':'Örökölt'}</b></span>
      {node.componentKey==='layout.grid'?<span><small>Track override</small><b>{tracks.hasOverride?'Egyedi':'Örökölt'}</b></span>:null}
    </div>
    <label className={styles.field}><span>Szélesség / span</span><select value={placement.direct.span??''} onChange={event=>applyPlacement({span:numberOrUndefined(event.target.value)})}><option value="">Örökölt</option>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} / 12</option>)}</select></label>
    <label className={styles.field}><span>Responsive order</span><input type="number" min="-20" max="20" step="1" value={placement.direct.order??''} placeholder="Örökölt" onChange={event=>applyPlacement({order:numberOrUndefined(event.target.value)})}/></label>
    <label className={styles.field}><span>Függőleges igazítás</span><select value={placement.direct.alignSelf??'auto'} onChange={event=>applyPlacement({alignSelf:event.target.value as StorefrontGridSelfAlignment})}>{STOREFRONT_GRID_SELF_ALIGNMENTS.map(value=><option key={value} value={value}>{ALIGN_LABELS[value]}</option>)}</select></label>
    <label className={styles.field}><span>Vízszintes igazítás</span><select value={placement.direct.justifySelf??'auto'} onChange={event=>applyPlacement({justifySelf:event.target.value as StorefrontGridSelfAlignment})}>{STOREFRONT_GRID_SELF_ALIGNMENTS.map(value=><option key={value} value={value}>{ALIGN_LABELS[value]}</option>)}</select></label>
    {expert?<>
      <label className={styles.field}><span>Grid start</span><input type="number" min="1" max="12" step="1" value={placement.direct.start??''} placeholder="Örökölt" onChange={event=>applyPlacement({start:numberOrUndefined(event.target.value)})}/></label>
      <label className={styles.field}><span>Grid end</span><input type="number" min="2" max="13" step="1" value={placement.direct.end??''} placeholder="Örökölt" onChange={event=>applyPlacement({end:numberOrUndefined(event.target.value)})}/></label>
      {node.componentKey==='layout.grid'?<>
        <label className={styles.field}><span>Custom track súlyok</span><input type="text" value={trackDraft} placeholder="pl. 2, 1, 1" onChange={event=>setTrackDraft(event.target.value)} onBlur={applyTracks}/></label>
        <p className={styles.emptyHint}>1–12 strukturált fr-súly, egyenként 0,25–8 között. A Builder ebből allowlisted `minmax(0, …fr)` trackeket generál; nyers CSS nem írható be.</p>
        <button type="button" className={styles.addSectionButton} onClick={()=>{setTrackDraft('');onApply(setStorefrontCustomGridTracks(document,node.id,viewport,null),`${viewportLabel(viewport)} custom grid track öröklésre állítva.`);}}>Custom track visszaállítása</button>
      </>:null}
    </>:null}
    {placement.hasOverride?<button type="button" className={styles.addSectionButton} onClick={()=>onApply(resetStorefrontResponsiveGridPlacement(document,node.id,viewport),`${viewportLabel(viewport)} grid-elhelyezés öröklésre állítva.`)}>Grid override visszaállítása</button>:null}
  </div>;
}
