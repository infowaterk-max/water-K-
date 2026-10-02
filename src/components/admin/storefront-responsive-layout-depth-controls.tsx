'use client';

import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {StorefrontFidelityLayoutControls} from '@/components/admin/storefront-fidelity-layout-controls';
import {
  clearStorefrontResponsiveOrder,
  moveStorefrontChildAtViewport,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {setStorefrontResponsiveGridPlacement} from '@/lib/builder/storefront-fidelity-layout';
import {
  STOREFRONT_RESPONSIVE_LAYOUT_ALIGN,
  STOREFRONT_RESPONSIVE_LAYOUT_SPACING,
  STOREFRONT_RESPONSIVE_STACK_JUSTIFY,
  STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
  inspectStorefrontResponsiveInheritance,
  inspectStorefrontResponsiveLayoutDepth,
  planStorefrontResponsiveInheritancePropagation,
  applyStorefrontResponsiveInheritancePropagation,
  resetStorefrontResponsiveLayoutDepth,
  setStorefrontResponsiveGridContainerLayout,
  setStorefrontResponsiveStackContainerLayout,
  setStorefrontResponsiveVisibility,
  type StorefrontResponsiveLayoutAlign,
  type StorefrontResponsiveLayoutSpacing,
  type StorefrontResponsiveStackJustify,
} from '@/lib/builder/storefront-responsive-layout-depth';
import styles from './storefront-visual-builder.module.css';

const viewportLabel=(viewport:StorefrontViewport)=>viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil';
const humanize=(value:string)=>value.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[._:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
const directString=(value:unknown)=>typeof value==='string'?value:'';
const directNumber=(value:unknown)=>typeof value==='number'?value:'';
const ALIGN_LABELS:Record<StorefrontResponsiveLayoutAlign,string>={start:'Kezdet',center:'Közép',end:'Vég',stretch:'Nyújtás'};
const JUSTIFY_LABELS:Record<StorefrontResponsiveStackJustify,string>={start:'Kezdet',center:'Közép',end:'Vég',between:'Szétosztva'};
const sourceLabel=(source:string)=>source==='viewport'?'Egyedi viewport':source==='base'?'Alap stílus':source==='component'?'Komponens alap':'Runtime alap';

export function StorefrontResponsiveLayoutDepthControls({document,node,viewport,responsiveMode,supportsStyle,onApply}:{
  document:StorefrontPageDocument;
  node:StorefrontComponentNode;
  viewport:StorefrontViewport;
  responsiveMode:string;
  supportsStyle:boolean;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const state=inspectStorefrontResponsiveLayoutDepth(document,node.id,viewport);
  const inheritance=inspectStorefrontResponsiveInheritance(document,node.id);
  const inheritanceState=inheritance.viewports[viewport];
  const inheritanceWarnings=inheritance.diagnostics.filter(issue=>issue.viewport===viewport);
  const advanced=state.editMode==='advanced'||state.editMode==='expert';
  const canPlace=state.parentComponentKey==='layout.grid'||state.parentComponentKey==='layout.stack'||responsiveMode!=='fixed';
  const childById=new Map((node.children??[]).map(child=>[child.id,child]));
  const orderedChildren=state.childOrder.flatMap(id=>{const child=childById.get(id);return child?[child]:[];});
  const applyPlacementSpan=(value:string)=>{
    const span=value?Number(value):undefined;
    onApply(setStorefrontResponsiveGridPlacement(document,node.id,viewport,{...state.gridPlacement.direct,span}),`${viewportLabel(viewport)} grid szélesség módosítva.`);
  };
  const visibilityValue=state.visibility.direct===null?'inherit':state.visibility.direct?'hidden':'visible';
  const containerSources=[...new Set(Object.values(inheritanceState.container.sources))];
  const containerSourceLabel=containerSources.length===1?sourceLabel(containerSources[0]??'default'):containerSources.includes('viewport')?'Vegyes · egyedi override-dal':'Vegyes alapforrás';
  const propagateTo=(target:StorefrontViewport)=>{
    const plan=planStorefrontResponsiveInheritancePropagation({
      document,
      nodeId:node.id,
      sourceViewport:viewport,
      targetViewports:[target],
      dimensions:STOREFRONT_RESPONSIVE_INHERITANCE_DIMENSIONS,
    });
    const next=applyStorefrontResponsiveInheritancePropagation(document,plan);
    onApply(next,`${viewportLabel(viewport)} responsive szándék átmásolva ide: ${viewportLabel(target)}.`);
  };

  return <div className={styles.fieldGroup} data-storefront-responsive-layout-depth-v1>
    <strong>{viewportLabel(viewport)} responsive layout</strong>
    <p className={styles.emptyHint}>Ugyanazt a Page Schema dokumentumot szerkeszted minden nézetben. Az aktív Runtime szabály: alapérték + pontos viewport override; a Desktop, Tablet és Mobil nem örököl egymástól automatikusan.</p>
    <div className={styles.metaGrid}>
      <span><small>Mód</small><b>{state.editMode==='normal'?'Normál':state.editMode==='advanced'?'Haladó':'Expert'}</b></span>
      <span><small>Effektív span</small><b>{state.effectiveGridSpan} / 12</b></span>
      <span><small>Láthatóság</small><b>{state.visibility.effective?'Rejtett':'Látható'}</b></span>
      {state.parentComponentKey?<span><small>Szülő</small><b>{humanize(state.parentComponentKey)}</b></span>:null}
      <span><small>Láthatóság forrása</small><b>{sourceLabel(inheritanceState.visibility.source)}</b></span>
      <span><small>Grid forrása</small><b>{sourceLabel(inheritanceState.gridPlacement.source)}</b></span>
      {inheritanceState.container.kind?<span><small>Konténer forrása</small><b>{containerSourceLabel}</b></span>:null}
      {node.children?.length?<span><small>Gyereksorrend forrása</small><b>{sourceLabel(inheritanceState.childOrder.source)}</b></span>:null}
    </div>

    <div className={styles.complexField} data-responsive-inheritance-intelligence>
      <strong>Öröklési intelligencia</strong>
      <p className={styles.emptyHint}>A rendszer a base + pontos viewport forrásmodellt magyarázza. Más nézetre csak explicit művelettel másol, és a művelet a normál Builder előzményekbe kerül.</p>
      {inheritanceWarnings.length?<div className={styles.outline}>{inheritanceWarnings.map(issue=><div key={`${issue.viewport}:${issue.dimension}`} className={styles.outlineRow}>
        <span className={styles.outlineIcon} aria-hidden="true">!</span>
        <span><strong>Redundáns override</strong><small>{humanize(issue.dimension)} · visszaállítható effektív változás nélkül</small></span>
      </div>)}</div>:<p className={styles.emptyHint}>Nincs bizonyítottan redundáns override ezen a viewporton.</p>}
      <div className={styles.rowMoves}>
        {(['desktop','tablet','mobile'] as const).filter(target=>target!==viewport).map(target=><button type="button" key={target} onClick={()=>propagateTo(target)}>{viewportLabel(target)} cél</button>)}
      </div>
    </div>

    <label className={styles.field}><span>Láthatóság ezen a breakpointon</span><select value={visibilityValue} onChange={event=>{
      const value=event.target.value;
      onApply(setStorefrontResponsiveVisibility(document,node.id,viewport,value==='inherit'?null:value==='hidden'),`${viewportLabel(viewport)} láthatóság módosítva.`);
    }}><option value="inherit">Alapértelmezett</option><option value="visible">Látható</option><option value="hidden">Rejtett</option></select></label>

    {!advanced&&canPlace?<label className={styles.field}><span>Grid szélesség / span</span><select value={state.gridPlacement.direct.span??''} onChange={event=>applyPlacementSpan(event.target.value)}><option value="">Alapértelmezett</option>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value} / 12</option>)}</select></label>:null}

    {state.container.kind==='grid'&&supportsStyle?<>
      <label className={styles.field}><span>Gap ezen a breakpointon</span><select value={directString(state.container.direct.gap)} onChange={event=>onApply(setStorefrontResponsiveGridContainerLayout(document,node.id,viewport,{gap:event.target.value?event.target.value as StorefrontResponsiveLayoutSpacing:null}),`${viewportLabel(viewport)} grid gap módosítva.`)}><option value="">Alap · {humanize(String(state.container.effective.gap??'m'))}</option>{STOREFRONT_RESPONSIVE_LAYOUT_SPACING.map(value=><option key={value} value={value}>{humanize(value)}</option>)}</select></label>
      {advanced?<>
        <label className={styles.field}><span>Oszlopok</span><select value={directNumber(state.container.direct.columns)} onChange={event=>onApply(setStorefrontResponsiveGridContainerLayout(document,node.id,viewport,{columns:event.target.value?Number(event.target.value):null}),`${viewportLabel(viewport)} grid oszlopszám módosítva.`)}><option value="">Alap · {String(state.container.effective.columns??12)}</option>{Array.from({length:12},(_,index)=>index+1).map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className={styles.field}><span>Elemek függőleges igazítása</span><select value={directString(state.container.direct.alignItems)} onChange={event=>onApply(setStorefrontResponsiveGridContainerLayout(document,node.id,viewport,{alignItems:event.target.value?event.target.value as StorefrontResponsiveLayoutAlign:null}),`${viewportLabel(viewport)} grid igazítás módosítva.`)}><option value="">Alap · {ALIGN_LABELS[(state.container.effective.alignItems as StorefrontResponsiveLayoutAlign)??'stretch']}</option>{STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.map(value=><option key={value} value={value}>{ALIGN_LABELS[value]}</option>)}</select></label>
        <label className={styles.field}><span>Elemek vízszintes igazítása</span><select value={directString(state.container.direct.justifyItems)} onChange={event=>onApply(setStorefrontResponsiveGridContainerLayout(document,node.id,viewport,{justifyItems:event.target.value?event.target.value as StorefrontResponsiveLayoutAlign:null}),`${viewportLabel(viewport)} grid igazítás módosítva.`)}><option value="">Alap · {ALIGN_LABELS[(state.container.effective.justifyItems as StorefrontResponsiveLayoutAlign)??'stretch']}</option>{STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.map(value=><option key={value} value={value}>{ALIGN_LABELS[value]}</option>)}</select></label>
      </>:null}
    </>:null}

    {state.container.kind==='stack'&&supportsStyle?<>
      <label className={styles.field}><span>Gap ezen a breakpointon</span><select value={directString(state.container.direct.gap)} onChange={event=>onApply(setStorefrontResponsiveStackContainerLayout(document,node.id,viewport,{gap:event.target.value?event.target.value as StorefrontResponsiveLayoutSpacing:null}),`${viewportLabel(viewport)} stack gap módosítva.`)}><option value="">Alap · {humanize(String(state.container.effective.gap??'m'))}</option>{STOREFRONT_RESPONSIVE_LAYOUT_SPACING.map(value=><option key={value} value={value}>{humanize(value)}</option>)}</select></label>
      {advanced?<>
        <label className={styles.field}><span>Irány</span><select value={directString(state.container.direct.direction)} onChange={event=>onApply(setStorefrontResponsiveStackContainerLayout(document,node.id,viewport,{direction:event.target.value?event.target.value as 'row'|'column':null}),`${viewportLabel(viewport)} stack irány módosítva.`)}><option value="">Alap · {state.container.effective.direction==='row'?'Vízszintes':'Függőleges'}</option><option value="column">Függőleges</option><option value="row">Vízszintes</option></select></label>
        <label className={styles.field}><span>Tördelés</span><select value={directString(state.container.direct.wrap)} onChange={event=>onApply(setStorefrontResponsiveStackContainerLayout(document,node.id,viewport,{wrap:event.target.value?event.target.value as 'nowrap'|'wrap':null}),`${viewportLabel(viewport)} stack tördelés módosítva.`)}><option value="">Alap · {state.container.effective.wrap==='wrap'?'Tördelés':'Egy sor'}</option><option value="nowrap">Egy sor</option><option value="wrap">Tördelés</option></select></label>
        <label className={styles.field}><span>Keresztirányú igazítás</span><select value={directString(state.container.direct.alignItems)} onChange={event=>onApply(setStorefrontResponsiveStackContainerLayout(document,node.id,viewport,{alignItems:event.target.value?event.target.value as StorefrontResponsiveLayoutAlign:null}),`${viewportLabel(viewport)} stack igazítás módosítva.`)}><option value="">Alap · {ALIGN_LABELS[(state.container.effective.alignItems as StorefrontResponsiveLayoutAlign)??'stretch']}</option>{STOREFRONT_RESPONSIVE_LAYOUT_ALIGN.map(value=><option key={value} value={value}>{ALIGN_LABELS[value]}</option>)}</select></label>
        <label className={styles.field}><span>Főirányú igazítás</span><select value={directString(state.container.direct.justifyContent)} onChange={event=>onApply(setStorefrontResponsiveStackContainerLayout(document,node.id,viewport,{justifyContent:event.target.value?event.target.value as StorefrontResponsiveStackJustify:null}),`${viewportLabel(viewport)} stack igazítás módosítva.`)}><option value="">Alap · {JUSTIFY_LABELS[(state.container.effective.justifyContent as StorefrontResponsiveStackJustify)??'start']}</option>{STOREFRONT_RESPONSIVE_STACK_JUSTIFY.map(value=><option key={value} value={value}>{JUSTIFY_LABELS[value]}</option>)}</select></label>
      </>:null}
    </>:null}

    {advanced&&canPlace&&supportsStyle?<StorefrontFidelityLayoutControls document={document} node={node} viewport={viewport} editMode={state.editMode} onApply={onApply}/>:null}

    {advanced&&orderedChildren.length>1?<div className={styles.complexField}>
      <strong>{viewportLabel(viewport)} gyereksorrend</strong>
      <p className={styles.emptyHint}>Csak a megjelenítési sorrend változik ezen a breakpointon; a Page Schema alapstruktúrája és az elem-identitások változatlanok.</p>
      <div className={styles.outline}>{orderedChildren.map((child,index)=><div key={child.id} className={styles.outlineRow}>
        <span className={styles.outlineIcon} aria-hidden="true">◇</span><span><strong>{humanize(child.componentKey)}</strong><small>{child.id}</small></span>
        <span className={styles.rowMoves}><button type="button" aria-label="Gyerek feljebb" disabled={index===0} onClick={()=>onApply(moveStorefrontChildAtViewport(document,node.id,viewport,child.id,index-1),`${viewportLabel(viewport)} gyereksorrend módosítva.`)}>↑</button><button type="button" aria-label="Gyerek lejjebb" disabled={index===orderedChildren.length-1} onClick={()=>onApply(moveStorefrontChildAtViewport(document,node.id,viewport,child.id,index+1),`${viewportLabel(viewport)} gyereksorrend módosítva.`)}>↓</button></span>
      </div>)}</div>
      <button type="button" className={styles.addSectionButton} onClick={()=>onApply(clearStorefrontResponsiveOrder(document,{viewport,parentId:node.id}),`${viewportLabel(viewport)} gyereksorrend alapértékre állítva.`)}>Gyereksorrend alaphelyzetbe</button>
    </div>:null}

    {!advanced?<p className={styles.emptyHint}>A Normál mód a biztonságos visibility/span/gap vezérlést mutatja. Responsive order, container flow, igazítás, gyereksorrend és Expert grid-geometria a Beállítások → Szerkesztési mód alatt oldható fel.</p>:null}
    <button type="button" className={styles.addSectionButton} onClick={()=>onApply(resetStorefrontResponsiveLayoutDepth(document,node.id,viewport),`${viewportLabel(viewport)} layout override-ok alapértékre állítva.`)}>↺ Breakpoint layout visszaállítása</button>
  </div>;
}
