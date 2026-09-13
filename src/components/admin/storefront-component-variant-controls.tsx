'use client';

import {useState} from 'react';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontComponentVariant,
  detectStorefrontComponentVariant,
  listStorefrontComponentVariants,
  listStorefrontVariantCapableNodes,
} from '@/lib/builder/storefront-component-variants';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import styles from './storefront-visual-builder.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const label=(key:string)=>key.split('.').at(-1)?.replace(/[-_]/g,' ')??key;

export function StorefrontComponentVariantControls({document,onApply}:{
  document:StorefrontPageDocument;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const candidates=listStorefrontVariantCapableNodes(document,registry);
  const[selectedNodeId,setSelectedNodeId]=useState(candidates[0]?.id??'');
  const node=candidates.find(candidate=>candidate.id===selectedNodeId)??candidates[0]??null;
  if(!node)return <div className={styles.fieldGroup} data-storefront-component-variants-v1><strong>Komponens variánsok</strong><p className={styles.emptyHint}>Ezen az oldalon nincs variánssal rendelkező komponens.</p></div>;
  const variants=listStorefrontComponentVariants(registry,node);
  const active=detectStorefrontComponentVariant(registry,node);
  const apply=(variantId:string)=>{
    const variant=variants.find(candidate=>candidate.variantId===variantId);
    if(!variant)return;
    const next=applyStorefrontComponentVariant(document,{nodeId:node.id,variantId},registry);
    onApply(next,`${variant.label} komponensvariáns alkalmazva · csak megjelenési beállítások változtak.`);
  };

  return <div className={styles.fieldGroup} data-storefront-component-variants-v1>
    <strong>Komponens variánsok</strong>
    <p className={styles.emptyHint}>Gyors megjelenési irányok a canonical komponenshez. A variáns nem ír át tartalmat, bindingot, termékadatot vagy oldalszerkezetet.</p>
    <label className={styles.field}><span>Szerkesztett komponens</span><select value={node.id} onChange={event=>setSelectedNodeId(event.target.value)}>{candidates.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.id} · {label(candidate.componentKey)}</option>)}</select></label>
    <div className={styles.filterTabs} aria-label="Komponens variánsok">{variants.map(variant=><button key={variant.variantId} type="button" data-active={active?.variantId===variant.variantId} onClick={()=>apply(variant.variantId)} title={variant.description}>{variant.label}</button>)}</div>
    <div className={styles.metaGrid}><span><small>Aktív</small><b>{active?.label??'Egyedi'}</b></span><span><small>Komponens</small><b>{node.componentKey}</b></span></div>
    <p className={styles.emptyHint}>{active?.description??'A jelenlegi megjelenési beállítások nem egyeznek pontosan egyik gyári variánssal sem.'}</p>
  </div>;
}
