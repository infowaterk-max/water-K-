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
import {inspectStorefrontFidelityBuilder,type StorefrontFidelityInspectorStatus} from '@/lib/builder/storefront-fidelity-inspector';
import type {StorefrontBuilderEditMode,StorefrontDesignGuardMode} from '@/lib/builder/storefront-fidelity-engine';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {StorefrontGlobalStylesControls} from '@/components/admin/storefront-global-styles-controls';
import {StorefrontComponentVariantControls} from '@/components/admin/storefront-component-variant-controls';
import {StorefrontFidelityNodeControls} from '@/components/admin/storefront-fidelity-node-controls';
import {StorefrontFidelityStateControls} from '@/components/admin/storefront-fidelity-state-controls';
import {StorefrontResponsiveLayoutDepthControls} from '@/components/admin/storefront-responsive-layout-depth-controls';
import {StorefrontInteractiveSceneControls} from '@/components/admin/storefront-interactive-scene-controls';
import {StorefrontRecipeCommerceControls} from '@/components/admin/storefront-recipe-commerce-controls';
import {StorefrontReleaseCommerceControls} from '@/components/admin/storefront-release-commerce-controls';
import {StorefrontExistingCommerceControls} from '@/components/admin/storefront-existing-commerce-controls';
import {getStorefrontExistingCommerceFamily} from '@/lib/builder/storefront-existing-commerce-operations';
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import styles from './storefront-visual-builder.module.css';

