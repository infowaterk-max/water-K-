'use client';

import {useState} from 'react';
import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode,StorefrontPageDocument} from '@/lib/builder/storefront-runtime';
import {
  clearStorefrontResponsiveOrder,
  moveStorefrontSectionAtViewport,
  setStorefrontDesignGuardMode,
  setStorefrontFidelityEditMode,
} from '@/lib/builder/storefront-fidelity-builder-operations';
import {inspectStorefrontFidelityBuilder} from '@/lib/builder/storefront-fidelity-inspector';
import type {StorefrontBuilderEditMode,StorefrontDesignGuardMode} from '@/lib/builder/storefront-fidelity-engine';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {StorefrontFidelityNodeControls} from '@/components/admin/storefront-fidelity-node-controls';
import styles from './storefront-visual-builder.module.css';

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const MODE_COPY:Record<StorefrontBuilderEditMode,{label:string;description:string}>={
  normal:{label:'Normál',description:'Biztonságos tartalom-, kép-, szín- és alap elrendezés-szerkesztés.'},
  advanced:{label:'Haladó',description:'Responsive sorrend, finomabb elrendezés, tipográfia és komponens-részletek.'},
  expert:{label:'Expert',description:'Maximális vizuális kontroll, továbbra is csak ellenőrzött Builder-beállításokon keresztül.'},
};
const GUARD_COPY:Record<StorefrontDesignGuardMode,{label:string;description:string}>={
  off:{label:'Kikapcsolva',description:'A Builder nem figyeli a sablon eredeti vizuális rendszerét.'},
  warn:{label:'Figyelmeztetés',description:'Szabadon szerkeszthetsz, de a Builder jelzi a jelentős eltéréseket.'},
  enforce:{label:'Védett',description:'A sablon védett szerkezetének sérülését a rendszer nem engedi át.'},
};

function listNodes(document:StorefrontPageDocument){
  const result:StorefrontComponentNode[]=[];
  const walk=(nodes:readonly StorefrontComponentNode[])=>nodes.forEach(node=>{result.push(node);walk(node.children??[])});
  walk(document.sections);
  return result;
}

