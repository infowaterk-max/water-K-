'use client';

import{useState}from'react';
import{useShoperationConfirm}from'@/components/admin/shoperation-dialog';
import styles from'@/app/admin/termekek/feltoltes/product-intake.module.css';
import mediaStyles from'./product-media-manager.module.css';

export type ProductMediaManagerItem={key:string;id?:string;url:string;name:string};
type Props={items:ProductMediaManagerItem[];productId:string;onFiles:(files:FileList|null)=>void;onRemove:(key:string)=>void;onPrimary:(key:string)=>void;onStatus:(message:string,error?:boolean)=>void};
type DeleteResponse={error?:string;deleted?:boolean;cleanupPending?:boolean;nextPrimaryMediaId?:string|null};

export function ProductMediaManager({items,productId,onFiles,onRemove,onPrimary,onStatus}:Props){
 const{confirm:showConfirm,dialog}=useShoperationConfirm(),[busyKey,setBusyKey]=useState('');
 async function remove(item:ProductMediaManagerItem){
  const approved=await showConfirm({eyebrow:'Termékmédia',title:'Kép törlése',description:`Biztosan törlöd ezt a képet: ${item.name}? Ha variáns használja, a képhozzárendelés is megszűnik.`,confirmLabel:'Kép törlése',danger:true});if(!approved)return;
  if(!item.id){URL.revokeObjectURL(item.url);onRemove(item.key);onStatus('A még fel nem töltött kép eltávolítva.');return}
  if(!productId){onStatus('A mentett kép törléséhez előbb a termékazonosítót kell betölteni.',true);return}
  setBusyKey(item.key);try{const response=await fetch('/api/admin/catalog/media',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({productId,mediaId:item.id})}),payload=await response.json().catch(()=>({}))as DeleteResponse;if(!response.ok&&response.status!==202||payload.deleted!==true){onStatus(payload.error??'A kép törlése nem sikerült.',true);return}onRemove(item.key);onStatus(payload.cleanupPending?'A kép törölve. A háttértár fizikai takarítása újrapróbálásra vár.':'A kép véglegesen törölve.')}catch{onStatus('Hálózati hiba a képtörlés közben.',true)}finally{setBusyKey('')}
 }
 async function makePrimary(item:ProductMediaManagerItem){
  if(items[0]?.key===item.key)return;
  if(!item.id){onPrimary(item.key);onStatus('A kép főképnek jelölve; a termék mentésekor ez lesz az első kép.');return}
  if(!productId){onPrimary(item.key);return}
  setBusyKey(item.key);try{const response=await fetch('/api/admin/catalog/media',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({productId,mediaId:item.id})}),payload=await response.json().catch(()=>({}))as{error?:string;primaryMediaId?:string};if(!response.ok||payload.primaryMediaId!==item.id){onStatus(payload.error??'A főkép beállítása nem sikerült.',true);return}onPrimary(item.key);onStatus('Főkép módosítva.')}catch{onStatus('Hálózati hiba a főkép beállítása közben.',true)}finally{setBusyKey('')}
 }
 return <>
  <div className={styles.mediaStrip}>
   {items.slice(0,5).map((item,index)=><div key={item.key} className={mediaStyles.mediaItem} style={{backgroundImage:`url(${item.url})`}} title={item.name}>
    {index===0&&<span className={mediaStyles.primaryBadge}>Főkép</span>}
    <button type="button" className={mediaStyles.trashButton} aria-label={`${item.name} kép törlése`} title="Kép törlése" disabled={busyKey===item.key} onClick={()=>void remove(item)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
    </button>
    <div className={mediaStyles.mediaActions}><button type="button" disabled={busyKey===item.key||index===0} onClick={()=>void makePrimary(item)}>◇ Főképnek</button></div>
   </div>)}
   {Array.from({length:Math.max(0,5-items.length)}).map((_,index)=><div className={styles.mediaTile} key={`empty-${index}`}/>) }
   <label className={styles.uploadTile}>⇧<br/>Képek feltöltése<br/>vagy húzd ide<input multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event=>onFiles(event.target.files)}/></label>
  </div>
  {dialog}
 </>;
}
