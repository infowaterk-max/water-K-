'use client';

import {useEffect,useState,useTransition} from 'react';
import {listVisualBuilderPresetLibraryAction} from '@/app/admin/tartalom/builder/preset-actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
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

export function StorefrontPresetLibraryPanel({
  document,
  selectedNode,
  capability,
  onApply,
}:{
  document:StorefrontPageDocument;
  selectedNode:StorefrontComponentNode|null;
  capability:StorefrontRuntimeCapabilityContext;
  onApply:(document:StorefrontPageDocument,selectedNodeId:string,message:string)=>void;
}){
  const[library,setLibrary]=useState<StorefrontBuilderPresetLibrary|null>(null);
  const[busy,startTransition]=useTransition();
  const[error,setError]=useState<string|null>(null);
  const compatible=selectedNode?library?.componentPresets.filter(item=>item.componentKey===selectedNode.componentKey&&item.componentVersion===selectedNode.componentVersion)??[]:[];

  useEffect(()=>{
    let active=true;
    setLibrary(null);
    setError(null);
    listVisualBuilderPresetLibraryAction({pageKey:document.pageKey})
      .then(next=>{if(active)setLibrary(next);})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A preset könyvtár nem tölthető be.');});
    return()=>{active=false;};
  },[document.pageKey,document.templateKey,document.templateVersion]);

  const run=(job:()=>void)=>startTransition(()=>{setError(null);job();});

  return <div data-storefront-preset-library-workspace-v2>
    <div className={styles.panelSectionHead}><div><strong>Preset könyvtár</strong><span>Gyári, biztonságos kompozíciók és megjelenési variációk.</span></div></div>
    {library?<p className={styles.emptyHint}>{library.templateKey} · v{library.templateVersion} · {library.sourcePageKey}</p>:<p className={styles.emptyHint}>Presetek betöltése…</p>}

    <div className={styles.panelDivider}/>
    <strong>Szekció presetek</strong>
    <p className={styles.emptyHint}>Új szekció friss node ID-kkal; a jelenlegi üzleti adatok authorityja változatlan marad.</p>
    <div className={styles.componentLibrary}>{library?.sectionPresets.map(preset=><article key={preset.presetId}>
      <span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name="layers"/></span>
      <span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · gyári szekció</small></span>
      <div><button type="button" disabled={busy} onClick={()=>run(()=>{
        const inserted=insertStorefrontSectionPreset(document,preset,registry,capability);
        onApply(inserted.document,inserted.insertedNodeId,`„${preset.label}” szekció-preset beillesztve · a draft még nincs mentve.`);
      })}>Beillesztés</button></div>
    </article>)}</div>
    {library&&!library.sectionPresets.length?<p className={styles.emptyHint}>Ehhez az oldaltípushoz nincs gyári szekció-preset.</p>:null}

    <div className={styles.panelDivider}/>
    <strong>Komponens presetek</strong>
    {selectedNode?<p className={styles.emptyHint}>Kijelölt elem: <strong>{label(selectedNode.componentKey)}</strong>. A preset a megjelenést módosítja, a tartalmat és bindingokat nem.</p>:<p className={styles.emptyHint}>Válassz ki egy elemet a vásznon a kompatibilis presetekhez.</p>}
    <div className={styles.componentLibrary}>{compatible.map(preset=><article key={preset.presetId}>
      <span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name="presets"/></span>
      <span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · megjelenési preset</small></span>
      <div><button type="button" disabled={busy||!selectedNode} onClick={()=>run(()=>{
        if(!selectedNode)return;
        const next=applyStorefrontComponentPresetAppearance(document,{nodeId:selectedNode.id,preset},registry,capability);
        onApply(next,selectedNode.id,`„${preset.label}” preset alkalmazva · a tartalom és bindingok változatlanok.`);
      })}>Alkalmazás</button></div>
    </article>)}</div>
    {selectedNode&&library&&!compatible.length?<p className={styles.emptyHint}>A kijelölt elemhez nincs kompatibilis gyári komponens-preset.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
  </div>;
}
