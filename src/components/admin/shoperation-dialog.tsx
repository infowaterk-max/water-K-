'use client';

import{useCallback,useEffect,useId,useRef,useState}from'react';

type DialogInput={label:string;value:string;onChange:(value:string)=>void;type?:'text'|'number';placeholder?:string;min?:number;step?:number};
type Props={open:boolean;eyebrow?:string;title:string;description?:string;input?:DialogInput;confirmLabel?:string;cancelLabel?:string;busy?:boolean;danger?:boolean;confirmDisabled?:boolean;onConfirm:()=>void;onClose:()=>void};
export type ShoperationConfirmRequest={eyebrow?:string;title:string;description?:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
export type ShoperationPromptRequest=ShoperationConfirmRequest&{label:string;initialValue?:string;placeholder?:string;type?:'text'|'number';min?:number;step?:number;required?:boolean};

const focusableSelector='button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function ShoperationDialog({open,eyebrow='Shoperation',title,description,input,confirmLabel='Megerősítés',cancelLabel='Mégse',busy=false,danger=false,confirmDisabled=false,onConfirm,onClose}:Props){
 const titleId=useId(),descriptionId=useId(),dialogRef=useRef<HTMLElement>(null),inputRef=useRef<HTMLInputElement>(null),confirmRef=useRef<HTMLButtonElement>(null),closeRef=useRef<HTMLButtonElement>(null),previousFocus=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(!open)return;
  previousFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const handler=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&!busy){event.preventDefault();onClose();return}
   if(event.key!=='Tab')return;
   const focusable=[...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector)??[])].filter(element=>!element.hasAttribute('disabled')&&element.getAttribute('aria-hidden')!=='true');
   if(!focusable.length){event.preventDefault();return}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  };
  document.addEventListener('keydown',handler);
  const timer=window.setTimeout(()=>{if(input)inputRef.current?.focus();else confirmRef.current?.focus()??closeRef.current?.focus()},0);
  return()=>{
   window.clearTimeout(timer);
   document.removeEventListener('keydown',handler);
   document.body.style.overflow=previousOverflow;
   previousFocus.current?.focus();
  };
 },[open,busy,input,onClose]);
 if(!open)return null;
 return <div className="adminModalBackdrop" role="presentation" data-shoperation-dialog-backdrop onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
  <section ref={dialogRef} className="adminModal shoperationDialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined} aria-busy={busy||undefined} data-shoperation-dialog>
   <header className="adminModalHeader">
    <div className="adminModalHeading">
     <span className="eyebrow">{eyebrow}</span>
     <h3 id={titleId}>{title}</h3>
    </div>
    <button ref={closeRef} className="adminModalClose" type="button" aria-label="Ablak bezárása" disabled={busy} onClick={onClose}>×</button>
   </header>
   <div className="adminModalBody">
    {description&&<p id={descriptionId}>{description}</p>}
    {input&&<label className="adminModalField"><span>{input.label}</span><input ref={inputRef} type={input.type??'text'} value={input.value} placeholder={input.placeholder} min={input.min} step={input.step} disabled={busy} onChange={event=>input.onChange(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!confirmDisabled&&!busy)onConfirm()}}/></label>}
   </div>
   <footer className="adminModalFooter">
    <button className="btn btnGhost" type="button" disabled={busy} onClick={onClose}>{cancelLabel}</button>
    <button ref={confirmRef} className={danger?'btn btnDanger':'btn btnPrimary'} type="button" disabled={busy||confirmDisabled} onClick={onConfirm}>{busy?'Feldolgozás…':confirmLabel}</button>
   </footer>
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
