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
import {VisualBuilderIcon} from './visual-builder-ui-icon';
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
const FONT_STACKS:Record<string,string>={
  'system-sans':'Arial, Helvetica, sans-serif',
  'humanist-sans':'Trebuchet MS, Arial, sans-serif',
  'geometric-sans':'Avenir Next, Avenir, Segoe UI, sans-serif',
  'editorial-serif':'Georgia, Times New Roman, serif',
  monospace:'ui-monospace, SFMono-Regular, Menlo, monospace',
};
const RADIUS_PREVIEW:Record<string,string>={sharp:'4px',soft:'12px',rounded:'20px'};
const SPACING_PREVIEW:Record<string,readonly number[]>={compact:[18,32,46],comfortable:[22,42,62],airy:[28,54,78]};

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
  const apply=(next:StorefrontGlobalStyleState,message='Globális stílus módosítva. Mentés után a webshop szerkesztett változatában érvényesül.')=>{
    onApply(setStorefrontGlobalStyleState(document,next),message);
  };
  const change=(key:keyof StorefrontGlobalStyleTokens,value:string|undefined)=>apply(nextState(state,key,value));
  const hasOverrides=Object.keys(state.tokens).length>0;
  const preview={
    background:state.tokens.background??'#ffffff',
    surface:state.tokens.surface??'#f6f6f2',
    muted:state.tokens.mutedText??'#626262',
    text:state.tokens.text??'#171717',
    border:state.tokens.border??'#d9d9d2',
    primary:state.tokens.primary??'#171717',
    primaryContrast:state.tokens.primaryContrast??'#ffffff',
    accent:state.tokens.accent??'#2f7f6f',
    headingFont:FONT_STACKS[state.tokens.headingFont??'system-sans'],
    bodyFont:FONT_STACKS[state.tokens.bodyFont??'system-sans'],
    radius:RADIUS_PREVIEW[state.tokens.radiusScale??'soft'],
    spacing:SPACING_PREVIEW[state.tokens.spacingScale??'comfortable'],
  };

  return <div className={styles.fieldGroup} data-storefront-global-styles-v1>
    <div data-global-style-heading>
      <div><strong>Globális stílusok</strong><small>Teljes webshop</small></div>
      <span>{hasOverrides?`${Object.keys(state.tokens).length} egyedi beállítás`:'Sablon alapértékek'}</span>
    </div>
    <p className={styles.emptyHint}>A sablon marad a vizuális alap. Itt a teljes webshop biztonságos márkastílusait állíthatod át anélkül, hogy az egyes oldalakat külön kellene szerkesztened.</p>

    <div data-global-style-preview style={{background:preview.background,color:preview.text,borderColor:preview.border,fontFamily:preview.bodyFont}}>
      <div data-preview-eyebrow style={{color:preview.accent}}>ÉLŐ STÍLUS-ELŐNÉZET</div>
      <h3 style={{fontFamily:preview.headingFont}}>A márkád vizuális hangja</h3>
      <p style={{color:preview.muted}}>A színek, tipográfia, térköz és lekerekítés együtt jelenik meg.</p>
      <div data-preview-card style={{background:preview.surface,borderColor:preview.border,borderRadius:preview.radius}}>
        <span><VisualBuilderIcon name="star"/></span>
        <div><strong>Prémium termékkártya</strong><small style={{color:preview.muted}}>A globális stílusokból épül.</small></div>
        <button type="button" tabIndex={-1} aria-hidden="true" style={{background:preview.primary,color:preview.primaryContrast,borderRadius:preview.radius}}>Megnézem</button>
      </div>
    </div>

    <div data-global-style-category="colors" className={styles.complexField}>
      <div data-style-category-head><span><VisualBuilderIcon name="presets"/></span><div><strong>Színek</strong><small>Márka-, felület- és kontrasztszínek</small></div></div>
      <div data-color-swatches>{COLOR_FIELDS.map(field=><span key={`swatch-${field.key}`} title={field.label} style={{background:state.tokens[field.key]??field.fallback}}/>)}</div>
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

    <div data-global-style-category="typography">
      <div data-style-category-head><span><VisualBuilderIcon name="text"/></span><div><strong>Tipográfia</strong><small>Címsor és törzsszöveg karaktere</small></div></div>
      <div data-type-preview><b style={{fontFamily:preview.headingFont}}>Aa</b><span style={{fontFamily:preview.bodyFont}}>A jó tipográfia hierarchiát teremt.</span></div>
      <label className={styles.field}><span>Címsor betűcsalád</span><select value={state.tokens.headingFont??''} onChange={event=>change('headingFont',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_FONT_PRESETS.map(item=><option key={item} value={item}>{FONT_LABELS[item]}</option>)}</select></label>
      <label className={styles.field}><span>Törzsszöveg betűcsalád</span><select value={state.tokens.bodyFont??''} onChange={event=>change('bodyFont',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_FONT_PRESETS.map(item=><option key={item} value={item}>{FONT_LABELS[item]}</option>)}</select></label>
    </div>

    <div data-global-style-category="buttons">
      <div data-style-category-head><span><VisualBuilderIcon name="component"/></span><div><strong>Gombok</strong><small>Elsődleges és másodlagos gombok előnézete</small></div></div>
      <div data-button-preview><button type="button" tabIndex={-1} aria-hidden="true" style={{background:preview.primary,color:preview.primaryContrast,borderRadius:preview.radius}}>Elsődleges gomb</button><button type="button" tabIndex={-1} aria-hidden="true" style={{color:preview.primary,borderColor:preview.border,borderRadius:preview.radius}}>Másodlagos</button></div>
    </div>

    <div data-global-style-category="cards">
      <div data-style-category-head><span><VisualBuilderIcon name="layout"/></span><div><strong>Kártyák</strong><small>Felület, szegély és lekerekítés együtt</small></div></div>
      <div data-card-preview style={{background:preview.surface,borderColor:preview.border,borderRadius:preview.radius}}><span style={{background:preview.accent}}/><div><strong>Termékkártya</strong><small style={{color:preview.muted}}>A globális stílusok szerinti megjelenés.</small></div></div>
      <label className={styles.field}><span>Globális lekerekítés</span><select value={state.tokens.radiusScale??''} onChange={event=>change('radiusScale',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_RADIUS_SCALES.map(item=><option key={item} value={item}>{RADIUS_LABELS[item]}</option>)}</select></label>
    </div>

    <div data-global-style-category="spacing">
      <div data-style-category-head><span><VisualBuilderIcon name="layers"/></span><div><strong>Térköz</strong><small>A teljes storefront ritmusa</small></div></div>
      <div data-spacing-preview>{preview.spacing.map((width,index)=><span key={width} style={{width}}><i>{index+1}</i></span>)}</div>
      <label className={styles.field}><span>Globális térköz-skála</span><select value={state.tokens.spacingScale??''} onChange={event=>change('spacingScale',event.target.value||undefined)}><option value="">Sablon alapérték</option>{STOREFRONT_GLOBAL_SPACING_SCALES.map(item=><option key={item} value={item}>{SPACING_LABELS[item]}</option>)}</select></label>
    </div>

    <div data-global-style-category="icons">
      <div data-style-category-head><span><VisualBuilderIcon name="star"/></span><div><strong>Ikonok</strong><small>Az ikonok a globális márkaszíneket követik</small></div></div>
      <div data-icon-preview style={{color:preview.primary}}><span><VisualBuilderIcon name="star"/></span><span><VisualBuilderIcon name="image"/></span><span><VisualBuilderIcon name="box"/></span><span style={{color:preview.accent}}><VisualBuilderIcon name="check"/></span></div>
      <p className={styles.emptyHint}>Az ikonok automatikusan a webshop globális színrendszerét használják.</p>
    </div>

    <div className={styles.metaGrid}>
      <span><small>Hatókör</small><b>Teljes webshop</b></span>
      <span><small>Mentés</small><b>Piszkozatverzió</b></span>
    </div>
    <button type="button" className={styles.addSectionButton} disabled={!hasOverrides} onClick={()=>apply({version:STOREFRONT_GLOBAL_STYLES_VERSION,tokens:{}},'Globális felülírások törölve; mentés után ismét a sablon alapstílusai lesznek érvényesek.')}>Sablon alapértékek visszaállítása</button>
  </div>;
}
