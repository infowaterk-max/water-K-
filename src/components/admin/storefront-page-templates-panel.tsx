'use client';

import {useEffect,useMemo,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {
  createVisualBuilderPageFromTemplateAction,
  getVisualBuilderPageTemplateSourceAction,
  listVisualBuilderPageTemplatesAction,
} from '@/app/admin/tartalom/builder/page-template-actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontPageTemplate,
  type StorefrontBuilderPageTemplate,
  type StorefrontBuilderPageTemplateLibrary,
} from '@/lib/builder/storefront-page-templates';
import {
  VX_LIBRARY_CATEGORY_LABELS,
  describeVxPageTemplate,
  filterVxLibraryItems,
  vxLibraryCategories,
  type VxLibraryCategory,
} from '@/lib/builder/vx-builder-library';
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import {VxBuilderLibraryPreview} from './vx-builder-library-preview';
import libraryStyles from './vx-builder-library.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=()=>\`builder:page-template:create:\${crypto.randomUUID()}\`;
const label=(value:string)=>value.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[._:-]+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());

type Props={
  document:StorefrontPageDocument;
  capability:StorefrontRuntimeCapabilityContext;
  onApply:(document:StorefrontPageDocument,selectedNodeId:string,message:string)=>void;
};

export function StorefrontPageTemplatesPanel({document,capability,onApply}:Props){
  const router=useRouter();
  const[busy,startTransition]=useTransition();
  const[library,setLibrary]=useState<StorefrontBuilderPageTemplateLibrary|null>(null);
  const[newPresetId,setNewPresetId]=useState('');
  const[newPageKey,setNewPageKey]=useState('');
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[query,setQuery]=useState('');
  const[category,setCategory]=useState<VxLibraryCategory|'all'>('all');
  const[previewId,setPreviewId]=useState<string|null>(null);

  const applicable=useMemo(()=>library?.pageTemplates.filter(item=>item.canApplyToCurrent)??[],[library]);
  const creatable=useMemo(()=>library?.pageTemplates.filter(item=>item.canCreateNew)??[],[library]);
  const categories=useMemo(()=>vxLibraryCategories(applicable.map(describeVxPageTemplate)),[applicable]);
  const visibleApplicable=useMemo(()=>filterVxLibraryItems(applicable,{describe:describeVxPageTemplate,label:item=>item.label,query,category}),[applicable,query,category]);
  const previewTemplate=previewId?applicable.find(item=>item.presetId===previewId)??null:null;

  useEffect(()=>{
    let active=true;
    setLibrary(null);setError(null);setMessage(null);setPreviewId(null);setQuery('');setCategory('all');
    listVisualBuilderPageTemplatesAction({pageKey:document.pageKey}).then(next=>{
      if(!active)return;
      setLibrary(next);
      const first=next.pageTemplates.find(item=>item.canCreateNew);
      setNewPresetId(first?.presetId??'');
    }).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Az oldalsablonok nem tölthetők be.');});
    return()=>{active=false;};
  },[document.pageKey,document.templateKey,document.templateVersion]);

  const run=(job:()=>Promise<void>)=>startTransition(()=>{
    setError(null);setMessage(null);
    job().catch(reason=>setError(reason instanceof Error?reason.message:'Az oldalsablon művelet sikertelen.'));
  });

  const applyTemplate=(template:StorefrontBuilderPageTemplate)=>run(async()=>{
    const source=await getVisualBuilderPageTemplateSourceAction({pageKey:document.pageKey,presetId:template.presetId});
    const next=applyStorefrontPageTemplate({current:document,source,registry,capability});
    onApply(next,next.sections[0]?.id??document.sections[0]?.id??'root',\`„\${template.label}” oldalsablon alkalmazva · a módosítás még nincs mentve.\`);
  });

  const createPage=()=>run(async()=>{
    if(!newPresetId)throw new Error('Válassz oldalsablont.');
    const targetPageKey=newPageKey.trim();
    if(!targetPageKey)throw new Error('Adj meg egy oldalazonosítót.');
    const result=await createVisualBuilderPageFromTemplateAction({referencePageKey:document.pageKey,presetId:newPresetId,targetPageKey,operationKey:operationKey()});
    setMessage(\`Új \${label(result.pageType)} oldal létrehozva · piszkozat r\${result.revisionNumber}.\`);
    setNewPageKey('');
    router.push(\`/admin/tartalom/builder?page=\${encodeURIComponent(result.pageKey)}\`);
    router.refresh();
  });

  return <div className={libraryStyles.library} data-storefront-page-templates-v1 data-vx-library-version="2">
    <header className={libraryStyles.libraryHeader}>
      <span>Oldalkönyvtár</span>
      <strong>Oldalsablonok</strong>
      <small>Kész teljes oldalak az aktuális sablon vizuális rendszerében. Alkalmazás után ugyanaz a Page Schema marad szerkeszthető.</small>
    </header>

    <input className={libraryStyles.search} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Oldalsablon keresése…" aria-label="Oldalsablon keresése"/>
    <div className={libraryStyles.chips} role="group" aria-label="Oldalsablon kategóriák">
      <button type="button" className={libraryStyles.chip} data-active={category==='all'} onClick={()=>setCategory('all')}>Összes</button>
      {categories.map(item=><button type="button" key={item} className={libraryStyles.chip} data-active={category===item} onClick={()=>setCategory(item)}>{VX_LIBRARY_CATEGORY_LABELS[item]}</button>)}
    </div>

    {previewTemplate?<section className={libraryStyles.previewDetail} aria-label="Oldalsablon nagyobb előnézete">
      <div className={libraryStyles.previewDetailHeader}><div><strong>{previewTemplate.label}</strong><small>{label(previewTemplate.pageType)} · teljes oldal</small></div><button type="button" aria-label="Előnézet bezárása" onClick={()=>setPreviewId(null)}><VisualBuilderIcon name="close"/></button></div>
      <VxBuilderLibraryPreview descriptor={describeVxPageTemplate(previewTemplate)} size="detail" label={previewTemplate.label}/>
      <div className={libraryStyles.previewDetailActions}><button type="button" disabled={busy} onClick={()=>applyTemplate(previewTemplate)}>Alkalmazás</button></div>
    </section>:null}

    <div className={libraryStyles.pageGrid}>{visibleApplicable.map(template=>{const descriptor=describeVxPageTemplate(template);return <article className={libraryStyles.pageCard} key={template.presetId}>
      <button type="button" className={libraryStyles.previewButton} onClick={()=>setPreviewId(template.presetId)} aria-label={\`\${template.label} nagyobb előnézete\`}><VxBuilderLibraryPreview descriptor={descriptor} label={template.label}/></button>
      <div className={libraryStyles.cardMeta}><strong>{template.label}</strong><div className={libraryStyles.cardBadges}><span className={libraryStyles.cardBadge}>{descriptor.categoryLabel}</span><span className={libraryStyles.cardBadge}>{label(template.pageType)}</span></div><small>Teljes oldal · a globális márkastílus megmarad</small></div>
      <div className={libraryStyles.cardActions}><button type="button" onClick={()=>setPreviewId(template.presetId)}>Előnézet</button><button type="button" data-primary="true" disabled={busy} onClick={()=>applyTemplate(template)}>Alkalmazás</button></div>
    </article>;})}</div>
    {library&&!visibleApplicable.length?<div className={libraryStyles.empty}>Nincs a keresésnek vagy kategóriának megfelelő oldalsablon.</div>:null}
    {!library?<div className={libraryStyles.empty}>Oldalsablonok betöltése…</div>:null}

    <section className={libraryStyles.subsection}>
      <div className={libraryStyles.subsectionHeader}><div><strong>Új oldal sablonból</strong><small>Az új oldal először piszkozatként jön létre.</small></div></div>
      <div className={libraryStyles.pageCreate}>
        <label><span>Oldalsablon</span><select value={newPresetId} disabled={busy||!creatable.length} onChange={event=>setNewPresetId(event.target.value)}>{creatable.map(template=><option key={template.presetId} value={template.presetId}>{template.label} · {label(template.pageType)}</option>)}</select></label>
        <label><span>Oldal azonosítója</span><input value={newPageKey} maxLength={128} placeholder="pl. rolunk" disabled={busy} onChange={event=>setNewPageKey(event.target.value)}/></label>
        <button type="button" disabled={busy||!newPresetId||!newPageKey.trim()} onClick={createPage}><VisualBuilderIcon name="plus"/> Új piszkozat oldal</button>
      </div>
      {!creatable.length&&library?<div className={libraryStyles.empty}>Ebben a sablonban nincs új oldal létrehozására engedélyezett oldalsablon.</div>:null}
    </section>

    {error?<div className={libraryStyles.empty} role="alert">{error}</div>:null}
    {message?<div className={libraryStyles.empty} role="status">{message}</div>:null}
  </div>;
}
