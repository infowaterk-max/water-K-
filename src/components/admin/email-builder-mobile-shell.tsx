'use client';

import{useEffect,useRef,useState,type FocusEvent as ReactFocusEvent,type MouseEvent as ReactMouseEvent,type ReactNode}from'react';
import styles from'./email-builder-mobile-shell.module.css';

type MobilePanel='canvas'|'library'|'inspector';
const libraryViews=['Blokkok','Szekciók','Presetek','Saját blokkok','Dinamikus adatok'] as const;
type LibraryView=typeof libraryViews[number];
type PendingBinding={key:string;label:string};
type ConfirmAction={source:HTMLButtonElement;name:string};

export function EmailBuilderMobileShell({children}:{children:ReactNode}){
  const rootRef=useRef<HTMLDivElement>(null);
  const reentryRef=useRef(false);
  const pendingBindingRef=useRef<PendingBinding|null>(null);
  const[panel,setPanel]=useState<MobilePanel>('canvas');
  const[libraryView,setLibraryView]=useState<LibraryView>('Blokkok');
  const[pendingBinding,setPendingBinding]=useState<PendingBinding|null>(null);
  const[confirmAction,setConfirmAction]=useState<ConfirmAction|null>(null);

  function selectLibrary(view:LibraryView){
    const nav=rootRef.current?.querySelector<HTMLElement>('nav[aria-label="E-mail Builder eszközök"]');
    const button=[...(nav?.querySelectorAll<HTMLButtonElement>('button')??[])].find(item=>item.textContent?.replace(/\s+/g,' ').trim().includes(view));
    button?.click();
    setLibraryView(view);
    setPanel('library');
  }

  function clearPendingBinding(){pendingBindingRef.current=null;setPendingBinding(null);}

  function captureEditorClick(event:ReactMouseEvent<HTMLDivElement>){
    if(reentryRef.current)return;
    const target=event.target as HTMLElement;
    const button=target.closest<HTMLButtonElement>('button');
    if(!button||!rootRef.current?.contains(button))return;

    const buttonText=button.textContent?.replace(/\s+/g,' ').trim()??'';
    if(buttonText==='Preset alkalmazása'){
      event.preventDefault();event.stopPropagation();
      const name=button.closest('article')?.querySelector('strong')?.textContent?.trim()||'Kiválasztott preset';
      setConfirmAction({source:button,name});
      return;
    }

    if(!window.matchMedia('(max-width:760px)').matches||panel!=='library'||libraryView!=='Dinamikus adatok')return;
    const code=button.querySelector('code')?.textContent?.trim()??'';
    const match=code.match(/^\{\{(.+)\}\}$/);
    if(!match)return;
    const pane=button.closest('aside');
    const hasTarget=[...(pane?.querySelectorAll('p')??[])].some(item=>item.textContent?.includes('Beszúrás helye:'));
    if(hasTarget)return;

    event.preventDefault();event.stopPropagation();
    const binding={key:match[1],label:button.querySelector('span')?.textContent?.trim()||match[1]};
    pendingBindingRef.current=binding;
    setPendingBinding(binding);
    setPanel('canvas');
  }

  function captureEditorFocus(_event:ReactFocusEvent<HTMLDivElement>){
    if(!pendingBindingRef.current)return;
    window.setTimeout(()=>{
      const pending=pendingBindingRef.current;
      const root=rootRef.current;
      if(!pending||!root)return;
      const nav=root.querySelector<HTMLElement>('nav[aria-label="E-mail Builder eszközök"]');
      const pane=nav?.nextElementSibling as HTMLElement|null;
      if(!pane)return;
      const hasTarget=[...pane.querySelectorAll('p')].some(item=>item.textContent?.includes('Beszúrás helye:'));
      if(!hasTarget)return;
      const source=[...pane.querySelectorAll<HTMLButtonElement>('button')].find(item=>item.querySelector('code')?.textContent?.trim()===`{{${pending.key}}}`);
      if(!source)return;
      source.click();
      clearPendingBinding();
    },0);
  }

  function runConfirmedPreset(){
    const action=confirmAction;
    if(!action)return;
    setConfirmAction(null);
    const nativeConfirm=window.confirm;
    reentryRef.current=true;
    try{
      window.confirm=()=>true;
      action.source.click();
    }finally{
      window.confirm=nativeConfirm;
      reentryRef.current=false;
    }
  }

  useEffect(()=>{
    if(panel==='canvas'&&!confirmAction&&!pendingBinding)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      if(confirmAction){setConfirmAction(null);return;}
      if(pendingBinding){clearPendingBinding();return;}
      setPanel('canvas');
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[panel,confirmAction,pendingBinding]);

  return <div ref={rootRef} className={styles.shell} data-mobile-panel={panel} onClickCapture={captureEditorClick} onFocusCapture={captureEditorFocus}>
    {children}
    {panel!=='canvas'&&<button type="button" className={styles.backdrop} aria-label="Mobil szerkesztőpanel bezárása" onClick={()=>setPanel('canvas')}/>} 

    {panel==='library'&&<div className={`${styles.drawerChrome} ${styles.libraryChrome}`} role="dialog" aria-modal="true" aria-label="E-mail elemek hozzáadása">
      <div className={styles.drawerTitle}><div><span>Hozzáadás</span><strong>{libraryView}</strong></div><button type="button" onClick={()=>setPanel('canvas')} aria-label="Panel bezárása">×</button></div>
      <div className={styles.libraryTabs} role="tablist" aria-label="E-mail Builder könyvtárak">
        {libraryViews.map(view=><button type="button" role="tab" aria-selected={libraryView===view} className={libraryView===view?styles.activeTab:''} key={view} onClick={()=>selectLibrary(view)}>{view}</button>)}
      </div>
    </div>}

    {panel==='inspector'&&<div className={`${styles.drawerChrome} ${styles.inspectorChrome}`} role="dialog" aria-modal="true" aria-label="Kijelölt blokk szerkesztése">
      <div className={styles.drawerTitle}><div><span>Szerkesztés</span><strong>Kijelölt blokk</strong></div><button type="button" onClick={()=>setPanel('canvas')} aria-label="Panel bezárása">×</button></div>
    </div>}

    {pendingBinding&&<div className={styles.pendingBinding} role="status"><div><span>Dinamikus adat kiválasztva</span><strong>Válaszd ki, hová szeretnéd beszúrni: {pendingBinding.label}</strong></div><button type="button" onClick={clearPendingBinding}>Mégse</button></div>}

    {confirmAction&&<div className="adminModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setConfirmAction(null)}}><section className="adminModal" role="dialog" aria-modal="true" aria-labelledby="email-builder-preset-confirm-title"><span className="eyebrow">Megerősítés</span><h3 id="email-builder-preset-confirm-title">Preset alkalmazása</h3><p>A(z) <strong>{confirmAction.name}</strong> preset lecseréli a jelenlegi piszkozat teljes elrendezését. A művelet egyetlen Visszavonás lépéssel visszaállítható.</p><div className="actions"><button className="btn btnGhost" type="button" onClick={()=>setConfirmAction(null)}>Mégsem</button><button className="btn btnPrimary" type="button" onClick={runConfirmedPreset}>Preset alkalmazása</button></div></section></div>}

    <nav className={styles.mobileDock} aria-label="Mobil E-mail Builder nézetek">
      <button type="button" className={panel==='canvas'?styles.dockActive:''} onClick={()=>setPanel('canvas')}><span>▣</span><small>Canvas</small></button>
      <button type="button" className={panel==='library'?styles.dockActive:''} onClick={()=>selectLibrary(libraryView)}><span>＋</span><small>Hozzáadás</small></button>
      <button type="button" className={panel==='inspector'?styles.dockActive:''} onClick={()=>setPanel('inspector')}><span>☷</span><small>Szerkesztés</small></button>
    </nav>
  </div>;
}