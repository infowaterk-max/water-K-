'use client';

import type {StorefrontViewport} from '@/lib/builder/storefront-foundation';
import type {StorefrontComponentNode} from '@/lib/builder/storefront-runtime';
import type {StorefrontInteractiveSceneProductOption} from '@/lib/builder/storefront-interactive-scene';
import styles from './storefront-visual-builder.module.css';

type HotspotRecord={id:string;productId:string;label?:string;position:{desktop:{x:number;y:number};tablet?:{x:number;y:number};mobile?:{x:number;y:number}}};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const number=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const point=(value:unknown,fallback={x:50,y:50})=>{const data=record(value);return{x:number(data.x,fallback.x),y:number(data.y,fallback.y)};};
const hotspots=(value:unknown):HotspotRecord[]=>Array.isArray(value)?value.flatMap((item,index)=>{const data=record(item),position=record(data.position),desktop=point(position.desktop);const id=typeof data.id==='string'&&data.id?data.id:`hotspot-${index+1}`,productId=typeof data.productId==='string'?data.productId:'',label=typeof data.label==='string'?data.label:undefined;return[{id,productId,label,position:{desktop,...(position.tablet?{tablet:point(position.tablet,desktop)}:{}),...(position.mobile?{mobile:point(position.mobile,point(position.tablet,desktop))}:{})}}];}):[];
const clamp=(value:number)=>Math.max(0,Math.min(100,Number.isFinite(value)?value:50));
const text=(value:unknown)=>typeof value==='string'?value:'';
const viewportLabel=(viewport:StorefrontViewport)=>viewport==='desktop'?'Desktop':viewport==='tablet'?'Tablet':'Mobil';

export function StorefrontInteractiveSceneControls({node,viewport,products,onConfig}:{
  node:StorefrontComponentNode;
  viewport:StorefrontViewport;
  products:readonly StorefrontInteractiveSceneProductOption[];
  onConfig:(key:string,value:unknown)=>void;
}){
  const list=hotspots(node.config.hotspots);
  const update=(index:number,next:HotspotRecord)=>onConfig('hotspots',list.map((item,itemIndex)=>itemIndex===index?next:item));
  const remove=(index:number)=>onConfig('hotspots',list.filter((_,itemIndex)=>itemIndex!==index));
  const add=()=>onConfig('hotspots',[...list,{id:`hotspot-${crypto.randomUUID().slice(0,8)}`,productId:products[0]?.productId??'',position:{desktop:{x:50,y:50}}}]);
  const directPoint=(item:HotspotRecord)=>item.position[viewport]??(viewport==='mobile'?item.position.tablet??item.position.desktop:item.position.desktop);
  const setPoint=(index:number,item:HotspotRecord,axis:'x'|'y',value:number)=>{
    const current=directPoint(item);
    update(index,{...item,position:{...item.position,[viewport]:{...current,[axis]:clamp(value)}}});
  };
  return <div className={styles.editorFields} data-interactive-scene-controls-v1>
    <div className={styles.fieldGroup}>
      <strong>Jelenet</strong>
      <label className={styles.field}><span>Típus</span><select value={text(node.config.sceneKind)||'look'} onChange={event=>onConfig('sceneKind',event.target.value)}><option value="look">Shop the Look</option><option value="room">Shop the Room</option><option value="setup">Shop the Setup</option><option value="gear">Shop the Gear</option><option value="generic">Interaktív jelenet</option></select></label>
      <label className={styles.field}><span>Cím</span><input value={text(node.config.title)} onChange={event=>onConfig('title',event.target.value)}/></label>
      <label className={styles.field}><span>Bevezető</span><textarea rows={3} value={text(node.config.copy)} onChange={event=>onConfig('copy',event.target.value)}/></label>
      <label className={styles.field}><span>Háttérkép URL</span><input value={text(node.config.backgroundImage)} onChange={event=>onConfig('backgroundImage',event.target.value)}/></label>
      <label className={styles.field}><span>Kép leírása</span><input value={text(node.config.backgroundAlt)} onChange={event=>onConfig('backgroundAlt',event.target.value)}/></label>
    </div>
    <div className={styles.fieldGroup}>
      <strong>Hotspotok</strong>
      <p className={styles.emptyHint}>A pozíció {viewportLabel(viewport)} nézetre módosul. Az ár és a készlet nem itt szerkeszthető: mindig a termékkatalógusból érkezik.</p>
      {list.map((item,index)=>{const activePoint=directPoint(item);return <div className={styles.complexField} key={item.id}>
        <strong>{index+1}. hotspot</strong>
        <label className={styles.field}><span>Termék</span><select value={item.productId} onChange={event=>update(index,{...item,productId:event.target.value})}><option value="">Válassz terméket…</option>{products.map(product=><option key={product.productId} value={product.productId}>{product.label}</option>)}</select></label>
        <label className={styles.field}><span>Egyedi címke (opcionális)</span><input value={item.label??''} onChange={event=>update(index,{...item,label:event.target.value||undefined})}/></label>
        <label className={styles.field}><span>{viewportLabel(viewport)} vízszintes pozíció</span><input type="range" min="0" max="100" value={activePoint.x} onChange={event=>setPoint(index,item,'x',Number(event.target.value))}/><small>{Math.round(activePoint.x)}%</small></label>
        <label className={styles.field}><span>{viewportLabel(viewport)} függőleges pozíció</span><input type="range" min="0" max="100" value={activePoint.y} onChange={event=>setPoint(index,item,'y',Number(event.target.value))}/><small>{Math.round(activePoint.y)}%</small></label>
        <button type="button" className={styles.secondaryButton} onClick={()=>remove(index)}>Hotspot eltávolítása</button>
      </div>})}
      <button type="button" className={styles.addSectionButton} disabled={!products.length} onClick={add}>＋ Hotspot hozzáadása</button>
      {!products.length?<p className={styles.emptyHint}>Nincs kiválasztható aktív termék. A jelenet csak valós katalógustermékhez köthető.</p>:null}
    </div>
    <div className={styles.fieldGroup}>
      <strong>Szett megjelenítése</strong>
      <label className={styles.switchField}><span>Terméklista a jelenet alatt</span><input type="checkbox" checked={node.config.showSetSummary!==false} onChange={event=>onConfig('showSetSummary',event.target.checked)}/><i aria-hidden="true"/></label>
      <label className={styles.field}><span>Lista címe</span><input value={text(node.config.setTitle)} onChange={event=>onConfig('setTitle',event.target.value)}/></label>
      <label className={styles.field}><span>CTA felirat</span><input value={text(node.config.setCtaLabel)} onChange={event=>onConfig('setCtaLabel',event.target.value)}/></label>
      <label className={styles.field}><span>CTA cél</span><input value={text(node.config.setCtaHref)} onChange={event=>onConfig('setCtaHref',event.target.value)}/></label>
    </div>
  </div>;
}
