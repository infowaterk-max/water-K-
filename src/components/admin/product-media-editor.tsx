'use client';

import{useMemo,useRef,useState,type PointerEvent as ReactPointerEvent}from'react';
import{DEFAULT_MEDIA_PRESENTATIONS,MEDIA_PRESENTATION_CONTEXTS,MEDIA_PREVIEW_META,normalizeMediaPresentationSet,type MediaPresentationContext,type MediaPresentationPreset,type MediaPresentationSet}from'@/lib/catalog-media-presentation';
import styles from'./product-media-editor.module.css';

export type MediaEditorVariant={key:string;id?:string;label:string;mediaKey:string|null};
export type MediaEditorItem={key:string;id?:string;url:string;name:string;presentation?:MediaPresentationSet};
type ApplyMode='same-media'|'presentation-only';
type Props={
 item:MediaEditorItem;productId:string;variants:MediaEditorVariant[];colors:string[];sizes:string[];presets:MediaPresentationPreset[];
 onClose:()=>void;onPresentation:(key:string,presentation:MediaPresentationSet)=>void;
 onPresetUpsert:(preset:MediaPresentationPreset)=>void;onPresetDelete:(presetId:string)=>void;
 onVariantApply:(sourceKey:string,targetKeys:string[],mode:ApplyMode,presentation:MediaPresentationSet)=>void;
 onStatus:(message:string,error?:boolean)=>void;
};
type SaveResponse={error?:string;presentation?:MediaPresentationSet};
type PresetResponse={error?:string;presetId?:string;name?:string;presentation?:MediaPresentationSet;deleted?:boolean};
type ApplyResponse={error?:string;appliedVariantIds?:string[];skippedVariantIds?:string[];appliedCount?:number;skippedCount?:number};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const cloneSet=(value?:MediaPresentationSet)=>normalizeMediaPresentationSet(value??DEFAULT_MEDIA_PRESENTATIONS);

function tokens(label:string){return label.split('/').map(value=>value.trim()).filter(Boolean)}
function dimension(label:string,values:string[]){const set=tokens(label);return values.find(value=>set.includes(value))??''}
function quality(width:number,zoom:number,minWidth:number){if(!width)return{label:'Betöltés…',tone:'neutral'};const ratio=(width/zoom)/minWidth;if(ratio>=1.25)return{label:'Jó',tone:'good'};if(ratio>=.9)return{label:'Határeset',tone:'warn'};return{label:'Gyenge',tone:'bad'}}

