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
import type {StorefrontPageDocument,StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import styles from './storefront-visual-builder.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=()=>`builder:page-template:create:${crypto.randomUUID()}`;
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
  const applicable=useMemo(()=>library?.pageTemplates.filter(item=>item.canApplyToCurrent)??[],[library]);
  const creatable=useMemo(()=>library?.pageTemplates.filter(item=>item.canCreateNew)??[],[library]);

  useEffect(()=>{
    let active=true;
    setLibrary(null);setError(null);setMessage(null);
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
    onApply(next,next.sections[0]?.id??document.sections[0]?.id??'root',`„${template.label}” oldalsablon alkalmazva · a teljes working copy lecserélve, a draft még nincs mentve.`);
  });

  const createPage=()=>run(async()=>{
    if(!newPresetId)throw new Error('STOREFRONT_PAGE_TEMPLATE_SELECTION_REQUIRED');
    const targetPageKey=newPageKey.trim();
    if(!targetPageKey)throw new Error('STOREFRONT_PAGE_TEMPLATE_PAGE_KEY_REQUIRED');
    const result=await createVisualBuilderPageFromTemplateAction({referencePageKey:document.pageKey,presetId:newPresetId,targetPageKey,operationKey:operationKey()});
    setMessage(`Új ${label(result.pageType)} oldal létrehozva · r${result.revisionNumber}.`);
    setNewPageKey('');
    router.push(`/admin/tartalom/builder?page=${encodeURIComponent(result.pageKey)}`);
    router.refresh();
  });

  return <div data-storefront-page-templates-v1>
    <strong>Oldalsablonok</strong>
    <p className={styles.emptyHint}>Teljes Page Presetet alkalmazhatsz az aktuális oldal working copyjára. Ez lecseréli az oldal kompozícióját, de nem ment és nem publikál automatikusan; a globális márkastílus megmarad, és a Builder visszavonása használható.</p>
    {library?<p className={styles.emptyHint}>{library.templateKey} · v{library.templateVersion} · {label(library.currentPageType)}</p>:<p className={styles.emptyHint}>Oldalsablonok betöltése…</p>}
    <div className={styles.componentLibrary}>{applicable.map(template=><article key={template.presetId}>
      <span className={styles.componentLibraryIcon}>▤</span>
      <span><strong>{template.label}</strong><small>{label(template.pageType)} · teljes oldal</small></span>
      <div><button type="button" disabled={busy} onClick={()=>applyTemplate(template)}>Teljes oldal alkalmazása</button></div>
    </article>)}</div>
    {library&&!applicable.length?<p className={styles.emptyHint}>Az aktuális oldaltípushoz nincs kompatibilis gyári Page Preset.</p>:null}

    <div className={styles.panelDivider}/>
    <strong>Új oldal oldalsablonból</strong>
    <p className={styles.emptyHint}>V1-ben új, ismételhető tartalmi oldal hozható létre: Tartalom, Blogbejegyzés vagy Jogi oldal. Az új oldal elsőként draftként jön létre.</p>
    <label className={styles.field}><span>Oldalsablon</span><select value={newPresetId} disabled={busy||!creatable.length} onChange={event=>setNewPresetId(event.target.value)}>{creatable.map(template=><option key={template.presetId} value={template.presetId}>{template.label} · {label(template.pageType)}</option>)}</select></label>
    <label className={styles.field}><span>Új oldal kulcsa</span><input value={newPageKey} maxLength={128} placeholder="pl. content.rolunk" disabled={busy} onChange={event=>setNewPageKey(event.target.value)}/></label>
    <button type="button" className={styles.addSectionButton} disabled={busy||!newPresetId||!newPageKey.trim()} onClick={createPage}>＋ Új draft oldal létrehozása</button>
    {!creatable.length&&library?<p className={styles.emptyHint}>Ebben a sablonban nincs új oldal létrehozására engedélyezett Page Preset.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
    {message?<div className={styles.notice} role="status">{message}</div>:null}
  </div>;
}
