'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {bindStorefrontReleaseCommerceData,setStorefrontReleaseCommerceConfig} from '@/lib/builder/storefront-release-commerce-operations';
import {listReleaseCommerceOptionsAction} from '@/app/admin/tartalom/builder/release-commerce-actions';
import styles from './storefront-visual-builder.module.css';

type ReleaseOption={releaseKey:string;title:string;startsAt:string;endsAt:string|null};
const text=(value:unknown)=>typeof value==='string'?value:'';

export function StorefrontReleaseCommerceControls({document,node,onApply}:{document:StorefrontPageDocument;node:StorefrontComponentNode;onApply:(next:StorefrontPageDocument,notice:string)=>void;}){
  const[items,setItems]=useState<readonly ReleaseOption[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  useEffect(()=>{let active=true;listReleaseCommerceOptionsAction().then(value=>{if(active){setItems(value);setError(null);}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A release lista nem tölthető be.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[]);
  const current=text(node.config.releaseKey),bindingsReady=node.bindings?.releases?.path==='commerce.releases';
  const applyKey=(releaseKey:string)=>{let next=bindStorefrontReleaseCommerceData(document,node.id);next=setStorefrontReleaseCommerceConfig(next,node.id,'releaseKey',releaseKey);onApply(next,releaseKey?'Release kiválasztva.':'Release kiválasztása törölve.');};
  const applyBoolean=(key:'showCountdown'|'showStockCount',value:boolean)=>{let next=bindingsReady?document:bindStorefrontReleaseCommerceData(document,node.id);next=setStorefrontReleaseCommerceConfig(next,node.id,key,value);onApply(next,'Release megjelenés frissítve.');};
  return <div className={styles.editorFields} data-release-commerce-controls-v1><div className={styles.fieldGroup}><strong>Drop / Release Commerce</strong><p className={styles.emptyHint}>A Builder csak a megjelenítést és a kiválasztott release-t kezeli. Az indulás, zárás, termék/variáns eligibility és készlet a közös szerveroldali authorityból érkezik.</p>{loading?<p className={styles.emptyHint}>Release-ek betöltése…</p>:null}{error?<p className={styles.emptyHint}>{error}</p>:null}<label className={styles.field}><span>Megjelenített release</span><select value={current} disabled={loading} onChange={event=>applyKey(event.target.value)}><option value="">Automatikus aktív/következő release</option>{items.map(item=><option key={item.releaseKey} value={item.releaseKey}>{item.title}</option>)}</select></label><label className={styles.field}><span><input type="checkbox" checked={node.config.showCountdown!==false} onChange={event=>applyBoolean('showCountdown',event.target.checked)}/> Valós visszaszámláló megjelenítése</span></label><label className={styles.field}><span><input type="checkbox" checked={node.config.showStockCount===true} onChange={event=>applyBoolean('showStockCount',event.target.checked)}/> Valós készlet darabszám megjelenítése</span></label><Link className={styles.addSectionButton} href="/admin/tartalom/release-ek">Release könyvtár kezelése</Link>{!bindingsReady?<button type="button" className={styles.secondaryButton} onClick={()=>onApply(bindStorefrontReleaseCommerceData(document,node.id),'Release Commerce adatkapcsolat helyreállítva.')}>Adatkapcsolat helyreállítása</button>:null}</div></div>;
}
