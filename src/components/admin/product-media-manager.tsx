'use client';

import{useMemo,useState}from'react';
import{useShoperationConfirm}from'@/components/admin/shoperation-dialog';
import{ProductMediaEditor,type MediaEditorVariant}from'@/components/admin/product-media-editor';
import type{MediaPresentationPreset,MediaPresentationSet}from'@/lib/catalog-media-presentation';
import styles from'@/app/admin/termekek/feltoltes/product-intake.module.css';
import mediaStyles from'./product-media-manager.module.css';

export type ProductMediaManagerItem={key:string;id?:string;url:string;name:string;presentation?:MediaPresentationSet};
type ApplyMode='same-media'|'presentation-only';
type Props={items:ProductMediaManagerItem[];productId:string;variants:MediaEditorVariant[];colors:string[];sizes:string[];presets:MediaPresentationPreset[];onFiles:(files:FileList|null)=>void;onRemove:(key:string)=>void;onPrimary:(key:string)=>void;onPresentation:(key:string,presentation:MediaPresentationSet)=>void;onVariantApply:(sourceKey:string,targetKeys:string[],mode:ApplyMode,presentation:MediaPresentationSet)=>void;onStatus:(message:string,error?:boolean)=>void};
type DeleteResponse={error?:string;deleted?:boolean;cleanupPending?:boolean;nextPrimaryMediaId?:string|null};
const MAX_MEDIA=8,MAX_BYTES=8*1024*1024,ALLOWED_TYPES=new Set(['image/jpeg','image/png','image/webp','image/avif']);

export function ProductMediaManager({items,productId,variants,colors,sizes,presets,onFiles,onRemove,onPrimary,onPresentation,onVariantApply,onStatus}:Props){
 const{confirm:showConfirm,dialog}=useShoperationConfirm(),[busyKey,setBusyKey]=useState(''),[dragActive,setDragActive]=useState(false),[editingKey,setEditingKey]=useState(''),[localPresets,setLocalPresets]=useState<MediaPresentationPreset[]>(presets);
 const editingItem=useMemo(()=>items.find(item=>item.key===editingKey),[items,editingKey]);
 function acceptFiles(list:FileList|null){
  if(!list?.length)return;const incoming=Array.from(list),unsupported=incoming.filter(file=>!ALLOWED_TYPES.has(file.type)),oversized=incoming.filter(file=>file.size>MAX_BYTES);
  if(unsupported.length){onStatus(`Nem támogatott képformátum: ${unsupported.map(file=>file.name).join(', ')}. Használj JPEG, PNG, WebP vagy AVIF fájlt.`,true);return}
  if(oversized.length){onStatus(`A következő kép nagyobb 8 MB-nál: ${oversized.map(file=>file.name).join(', ')}.`,true);return}
  const room=Math.max(0,MAX_MEDIA-items.length);if(!room){onStatus('Legfeljebb 8 termékkép tölthető fel.',true);return}
  const accepted=incoming.slice(0,room),transfer=new DataTransfer();accepted.forEach(file=>transfer.items.add(file));onFiles(transfer.files);
  if(incoming.length>room)onStatus(`${accepted.length} kép hozzáadva. A termékhez legfeljebb 8 kép tartozhat.`);else onStatus(`${accepted.length} kép előkészítve feltöltésre.`);
 }
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
  <div className={`${styles.mediaStrip} ${mediaStyles.mediaGrid}`}>
   {items.map((item,index)=><div key={item.key} className={mediaStyles.mediaItem} style={{backgroundImage:`url(${item.url})`}} title={item.name}>
    {index===0&&<span className={mediaStyles.primaryBadge}>Főkép</span>}
    <button type="button" className={mediaStyles.trashButton} aria-label={`${item.name} kép törlése`} title="Kép törlése" disabled={busyKey===item.key} onClick={()=>void remove(item)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg>
    </button>
    <div className={mediaStyles.mediaActions}><button type="button" disabled={busyKey===item.key} onClick={()=>setEditingKey(item.key)}>✎ Szerkesztés</button><button type="button" disabled={busyKey===item.key||index===0} onClick={()=>void makePrimary(item)}>◇ Főképnek</button></div>
   </div>)}
   {Array.from({length:Math.max(0,5-items.length)}).map((_,index)=><div className={styles.mediaTile} key={`empty-${index}`}/>) }
   {items.length<MAX_MEDIA?<label className={`${styles.uploadTile} ${mediaStyles.dropZone}`} data-drag-active={dragActive?'true':'false'} onDragEnter={event=>{event.preventDefault();setDragActive(true)}} onDragOver={event=>{event.preventDefault();setDragActive(true)}} onDragLeave={event=>{event.preventDefault();if(event.currentTarget===event.target)setDragActive(false)}} onDrop={event=>{event.preventDefault();setDragActive(false);acceptFiles(event.dataTransfer.files)}}>⇧<br/>Képek feltöltése<br/>vagy húzd ide<small>{items.length}/8 kép · max. 8 MB</small><input multiple type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event=>{acceptFiles(event.target.files);event.currentTarget.value=''}}/></label>:<div className={`${styles.uploadTile} ${mediaStyles.uploadDisabled}`} aria-label="Termékkép limit elérve">✓<br/>8/8 kép<br/><small>Limit elérve</small></div>}
  </div>
  {editingItem&&<ProductMediaEditor item={editingItem} productId={productId} variants={variants} colors={colors} sizes={sizes} presets={localPresets} onClose={()=>setEditingKey('')} onPresentation={onPresentation} onPresetUpsert={preset=>setLocalPresets(current=>[...current.filter(item=>item.id!==preset.id&&item.name.toLocaleLowerCase()!==preset.name.toLocaleLowerCase()),preset].sort((a,b)=>a.name.localeCompare(b.name,'hu')))} onPresetDelete={presetId=>setLocalPresets(current=>current.filter(item=>item.id!==presetId))} onVariantApply={onVariantApply} onStatus={onStatus}/>} 
  {dialog}
 </>;
}
