'use client';

import { useEffect,useMemo,useRef,useState,type MouseEvent as ReactMouseEvent,type ReactNode } from 'react';
import { emailBindingRegistry,getEmailBinding,resolveEmailString } from '@/lib/email-builder/bindings';
import type { EmailRenderContext } from '@/lib/email-builder/types';
import styles from './email-builder-wordlike-shell.module.css';

type TextControl=HTMLInputElement|HTMLTextAreaElement;
type BindingTarget={control:TextControl;label:string;start:number;end:number;editable?:HTMLElement|null};

const supportedFieldLabels=new Set(['Tárgy','Preheader','Szöveg','Gomb felirata','Hivatkozás','Blokk címe','Szöveges márkanév felülírás','Lábléc szövege']);
const inspectorFieldByBlock:Record<string,string>={Címsor:'Szöveg',Szöveg:'Szöveg',Gomb:'Gomb felirata'};

function groupLabel(group:string){return group==='store'?'Webshop':group==='customer'?'Vásárló':group==='order'?'Rendelés':group==='payment'?'Fizetés':group==='shipping'?'Szállítás':group==='billing'?'Számlázás':'Kupon';}
function bindingLabel(key:string){return emailBindingRegistry.find(item=>item.key===key)?.label??key;}
function bindingPreview(context:EmailRenderContext,key:string){const value=getEmailBinding(context,key);return value===null||value===undefined||String(value)===''?'—':String(value);}
function selectionOf(control:TextControl){const end=control.value.length;return{start:control.selectionStart??end,end:control.selectionEnd??end};}
function setNativeValue(control:TextControl,value:string){
  const prototype=control instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  const setter=Object.getOwnPropertyDescriptor(prototype,'value')?.set;
  if(setter)setter.call(control,value);else control.value=value;
  control.dispatchEvent(new Event('input',{bubbles:true}));
}
function serializeNode(node:Node):string{
  if(node.nodeType===Node.TEXT_NODE)return node.nodeValue??'';
  if(!(node instanceof HTMLElement))return'';
  const binding=node.dataset.emailBindingKey;if(binding)return`{{${binding}}}`;
  if(node.tagName==='BR')return'\n';
  let value='';node.childNodes.forEach(child=>{value+=serializeNode(child);});
  if((node.tagName==='DIV'||node.tagName==='P')&&node.nextSibling)value+='\n';
  return value;
}
function serializeEditable(root:HTMLElement){let value='';root.childNodes.forEach(node=>{value+=serializeNode(node);});return value.replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').replace(/\n$/,'');}
function appendText(document:Document,parent:HTMLElement,value:string){const parts=value.split('\n');parts.forEach((part,index)=>{if(index)parent.append(document.createElement('br'));if(part)parent.append(document.createTextNode(part));});}
function hydrateEditable(root:HTMLElement,raw:string,context:EmailRenderContext){
  const document=root.ownerDocument;root.replaceChildren();
  const pattern=/\{\{([a-zA-Z0-9._-]+)\}\}/g;let cursor=0;let match:RegExpExecArray|null;
  while((match=pattern.exec(raw))){
    appendText(document,root,raw.slice(cursor,match.index));
    const chip=document.createElement('span');const key=match[1];chip.dataset.emailBindingKey=key;chip.contentEditable='false';chip.className='shoperation-binding-chip';chip.textContent=bindingPreview(context,key);chip.title=`Dinamikus adat: ${bindingLabel(key)}`;chip.setAttribute('aria-label',`${bindingLabel(key)}: ${bindingPreview(context,key)}`);root.append(chip);cursor=match.index+match[0].length;
  }
  appendText(document,root,raw.slice(cursor));
}
function restoreResolved(root:HTMLElement,raw:string,context:EmailRenderContext){root.replaceChildren();appendText(root.ownerDocument,root,resolveEmailString(raw,context));}
function rawLength(node:Node){return serializeNode(node).length;}
function rawOffset(root:HTMLElement,target:Node,offset:number){
  let total=0;let found:number|null=null;
  const walk=(node:Node):boolean=>{
    if(node===target){
      if(node.nodeType===Node.TEXT_NODE){found=total+(node.nodeValue??'').slice(0,offset).length;return true;}
      if(node instanceof HTMLElement&&node.dataset.emailBindingKey){found=total;return true;}
      const children=[...node.childNodes];for(let index=0;index<Math.min(offset,children.length);index++)total+=rawLength(children[index]);found=total;return true;
    }
    if(node.nodeType===Node.TEXT_NODE){total+=node.nodeValue?.length??0;return false;}
    if(node instanceof HTMLElement&&node.dataset.emailBindingKey){total+=`{{${node.dataset.emailBindingKey}}}`.length;return false;}
    if(node instanceof HTMLElement&&node.tagName==='BR'){total+=1;return false;}
    for(const child of [...node.childNodes])if(walk(child))return true;
    if(node instanceof HTMLElement&&(node.tagName==='DIV'||node.tagName==='P')&&node!==root&&node.nextSibling)total+=1;
    return false;
  };
  walk(root);return found??total;
}
function selectionOffsets(root:HTMLElement){
  const selection=root.ownerDocument.getSelection();const end=serializeEditable(root).length;
  if(!selection||!selection.rangeCount)return{start:end,end};
  const range=selection.getRangeAt(0);if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return{start:end,end};
  return{start:rawOffset(root,range.startContainer,range.startOffset),end:rawOffset(root,range.endContainer,range.endOffset)};
}
function placeCaretFromPoint(document:Document,editable:HTMLElement,x:number,y:number){
  const selection=document.getSelection();if(!selection)return;
  let range:Range|null=null;
  const withCaret=document as Document&{caretRangeFromPoint?:(x:number,y:number)=>Range|null;caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null};
  const position=withCaret.caretPositionFromPoint?.(x,y);
  if(position&&editable.contains(position.offsetNode)){range=document.createRange();range.setStart(position.offsetNode,position.offset);range.collapse(true);}
  if(!range){const legacy=withCaret.caretRangeFromPoint?.(x,y)??null;if(legacy&&editable.contains(legacy.startContainer))range=legacy;}
  if(!range){range=document.createRange();range.selectNodeContents(editable);range.collapse(false);}
  selection.removeAllRanges();selection.addRange(range);
}
function placeCaretAtRawOffset(root:HTMLElement,offset:number){
  const document=root.ownerDocument,selection=document.getSelection();if(!selection)return;let remaining=Math.max(0,offset),target:Node=root,targetOffset=root.childNodes.length,done=false;
  const walk=(node:Node):void=>{
    if(done)return;
    if(node.nodeType===Node.TEXT_NODE){const length=node.nodeValue?.length??0;if(remaining<=length){target=node;targetOffset=remaining;done=true;return;}remaining-=length;return;}
    if(node instanceof HTMLElement&&node.dataset.emailBindingKey){const length=`{{${node.dataset.emailBindingKey}}}`.length;if(remaining<=length){target=node.parentNode??root;targetOffset=[...(target.childNodes)].indexOf(node)+1;done=true;return;}remaining-=length;return;}
    if(node instanceof HTMLElement&&node.tagName==='BR'){if(remaining<=1){target=node.parentNode??root;targetOffset=[...(target.childNodes)].indexOf(node)+1;done=true;return;}remaining-=1;return;}
    node.childNodes.forEach(child=>walk(child));
  };
  root.childNodes.forEach(node=>walk(node));const range=document.createRange();range.setStart(target,targetOffset);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
}
function labelText(label:HTMLLabelElement){return label.querySelector(':scope > span')?.textContent?.trim()??label.querySelector('span')?.textContent?.trim()??'';}
function usableControl(label:HTMLLabelElement){const control=label.querySelector<TextControl>('textarea,input');if(!control)return null;if(control instanceof HTMLInputElement&&['checkbox','color','range','radio','file'].includes(control.type))return null;return control;}

export function EmailBuilderWordLikeShellV2({children,previewContext}:{children:ReactNode;previewContext:EmailRenderContext}){
  const rootRef=useRef<HTMLDivElement>(null),targetRef=useRef<BindingTarget|null>(null),wiredFrames=useRef(new WeakSet<HTMLIFrameElement>());
  const[pickerOpen,setPickerOpen]=useState(false),[pickerLabel,setPickerLabel]=useState(''),[query,setQuery]=useState(''),[notice,setNotice]=useState('');
  const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase('hu');return emailBindingRegistry.filter(item=>!needle||`${item.label} ${item.key} ${groupLabel(item.requiredContext)}`.toLocaleLowerCase('hu').includes(needle));},[query]);
  const groups=useMemo(()=>Array.from(new Set(filtered.map(item=>item.requiredContext))),[filtered]);
  function flash(message:string){setNotice(message);window.setTimeout(()=>setNotice(current=>current===message?'':current),2600);}
  function openPicker(target:BindingTarget){targetRef.current=target;setPickerLabel(target.label);setQuery('');setPickerOpen(true);}
  function openForControl(control:TextControl,label:string){const selection=selectionOf(control);openPicker({control,label,...selection});}
  function chooseBinding(key:string,label:string){
    const target=targetRef.current;if(!target)return;const control=target.control.isConnected?target.control:null;if(!control){setPickerOpen(false);flash('A szerkesztett mező már nem érhető el. Kattints bele újra.');return;}
    const current=control.value,start=Math.max(0,Math.min(target.start,current.length)),end=Math.max(start,Math.min(target.end,current.length)),token=`{{${key}}}`,next=`${current.slice(0,start)}${token}${current.slice(end)}`;setNativeValue(control,next);const cursor=start+token.length;
    targetRef.current={...target,start:cursor,end:cursor};setPickerOpen(false);flash(`Beszúrva: ${label}`);
    if(target.editable?.isConnected){hydrateEditable(target.editable,next,previewContext);target.editable.focus();placeCaretAtRawOffset(target.editable,cursor);}else{control.focus();window.setTimeout(()=>control.setSelectionRange(cursor,cursor),0);}
  }
  function captureReferenceClick(event:ReactMouseEvent<HTMLDivElement>){const target=event.target as HTMLElement,button=target.closest<HTMLButtonElement>('button');if(!button||button.closest('[data-email-binding-picker]'))return;const code=button.querySelector('code')?.textContent?.trim()??'';if(!/^\{\{[^}]+\}\}$/.test(code))return;event.preventDefault();event.stopPropagation();flash('A változókönyvtár referencia. Beszúráshoz kattints a szövegbe, majd válaszd a „Dinamikus adat” gombot.');}

  useEffect(()=>{
    const root=rootRef.current;if(!root)return;const controlByEditable=new WeakMap<HTMLElement,TextControl>();
    const findInspector=()=>[...root.querySelectorAll<HTMLElement>('span')].find(item=>item.textContent?.trim()==='Kijelölt elem')?.closest('aside')??null;
    const inspectorControl=(blockTitle:string)=>{const aside=findInspector();if(!aside)return null;const field=inspectorFieldByBlock[blockTitle];if(!field)return null;for(const label of [...aside.querySelectorAll<HTMLLabelElement>('label')])if(labelText(label)===field){const control=usableControl(label);if(control)return control;}return null;};
    const inspectorTitle=()=>{const aside=findInspector(),marker=[...(aside?.querySelectorAll<HTMLElement>('span')??[])].find(item=>item.textContent?.trim()==='Kijelölt elem');return marker?.parentElement?.querySelector('strong')?.textContent?.trim()??'';};
    const editableFor=(document:Document,row:HTMLElement,title:string)=>title==='Címsor'?row.querySelector<HTMLElement>('h1,h2,h3'):title==='Szöveg'?row.querySelector<HTMLElement>('td'):title==='Gomb'?row.querySelector<HTMLElement>('a.email-button'):null;
    const removeToolbar=(document:Document)=>document.getElementById('shoperation-inline-toolbar')?.remove();
    const deactivate=(editable:HTMLElement)=>{const control=controlByEditable.get(editable);if(control){const raw=serializeEditable(editable);if(raw!==control.value)setNativeValue(control,raw);restoreResolved(editable,raw,previewContext);}editable.contentEditable='false';editable.removeAttribute('data-shoperation-inline-edit');editable.style.cursor='';editable.style.whiteSpace='';};
    const showToolbar=(frame:HTMLIFrameElement,editable:HTMLElement,control:TextControl,title:string)=>{const document=frame.contentDocument;if(!document)return;removeToolbar(document);const toolbar=document.createElement('div');toolbar.id='shoperation-inline-toolbar';const button=document.createElement('button');button.type='button';button.textContent='{ }';button.title='Dinamikus adat beszúrása';button.setAttribute('aria-label','Dinamikus adat beszúrása');toolbar.append(button);document.body.append(toolbar);button.onmousedown=event=>{event.preventDefault();event.stopPropagation();const raw=serializeEditable(editable);if(raw!==control.value)setNativeValue(control,raw);const selection=selectionOffsets(editable);openPicker({control,label:`${title} · kurzor`,...selection,editable});};};
    const activateInline=(frame:HTMLIFrameElement,id:string,x:number,y:number,attempt=0)=>{const document=frame.contentDocument;if(!document)return;const title=inspectorTitle(),control=inspectorControl(title),row=[...document.querySelectorAll<HTMLElement>('[data-email-block-id]')].find(item=>item.dataset.emailBlockId===id);if((!control||!row||!inspectorFieldByBlock[title])&&attempt<4){window.setTimeout(()=>activateInline(frame,id,x,y,attempt+1),35);return;}if(!control||!row)return;const editable=editableFor(document,row,title);if(!editable)return;document.querySelectorAll<HTMLElement>('[data-shoperation-inline-edit="true"]').forEach(item=>{if(item!==editable)deactivate(item);});hydrateEditable(editable,control.value,previewContext);controlByEditable.set(editable,control);editable.dataset.shoperationInlineEdit='true';editable.contentEditable='true';editable.spellcheck=true;editable.style.cursor='text';editable.style.whiteSpace='pre-wrap';editable.onclick=event=>event.stopPropagation();editable.onfocus=()=>showToolbar(frame,editable,control,title);editable.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();editable.blur();}if(title!=='Szöveg'&&event.key==='Enter'){event.preventDefault();editable.blur();}};editable.onblur=()=>{const raw=serializeEditable(editable);if(raw!==control.value)setNativeValue(control,raw);window.setTimeout(()=>{if(document.activeElement!==editable){restoreResolved(editable,raw,previewContext);editable.contentEditable='false';editable.removeAttribute('data-shoperation-inline-edit');editable.style.cursor='';editable.style.whiteSpace='';removeToolbar(document);}},80);};editable.focus();placeCaretFromPoint(document,editable,x,y);showToolbar(frame,editable,control,title);};
    const prepareFrame=(frame:HTMLIFrameElement)=>{const document=frame.contentDocument;if(!document||document.documentElement.dataset.shoperationWordlikeV2==='1')return;document.documentElement.dataset.shoperationWordlikeV2='1';const style=document.createElement('style');style.textContent='[data-shoperation-inline-edit="true"]{outline:1.5px solid #159b7b!important;outline-offset:3px!important;border-radius:4px}.shoperation-binding-chip{display:inline;color:inherit;background:rgba(21,155,123,.10);border-bottom:1px dashed #159b7b;border-radius:2px;padding:0 1px;margin:0;font:inherit;line-height:inherit;vertical-align:baseline;white-space:inherit}#shoperation-inline-toolbar{position:fixed;top:8px;right:8px;z-index:2147483000}#shoperation-inline-toolbar button{width:34px;height:34px;border:1px solid #9fd9ca;border-radius:999px;background:#fff;color:#08745f;padding:0;font:800 12px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(16,48,40,.14);cursor:pointer}';document.head.append(style);document.addEventListener('click',event=>{const target=event.target as HTMLElement;if(target.closest('[data-shoperation-inline-edit="true"]'))return;const row=target.closest<HTMLElement>('[data-email-block-id]');if(!row?.dataset.emailBlockId)return;const mouse=event as MouseEvent;window.setTimeout(()=>activateInline(frame,row.dataset.emailBlockId!,mouse.clientX,mouse.clientY),30);},true);};
    const wireFrame=(frame:HTMLIFrameElement)=>{if(wiredFrames.current.has(frame)){prepareFrame(frame);return;}wiredFrames.current.add(frame);frame.addEventListener('load',()=>prepareFrame(frame));prepareFrame(frame);};
    const decorate=()=>{root.querySelectorAll<HTMLLabelElement>('label').forEach(label=>{const text=labelText(label),control=usableControl(label);if(!control||!supportedFieldLabels.has(text)||label.querySelector('[data-wordlike-binding-trigger]'))return;const button=document.createElement('button');button.type='button';button.dataset.wordlikeBindingTrigger='true';button.className=styles.fieldBindingButton;button.textContent='{ } Dinamikus adat';button.onmousedown=event=>event.preventDefault();button.onclick=event=>{event.preventDefault();event.stopPropagation();openForControl(control,text);};label.append(button);});const canvasMarker=[...root.querySelectorAll<HTMLElement>('span')].find(item=>item.textContent?.trim()==='Élő canvas'),toolbar=canvasMarker?.parentElement?.parentElement;if(toolbar&&!toolbar.querySelector('[data-wordlike-insert]')){const button=document.createElement('button');button.type='button';button.dataset.wordlikeInsert='true';button.className=styles.insertButton;button.textContent='＋ Beszúrás';button.onclick=()=>{if(window.matchMedia('(max-width:760px)').matches){[...root.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.textContent?.includes('Hozzáadás'))?.click();}else{root.querySelector<HTMLButtonElement>('nav[aria-label="E-mail Builder eszközök"] button[title="Blokkok"]')?.click();}};toolbar.append(button);}const hint=[...root.querySelectorAll<HTMLParagraphElement>('p')].find(item=>item.textContent?.includes('Kattints egy blokkra az e-mailben'));if(hint)hint.textContent='Kattints közvetlenül a címsorba, szövegbe vagy gombra és szerkeszd ott. A dinamikus értékek szerkesztés közben is a mintaadatukkal maradnak láthatók.';root.querySelectorAll<HTMLIFrameElement>('iframe[title="E-mail Builder élő előnézet"]').forEach(wireFrame);};
    decorate();const observer=new MutationObserver(decorate);observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
  },[previewContext]);

  return <div ref={rootRef} className={styles.shell} onClickCapture={captureReferenceClick}>{children}{notice&&<div className={styles.notice} role="status">{notice}</div>}{pickerOpen&&<div className={styles.pickerBackdrop} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPickerOpen(false)}}><section className={styles.picker} role="dialog" aria-modal="true" aria-label="Dinamikus adat beszúrása" data-email-binding-picker><div className={styles.pickerHead}><div><span>Beszúrás</span><strong>Dinamikus adat</strong><small>{pickerLabel}</small></div><button type="button" onClick={()=>setPickerOpen(false)} aria-label="Bezárás">×</button></div><input className={styles.search} autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Keresés – pl. keresztnév, rendelés, összeg…"/><div className={styles.bindingList}>{groups.map(group=><section key={group}><h3>{groupLabel(group)}</h3><div>{filtered.filter(item=>item.requiredContext===group).map(binding=><button type="button" key={binding.key} onClick={()=>chooseBinding(binding.key,binding.label)}><span>{binding.label}</span><small>{bindingPreview(previewContext,binding.key)} · Beszúrás a kurzorhoz</small></button>)}</div></section>)}</div>{!filtered.length&&<div className={styles.empty}>Nincs ilyen dinamikus adat.</div>}</section></div>}</div>;
}
