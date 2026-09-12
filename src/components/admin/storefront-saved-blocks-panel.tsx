'use client';

import {useEffect,useState,useTransition} from 'react';
import {
  createVisualBuilderReusableSymbolAction,
  createVisualBuilderSavedBlockAction,
  deleteVisualBuilderReusableSymbolAction,
  deleteVisualBuilderSavedBlockAction,
  getVisualBuilderSavedBlockAction,
  listVisualBuilderReusableSymbolsAction,
  setVisualBuilderReusableSymbolGlobalSlotAction,
  updateVisualBuilderSavedBlockAction,
} from '@/app/admin/tartalom/builder/actions';
import {listVisualBuilderPresetLibraryAction} from '@/app/admin/tartalom/builder/preset-actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
import {
  applyStorefrontComponentPresetAppearance,
  insertStorefrontSectionPreset,
  type StorefrontBuilderComponentPreset,
  type StorefrontBuilderPresetLibrary,
  type StorefrontBuilderSectionPreset,
} from '@/lib/builder/storefront-preset-application';
import {insertStorefrontSavedBlock} from '@/lib/builder/storefront-saved-blocks';
import {
  assertStorefrontReusableSymbolSource,
  detachStorefrontReusableSymbol,
  findStorefrontLinkedSymbolInstance,
  insertStorefrontReusableSymbol,
  linkStorefrontReusableSymbolAtRoot,
  rebaseStorefrontReusableSymbolInstances,
  type StorefrontGlobalSymbolSlot,
  type StorefrontReusableSymbol,
} from '@/lib/builder/storefront-linked-symbols';
import {validateStorefrontPageDocument,type StorefrontComponentNode,type StorefrontPageDocument,type StorefrontRuntimeCapabilityContext} from '@/lib/builder/storefront-runtime';
import type {StorefrontSavedBlockSummary} from '@/lib/builder/storefront-saved-block-persistence';
import styles from './storefront-visual-builder.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=(kind:string)=>`builder:fidelity:${kind}:${crypto.randomUUID()}`;
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
  const[symbols,setSymbols]=useState<StorefrontReusableSymbol[]>([]);
  const[presetLibrary,setPresetLibrary]=useState<StorefrontBuilderPresetLibrary|null>(null);
  const[name,setName]=useState('');
  const[symbolName,setSymbolName]=useState('');
  const[editingId,setEditingId]=useState<string|null>(null);
  const[editingName,setEditingName]=useState('');
  const[busy,startTransition]=useTransition();
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const selectedDefinition=selectedNode?registry.get(selectedNode.componentKey,selectedNode.componentVersion):undefined;
  const canSave=Boolean(selectedNode&&selectedIsTopLevel&&!selectedDefinition?.protectedSystem);
  const linkedInstance=selectedNode?findStorefrontLinkedSymbolInstance(document,selectedNode.id):null;
  const canCreateSymbol=(()=>{
    if(!selectedNode||!selectedIsTopLevel)return false;
    try{assertStorefrontReusableSymbolSource(selectedNode);return true;}catch{return false;}
  })();
  const compatibleComponentPresets=selectedNode?presetLibrary?.componentPresets.filter(preset=>preset.componentKey===selectedNode.componentKey&&preset.componentVersion===selectedNode.componentVersion)??[]:[];

  useEffect(()=>{
    let active=true;
    listVisualBuilderReusableSymbolsAction().then(items=>{if(active)setSymbols(items);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A reusable symbol lista nem tölthető be.');});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    let active=true;
    setPresetLibrary(null);
    listVisualBuilderPresetLibraryAction({pageKey:document.pageKey}).then(library=>{if(active)setPresetLibrary(library);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A preset könyvtár nem tölthető be.');});
    return()=>{active=false;};
  },[document.pageKey,document.templateKey,document.templateVersion]);

  const run=(job:()=>Promise<void>)=>startTransition(()=>{
    setMessage(null);setError(null);
    job().catch(reason=>setError(reason instanceof Error?reason.message:'A Builder művelet sikertelen.'));
  });
  const assertCompatible=(next:StorefrontPageDocument)=>{
    const validation=validateStorefrontPageDocument(next,registry,capability);
    const failure=validation.violations.find(item=>item.severity==='error');
    if(failure)throw new Error(`STOREFRONT_SYMBOL_NOT_COMPATIBLE:${failure.code}`);
  };

  const insertPresetSection=(preset:StorefrontBuilderSectionPreset)=>run(async()=>{
    const inserted=insertStorefrontSectionPreset(document,preset,registry,capability);
    onApply(inserted.document,inserted.insertedNodeId,`„${preset.label}” gyári szekció-preset beillesztve · a draft még nincs mentve.`);
  });
  const applyComponentPreset=(preset:StorefrontBuilderComponentPreset)=>{
    if(!selectedNode){setError('Komponens presethez válassz ki egy kompatibilis elemet.');return;}
    run(async()=>{
      const next=applyStorefrontComponentPresetAppearance(document,{nodeId:selectedNode.id,preset},registry,capability);
      onApply(next,selectedNode.id,`„${preset.label}” megjelenési preset alkalmazva · a tartalom és bindingok változatlanok.`);
    });
  };

  const saveSelected=()=>{
    if(!selectedNode||!canSave){setError('Mentéshez válassz ki egy nem védett, legfelső szintű szekciót.');return;}
    const blockName=name.trim()||label(selectedNode.componentKey);
    run(async()=>{
      const saved=await createVisualBuilderSavedBlockAction({name:blockName,fragment:selectedNode,operationKey:operationKey('create')});
      setBlocks(current=>[saved,...current.filter(item=>item.id!==saved.id)]);setName('');
      setMessage(`„${saved.name}” elmentve a saját blokkok közé.`);
    });
  };
  const insertBlock=(blockId:string)=>run(async()=>{
    const block=await getVisualBuilderSavedBlockAction({blockId});
    const inserted=insertStorefrontSavedBlock(document,block.fragment);assertCompatible(inserted.document);
    onApply(inserted.document,inserted.insertedNodeId,`„${block.name}” beillesztve · a draft még nincs mentve.`);
  });
  const beginRename=(block:StorefrontSavedBlockSummary)=>{setError(null);setMessage(null);setEditingId(block.id);setEditingName(block.name);};
  const cancelRename=()=>{setEditingId(null);setEditingName('');};
  const saveRename=(blockId:string)=>{
    const nextName=editingName.trim();if(!nextName){setError('A mentett blokk neve nem lehet üres.');return;}
    run(async()=>{
      const updated=await updateVisualBuilderSavedBlockAction({blockId,name:nextName,operationKey:operationKey('update')});
      setBlocks(current=>current.map(item=>item.id===updated.id?updated:item));cancelRename();setMessage(`„${updated.name}” néven mentve.`);
    });
  };
  const deleteBlock=(blockId:string)=>run(async()=>{
    const target=blocks.find(item=>item.id===blockId);
    await deleteVisualBuilderSavedBlockAction({blockId,operationKey:operationKey('delete')});
    setBlocks(current=>current.filter(item=>item.id!==blockId));if(editingId===blockId)cancelRename();
    setMessage(target?`„${target.name}” törölve a saját blokkok közül.`:'Mentett blokk törölve.');
  });

  const createLinkedSymbol=()=>{
    if(!selectedNode||!canCreateSymbol){setError('Linked symbolhoz válassz ki egy canonical legfelső szintű szekciót vagy fejlécet.');return;}
    const nextName=symbolName.trim()||label(selectedNode.componentKey);
    run(async()=>{
      const symbol=await createVisualBuilderReusableSymbolAction({name:nextName,fragment:selectedNode,operationKey:operationKey('symbol-create')});
      const next=linkStorefrontReusableSymbolAtRoot(document,symbol,selectedNode.id);assertCompatible(next);
      setSymbols(current=>[symbol,...current.filter(item=>item.id!==symbol.id)]);setSymbolName('');
      onApply(next,selectedNode.id,`„${symbol.name}” linked symbol létrehozva · a draft még nincs mentve.`);
    });
  };
  const insertLinkedSymbol=(symbol:StorefrontReusableSymbol)=>{
    run(async()=>{
      const inserted=insertStorefrontReusableSymbol(document,symbol);assertCompatible(inserted.document);
      onApply(inserted.document,inserted.insertedNodeId,`„${symbol.name}” linkelve beillesztve · a draft még nincs mentve.`);
    });
  };
  const detachSelected=()=>{
    if(!selectedNode||!linkedInstance)return;
    const next=detachStorefrontReusableSymbol(document,selectedNode.id,symbols);assertCompatible(next);
    onApply(next,selectedNode.id,'A kijelölt példány leválasztva. A jelenlegi effektív tartalom megmaradt.');
  };
  const syncLinked=()=>{
    const next=rebaseStorefrontReusableSymbolInstances(document,symbols);assertCompatible(next);
    onApply(next,selectedNode?.id??next.sections[0]?.id??'root','Linked symbol példányok szinkronizálva · a draft még nincs mentve.');
  };
  const setGlobal=(symbol:StorefrontReusableSymbol,globalSlot:StorefrontGlobalSymbolSlot|null)=>run(async()=>{
    const updated=await setVisualBuilderReusableSymbolGlobalSlotAction({symbolId:symbol.id,globalSlot,operationKey:operationKey('symbol-global')});
    setSymbols(current=>current.map(item=>item.id===updated.id?updated:globalSlot&&item.globalSlot===globalSlot?{...item,globalSlot:null}:item));
    setMessage(globalSlot?`„${updated.name}” mostantól globális ${globalSlot==='header'?'fejléc':'lábléc'}.`:`„${updated.name}” globális hozzárendelése kikapcsolva.`);
  });
  const deleteSymbol=(symbol:StorefrontReusableSymbol)=>run(async()=>{
    await deleteVisualBuilderReusableSymbolAction({symbolId:symbol.id,operationKey:operationKey('symbol-delete')});
    setSymbols(current=>current.filter(item=>item.id!==symbol.id));setMessage(`„${symbol.name}” reusable symbol törölve.`);
  });

  return <div className={styles.fieldGroup} data-storefront-saved-blocks-v1>
    <div data-storefront-preset-library-v1>
      <strong>Preset könyvtár</strong>
      <p className={styles.emptyHint}>Az aktuális sablon gyári szekcióit friss ID-kkel illesztheted be. Komponens preset csak a kijelölt kompatibilis elem megjelenését és responsive beállításait módosítja; tartalmat, bindingot és gyerekstruktúrát nem ír felül.</p>
      {presetLibrary?<p className={styles.emptyHint}>{presetLibrary.templateKey} · v{presetLibrary.templateVersion} · forrás: {presetLibrary.sourcePageKey}</p>:<p className={styles.emptyHint}>Presetek betöltése…</p>}
      <div className={styles.componentLibrary}>{presetLibrary?.sectionPresets.map(preset=><article key={preset.presetId}>
        <span className={styles.componentLibraryIcon}>▧</span><span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · gyári szekció</small></span>
        <div><button type="button" disabled={busy} onClick={()=>insertPresetSection(preset)}>Beillesztés</button></div>
      </article>)}</div>
      {presetLibrary&&!presetLibrary.sectionPresets.length?<p className={styles.emptyHint}>Ehhez az oldaltípushoz nincs beilleszthető gyári szekció-preset.</p>:null}
      {selectedNode?<>
        <p className={styles.emptyHint}>Kijelölt komponens: <strong>{label(selectedNode.componentKey)}</strong></p>
        <div className={styles.componentLibrary}>{compatibleComponentPresets.map(preset=><article key={preset.presetId}>
          <span className={styles.componentLibraryIcon}>◫</span><span><strong>{preset.label}</strong><small>{label(preset.componentKey)} · megjelenési preset</small></span>
          <div><button type="button" disabled={busy} onClick={()=>applyComponentPreset(preset)}>Alkalmazás</button></div>
        </article>)}</div>
        {presetLibrary&&!compatibleComponentPresets.length?<p className={styles.emptyHint}>A kijelölt elemhez nincs kompatibilis gyári komponens-preset ezen a sablonoldalon.</p>:null}
      </>:<p className={styles.emptyHint}>Komponens-presethez jelölj ki egy elemet a vásznon.</p>}
    </div>

    <div className={styles.panelDivider}/>
    <strong>Saját mentett blokkok</strong>
    <p className={styles.emptyHint}>Ments el egy teljes felső szintű szekciót, majd illeszd be bármely kompatibilis oldalra. A beillesztés nem publikál és nem ment automatikusan.</p>
    <label className={styles.field}><span>Blokk neve</span><input value={name} maxLength={80} placeholder={selectedNode?label(selectedNode.componentKey):'Pl. Nyári hero'} onChange={event=>setName(event.target.value)}/></label>
    <button type="button" className={styles.addSectionButton} disabled={busy||!canSave} onClick={saveSelected}>☆ Kijelölt szekció mentése</button>
    {!canSave&&selectedNode?<p className={styles.emptyHint}>V1-ben csak nem védett, legfelső szintű szekció menthető. Belső komponenshez válaszd ki a szülő szekciót.</p>:null}
    <div className={styles.componentLibrary}>{blocks.map(block=><article key={block.id}>
      <span className={styles.componentLibraryIcon}>☆</span><span>{editingId===block.id?<input aria-label="Mentett blokk új neve" value={editingName} maxLength={80} disabled={busy} onChange={event=>setEditingName(event.target.value)}/>:<strong>{block.name}</strong>}<small>{label(block.componentKey)} · v{block.componentVersion}</small></span>
      <div>{editingId===block.id?<><button type="button" disabled={busy} onClick={()=>saveRename(block.id)}>Mentés</button><button type="button" disabled={busy} onClick={cancelRename}>Mégse</button></>:<><button type="button" disabled={busy} onClick={()=>insertBlock(block.id)}>Beillesztés</button><button type="button" disabled={busy} onClick={()=>beginRename(block)}>Átnevezés</button><button type="button" disabled={busy} onClick={()=>deleteBlock(block.id)}>Törlés</button></>}</div>
    </article>)}</div>
    {!blocks.length?<p className={styles.emptyHint}>Még nincs saját mentett blokk ebben a webshopban.</p>:null}

    <div className={styles.panelDivider}/>
    <strong>Linked reusable symbols</strong>
    <p className={styles.emptyHint}>A linked példányok követik a közös forrás változásait, miközben a helyi felülírások megmaradnak. A Leválasztás a jelenlegi effektív tartalmat hagyja az oldalon.</p>
    <label className={styles.field}><span>Symbol neve</span><input value={symbolName} maxLength={80} placeholder={selectedNode?label(selectedNode.componentKey):'Pl. Kiemelt ajánlat'} onChange={event=>setSymbolName(event.target.value)}/></label>
    <button type="button" className={styles.addSectionButton} disabled={busy||!canCreateSymbol} onClick={createLinkedSymbol}>◇ Kijelölt elem linked symbollá</button>
    {linkedInstance?<button type="button" className={styles.addSectionButton} disabled={busy} onClick={detachSelected}>⎋ Kijelölt példány leválasztása</button>:null}
    <button type="button" className={styles.addSectionButton} disabled={busy||!symbols.length} onClick={syncLinked}>↻ Linked példányok szinkronizálása</button>
    <div className={styles.componentLibrary}>{symbols.map(symbol=><article key={symbol.id}>
      <span className={styles.componentLibraryIcon}>{symbol.globalSlot==='header'?'H':symbol.globalSlot==='footer'?'F':'◇'}</span>
      <span><strong>{symbol.name}</strong><small>{label(symbol.componentKey)} · r{symbol.revision}{symbol.globalSlot?` · globális ${symbol.globalSlot}`:''}</small></span>
      <div>
        <button type="button" disabled={busy} onClick={()=>insertLinkedSymbol(symbol)}>Linkelve beilleszt</button>
        {symbol.componentKey==='system.header'?<button type="button" disabled={busy} onClick={()=>setGlobal(symbol,symbol.globalSlot==='header'?null:'header')}>{symbol.globalSlot==='header'?'Globális ki':'Globális fejléc'}</button>:null}
        {symbol.componentKey==='layout.section'?<button type="button" disabled={busy} onClick={()=>setGlobal(symbol,symbol.globalSlot==='footer'?null:'footer')}>{symbol.globalSlot==='footer'?'Globális ki':'Globális lábléc'}</button>:null}
        <button type="button" disabled={busy} onClick={()=>deleteSymbol(symbol)}>Törlés</button>
      </div>
    </article>)}</div>
    {!symbols.length?<p className={styles.emptyHint}>Még nincs linked reusable symbol ebben a webshopban.</p>:null}
    {error?<div className={styles.errorNotice} role="alert">{error}</div>:null}
    {message?<div className={styles.notice} role="status">{message}</div>:null}
  </div>;
}
