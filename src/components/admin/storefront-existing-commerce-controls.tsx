'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {bindStorefrontExistingCommerceData,getStorefrontExistingCommerceFamily,setStorefrontExistingCommerceConfigKey} from '@/lib/builder/storefront-existing-commerce-operations';
import {listExistingCommerceEngineOptionsAction} from '@/app/admin/tartalom/builder/existing-commerce-actions';
import styles from './storefront-visual-builder.module.css';

type Option={configKey:string;label:string};type Options={guided_finder:readonly Option[];multi_product_composer:readonly Option[];product_configurator:readonly Option[]};
export function StorefrontExistingCommerceControls({document,node,onApply}:{document:StorefrontPageDocument;node:StorefrontComponentNode;onApply:(next:StorefrontPageDocument,notice:string)=>void;}){
  const family=getStorefrontExistingCommerceFamily(node.componentKey),[options,setOptions]=useState<Options>({guided_finder:[],multi_product_composer:[],product_configurator:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{let active=true;setLoading(true);listExistingCommerceEngineOptionsAction().then(value=>{if(active){setOptions(value);setError('');}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A konfigurációlista nem tölthető be.');}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[]);
  const kind=useMemo(()=>family?.configKey==='finderKey'?'guided_finder':family?.configKey==='composerKey'?'multi_product_composer':'product_configurator',[family]);
  if(!family)return null;
  const items=options[kind],current=typeof node.config[family.configKey]==='string'?String(node.config[family.configKey]):'',bindingsReady=node.bindings?.engineConfigs?.path===family.enginePath&&node.bindings?.catalog?.path==='catalog.existingCommerceProducts';
  return <div className={styles.editorFields} data-existing-commerce-controls-v1><div className={styles.fieldGroup}><strong>{kind==='guided_finder'?'Guided Finder':kind==='multi_product_composer'?'Multi-Product Composer':'Product Configurator / Compatibility'}</strong><p className={styles.emptyHint}>A Builder csak a mentett közös engine-konfigurációt választja ki. A termék-, ár-, készlet- és rendelési adatok szerveroldali bindingból érkeznek; nincs raw JSON.</p>{loading?<p className={styles.emptyHint}>Konfigurációk betöltése…</p>:null}{error?<p className={styles.emptyHint}>{error}</p>:null}<label className={styles.field}><span>Aktív konfiguráció</span><select disabled={loading} value={current} onChange={event=>onApply(setStorefrontExistingCommerceConfigKey(document,node.id,event.target.value),event.target.value?'Commerce konfiguráció kiválasztva.':'Commerce konfiguráció törölve.')}><option value="">Automatikus, ha pontosan egy van</option>{items.map(item=><option key={item.configKey} value={item.configKey}>{item.label}</option>)}</select></label>{!loading&&!items.length?<p className={styles.emptyHint}>Még nincs ilyen motor konfigurálva. Hozz létre egyet a commerce motor könyvtárban.</p>:null}<Link className={styles.addSectionButton} href="/admin/tartalom/commerce-engines">Commerce motorok kezelése</Link>{!bindingsReady?<button type="button" className={styles.addSectionButton} onClick={()=>onApply(bindStorefrontExistingCommerceData(document,node.id),'Commerce adatkapcsolat helyreállítva.')}>Adatkapcsolat helyreállítása</button>:null}</div></div>;
}
