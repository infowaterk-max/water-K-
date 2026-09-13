'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

const COMPACT_QUERY='(max-width: 1100px), (hover: none) and (pointer: coarse)';

function findBuilderSection(marker:HTMLSpanElement|null){
  return marker?.closest<HTMLElement>('section[data-storefront-builder-theme]')??null;
}

function findViewportButton(section:HTMLElement,label:'Desktop'|'Tablet'|'Mobil'){
  return Array.from(section.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.textContent?.trim()===label)??null;
}

function findWorkspace(section:HTMLElement){
  return section.querySelector<HTMLElement>('[data-left-collapsed][data-inspector-open]');
}

function findToggle(section:HTMLElement,title:'Bal panel'|'Inspector'){
  return section.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
}

export function VisualBuilderMobileViewport(){
  const markerRef=useRef<HTMLSpanElement>(null);
  const compactActivatedRef=useRef(false);
  const[drawerOpen,setDrawerOpen]=useState(false);

  const closePanels=useCallback(()=>{
    const section=findBuilderSection(markerRef.current);
    if(!section)return;
    const workspace=findWorkspace(section);
    if(!workspace)return;
    if(workspace.dataset.leftCollapsed==='false')findToggle(section,'Bal panel')?.click();
    if(workspace.dataset.inspectorOpen==='true')findToggle(section,'Inspector')?.click();
  },[]);

  useEffect(()=>{
    const section=findBuilderSection(markerRef.current);
    if(!section)return;
    section.dataset.mobileBuilderViewport='true';
    const media=window.matchMedia(COMPACT_QUERY);

    const applyCompact=()=>{
      if(!media.matches){compactActivatedRef.current=false;setDrawerOpen(false);return;}
      const workspace=findWorkspace(section);
      const mobileButton=findViewportButton(section,'Mobil');
      const leftToggle=findToggle(section,'Bal panel');
      const inspectorToggle=findToggle(section,'Inspector');
      if(!workspace||!mobileButton||!leftToggle||!inspectorToggle)return;

      if(!compactActivatedRef.current){
        compactActivatedRef.current=true;
        if(mobileButton.getAttribute('data-active')!=='true')mobileButton.click();
        if(workspace.dataset.leftCollapsed==='false')leftToggle.click();
        if(workspace.dataset.inspectorOpen==='true')inspectorToggle.click();
      }
      setDrawerOpen(workspace.dataset.leftCollapsed==='false'||workspace.dataset.inspectorOpen==='true');
    };

    const onSectionClick=(event:MouseEvent)=>{
      if(!media.matches)return;
      const button=(event.target as Element|null)?.closest<HTMLButtonElement>('button')??null;
      const workspace=findWorkspace(section);
      const leftToggle=findToggle(section,'Bal panel');
      const inspectorToggle=findToggle(section,'Inspector');
      if(!workspace||!button||!leftToggle||!inspectorToggle)return;
      if(button===leftToggle&&workspace.dataset.leftCollapsed==='true'&&workspace.dataset.inspectorOpen==='true')inspectorToggle.click();
      if(button===inspectorToggle&&workspace.dataset.inspectorOpen==='false'&&workspace.dataset.leftCollapsed==='false')leftToggle.click();
      window.requestAnimationFrame(applyCompact);
    };

    const observer=new MutationObserver(()=>window.requestAnimationFrame(applyCompact));
    observer.observe(section,{subtree:true,childList:true,attributes:true,attributeFilter:['data-active','data-left-collapsed','data-inspector-open']});
    const onMediaChange=()=>window.requestAnimationFrame(applyCompact);
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&media.matches)closePanels();};
    section.addEventListener('click',onSectionClick,true);
    media.addEventListener('change',onMediaChange);
    window.addEventListener('keydown',onKeyDown);
    window.requestAnimationFrame(()=>window.requestAnimationFrame(applyCompact));

    return()=>{
      observer.disconnect();
      section.removeEventListener('click',onSectionClick,true);
      media.removeEventListener('change',onMediaChange);
      window.removeEventListener('keydown',onKeyDown);
      delete section.dataset.mobileBuilderViewport;
    };
  },[closePanels]);

  return <>
    <span ref={markerRef} hidden data-visual-builder-mobile-viewport/>
    {drawerOpen?<button type="button" className="vb-capability-scrim" aria-label="Szerkesztőpanel bezárása" onClick={closePanels}/>:null}
    <style>{`
      @media (max-width:1100px), (hover:none) and (pointer:coarse){
        section[data-mobile-builder-viewport="true"]{position:relative;overflow:hidden}
        section[data-mobile-builder-viewport="true"]>.vb-capability-scrim{position:fixed;inset:0;z-index:270;border:0;background:rgba(18,34,29,.38);backdrop-filter:blur(2px)}
        section[data-mobile-builder-viewport="true"] [data-left-collapsed][data-inspector-open]{grid-template-columns:minmax(0,1fr)!important;min-width:0!important;overflow:hidden!important}
        section[data-mobile-builder-viewport="true"] [data-left-collapsed][data-inspector-open]>main{min-width:0!important;width:100%!important}
        section[data-mobile-builder-viewport="true"] aside[data-collapsed="true"],
        section[data-mobile-builder-viewport="true"] aside[data-open="false"]{display:none!important;visibility:hidden!important;pointer-events:none!important}
        section[data-mobile-builder-viewport="true"] aside[data-collapsed="false"],
        section[data-mobile-builder-viewport="true"] aside[data-open="true"]{display:grid!important;visibility:visible!important;pointer-events:auto!important;position:fixed!important;z-index:280!important;left:8px!important;right:8px!important;bottom:8px!important;top:auto!important;width:auto!important;max-width:none!important;height:min(76dvh,760px)!important;max-height:calc(100dvh - 82px)!important;border:1px solid #d9e4e1!important;border-radius:20px!important;background:#fff!important;box-shadow:0 24px 64px rgba(20,39,33,.24)!important;overflow:hidden!important}
        section[data-mobile-builder-viewport="true"] aside[data-collapsed="false"]{grid-template-rows:auto minmax(0,1fr)!important}
        section[data-mobile-builder-viewport="true"] aside[data-open="true"]{grid-template-rows:auto auto minmax(0,1fr)!important}
        section[data-mobile-builder-viewport="true"] aside[data-collapsed="false"]>div:last-child,
        section[data-mobile-builder-viewport="true"] aside[data-open="true"]>div:last-child{overflow:auto!important;-webkit-overflow-scrolling:touch}
        section[data-mobile-builder-viewport="true"] [data-viewport="mobile"]{width:min(100%,390px)!important;max-width:390px!important;transform:scale(1)!important;transform-origin:top center!important;margin-inline:auto!important}
        section[data-mobile-builder-viewport="true"] [data-viewport="mobile"] [data-builder-node-id]{touch-action:manipulation}
        section[data-mobile-builder-viewport="true"] nav[aria-label="Visual Builder fő navigáció"],
        section[data-mobile-builder-viewport="true"] nav[aria-label="Inspector navigáció"]{display:flex!important;overflow-x:auto!important;scrollbar-width:none!important;overscroll-behavior-x:contain}
        section[data-mobile-builder-viewport="true"] nav[aria-label="Visual Builder fő navigáció"]::-webkit-scrollbar,
        section[data-mobile-builder-viewport="true"] nav[aria-label="Inspector navigáció"]::-webkit-scrollbar{display:none}
        section[data-mobile-builder-viewport="true"] nav[aria-label="Visual Builder fő navigáció"] button,
        section[data-mobile-builder-viewport="true"] nav[aria-label="Inspector navigáció"] button{flex:0 0 auto!important;min-height:44px!important}
        section[data-mobile-builder-viewport="true"] input:not([type="checkbox"]),
        section[data-mobile-builder-viewport="true"] select,
        section[data-mobile-builder-viewport="true"] textarea{min-height:44px}
      }
    `}</style>
  </>;
}
