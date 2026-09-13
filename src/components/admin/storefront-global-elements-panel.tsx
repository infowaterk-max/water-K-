'use client';

import {useEffect,useState,useTransition} from 'react';
import {
  createVisualBuilderReusableSymbolAction,
  deleteVisualBuilderReusableSymbolAction,
  listVisualBuilderReusableSymbolsAction,
  setVisualBuilderReusableSymbolGlobalSlotAction,
} from '@/app/admin/tartalom/builder/actions';
import {createStorefrontVisualBuilderComponentRegistry} from '@/lib/builder/storefront-builder-registry';
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
import {VisualBuilderIcon} from './visual-builder-ui-icon';
import css from './storefront-visual-builder-95.module.css';

const registry=createStorefrontVisualBuilderComponentRegistry();
const operationKey=(kind:string)=>`builder:global-element:${kind}:${crypto.randomUUID()}`;
const LABELS:Record<string,string>={'system.header':'Fejléc','layout.section':'Szekció','editorial.footer':'Lábléc'};
const label=(key:string)=>LABELS[key]??key.split('.').at(-1)?.replace(/[-_]/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase())??'Elem';
const slotLabel=(slot:StorefrontGlobalSymbolSlot|null)=>slot==='header'?'Globális fejléc':slot==='footer'?'Globális lábléc':'Kapcsolt szimbólum';