export function StorefrontFidelitySettings({document,viewport,onApply}:{
  document:StorefrontPageDocument;
  viewport:StorefrontViewport;
  onApply:(next:StorefrontPageDocument,notice:string)=>void;
}){
  const inspector=inspectStorefrontFidelityBuilder(document);
  const advanced=inspector.editMode==='advanced'||inspector.editMode==='expert';
  const performanceLabel=inspector.performance.status==='ok'?'Rendben':inspector.performance.status==='warning'?'Figyelmeztetés':'Túl nehéz';
  const performanceCopy=inspector.performance.status==='ok'
    ?'Az oldal szerkezete a teljesítménykereten belül van.'
    :inspector.performance.status==='warning'
      ?'Az oldal még menthető, de érdemes egyszerűsíteni a jelzett részeket.'
      :'A hard teljesítménylimit sérült; a mentés blokkolva lesz.';
  const sections=document.sections;
  const nodes=listNodes(document);
  const[editedNodeId,setEditedNodeId]=useState(nodes[0]?.id??'');
  const editedNode=nodes.find(node=>node.id===editedNodeId)??nodes[0]??null;
  const editedDefinition=editedNode?componentRegistry.get(editedNode.componentKey,editedNode.componentVersion):undefined;

  return <div className={styles.editorFields}>
    <div className={styles.fieldGroup}>
      <strong>Szerkesztési mód</strong>
      <label className={styles.field}><span>Builder képességszint</span><select value={inspector.editMode} onChange={event=>{
        const mode=event.target.value as StorefrontBuilderEditMode;
        onApply(setStorefrontFidelityEditMode(document,mode),`${MODE_COPY[mode].label} szerkesztési mód bekapcsolva.`);
      }}>{(['normal','advanced','expert'] as const).map(mode=><option key={mode} value={mode}>{MODE_COPY[mode].label}</option>)}</select></label>
      <p className={styles.emptyHint}>{MODE_COPY[inspector.editMode].description}</p>
    </div>

    <div className={styles.fieldGroup}>
      <strong>Design Guard</strong>
      <label className={styles.field}><span>Sablonvédelem</span><select value={inspector.designGuard.mode} onChange={event=>{
        const mode=event.target.value as StorefrontDesignGuardMode;
        onApply(setStorefrontDesignGuardMode(document,mode),`Design Guard: ${GUARD_COPY[mode].label}.`);
      }}>{(['off','warn','enforce'] as const).map(mode=><option key={mode} value={mode}>{GUARD_COPY[mode].label}</option>)}</select></label>
      <p className={styles.emptyHint}>{GUARD_COPY[inspector.designGuard.mode].description}</p>
      {inspector.designGuard.presetId?<div className={styles.metaGrid}><span><small>Aktív preset</small><b>{inspector.designGuard.presetId}</b></span><span><small>Védett elemek</small><b>{inspector.designGuard.protectedNodeCount}</b></span></div>:null}
    </div>

    <div className={styles.fieldGroup}>
      <strong>Teljesítmény</strong>
      <div className={styles.metaGrid}>
        <span><small>Állapot</small><b>{performanceLabel}</b></span>
        <span><small>Szekciók</small><b>{inspector.performance.metrics.sectionCount}</b></span>
        <span><small>Elemek</small><b>{inspector.performance.metrics.nodeCount}</b></span>
        <span><small>Rétegek</small><b>{inspector.performance.metrics.visualLayerCount}</b></span>
        <span><small>Eager képek</small><b>{inspector.performance.metrics.eagerImageCount}</b></span>
        <span><small>Max. mélység</small><b>{inspector.performance.metrics.maxDepth}</b></span>
      </div>
      <p className={styles.emptyHint}>{performanceCopy}</p>
      {inspector.performance.issues.length?<div className={styles.complexField}>{inspector.performance.issues.map(issue=><span key={issue.code} className={styles.muted}>{issue.severity==='error'?'Blokkoló':'Figyelmeztetés'} · {issue.metric}: {issue.actual} / {issue.limit}</span>)}</div>:null}
    </div>

    {advanced?<>
      <div className={styles.fieldGroup}>
        <strong>{viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil'} szekciósorrend</strong>
        <p className={styles.emptyHint}>Itt külön sorrendet adhatsz ennek a nézetnek. Ettől nem készül duplikált rejtett oldalrész.</p>
        <div className={styles.outline}>{sections.map((section,index)=><div key={section.id} className={styles.outlineRow}>
          <span className={styles.outlineIcon} aria-hidden="true">◇</span><span><strong>{section.id}</strong><small>{section.componentKey}</small></span>
          <span className={styles.rowMoves}><button type="button" aria-label="Szekció feljebb" disabled={index===0} onClick={()=>onApply(moveStorefrontSectionAtViewport(document,viewport,section.id,index-1),`${viewport} sorrend módosítva.`)}>↑</button><button type="button" aria-label="Szekció lejjebb" disabled={index===sections.length-1} onClick={()=>onApply(moveStorefrontSectionAtViewport(document,viewport,section.id,index+1),`${viewport} sorrend módosítva.`)}>↓</button></span>
        </div>)}</div>
        <button type="button" className={styles.addSectionButton} onClick={()=>onApply(clearStorefrontResponsiveOrder(document,{viewport}),`${viewport} egyedi sorrend törölve.`)}>Örökölt sorrend visszaállítása</button>
      </div>

      <div className={styles.fieldGroup}>
        <strong>Elem-szintű Haladó szerkesztés</strong>
        <p className={styles.emptyHint}>Válassz egy valódi Page Schema elemet. A módosítás ugyanazon közös Runtime-on jelenik meg, nem külön sablon-specifikus kódban.</p>
        <label className={styles.field}><span>Szerkesztett elem</span><select value={editedNode?.id??''} onChange={event=>setEditedNodeId(event.target.value)}>{nodes.map(node=><option key={node.id} value={node.id}>{node.id} · {node.componentKey}</option>)}</select></label>
      </div>
      {editedNode&&editedDefinition?<StorefrontFidelityNodeControls document={document} node={editedNode} viewport={viewport} configurable={editedDefinition.manifest.configurable} onApply={onApply}/>:null}
    </>:<div className={styles.fieldGroup}><strong>Responsive kompozíció</strong><p className={styles.emptyHint}>A külön Desktop/Tablet/Mobil sorrend és elem-szintű tipográfia/képfókusz a Haladó módban érhető el. A Normál mód szándékosan egyszerűbb és biztonságosabb.</p></div>}
  </div>;
}