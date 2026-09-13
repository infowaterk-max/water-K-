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
const LABELS:Record<string,string>={'system.header':'Fejléc','system.navigation':'Navigáció','layout.section':'Szekció','layout.container':'Konténer','layout.grid':'Rács','layout.stack':'Elrendezési csoport','content.heading':'Címsor','content.text':'Szöveg','content.image':'Kép','content.button':'Gomb','editorial.footer':'Lábléc','commerce.product-grid':'Termékrács','commerce.checkout-summary':'Rendelési összegzés','commerce.cart-summary':'Kosár összegzés'};
const label=(key:string)=>LABELS[key]??key.split('.').at(-1)?.replace(/[-_]/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())??'Elem';

export function StorefrontComponentVariantControls({document,onApply}:{
  document:StorefrontPageDocument;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const candidates=listStorefrontVariantCapableNodes(document,registry);
  const[selectedNodeId,setSelectedNodeId]=useState(candidates[0]?.id??'');
  const node=candidates.find(candidate=>candidate.id===selectedNodeId)??candidates[0]??null;
  if(!node)return <div className={styles.fieldGroup} data-storefront-component-variants-v1><strong>Megjelenési variánsok</strong><p className={styles.emptyHint}>Ezen az oldalon nincs variánssal rendelkező elem.</p></div>;
  const variants=listStorefrontComponentVariants(registry,node);
  const active=detectStorefrontComponentVariant(registry,node);
  const apply=(variantId:string)=>{
    const variant=variants.find(candidate=>candidate.variantId===variantId);
    if(!variant)return;
    const next=applyStorefrontComponentVariant(document,{nodeId:node.id,variantId},registry);
    onApply(next,`${variant.label} megjelenési variáns alkalmazva.`);
  };

  return <div className={styles.fieldGroup} data-storefront-component-variants-v1>
    <strong>Megjelenési variánsok</strong>
    <p className={styles.emptyHint}>Gyors, biztonságos megjelenési irányok. A variáns nem ír át tartalmat, termékadatot vagy oldalszerkezetet.</p>
    <label className={styles.field}><span>Szerkesztett elem</span><select value={node.id} onChange={event=>setSelectedNodeId(event.target.value)}>{candidates.map(candidate=><option key={candidate.id} value={candidate.id}>{label(candidate.componentKey)}</option>)}</select></label>
    <div className={styles.filterTabs} aria-label="Megjelenési variánsok">{variants.map(variant=><button key={variant.variantId} type="button" data-active={active?.variantId===variant.variantId} onClick={()=>apply(variant.variantId)} title={variant.description}>{variant.label}</button>)}</div>
    <div className={styles.metaGrid}><span><small>Aktív</small><b>{active?.label??'Egyedi'}</b></span><span><small>Elem</small><b>{label(node.componentKey)}</b></span></div>
    <p className={styles.emptyHint}>{active?.description??'A jelenlegi megjelenés egyedi beállításokat használ.'}</p>
  </div>;
}
