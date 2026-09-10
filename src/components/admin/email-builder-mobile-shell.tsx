'use client';

import{useEffect,useRef,useState,type ReactNode}from'react';
import styles from'./email-builder-mobile-shell.module.css';

type MobilePanel='canvas'|'library'|'inspector';
const libraryViews=['Blokkok','Szekciók','Presetek','Saját blokkok','Dinamikus adatok'] as const;
type LibraryView=typeof libraryViews[number];

export function EmailBuilderMobileShell({children}:{children:ReactNode}){
  const rootRef=useRef<HTMLDivElement>(null);
  const[panel,setPanel]=useState<MobilePanel>('canvas');
  const[libraryView,setLibraryView]=useState<LibraryView>('Blokkok');

  function selectLibrary(view:LibraryView){
    const nav=rootRef.current?.querySelector<HTMLElement>('nav[aria-label="E-mail Builder eszközök"]');
    const button=[...(nav?.querySelectorAll<HTMLButtonElement>('button')??[])].find(item=>item.textContent?.replace(/\s+/g,' ').trim().includes(view));
    button?.click();
    setLibraryView(view);
    setPanel('library');
  }

  useEffect(()=>{
    if(panel==='canvas')return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setPanel('canvas');};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[panel]);

  return <div ref={rootRef} className={styles.shell} data-mobile-panel={panel}>
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

    <nav className={styles.mobileDock} aria-label="Mobil E-mail Builder nézetek">
      <button type="button" className={panel==='canvas'?styles.dockActive:''} onClick={()=>setPanel('canvas')}><span>▣</span><small>Canvas</small></button>
      <button type="button" className={panel==='library'?styles.dockActive:''} onClick={()=>selectLibrary(libraryView)}><span>＋</span><small>Hozzáadás</small></button>
      <button type="button" className={panel==='inspector'?styles.dockActive:''} onClick={()=>setPanel('inspector')}><span>☷</span><small>Szerkesztés</small></button>
    </nav>
  </div>;
}