export function ProductMediaEditor({item,productId,variants,colors,sizes,presets,onClose,onPresentation,onPresetUpsert,onPresetDelete,onVariantApply,onStatus}:Props){
 const[draft,setDraft]=useState<MediaPresentationSet>(()=>cloneSet(item.presentation)),[active,setActive]=useState<MediaPresentationContext>('card'),[busy,setBusy]=useState(false),[naturalWidth,setNaturalWidth]=useState(0),[presetName,setPresetName]=useState(''),[sourceVariantKey,setSourceVariantKey]=useState(()=>variants.find(v=>v.mediaKey===item.key)?.key??variants[0]?.key??''),[selected,setSelected]=useState<string[]>([]),[mode,setMode]=useState<ApplyMode>('same-media'),[showVariants,setShowVariants]=useState(false);
 const drag=useRef<{x:number;y:number;offsetX:number;offsetY:number;width:number;height:number}|null>(null);
 const sourceVariant=variants.find(v=>v.key===sourceVariantKey),sourceColor=sourceVariant?dimension(sourceVariant.label,colors):'',sourceSize=sourceVariant?dimension(sourceVariant.label,sizes):'';
 const selectedVariants=variants.filter(v=>selected.includes(v.key)),missingOwnImage=mode==='presentation-only'?selectedVariants.filter(v=>!v.mediaKey).length:0;
 const current=draft[active],meta=MEDIA_PREVIEW_META[active];
 const transformStyle=(context:MediaPresentationContext)=>{const value=draft[context];return{transform:`translate(${value.offsetX}%, ${value.offsetY}%) scale(${value.zoom}) rotate(${value.rotation}deg)`}};
 const qualityMap=useMemo(()=>Object.fromEntries(MEDIA_PRESENTATION_CONTEXTS.map(context=>[context,quality(naturalWidth,draft[context].zoom,MEDIA_PREVIEW_META[context].minWidth)]))as Record<MediaPresentationContext,{label:string;tone:string}>,[naturalWidth,draft]);
 function patch(patch:Partial<typeof current>){setDraft(value=>({...value,[active]:{...value[active],...patch}}))}
 function beginDrag(event:ReactPointerEvent<HTMLDivElement>){const rect=event.currentTarget.getBoundingClientRect();event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,offsetX:current.offsetX,offsetY:current.offsetY,width:Math.max(1,rect.width),height:Math.max(1,rect.height)}}
 function moveDrag(event:ReactPointerEvent<HTMLDivElement>){if(!drag.current)return;patch({offsetX:clamp(drag.current.offsetX+(event.clientX-drag.current.x)/drag.current.width*100,-50,50),offsetY:clamp(drag.current.offsetY+(event.clientY-drag.current.y)/drag.current.height*100,-50,50)})}
 function endDrag(){drag.current=null}
 function selectGroup(kind:'color'|'size'|'all'){
  if(kind==='all'){setSelected(variants.map(v=>v.key));return}
  const token=kind==='color'?sourceColor:sourceSize;if(!token)return;
  setSelected(variants.filter(v=>dimension(v.label,kind==='color'?colors:sizes)===token).map(v=>v.key));
 }
 async function persistCurrentPresentation(normalized:MediaPresentationSet){
  if(!item.id||!productId)return normalized;
  const response=await fetch('/api/admin/catalog/media/presentation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',productId,mediaId:item.id,presentation:normalized})}),payload=await response.json().catch(()=>({}))as SaveResponse;
  if(!response.ok||!payload.presentation)throw new Error(payload.error??'A képszerkesztés mentése nem sikerült.');
  return normalizeMediaPresentationSet(payload.presentation);
 }
 async function save(){
  const normalized=normalizeMediaPresentationSet(draft);if(!item.id||!productId){onPresentation(item.key,normalized);onStatus('A képkivágás helyben elkészült; a kép feltöltése után menthető véglegesen.');onClose();return}
  setBusy(true);try{const saved=await persistCurrentPresentation(normalized);onPresentation(item.key,saved);onStatus('Képmegjelenítés mentve. Az eredeti fájl változatlan maradt.');onClose()}catch(caught){onStatus(caught instanceof Error?caught.message:'Hálózati hiba a képszerkesztés mentésekor.',true)}finally{setBusy(false)}
 }
 async function savePreset(){
  const name=presetName.trim();if(!name)return;setBusy(true);try{const response=await fetch('/api/admin/catalog/media/presentation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'createPreset',name,presentation:normalizeMediaPresentationSet(draft)})}),payload=await response.json().catch(()=>({}))as PresetResponse;if(!response.ok||!payload.presetId||!payload.name||!payload.presentation){onStatus(payload.error??'A preset mentése nem sikerült.',true);return}onPresetUpsert({id:payload.presetId,name:payload.name,presentation:normalizeMediaPresentationSet(payload.presentation)});setPresetName('');onStatus(`Preset mentve: ${payload.name}.`)}catch{onStatus('Hálózati hiba a preset mentésekor.',true)}finally{setBusy(false)}
 }
 async function deletePreset(preset:MediaPresentationPreset){
  setBusy(true);try{const response=await fetch('/api/admin/catalog/media/presentation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'deletePreset',presetId:preset.id})}),payload=await response.json().catch(()=>({}))as PresetResponse;if(!response.ok||payload.deleted!==true){onStatus(payload.error??'A preset törlése nem sikerült.',true);return}onPresetDelete(preset.id);onStatus(`Preset törölve: ${preset.name}.`)}catch{onStatus('Hálózati hiba a preset törlésekor.',true)}finally{setBusy(false)}
 }
 async function applyVariants(){
  if(!selectedVariants.length)return;const normalized=normalizeMediaPresentationSet(draft),persistedTargets=selectedVariants.filter(v=>v.id),canServer=Boolean(productId&&item.id&&persistedTargets.length===selectedVariants.length);
  if(canServer){setBusy(true);try{const saved=await persistCurrentPresentation(normalized);onPresentation(item.key,saved);const response=await fetch('/api/admin/catalog/media/presentation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'applyVariants',productId,sourceMediaId:item.id,targetVariantIds:persistedTargets.map(v=>v.id),mode})}),payload=await response.json().catch(()=>({}))as ApplyResponse;if(!response.ok||!Array.isArray(payload.appliedVariantIds)||!Array.isArray(payload.skippedVariantIds)){onStatus(payload.error??'A variánsokra alkalmazás nem sikerült.',true);return}onVariantApply(item.key,selected,mode,saved);onStatus(`${payload.appliedCount??payload.appliedVariantIds.length} variáns frissítve${(payload.skippedCount??payload.skippedVariantIds.length)>0?`, ${payload.skippedCount??payload.skippedVariantIds.length} saját kép nélküli variáns kihagyva`:''}.`);setShowVariants(false)}catch(caught){onStatus(caught instanceof Error?caught.message:'Hálózati hiba a variánsokra alkalmazáskor.',true)}finally{setBusy(false)}return}
  onVariantApply(item.key,selected,mode,normalized);onPresentation(item.key,normalized);onStatus(`${selectedVariants.length-missingOwnImage} helyi variáns frissítve${missingOwnImage?`, ${missingOwnImage} saját kép nélküli variáns kihagyva`:''}. A végleges mentés a termék mentésekor történik.`);setShowVariants(false)
 }
 return <div className={styles.backdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="media-editor-title">
   <header className={styles.header}><div><span>Termékmédia · non-destructive editor</span><h2 id="media-editor-title">{item.name}</h2><p>Húzd a képet, zoomolj és ellenőrizd rögtön a három webshop-nézetet. Az eredeti fájl nem módosul.</p></div><button type="button" className={styles.close} onClick={onClose} aria-label="Médiaszerkesztő bezárása">×</button></header>
   <div className={styles.body}>
    <div className={styles.workspace}>
     <div className={styles.tabs}>{MEDIA_PRESENTATION_CONTEXTS.map(context=><button key={context} type="button" data-active={active===context?'true':'false'} onClick={()=>setActive(context)}>{MEDIA_PREVIEW_META[context].label}</button>)}</div>
     <div className={styles.stageWrap}>
      <div className={styles.stage} style={{aspectRatio:meta.aspectRatio}} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
       <img src={item.url} alt="" draggable={false} style={transformStyle(active)} onLoad={event=>setNaturalWidth(event.currentTarget.naturalWidth)}/><span>Fogd meg és húzd a képet</span>
      </div>
     </div>
     <div className={styles.controls}>
      <label><span>Zoom</span><input aria-label="Kép zoom" type="range" min="1" max="3" step="0.05" value={current.zoom} onChange={event=>patch({zoom:Number(event.target.value)})}/><strong>{current.zoom.toFixed(2)}×</strong></label>
      <div className={styles.controlRow}><button type="button" onClick={()=>patch({rotation:clamp(current.rotation-90,-180,180)})}>↶ 90°</button><button type="button" onClick={()=>patch({rotation:clamp(current.rotation+90,-180,180)})}>↷ 90°</button><button type="button" onClick={()=>patch(DEFAULT_MEDIA_PRESENTATIONS[active])}>Nézet visszaállítása</button><button type="button" onClick={()=>setDraft(cloneSet())}>Minden visszaállítása</button></div>
     </div>
     <section className={styles.presets}><div><strong>Media presetek</strong><small>Ugyanazt a kivágást egy kattintással új képekre is átviheted.</small></div><div className={styles.presetList}>{presets.length?presets.map(preset=><div key={preset.id}><button type="button" onClick={()=>setDraft(cloneSet(preset.presentation))}>{preset.name}</button><button type="button" className={styles.presetDelete} aria-label={`${preset.name} preset törlése`} onClick={()=>void deletePreset(preset)}>×</button></div>):<span>Még nincs mentett preset.</span>}</div><div className={styles.presetSave}><input maxLength={80} value={presetName} placeholder="pl. Cipő főképe" onChange={event=>setPresetName(event.target.value)}/><button type="button" disabled={busy||!presetName.trim()} onClick={()=>void savePreset()}>Preset mentése</button></div></section>
    </div>
    <aside className={styles.previewRail}>
     <div className={styles.previewHeading}><div><span>Élő előnézet</span><strong>Mentés nélkül is azonnal látod</strong></div><button type="button" onClick={()=>setShowVariants(value=>!value)}>Variánsokra alkalmazás</button></div>
     <div className={styles.previewGrid}>{MEDIA_PRESENTATION_CONTEXTS.map(context=>{const view=MEDIA_PREVIEW_META[context],q=qualityMap[context];return <article key={context}><div className={styles.previewFrame} style={{aspectRatio:view.aspectRatio}}><img src={item.url} alt="" draggable={false} style={transformStyle(context)}/></div><div><strong>{view.label}</strong><span>{view.description}</span><small data-tone={q.tone}>Képminőség: {q.label}</small></div></article>})}</div>
     {showVariants&&<section className={styles.variantPanel}><div className={styles.variantPanelHead}><div><strong>Alkalmazás létező variánsokra</strong><small>A rendszer nem hoz létre új variánst.</small></div><button type="button" onClick={()=>setShowVariants(false)}>×</button></div>{variants.length?<><label className={styles.sourceSelect}>Kiinduló variáns<select value={sourceVariantKey} onChange={event=>setSourceVariantKey(event.target.value)}>{variants.map(variant=><option key={variant.key} value={variant.key}>{variant.label}</option>)}</select></label><div className={styles.quickGroups}><button type="button" disabled={!sourceColor} onClick={()=>selectGroup('color')}>Azonos szín · minden méret</button><button type="button" disabled={!sourceSize} onClick={()=>selectGroup('size')}>Azonos méret · minden szín</button><button type="button" onClick={()=>selectGroup('all')}>Minden létező variáns</button><button type="button" onClick={()=>setSelected([])}>Kijelölés törlése</button></div><div className={styles.modeSwitch}><label><input type="radio" name="media-apply-mode" checked={mode==='same-media'} onChange={()=>setMode('same-media')}/><span><b>Ugyanez a kép</b><small>A kiválasztott variánsok ezt a média assetet használják.</small></span></label><label><input type="radio" name="media-apply-mode" checked={mode==='presentation-only'} onChange={()=>setMode('presentation-only')}/><span><b>Csak a szerkesztési beállítások</b><small>A célvariáns saját képét megtartjuk, csak crop/zoom/pozíció kerül át.</small></span></label></div><div className={styles.variantList}>{variants.map(variant=><label key={variant.key} data-warning={mode==='presentation-only'&&!variant.mediaKey?'true':'false'}><input type="checkbox" checked={selected.includes(variant.key)} onChange={event=>setSelected(current=>event.target.checked?[...current,variant.key]:current.filter(key=>key!==variant.key))}/><span><b>{variant.label}</b><small>{variant.mediaKey?'Van hozzárendelt kép':'Nincs saját kép'}{variant.key===sourceVariantKey?' · kiinduló':''}</small></span></label>)}</div><div className={styles.applySummary}><strong>{selectedVariants.length} létező variáns kijelölve</strong><span>{mode==='presentation-only'&&missingOwnImage?`${missingOwnImage} saját kép nélküli variáns kimarad.`:'Új variáns nem jön létre.'}</span><button type="button" disabled={busy||!selectedVariants.length} onClick={()=>void applyVariants()}>Alkalmazás {selectedVariants.length?`${selectedVariants.length} variánsra`:''}</button></div></>:<p>Nincs alkalmazható variáns.</p>}</section>}
    </aside>
   </div>
   <footer className={styles.footer}><div><span>{MEDIA_PREVIEW_META[active].label}</span><strong>Eltolás: {Math.round(current.offsetX)}% / {Math.round(current.offsetY)}% · forgatás: {Math.round(current.rotation)}°</strong></div><div><button type="button" onClick={onClose}>Mégse</button><button type="button" className={styles.primary} disabled={busy} onClick={()=>void save()}>{busy?'Mentés…':'Módosítás alkalmazása'}</button></div></footer>
  </section>
 </div>;
}