const componentRegistry=createStorefrontVisualBuilderComponentRegistry();
const MODE_COPY:Record<StorefrontBuilderEditMode,{label:string;description:string}>={
  normal:{label:'Normál',description:'A legfontosabb, biztonságos kereskedői beállítások.'},
  advanced:{label:'Haladó',description:'Finomabb responsive, tipográfiai és elrendezési kontroll.'},
  expert:{label:'Expert',description:'Maximális szerkesztési mélység ellenőrzött Builder-kontrollokkal.'},
};
const GUARD_COPY:Record<StorefrontDesignGuardMode,{label:string;description:string}>={
  off:{label:'Kikapcsolva',description:'A Builder nem figyeli a sablon eredeti vizuális rendszerét.'},
  warn:{label:'Figyelmeztetés',description:'Szabadon szerkeszthetsz, a rendszer jelzi a jelentős eltéréseket.'},
  enforce:{label:'Védett',description:'A sablon védett szerkezetének sérülését a rendszer nem engedi át.'},
};
const STATUS_COPY:Record<StorefrontFidelityInspectorStatus,string>={ok:'Rendben',warning:'Figyelmeztetés',error:'Javítandó'};
const humanize=(value:string)=>value.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[._:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());

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
      :'A teljesítménylimit sérült; a mentés blokkolva lesz.';
  const sections=document.sections;
  const nodes=listNodes(document);
  const[editedNodeId,setEditedNodeId]=useState(nodes[0]?.id??'');
  const editedNode=nodes.find(node=>node.id===editedNodeId)??nodes[0]??null;
  const editedDefinition=editedNode?componentRegistry.get(editedNode.componentKey,editedNode.componentVersion):undefined;
  const editedConfigurable=editedDefinition?.manifest.configurable??[];

  return <div className={styles.editorFields} data-storefront-fidelity-settings-v2>
    <div className={styles.fieldGroup}>
      <strong>Szerkesztési mélység</strong>
      <p className={styles.emptyHint}>Ugyanazt a Buildert használod minden módban; csak a látható kontrollok részletessége változik.</p>
      <div data-fidelity-mode-cards>{(['normal','advanced','expert'] as const).map(mode=><button type="button" key={mode} data-active={inspector.editMode===mode} onClick={()=>onApply(setStorefrontFidelityEditMode(document,mode),`${MODE_COPY[mode].label} szerkesztési mód bekapcsolva.`)}><strong>{MODE_COPY[mode].label}</strong><small>{MODE_COPY[mode].description}</small></button>)}</div>
    </div>

    <StorefrontGlobalStylesControls document={document} onApply={onApply}/>
    <StorefrontComponentVariantControls document={document} onApply={onApply}/>

    <div className={styles.fieldGroup}>
      <strong>Design Guard</strong>
      <p className={styles.emptyHint}>A sablon karaktere megőrizhető úgy, hogy közben a tartalom és a megjelenés továbbra is szerkeszthető marad.</p>
      <label className={styles.field}><span>Sablonvédelem</span><select value={inspector.designGuard.mode} onChange={event=>{
        const mode=event.target.value as StorefrontDesignGuardMode;
        onApply(setStorefrontDesignGuardMode(document,mode),`Design Guard: ${GUARD_COPY[mode].label}.`);
      }}>{(['off','warn','enforce'] as const).map(mode=><option key={mode} value={mode}>{GUARD_COPY[mode].label}</option>)}</select></label>
      <p className={styles.emptyHint}>{GUARD_COPY[inspector.designGuard.mode].description}</p>
    </div>

    <div className={styles.fieldGroup}>
      <strong>Oldalminőség</strong>
      <div data-quality-summary>
        <span><small>Akadálymentesség</small><b>{STATUS_COPY[inspector.accessibility.status]}</b></span>
        <span><small>Responsive elrendezés</small><b>{STATUS_COPY[inspector.layout.status]}</b></span>
        <span><small>Teljesítmény</small><b>{performanceLabel}</b></span>
      </div>
      <p className={styles.emptyHint}>A részletes közzétételi ellenőrzést a Közzététel gombnál kapod meg; itt csak a legfontosabb állapot látszik.</p>
    </div>

    {advanced?<>
      <div className={styles.fieldGroup}>
        <strong>Haladó elrendezési vezérlés</strong>
        <p className={styles.emptyHint}>Válassz egy elemet, majd ugyanazon a komponensen állíts Desktop / Tablet / Mobil specifikus viselkedést.</p>
        <label className={styles.field}><span>Szerkesztett elem</span><select value={editedNode?.id??''} onChange={event=>setEditedNodeId(event.target.value)}>{nodes.map(node=><option key={node.id} value={node.id}>{humanize(node.componentKey)}</option>)}</select></label>
      </div>
      {editedNode&&editedDefinition?<StorefrontResponsiveLayoutDepthControls
        document={document}
        node={editedNode}
        viewport={viewport}
        responsiveMode={editedDefinition.manifest.responsiveMode}
        supportsStyle={editedConfigurable.includes('style')}
        onApply={onApply}
      />:null}
      {editedNode?.componentKey==='commerce.interactive-scene'?<StorefrontInteractiveSceneControls document={document} node={editedNode} viewport={viewport} onApply={onApply}/>:null}
      {editedNode?.componentKey==='commerce.recipe'?<StorefrontRecipeCommerceControls document={document} node={editedNode} onApply={onApply}/>:null}
      {editedNode?.componentKey==='commerce.release'?<StorefrontReleaseCommerceControls document={document} node={editedNode} onApply={onApply}/>:null}
      {editedNode&&getStorefrontExistingCommerceFamily(editedNode.componentKey)?<StorefrontExistingCommerceControls document={document} node={editedNode} onApply={onApply}/>:null}

      <div className={styles.fieldGroup}>
        <strong>{viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil'} szekciósorrend</strong>
        <p className={styles.emptyHint}>Külön megjelenítési sorrendet adhatsz ennek a nézetnek anélkül, hogy az oldal elemei duplikálódnának.</p>
        <div className={styles.outline}>{sections.map((section,index)=><div key={section.id} className={styles.outlineRow}>
          <span className={styles.outlineIcon} aria-hidden="true"><VisualBuilderIcon name="layers"/></span><span><strong>{humanize(section.componentKey)}</strong><small>{index+1}. szekció</small></span>
          <span className={styles.rowMoves}><button type="button" aria-label="Szekció feljebb" disabled={index===0} onClick={()=>onApply(moveStorefrontSectionAtViewport(document,viewport,section.id,index-1),`${viewport} sorrend módosítva.`)}><VisualBuilderIcon name="chevron-up"/></button><button type="button" aria-label="Szekció lejjebb" disabled={index===sections.length-1} onClick={()=>onApply(moveStorefrontSectionAtViewport(document,viewport,section.id,index+1),`${viewport} sorrend módosítva.`)}><VisualBuilderIcon name="chevron-down"/></button></span>
        </div>)}</div>
        <button type="button" className={styles.addSectionButton} onClick={()=>onApply(clearStorefrontResponsiveOrder(document,{viewport}),`${viewport} egyedi sorrend törölve.`)}><VisualBuilderIcon name="reset"/> Örökölt sorrend visszaállítása</button>
      </div>

      {editedNode&&editedDefinition?<StorefrontFidelityNodeControls document={document} node={editedNode} viewport={viewport} configurable={editedConfigurable} onApply={onApply}/>:null}
      {editedNode&&editedDefinition?<StorefrontFidelityStateControls document={document} node={editedNode} viewport={viewport} configurable={editedConfigurable} onApply={onApply}/>:null}

      <div className={styles.fieldGroup}>
        <strong>Teljesítmény részletei</strong>
        <div className={styles.metaGrid}>
          <span><small>Szekciók</small><b>{inspector.performance.metrics.sectionCount}</b></span>
          <span><small>Elemek</small><b>{inspector.performance.metrics.nodeCount}</b></span>
          <span><small>Rétegek</small><b>{inspector.performance.metrics.visualLayerCount}</b></span>
          <span><small>Eager képek</small><b>{inspector.performance.metrics.eagerImageCount}</b></span>
          <span><small>Max. mélység</small><b>{inspector.performance.metrics.maxDepth}</b></span>
        </div>
        <p className={styles.emptyHint}>{performanceCopy}</p>
        {inspector.performance.issues.length?<div className={styles.complexField}>{inspector.performance.issues.map(issue=><span key={issue.code} className={styles.muted}>{issue.severity==='error'?'Blokkoló':'Figyelmeztetés'} · {issue.metric}: {issue.actual} / {issue.limit}</span>)}</div>:null}
      </div>
    </>:<p className={styles.emptyHint}>Haladó vagy Expert módban megjelenik a részletes responsive, állapot- és teljesítményvezérlés.</p>}
  </div>;
}
