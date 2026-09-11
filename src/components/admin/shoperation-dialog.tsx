'use client';

import{useCallback,useEffect,useId,useRef,useState}from'react';
import styles from'./shoperation-dialog.module.css';

type DialogInput={label:string;value:string;onChange:(value:string)=>void;type?:'text'|'number';placeholder?:string;min?:number;step?:number};
type Props={open:boolean;eyebrow?:string;title:string;description?:string;input?:DialogInput;confirmLabel?:string;cancelLabel?:string;busy?:boolean;danger?:boolean;confirmDisabled?:boolean;onConfirm:()=>void;onClose:()=>void};
export type ShoperationConfirmRequest={eyebrow?:string;title:string;description?:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
export type ShoperationPromptRequest=ShoperationConfirmRequest&{label:string;initialValue?:string;placeholder?:string;type?:'text'|'number';min?:number;step?:number;required?:boolean};

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

export function useShoperationConfirm(){
 const[request,setRequest]=useState<ShoperationConfirmRequest|null>(null),resolver=useRef<((value:boolean)=>void)|null>(null);
 const settle=useCallback((value:boolean)=>{resolver.current?.(value);resolver.current=null;setRequest(null)},[]);
 const confirm=useCallback((next:ShoperationConfirmRequest)=>new Promise<boolean>(resolve=>{resolver.current?.(false);resolver.current=resolve;setRequest(next)}),[]);
 useEffect(()=>()=>{resolver.current?.(false);resolver.current=null},[]);
 const dialog=request?<ShoperationDialog open eyebrow={request.eyebrow} title={request.title} description={request.description} confirmLabel={request.confirmLabel} cancelLabel={request.cancelLabel} danger={request.danger} onConfirm={()=>settle(true)} onClose={()=>settle(false)}/>:null;
 return{confirm,dialog};
}

export function useShoperationPrompt(){
 const[request,setRequest]=useState<ShoperationPromptRequest|null>(null),[value,setValue]=useState(''),resolver=useRef<((value:string|null)=>void)|null>(null);
 const settle=useCallback((result:string|null)=>{resolver.current?.(result);resolver.current=null;setRequest(null);setValue('')},[]);
 const prompt=useCallback((next:ShoperationPromptRequest)=>new Promise<string|null>(resolve=>{resolver.current?.(null);resolver.current=resolve;setValue(next.initialValue??'');setRequest(next)}),[]);
 useEffect(()=>()=>{resolver.current?.(null);resolver.current=null},[]);
 const invalid=Boolean(request?.required&&!value.trim());
 const dialog=request?<ShoperationDialog open eyebrow={request.eyebrow} title={request.title} description={request.description} confirmLabel={request.confirmLabel??'Alkalmaz'} cancelLabel={request.cancelLabel} danger={request.danger} confirmDisabled={invalid} input={{label:request.label,value,onChange:setValue,type:request.type,placeholder:request.placeholder,min:request.min,step:request.step}} onConfirm={()=>settle(value)} onClose={()=>settle(null)}/>:null;
 return{prompt,dialog};
}