export function StorefrontGlobalElementsPanel({document,selectedNode,selectedIsTopLevel,capability,onApply}:{
  document:StorefrontPageDocument;
  selectedNode:StorefrontComponentNode|null;
  selectedIsTopLevel:boolean;
  capability:StorefrontRuntimeCapabilityContext;
  onApply:(document:StorefrontPageDocument,insertedNodeId:string,message:string)=>void;
}){
  const[symbols,setSymbols]=useState<StorefrontReusableSymbol[]>([]);
  const[name,setName]=useState('');
  const[message,setMessage]=useState<string|null>(null);
  const[error,setError]=useState<string|null>(null);
  const[busy,startTransition]=useTransition();
  const linkedInstance=selectedNode?findStorefrontLinkedSymbolInstance(document,selectedNode.id):null;
  const canCreate=(()=>{if(!selectedNode||!selectedIsTopLevel)return false;try{assertStorefrontReusableSymbolSource(selectedNode);return true;}catch{return false;}})();

  useEffect(()=>{let active=true;listVisualBuilderReusableSymbolsAction().then(items=>{if(active)setSymbols(items);}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'A globális elemek nem tölthetők be.');});return()=>{active=false;};},[]);
  const run=(job:()=>Promise<void>)=>startTransition(()=>{setMessage(null);setError(null);job().catch(reason=>setError(reason instanceof Error?reason.message:'A globális elem művelet sikertelen.'));});
  const assertCompatible=(next:StorefrontPageDocument)=>{const result=validateStorefrontPageDocument(next,registry,capability);const failure=result.violations.find(item=>item.severity==='error');if(failure)throw new Error(`Az elem nem kompatibilis ezzel az oldallal: ${failure.code}`);};

  const createLinked=()=>{
    if(!selectedNode||!canCreate){setError('Kapcsolt szimbólumhoz válassz ki egy kompatibilis, legfelső szintű szekciót vagy fejlécet.');return;}
    const symbolName=name.trim()||label(selectedNode.componentKey);
    run(async()=>{const symbol=await createVisualBuilderReusableSymbolAction({name:symbolName,fragment:selectedNode,operationKey:operationKey('create')});const next=linkStorefrontReusableSymbolAtRoot(document,symbol,selectedNode.id);assertCompatible(next);setSymbols(current=>[symbol,...current.filter(item=>item.id!==symbol.id)]);setName('');onApply(next,selectedNode.id,`„${symbol.name}” kapcsolt szimbólum létrehozva.`);});
  };
  const insertLinked=(symbol:StorefrontReusableSymbol)=>run(async()=>{const inserted=insertStorefrontReusableSymbol(document,symbol);assertCompatible(inserted.document);onApply(inserted.document,inserted.insertedNodeId,`„${symbol.name}” linkelve beillesztve.`);});
  const detach=()=>{if(!selectedNode||!linkedInstance)return;const next=detachStorefrontReusableSymbol(document,selectedNode.id,symbols);assertCompatible(next);onApply(next,selectedNode.id,'A kijelölt példány leválasztva. A jelenlegi tartalom megmaradt.');};
  const sync=()=>{const next=rebaseStorefrontReusableSymbolInstances(document,symbols);assertCompatible(next);onApply(next,selectedNode?.id??next.sections[0]?.id??'root','Kapcsolt szimbólumok szinkronizálva.');};
  const setGlobal=(symbol:StorefrontReusableSymbol,globalSlot:StorefrontGlobalSymbolSlot|null)=>run(async()=>{if(globalSlot)assertStorefrontReusableSymbolSource(symbol.fragment,globalSlot);const updated=await setVisualBuilderReusableSymbolGlobalSlotAction({symbolId:symbol.id,globalSlot,operationKey:operationKey('global')});setSymbols(current=>current.map(item=>item.id===updated.id?updated:globalSlot&&item.globalSlot===globalSlot?{...item,globalSlot:null}:item));setMessage(globalSlot?`„${updated.name}” mostantól ${slotLabel(globalSlot).toLowerCase()}.`:`„${updated.name}” globális hozzárendelése kikapcsolva.`);});
  const remove=(symbol:StorefrontReusableSymbol)=>run(async()=>{await deleteVisualBuilderReusableSymbolAction({symbolId:symbol.id,operationKey:operationKey('delete')});setSymbols(current=>current.filter(item=>item.id!==symbol.id));setMessage(`„${symbol.name}” törölve.`);});
  const canGlobalHeader=(symbol:StorefrontReusableSymbol)=>{try{assertStorefrontReusableSymbolSource(symbol.fragment,'header');return true;}catch{return false;}};
  const canGlobalFooter=(symbol:StorefrontReusableSymbol)=>{try{assertStorefrontReusableSymbolSource(symbol.fragment,'footer');return true;}catch{return false;}};

  return <div data-storefront-global-elements-v2>
    <div className={css.panelHead}><div><strong>Globális elemek</strong><small>A kapcsolt szimbólum frissíthető központilag; a globális fejléc/lábléc minden oldal közös eleme.</small></div></div>
    <div className={css.sectionCard}>
      <div className={css.sectionTitle}><strong>Új kapcsolt szimbólum</strong><small>{canCreate?'Kijelölés használható':'Válassz elemet'}</small></div>
      <label className={css.field}><span>Név</span><input value={name} maxLength={80} placeholder={selectedNode?label(selectedNode.componentKey):'Pl. Kampány hero'} onChange={event=>setName(event.target.value)}/></label>
      <div className={css.quickGrid}><button type="button" disabled={busy||!canCreate} onClick={createLinked}><VisualBuilderIcon name="link"/> Kapcsolt szimbólum létrehozása</button><button type="button" disabled={busy||!symbols.length} onClick={sync}><VisualBuilderIcon name="sync"/> Összes szinkronizálása</button>{linkedInstance?<button type="button" disabled={busy} onClick={detach}><VisualBuilderIcon name="unlink"/> Kijelölt példány leválasztása</button>:null}</div>
      <p className={css.hint}>A kapcsolt szimbólum megőrzi a helyi eltéréseket, miközben a közös forrás új verziói rebase-elhetők. A globális fejléc/lábléc külön, egyértelmű szerepkör.</p>
    </div>
    {message?<div className={css.statusCard}><VisualBuilderIcon name="check"/><div><strong>Kész</strong><small>{message}</small></div></div>:null}
    {error?<div className={css.statusCard}><VisualBuilderIcon name="error"/><div><strong>Nem sikerült</strong><small>{error}</small></div></div>:null}
    <div className={css.library}>{symbols.map(symbol=><article className={css.libraryCard} key={symbol.id}>
      <span className={css.libraryIcon}><VisualBuilderIcon name={symbol.globalSlot==='header'?'header':symbol.globalSlot==='footer'?'footer':'link'}/></span>
      <span><strong>{symbol.name}</strong><small>{slotLabel(symbol.globalSlot)} · {label(symbol.componentKey)} · r{symbol.revision}</small></span>
      <span><button type="button" disabled={busy} onClick={()=>insertLinked(symbol)}>Beillesztés</button>{symbol.globalSlot?<button type="button" disabled={busy} onClick={()=>setGlobal(symbol,null)}>Globális kikapcsolása</button>:<>{canGlobalHeader(symbol)?<button type="button" disabled={busy} onClick={()=>setGlobal(symbol,'header')}>Globális fejléc</button>:null}{canGlobalFooter(symbol)?<button type="button" disabled={busy} onClick={()=>setGlobal(symbol,'footer')}>Globális lábléc</button>:null}</>}<button type="button" disabled={busy} onClick={()=>remove(symbol)}>Törlés</button></span>
    </article>)}</div>
    {!symbols.length?<p className={css.hint}>Még nincs kapcsolt szimbólum vagy globális elem ebben a webshopban.</p>:null}
  </div>;
}
