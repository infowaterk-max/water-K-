'use client';

import {useEffect,useState,useTransition} from 'react';
import {listVisualBuilderPresetLibraryAction} from '@/app/admin/tartalom/builder/preset-actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {
  applyStorefrontComponentPresetAppearance,
  insertStorefrontSectionPreset,
  type StorefrontBuilderPresetLibrary,
} from '@/lib/builder/storefront-preset-application';
import type {StorefrontComponentNode,StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import styles from './storefront-visual-builder.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const label=(key:string)=>key.split('.').at(-1)?.replace(/[-_]/g,' ')??key;

export function StorefrontPresetLibraryPanel({document,selectedNode,capability,onApply}:{document:StorefrontPageDocument;selectedNode:StorefrontComponentNode|null;capability:StorefrontRuntimeCapabilityContext;onApply:(document:StorefrontPageDocument,selectedNodeId:string,message:string)=>void;}){
  const[library,setLibrary]=useState<StorefrontBuilderPresetLibrary|null>(null);const[busy,startTransition]=useTransition();const[error,setError]=useState<string|null>(null);
  const compatible=selectedNode?library?.componentPresets.filter(item=>item.componentKey===selectedNode.componentKey&&item.componentVersion===selectedNode.componentVersion)??[]:[];
  const opportunities=listStorefrontContextualCapabilityOpportunities({document,capability});
  useEffect(()=>{let active=true;setLibrary(null);setError(null);listVisualBuilderPresetLibraryAction({pageKey:document.pageKey}).then(next=>{if(active)setLibrary(next);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A preset könyvtár nem tölthető be.');});return()=>{active=false;};},[document.pageKey,document.templateKey,document.templateVersion]);
  const run=(job:()=>void)=>startTransition(()=>{setError(null);job();});
  return <div data-storefront-preset-library-workspace-v2>
    <div className={styles.panelSectionHead}><div><strong>Preset könyvtár</strong><span>Gyári kompozíciók és megjelenések, amelyeket egy kattintással használhatsz.</span></div></div>
    {library?<p className={styles.emptyHint}>Az aktuális sablonhoz elérhető presetek.</p>:<p className={styles.emptyHint}>Presetek betöltése…</p>}

    <div className={styles.panelDivider}/><strong>Ehhez az oldalhoz kapcsolódó képességek</strong><p className={styles.emptyHint}>Itt azok a webshopmotor-képességek jelennek meg, amelyeknek ezen az oldaltípuson van természetes helyük. A státusz a jelenlegi tenant Alap/Pro jogosultságából származik.</p>
    <div className={styles.componentLibrary}>{opportunities.map(item=><article key={item.key} data-capability-status={item.availability}>
      <span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name={item.availability==='locked'?'warning':'component'}/></span>
      <span><strong>{item.label}</strong><small>{item.description}</small><small>{item.componentKeys.join(' · ')}</small></span>
      <div><span className={styles.emptyHint}>{item.availability==='available'?'Elérhető':item.requiredPlan==='pro'?'Pro capability':'Jogosultság szükséges'}</span></div>
    </article>)}</div>
    {!opportunities.length?<p className={styles.emptyHint}>Ehhez az oldaltípushoz nincs további kontextuális capability.</p>:null}

    <div className={styles.panelDivider}/><strong>Szekció presetek</strong><p className={styles.emptyHint}>Kész szekciókat illeszthetsz be úgy, hogy a webshop meglévő adatai és működése változatlan marad.</p>
    <div className={styles.componentLibrary}>{library?.sectionPresets.map(preset=><article key={preset.presetId}><span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name="layers"/></span><span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · kész szekció</small></span><div><button type="button" disabled={busy} onClick={()=>run(()=>{const inserted=insertStorefrontSectionPreset(document,preset,registry,capability);onApply(inserted.document,inserted.insertedNodeId,`„${preset.label}” szekció beillesztve · a módosítás még nincs mentve.`);})}>Beillesztés</button></div></article>)}</div>
    {library&&!library.sectionPresets.length?<p className={styles.emptyHint}>Ehhez az oldaltípushoz nincs gyári szekció-preset.</p>:null}

    <div className={styles.panelDivider}/><strong>Megjelenési presetek</strong>
    {selectedNode?<p className={styles.emptyHint}>Kijelölt elem: <strong>{label(selectedNode.componentKey)}</strong>. Ezek a presetek csak a megjelenést módosítják; a tartalom megmarad.</p>:<p className={styles.emptyHint}>Válassz ki egy elemet a vásznon a hozzá illő megjelenési presetekhez.</p>}
    <div className={styles.componentLibrary}>{compatible.map(preset=><article key={preset.presetId}><span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name="presets"/></span><span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · megjelenési preset</small></span><div><button type="button" disabled={busy||!selectedNode} onClick={()=>run(()=>{if(!selectedNode)return;const next=applyStorefrontComponentPresetAppearance(document,{nodeId:selectedNode.id,preset},registry,capability);onApply(next,selectedNode.id,`„${preset.label}” preset alkalmazva · a tartalom változatlan maradt.`);})}>Alkalmazás</button></div></article>)}</div>
    {selectedNode&&library&&!compatible.length?<p className={styles.emptyHint}>A kijelölt elemhez nincs kompatibilis gyári megjelenési preset.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
  </div>;
}
