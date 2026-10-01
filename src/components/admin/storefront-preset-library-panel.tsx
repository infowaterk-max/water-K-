'use client';

import {useEffect,useMemo,useState,useTransition} from 'react';
import {listVisualBuilderPresetLibraryAction} from '@/app/admin/tartalom/builder/preset-actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {listStorefrontContextualCapabilityOpportunities} from '@/lib/builder/storefront-template-capability-discovery';
import {
  applyStorefrontComponentPresetAppearance,
  insertStorefrontSectionPreset,
  type StorefrontBuilderPresetLibrary,
  type StorefrontBuilderSectionPreset,
} from '@/lib/builder/storefront-preset-application';
import {
  VX_LIBRARY_CATEGORY_LABELS,
  describeVxComponent,
  describeVxSectionPreset,
  filterVxLibraryItems,
  vxLibraryCategories,
  type VxLibraryCategory,
} from '@/lib/builder/vx-builder-library';
import type {StorefrontComponentNode,StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import {VxBuilderLibraryPreview} from './vx-builder-library-preview';
import libraryStyles from './vx-builder-library.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const label=(key:string)=>key.split('.').at(-1)?.replace(/[-_]/g,' ')??key;

export function StorefrontPresetLibraryPanel({document,selectedNode,capability,onApply}:{document:StorefrontPageDocument;selectedNode:StorefrontComponentNode|null;capability:StorefrontRuntimeCapabilityContext;onApply:(document:StorefrontPageDocument,selectedNodeId:string,message:string)=>void;}){
  const[library,setLibrary]=useState<StorefrontBuilderPresetLibrary|null>(null);
  const[busy,startTransition]=useTransition();
  const[error,setError]=useState<string|null>(null);
  const[query,setQuery]=useState('');
  const[category,setCategory]=useState<VxLibraryCategory|'all'>('all');
  const[previewId,setPreviewId]=useState<string|null>(null);

  const compatible=selectedNode?library?.componentPresets.filter(item=>item.componentKey===selectedNode.componentKey&&item.componentVersion===selectedNode.componentVersion)??[]:[];
  const opportunities=listStorefrontContextualCapabilityOpportunities({document,capability});
  const sectionPresets=library?.sectionPresets??[];
  const categories=useMemo(()=>vxLibraryCategories(sectionPresets.map(describeVxSectionPreset)),[sectionPresets]);
  const visiblePresets=useMemo(()=>filterVxLibraryItems(sectionPresets,{describe:describeVxSectionPreset,label:item=>item.label,query,category}),[sectionPresets,query,category]);
  const previewPreset=previewId?sectionPresets.find(item=>item.presetId===previewId)??null:null;

  useEffect(()=>{
    let active=true;
    setLibrary(null);setError(null);setPreviewId(null);setQuery('');setCategory('all');
    listVisualBuilderPresetLibraryAction({pageKey:document.pageKey}).then(next=>{if(active)setLibrary(next);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A preset könyvtár nem tölthető be.');});
    return()=>{active=false;};
  },[document.pageKey,document.templateKey,document.templateVersion]);

  const run=(job:()=>void)=>startTransition(()=>{setError(null);job();});
  const insertPreset=(preset:StorefrontBuilderSectionPreset)=>run(()=>{
    const inserted=insertStorefrontSectionPreset(document,preset,registry,capability);
    onApply(inserted.document,inserted.insertedNodeId,\`„\${preset.label}” szekció beillesztve · a módosítás még nincs mentve.\`);
  });

  return <div className={libraryStyles.library} data-storefront-preset-library-workspace-v2 data-vx-library-version="2">
    <header className={libraryStyles.libraryHeader}>
      <span>Gyári könyvtár</span>
      <strong>Szekciók</strong>
      <small>Vizuálisan felismerhető, szerkeszthető kompozíciók. A beillesztett blokk utána teljes értékű Builder-tartalom.</small>
    </header>

    <input className={libraryStyles.search} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Szekció keresése…" aria-label="Szekció keresése"/>
    <div className={libraryStyles.chips} role="group" aria-label="Szekció kategóriák">
      <button type="button" className={libraryStyles.chip} data-active={category==='all'} onClick={()=>setCategory('all')}>Összes</button>
      {categories.map(item=><button type="button" key={item} className={libraryStyles.chip} data-active={category===item} onClick={()=>setCategory(item)}>{VX_LIBRARY_CATEGORY_LABELS[item]}</button>)}
    </div>

    {previewPreset?<section className={libraryStyles.previewDetail} aria-label="Szekció nagyobb előnézete">
      <div className={libraryStyles.previewDetailHeader}><div><strong>{previewPreset.label}</strong><small>{describeVxSectionPreset(previewPreset).categoryLabel} · {describeVxSectionPreset(previewPreset).nodeCount} elem</small></div><button type="button" aria-label="Előnézet bezárása" onClick={()=>setPreviewId(null)}><VisualBuilderIcon name="close"/></button></div>
      <VxBuilderLibraryPreview descriptor={describeVxSectionPreset(previewPreset)} size="detail" label={previewPreset.label}/>
      <div className={libraryStyles.previewDetailActions}><button type="button" disabled={busy} onClick={()=>insertPreset(previewPreset)}>Beillesztés</button></div>
    </section>:null}

    <div className={libraryStyles.sectionGrid}>
      {visiblePresets.map(preset=>{const descriptor=describeVxSectionPreset(preset);return <article className={libraryStyles.sectionCard} key={preset.presetId}>
        <button type="button" className={libraryStyles.previewButton} onClick={()=>setPreviewId(preset.presetId)} aria-label={\`\${preset.label} nagyobb előnézete\`}><VxBuilderLibraryPreview descriptor={descriptor} label={preset.label}/></button>
        <div className={libraryStyles.cardMeta}><strong>{preset.label}</strong><div className={libraryStyles.cardBadges}><span className={libraryStyles.cardBadge}>{descriptor.categoryLabel}</span><span className={libraryStyles.cardBadge}>{descriptor.nodeCount}{descriptor.truncated?'+':''} elem</span></div><small>{label(preset.componentKey)} · gyári szekció</small></div>
        <div className={libraryStyles.cardActions}><button type="button" onClick={()=>setPreviewId(preset.presetId)}>Előnézet</button><button type="button" data-primary="true" disabled={busy} onClick={()=>insertPreset(preset)}>Beillesztés</button></div>
      </article>;})}
    </div>
    {library&&!visiblePresets.length?<div className={libraryStyles.empty}>Nincs a keresésnek vagy kategóriának megfelelő gyári szekció.</div>:null}
    {!library?<div className={libraryStyles.empty}>Presetek betöltése…</div>:null}

    <section className={libraryStyles.subsection}>
      <div className={libraryStyles.subsectionHeader}><div><strong>Megjelenési presetek</strong><small>A tartalmat nem írják felül, csak a kijelölt elem megjelenését.</small></div></div>
      {selectedNode?<div className={libraryStyles.appearanceList}>{compatible.map(preset=>{const descriptor=describeVxComponent(preset.componentKey,preset.label);return <article className={libraryStyles.appearanceItem} key={preset.presetId}><VxBuilderLibraryPreview descriptor={descriptor} size="compact"/><span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · megjelenés</small></span><button type="button" disabled={busy} onClick={()=>run(()=>{const next=applyStorefrontComponentPresetAppearance(document,{nodeId:selectedNode.id,preset},registry,capability);onApply(next,selectedNode.id,\`„\${preset.label}” preset alkalmazva · a tartalom változatlan maradt.\`);})}>Alkalmazás</button></article>;})}</div>:<div className={libraryStyles.empty}>Válassz ki egy elemet a vásznon a hozzá illő megjelenési presetekhez.</div>}
      {selectedNode&&library&&!compatible.length?<div className={libraryStyles.empty}>A kijelölt elemhez nincs kompatibilis gyári megjelenési preset.</div>:null}
    </section>

    <details className={libraryStyles.details}>
      <summary>Oldalhoz kapcsolódó képességek</summary>
      <div className={libraryStyles.capabilityList}>{opportunities.map(item=><article className={libraryStyles.capabilityItem} key={item.key} data-capability-status={item.availability}>
        <VxBuilderLibraryPreview descriptor={describeVxComponent(item.componentKeys[0]??'future.capability',item.label)} size="compact"/>
        <span><strong>{item.label}</strong><small>{item.description}</small></span>
        <b className={libraryStyles.capabilityStatus}>{item.availability==='available'?'Elérhető':item.requiredPlan==='pro'?'Pro':'Zárolt'}</b>
      </article>)}</div>
      {!opportunities.length?<div className={libraryStyles.empty}>Ehhez az oldaltípushoz nincs további kontextuális capability.</div>:null}
    </details>

    {error?<div className={libraryStyles.empty} role="alert">{error}</div>:null}
  </div>;
}
