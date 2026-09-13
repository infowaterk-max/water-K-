'use client';

import {useState,useTransition} from 'react';
import {
  createVisualBuilderSavedBlockAction,
  deleteVisualBuilderSavedBlockAction,
  getVisualBuilderSavedBlockAction,
  updateVisualBuilderSavedBlockAction,
} from '@/app/admin/tartalom/builder/actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {insertStorefrontSavedBlock} from '@/lib/builder/storefront-saved-blocks';
import {validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument,type StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontSavedBlockSummary} from '@/lib/builder/storefront-saved-block-persistence';
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import css from './storefront-visual-builder-95.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=(kind:string)=>`builder:own-block:${kind}:${crypto.randomUUID()}`;
const LABELS:Record<string,string>={'layout.section':'Szekció','layout.container':'Konténer','system.header':'Fejléc','editorial.footer':'Lábléc'};
const label=(key:string)=>LABELS[key]??key.split('.').at(-1)?.replace(/[-_]/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())??'Blokk';

export function StorefrontOwnBlocksPanel({document,selectedNode,selectedIsTopLevel,initialSavedBlocks,capability,onApply}:{
  document:StorefrontPageDocument;
  selectedNode:StorefrontComponentNode|null;
  selectedIsTopLevel:boolean;
  initialSavedBlocks:StorefrontSavedBlockSummary[];
  capability:StorefrontRuntimeCapabilityContext;
  onApply:(document:StorefrontPageDocument,insertedNodeId:string,message:string)=>void;
}){
  const[blocks,setBlocks]=useState(initialSavedBlocks);
  const[name,setName]=useState('');
  const[editingId,setEditingId]=useState<string|null>(null);
  const[editingName,setEditingName]=useState('');
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[busy,startTransition]=useTransition();
  const selectedDefinition=selectedNode?registry.get(selectedNode.componentKey,selectedNode.componentVersion):undefined;
  const canSave=Boolean(selectedNode&&selectedIsTopLevel&&!selectedDefinition?.protectedSystem);
  const run=(job:()=>Promise<void>)=>startTransition(()=>{setMessage(null);setError(null);job().catch(reason=>setError(reason instanceof Error?reason.message:'A saját blokk művelet sikertelen.'));});
  const assertCompatible=(next:StorefrontPageDocument)=>{const result=validateStorefrontPageDocument(next,registry,capability);const failure=result.violations.find(item=>item.severity==='error');if(failure)throw new Error(`A blokk nem kompatibilis ezzel az oldallal: ${failure.code}`);};

  const saveSelected=()=>{
    if(!selectedNode||!canSave){setError('Mentéshez válassz ki egy nem védett, legfelső szintű szekciót.');return;}
    const blockName=name.trim()||label(selectedNode.componentKey);
    run(async()=>{const saved=await createVisualBuilderSavedBlockAction({name:blockName,fragment:selectedNode,operationKey:operationKey('create')});setBlocks(current=>[saved,...current.filter(item=>item.id!==saved.id)]);setName('');setMessage(`„${saved.name}” elmentve.`);});
  };
  const insertBlock=(blockId:string)=>run(async()=>{const block=await getVisualBuilderSavedBlockAction({blockId});const inserted=insertStorefrontSavedBlock(document,block.fragment);assertCompatible(inserted.document);onApply(inserted.document,inserted.insertedNodeId,`„${block.name}” beillesztve · a piszkozat még nincs mentve.`);});
  const saveRename=(blockId:string)=>{const nextName=editingName.trim();if(!nextName){setError('A blokk neve nem lehet üres.');return;}run(async()=>{const updated=await updateVisualBuilderSavedBlockAction({blockId,name:nextName,operationKey:operationKey('rename')});setBlocks(current=>current.map(item=>item.id===updated.id?updated:item));setEditingId(null);setEditingName('');setMessage(`„${updated.name}” néven mentve.`);});};
  const deleteBlock=(blockId:string)=>run(async()=>{const target=blocks.find(item=>item.id===blockId);await deleteVisualBuilderSavedBlockAction({blockId,operationKey:operationKey('delete')});setBlocks(current=>current.filter(item=>item.id!==blockId));if(editingId===blockId){setEditingId(null);setEditingName('');}setMessage(target?`„${target.name}” törölve.`:'A blokk törölve.');});

  return <div data-storefront-own-blocks-v2>
    <div className={css.panelHead}><div><strong>Saját blokkok</strong><small>Teljes szekciókat menthetsz el és használhatsz újra más oldalakon.</small></div></div>
    <div className={css.sectionCard}>
      <div className={css.sectionTitle}><strong>Kijelölt szekció mentése</strong><small>{canSave?'Menthető':'Válassz szekciót'}</small></div>
      <label className={css.field}><span>Blokk neve</span><input value={name} maxLength={80} placeholder={selectedNode?label(selectedNode.componentKey):'Pl. Nyári hero'} onChange={event=>setName(event.target.value)}/></label>
      <button type="button" className={css.secondary} disabled={busy||!canSave} onClick={saveSelected}><VisualBuilderIcon name="saved"/> Mentés saját blokként</button>
      {!canSave?<p className={css.hint}>V1-ben nem védett, legfelső szintű szekció menthető. Belső elemnél válaszd ki a szülő szekciót.</p>:null}
    </div>
    {message?<div className={css.statusCard}><VisualBuilderIcon name="check"/><div><strong>Kész</strong><small>{message}</small></div></div>:null}
    {error?<div className={css.statusCard}><VisualBuilderIcon name="error"/><div><strong>Nem sikerült</strong><small>{error}</small></div></div>:null}
    <div className={css.library}>{blocks.map(block=><article className={css.libraryCard} key={block.id}>
      <span className={css.libraryIcon}><VisualBuilderIcon name="saved"/></span>
      <span>{editingId===block.id?<input className={css.search} aria-label="Blokk új neve" value={editingName} maxLength={80} disabled={busy} onChange={event=>setEditingName(event.target.value)}/>:<strong>{block.name}</strong>}<small>{label(block.componentKey)} · újrahasználható szekció</small></span>
      <span>{editingId===block.id?<><button type="button" disabled={busy} onClick={()=>saveRename(block.id)}>Mentés</button><button type="button" disabled={busy} onClick={()=>{setEditingId(null);setEditingName('');}}>Mégse</button></>:<><button type="button" disabled={busy} onClick={()=>insertBlock(block.id)}>Beillesztés</button><button type="button" disabled={busy} onClick={()=>{setEditingId(block.id);setEditingName(block.name);}}>Átnevezés</button><button type="button" disabled={busy} onClick={()=>deleteBlock(block.id)}>Törlés</button></>}</span>
    </article>)}</div>
    {!blocks.length?<p className={css.hint}>Még nincs saját mentett blokk ebben a webshopban.</p>:null}
  </div>;
}
