'use client';

import {
  STOREFRONT_GLOBAL_FONT_PRESETS,
  STOREFRONT_GLOBAL_RADIUS_SCALES,
  STOREFRONT_GLOBAL_SPACING_SCALES,
  STOREFRONT_GLOBAL_STYLES_VERSION,
  getStorefrontGlobalStyleState,
  setStorefrontGlobalStyleState,
  type StorefrontGlobalStyleState,
  type StorefrontGlobalStyleTokens,
} from '@/lib/builder/storefront-global-styles';
import type {StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import styles from './storefront-visual-builder.module.css';

const COLOR_FIELDS:readonly {key:Extract<keyof StorefrontGlobalStyleTokens,string>;label:string;fallback:string}[]=[
  {key:'background',label:'Háttér',fallback:'#ffffff'},
  {key:'surface',label:'Felület',fallback:'#f6f6f2'},
  {key:'surfaceMuted',label:'Visszafogott felület',fallback:'#ecece6'},
  {key:'text',label:'Szöveg',fallback:'#171717'},
  {key:'mutedText',label:'Visszafogott szöveg',fallback:'#626262'},
  {key:'border',label:'Szegély',fallback:'#d9d9d2'},
  {key:'primary',label:'Elsődleges',fallback:'#171717'},
  {key:'primaryContrast',label:'Elsődleges kontraszt',fallback:'#ffffff'},
  {key:'accent',label:'Akcentus',fallback:'#2f7f6f'},
] as const;

const FONT_LABELS:Record<string,string>={
  'system-sans':'System Sans',
  'humanist-sans':'Humanist Sans',
  'geometric-sans':'Geometric Sans',
  'editorial-serif':'Editorial Serif',
  monospace:'Monospace',
};
const SPACING_LABELS:Record<string,string>={compact:'Kompakt',comfortable:'Kényelmes',airy:'Levegős'};
const RADIUS_LABELS:Record<string,string>={sharp:'Éles',soft:'Lágy',rounded:'Kerekített'};

function nextState(current:StorefrontGlobalStyleState,key:keyof StorefrontGlobalStyleTokens,value:string|undefined):StorefrontGlobalStyleState{
  const tokens={...current.tokens};
  if(value===undefined||value==='')delete tokens[key];
  else(tokens as Record<string,unknown>)[key]=value;
  return{version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens};
}

export function StorefrontGlobalStylesControls({document,onApply}:{
  document:StorefrontPageDocument;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const state=getStorefrontGlobalStyleState(document);
  const apply=(next:StorefrontGlobalStyleState,message='Globális stílus módosítva. Mentéskor minden oldal draftjára érvényesül.')=>{
    onApply(setStorefrontGlobalStyleState(document,next),message);
  };
  const change=(key:keyof StorefrontGlobalStyleTokens,value:string|undefined)=>apply(nextState(state,key,value));
  const hasOverrides=Object.keys(state.tokens).length>0;

  return <div className={styles.fieldGroup} data-storefront-global-styles-v1>
    <strong>Globális stílusok</strong>
    <p className={styles.emptyHint}>A sablon marad az alap vizuális rendszer. Az itt megadott kontrollált tokenek minden oldalra kiterjedő felülírások; nincs nyers CSS, és mentés nélkül nem kerülnek draft revisionbe.</p>

    <div className={styles.metaGrid}>
      <span><small>Hatókör</small><b>Teljes webshop</b></span>
      <span><small>Authority</small><b>Page Schema revision</b></span>
    </div>

    <div className={styles.complexField}>
      <strong>Színek</strong>
      {COLOR_FIELDS.map(field=>{
        const current=state.tokens[field.key];
        const enabled=typeof current==='string';
        return <div key={field.key} className={styles.field}>
          <span>{field.label}</span>
          <span className={styles.colorField}>
            <input type="color" aria-label={`${field.label} szín`} value={current??field.fallback} disabled={!enabled} onChange={event=>change(field.key,event.target.value)}/>
            <input aria-label={`${field.label} hex`} value={current??'Sablon'} readOnly/>
          </span>
          <label className={styles.switchField}><span>Felülírás</span><input type="checkbox" checked={enabled} onChange={event=>change(field.key,event.target.checked?(current??field.fallback):undefined)}/><i aria-hidden="true"/></label>
        </div>;
      })}
    </div>

    <label className={styles.field}><span>Címsor betűcsalád</span><select value={state.tokens.headingFont??''} onChange={event=>change('headingFont',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_FONT_PRESETS.map(item=><option key={item} value={item}>{FONT_LABELS[item]}</option>)}</select></label>
    <label className={styles.field}><span>Törzsszöveg betűcsalád</span><select value={state.tokens.bodyFont??''} onChange={event=>change('bodyFont',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_FONT_PRESETS.map(item=><option key={item} value={item}>{FONT_LABELS[item]}</option>)}</select></label>
    <label className={styles.field}><span>Globális térköz-skála</span><select value={state.tokens.spacingScale??''} onChange={event=>change('spacingScale',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_SPACING_SCALES.map(item=><option key={item} value={item}>{SPACING_LABELS[item]}</option>)}</select></label>
    <label className={styles.field}><span>Globális lekerekítés</span><select value={state.tokens.radiusScale??''} onChange={event=>change('radiusScale',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_RADIUS_SCALES.map(item=><option key={item} value={item}>{RADIUS_LABELS[item]}</option>)}</select></label>

    <button type="button" className={styles.addSectionButton} disabled={!hasOverrides} onClick={()=>apply({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{}},'Globális felülírások törölve; a sablon alap design tokenjei lesznek érvényesek mentés után.')}>Sablon alapértékek visszaállítása</button>
  </div>;
}
