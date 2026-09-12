'use client';

import {useState,useTransition} from 'react';
import {
  createVisualBuilderSavedBlockAction,
  deleteVisualBuilderSavedBlockAction,
  getVisualBuilderSavedBlockAction,
} from '@/app/admin/tartalom/builder/actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {insertStorefrontSavedBlock} from '@/lib/builder/storefront-saved-blocks';
import {validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument,type StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontSavedBlockSummary} from '@/lib/builder/storefront-saved-block-persistence';
import styles from './storefront-visual-builder.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=(kind:string)=>`builder:saved-block:${kind}:${crypto.randomUUID()}`;
const label=(key:string)=>key.split('.').at(-1)?.replace(/[-_]/g,' ')??key;

type Props={
  document:StorefrontPageDocument;
  selectedNode:StorefrontComponentNode|null;
  selectedIsTopLevel:boolean;
  initialSavedBlocks:StorefrontSavedBlockSummary[];
  capability:StorefrontRuntimeCapabilityContext;
  onApply:(document:StorefrontPageDocument,insertedNodeId:string,message:string)=>void;
};

export function StorefrontSavedBlocksPanel({document,selectedNode,selectedIsTopLevel,initialSavedBlocks,capability,onApply}:Props){
  const[blocks,setBlocks]=useState(initialSavedBlocks);
  const[name,setName]=useState('');
  const[busy,startTransition]=useTransition();
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const selectedDefinition=selectedNode?registry.get(selectedNode.componentKey,selectedNode.componentVersion):undefined;
  const canSave=Boolean(selectedNode&&selectedIsTopLevel&&!selectedDefinition?.protectedSystem);

  const run=(job:()=>Promise<void>)=>startTransition(()=>{
    setMessage(null);
    setError(null);
    job().catch(reason=>setError(reason instanceof Error?reason.message:'A mentett blokk művelet sikertelen.'));
  });

  const saveSelected=()=>{
    if(!selectedNode||!canSave){
      setError('Mentéshez válassz ki egy nem védett, legfelső szintű szekciót.');
      return;
    }
    const blockName=name.trim()||label(selectedNode.componentKey);
    run(async()=>{
      const saved=await createVisualBuilderSavedBlockAction({name:blockName,fragment:selectedNode,operationKey:operationKey('create')});
      setBlocks(current=>[saved,...current.filter(item=>item.id!==saved.id)]);
      setName('');
      setMessage(`„${saved.name}” elmentve a saját blokkok közé.`);
    });
  };

  const insertBlock=(blockId:string)=>run(async()=>{
    const block=await getVisualBuilderSavedBlockAction({blockId});
    const inserted=insertStorefrontSavedBlock(document,block.fragment);
    const validation=validateStorefrontPageDocument(inserted.document,registry,capability);
    const failures=validation.violations.filter(item=>item.severity==='error');
    if(failures.length)throw new Error(`STOREFRONT_SAVED_BLOCK_NOT_COMPATIBLE:${failures[0]?.code??'INVALID'}`);
    onApply(inserted.document,inserted.insertedNodeId,`„${block.name}” beillesztve · a draft még nincs mentve.`);
    setMessage(`„${block.name}” beillesztve. A módosítás a következő Mentéskor kerül a draftba.`);
  });

  const deleteBlock=(blockId:string)=>run(async()=>{
    const target=blocks.find(item=>item.id===blockId);
    await deleteVisualBuilderSavedBlockAction({blockId,operationKey:operationKey('delete')});
    setBlocks(current=>current.filter(item=>item.id!==blockId));
    setMessage(target?`„${target.name}” törölve a saját blokkok közül.`:'Mentett blokk törölve.');
  });

  return <div className={styles.fieldGroup} data-storefront-saved-blocks-v1>
    <strong>Saját mentett blokkok</strong>
    <p className={styles.emptyHint}>Ments el egy teljes felső szintű szekciót, majd illeszd be bármely kompatibilis oldalra. A beillesztés nem publikál és nem ment automatikusan.</p>
    <label className={styles.field}><span>Blokk neve</span><input value={name} maxLength={80} placeholder={selectedNode?label(selectedNode.componentKey):'Pl. Nyári hero'} onChange={event=>setName(event.target.value)}/></label>
    <button type="button" className={styles.addSectionButton} disabled={busy||!canSave} onClick={saveSelected}>☆ Kijelölt szekció mentése</button>
    {!canSave&&selectedNode?<p className={styles.emptyHint}>V1-ben csak nem védett, legfelső szintű szekció menthető. Belső komponenshez válaszd ki a szülő szekciót.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
    {message?<div className={styles.notice} role="status">{message}</div>:null}
    <div className={styles.componentLibrary}>
      {blocks.map(block=><article key={block.id}>
        <span className={styles.componentLibraryIcon}>☆</span>
        <span><strong>{block.name}</strong><small>{label(block.componentKey)} · v{block.componentVersion}</small></span>
        <div><button type="button" disabled={busy} onClick={()=>insertBlock(block.id)}>Beillesztés</button><button type="button" disabled={busy} onClick={()=>deleteBlock(block.id)}>Törlés</button></div>
      </article>)}
    </div>
    {!blocks.length?<p className={styles.emptyHint}>Még nincs saját mentett blokk ebben a webshopban.</p>:null}
  </div>;
}
