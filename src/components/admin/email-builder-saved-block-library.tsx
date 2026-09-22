'use client';

import{useEffect,useState}from'react';
import type{EmailBlock,EmailBlockType}from'@/lib/email-builder/types';
import styles from'./email-builder-editor.module.css';
import libraryStyles from'./email-builder-library.module.css';

type SavedBlock={id:string;name:string;block_type:EmailBlockType;schema_version:number;block:EmailBlock;created_at:string;updated_at:string};
type LoadState='loading'|'ready'|'error';

const blockLabels:Record<EmailBlockType,string>={header:'Fejléc',heading:'Címsor',text:'Szöveg',button:'Gomb',divider:'Elválasztó',spacer:'Térköz','order-items':'Rendelési tételek','order-summary':'Összesítés','payment-info':'Fizetési adatok',address:'Cím',footer:'Lábléc'};
const blockIcons:Record<EmailBlockType,string>={header:'▱',heading:'H',text:'≡',button:'▭',divider:'—',spacer:'↕','order-items':'▤','order-summary':'∑','payment-info':'¤',address:'⌂',footer:'▂'};

export function SavedBlockLibrary({selected,onInsert}:{selected:EmailBlock|null;onInsert:(block:EmailBlock,savedBlockId:string)=>void}){
  const[items,setItems]=useState<SavedBlock[]>([]);
  const[name,setName]=useState('');
  const[state,setState]=useState<LoadState>('loading');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[pendingDelete,setPendingDelete]=useState<SavedBlock|null>(null);

  async function load(){
    setState('loading');
    try{
      const response=await fetch('/api/admin/email-builder/saved-blocks',{cache:'no-store'});
      const data=await response.json().catch(()=>null) as{savedBlocks?:SavedBlock[];error?:string}|null;
      if(!response.ok)throw new Error(data?.error||'A saját blokkok nem tölthetők be.');
      setItems(data?.savedBlocks??[]);setState('ready');setMessage('');
    }catch(error){setState('error');setMessage(error instanceof Error?error.message:'A saját blokkok nem tölthetők be.');}
  }
  useEffect(()=>{void load();},[]);
  useEffect(()=>{
    if(!pendingDelete)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)setPendingDelete(null)};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[pendingDelete,busy]);

  async function save(){
    if(!selected||!name.trim()||busy)return;
    setBusy(true);setMessage('Mentés…');
    try{
      const response=await fetch('/api/admin/email-builder/saved-blocks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:name.trim(),block:selected})});
      const data=await response.json().catch(()=>null) as{savedBlock?:SavedBlock;error?:string}|null;
      if(!response.ok||!data?.savedBlock)throw new Error(data?.error||'A saját blokk nem menthető.');
      setItems(current=>[data.savedBlock!,...current.filter(item=>item.id!==data.savedBlock!.id)]);setName('');setMessage('Saját blokk mentve.');setState('ready');
    }catch(error){setMessage(error instanceof Error?error.message:'A saját blokk nem menthető.');}
    finally{setBusy(false);}
  }

  async function remove(item:SavedBlock){
    if(busy)return;
    setBusy(true);setMessage('Törlés…');
    try{
      const response=await fetch(`/api/admin/email-builder/saved-blocks/${item.id}`,{method:'DELETE'});
      const data=await response.json().catch(()=>null) as{ok?:boolean;error?:string}|null;
      if(!response.ok||data?.ok!==true)throw new Error(data?.error||'A saját blokk nem törölhető.');
      setItems(current=>current.filter(entry=>entry.id!==item.id));setMessage('Saját blokk törölve.');setPendingDelete(null);
    }catch(error){setMessage(error instanceof Error?error.message:'A saját blokk nem törölhető.');}
    finally{setBusy(false);}
  }

  return <div className={styles.libraryPane}>
    <div className={styles.panelHead}><div><span className={styles.kicker}>Könyvtár</span><strong>Saját blokkok</strong></div><span className={styles.libraryCount}>{items.length}</span></div>
    <p className={styles.libraryIntro}>Mentsd el a kijelölt blokkot tenant-szinten, majd használd újra bármely e-mail piszkozatban. A beszúrás nem ment és nem aktivál automatikusan.</p>
    <div className={libraryStyles.savedBlockForm}>
      <label><span>Blokk neve</span><input value={name} maxLength={120} placeholder={selected?`${blockLabels[selected.type]} – saját változat`:'Előbb jelölj ki egy blokkot'} disabled={!selected||busy} onChange={event=>setName(event.target.value)}/></label>
      <button type="button" className={libraryStyles.libraryAction} disabled={!selected||!name.trim()||busy} onClick={()=>void save()}>{busy?'Folyamatban…':'Kijelölt blokk mentése'}</button>
      {message&&<small className={libraryStyles.libraryStatus} role="status">{message}</small>}
    </div>
    {state==='loading'&&<div className={styles.emptyLibrary}><span>◇</span><strong>Saját blokkok betöltése…</strong></div>}
    {state==='error'&&<div className={styles.emptyLibrary}><span>!</span><strong>A könyvtár nem tölthető be.</strong><p>{message}</p><button type="button" className={libraryStyles.libraryAction} onClick={()=>void load()}>Újrapróbálás</button></div>}
    {state==='ready'&&items.length===0&&<div className={styles.emptyLibrary}><span>◇</span><strong>Még nincs saját blokk</strong><p>Jelölj ki egy blokkot a canvasban vagy a szerkezetlistában, adj neki nevet, majd mentsd el.</p></div>}
    {state==='ready'&&items.length>0&&<div className={libraryStyles.libraryCards}>{items.map(item=><article className={libraryStyles.libraryCard} key={item.id}><div className={libraryStyles.libraryCardTop}><span className={libraryStyles.libraryIcon}>{blockIcons[item.block_type]}</span><div className={libraryStyles.libraryMeta}><strong>{item.name}</strong><span>{blockLabels[item.block_type]}</span><p>Új blokkazonosítóval kerül a kijelölt elem után.</p></div></div><div className={libraryStyles.savedBlockActions}><button type="button" className={libraryStyles.libraryAction} onClick={()=>onInsert(item.block,item.id)}>＋ Beszúrás</button><button type="button" className={libraryStyles.libraryDanger} disabled={busy} onClick={()=>setPendingDelete(item)}>Törlés</button></div></article>)}</div>}
    {pendingDelete&&<div className="adminModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)setPendingDelete(null)}}><section className="adminModal" role="dialog" aria-modal="true" aria-labelledby={`saved-block-delete-${pendingDelete.id}`}><span className="eyebrow">Megerősítés</span><h3 id={`saved-block-delete-${pendingDelete.id}`}>Saját blokk törlése</h3><p>Biztosan törlöd a(z) <strong>{pendingDelete.name}</strong> saját blokkot a tenant könyvtárból?</p><div className="actions"><button className="btn btnGhost" type="button" disabled={busy} onClick={()=>setPendingDelete(null)}>Mégsem</button><button className="btn btnPrimary" type="button" disabled={busy} onClick={()=>void remove(pendingDelete)}>{busy?'Törlés…':'Törlés megerősítése'}</button></div></section></div>}
  </div>;
}