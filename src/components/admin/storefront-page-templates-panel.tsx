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
import {VisualBuilderIcon} from './visual-builder-ui-icon';
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
    onApply(next,next.sections[0]?.id??document.sections[0]?.id??'root',`„${template.label}” oldalsablon alkalmazva · a módosítás még nincs mentve.`);
  });

  const createPage=()=>run(async()=>{
    if(!newPresetId)throw new Error('Válassz oldalsablont.');
    const targetPageKey=newPageKey.trim();
    if(!targetPageKey)throw new Error('Adj meg egy oldalazonosítót.');
    const result=await createVisualBuilderPageFromTemplateAction({referencePageKey:document.pageKey,presetId:newPresetId,targetPageKey,operationKey:operationKey()});
    setMessage(`Új ${label(result.pageType)} oldal létrehozva · piszkozat r${result.revisionNumber}.`);
    setNewPageKey('');
    router.push(`/admin/tartalom/builder?page=${encodeURIComponent(result.pageKey)}`);
    router.refresh();
  });

  return <div data-storefront-page-templates-v1>
    <strong>Oldalsablonok</strong>
    <p className={styles.emptyHint}>Cseréld le az aktuális oldal teljes elrendezését egy kész oldalsablonra. A globális márkastílus megmarad, a módosítás pedig mentésig visszavonható.</p>
    {library?<p className={styles.emptyHint}>Az aktuális oldaltípushoz elérhető sablonok.</p>:<p className={styles.emptyHint}>Oldalsablonok betöltése…</p>}
    <div className={styles.componentLibrary}>{applicable.map(template=><article key={template.presetId}>
      <span className={styles.componentLibraryIcon} aria-hidden="true"><VisualBuilderIcon name="templates"/></span>
      <span><strong>{template.label}</strong><small>{label(template.pageType)} · teljes oldal</small></span>
      <div><button type="button" disabled={busy} onClick={()=>applyTemplate(template)}>Alkalmazás</button></div>
    </article>)}</div>
    {library&&!applicable.length?<p className={styles.emptyHint}>Az aktuális oldaltípushoz nincs kompatibilis gyári oldalsablon.</p>:null}

    <div className={styles.panelDivider}/>
    <strong>Új oldal sablonból</strong>
    <p className={styles.emptyHint}>Kész sablonból új tartalmi, blog- vagy jogi oldalt hozhatsz létre. Az új oldal először piszkozatként jön létre.</p>
    <label className={styles.field}><span>Oldalsablon</span><select value={newPresetId} disabled={busy||!creatable.length} onChange={event=>setNewPresetId(event.target.value)}>{creatable.map(template=><option key={template.presetId} value={template.presetId}>{template.label} · {label(template.pageType)}</option>)}</select></label>
    <label className={styles.field}><span>Oldal azonosítója</span><input value={newPageKey} maxLength={128} placeholder="pl. rolunk" disabled={busy} onChange={event=>setNewPageKey(event.target.value)}/><small>Rövid, egyedi azonosító az oldalhoz.</small></label>
    <button type="button" className={styles.addSectionButton} disabled={busy||!newPresetId||!newPageKey.trim()} onClick={createPage}><VisualBuilderIcon name="plus"/> Új piszkozat oldal</button>
    {!creatable.length&&library?<p className={styles.emptyHint}>Ebben a sablonban nincs új oldal létrehozására engedélyezett oldalsablon.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
    {message?<div className={styles.notice} role="status">{message}</div>:null}
  </div>;
}
