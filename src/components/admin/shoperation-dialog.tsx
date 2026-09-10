'use client';

import{useEffect,useId,useRef}from'react';
import styles from'./shoperation-dialog.module.css';

type DialogInput={label:string;value:string;onChange:(value:string)=>void;type?:'text'|'number';placeholder?:string;min?:number;step?:number};
type Props={open:boolean;eyebrow?:string;title:string;description?:string;input?:DialogInput;confirmLabel?:string;cancelLabel?:string;busy?:boolean;danger?:boolean;confirmDisabled?:boolean;onConfirm:()=>void;onClose:()=>void};

export function ShoperationDialog({open,eyebrow='Shoperation',title,description,input,confirmLabel='Megerősítés',cancelLabel='Mégse',busy=false,danger=false,confirmDisabled=false,onConfirm,onClose}:Props){
 const titleId=useId(),descriptionId=useId(),inputRef=useRef<HTMLInputElement>(null),confirmRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const handler=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy)onClose()};document.addEventListener('keydown',handler);const timer=window.setTimeout(()=>{if(input)inputRef.current?.focus();else confirmRef.current?.focus()},0);return()=>{window.clearTimeout(timer);document.removeEventListener('keydown',handler)}},[open,busy,input,onClose]);
 if(!open)return null;
 return <div className={styles.backdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
  <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined}>
   <div className={styles.icon} aria-hidden="true">S</div>
   <span className={styles.eyebrow}>{eyebrow}</span>
   <h3 id={titleId}>{title}</h3>
   {description&&<p id={descriptionId}>{description}</p>}
   {input&&<label className={styles.field}><span>{input.label}</span><input ref={inputRef} type={input.type??'text'} value={input.value} placeholder={input.placeholder} min={input.min} step={input.step} disabled={busy} onChange={event=>input.onChange(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!confirmDisabled&&!busy)onConfirm()}}/></label>}
   <div className={styles.actions}><button className={styles.cancel} type="button" disabled={busy} onClick={onClose}>{cancelLabel}</button><button ref={confirmRef} className={danger?styles.danger:styles.confirm} type="button" disabled={busy||confirmDisabled} onClick={onConfirm}>{busy?'Feldolgozás…':confirmLabel}</button></div>
  </section>
 </div>;
}
