'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

const COMPACT_QUERY='(max-width: 820px)';

function resolveWorkspace(marker:HTMLSpanElement|null){
  const section=marker?.closest<HTMLElement>('section[data-storefront-builder-theme]')??null;
  const workspace=section?.querySelector<HTMLElement>('[data-left-collapsed][data-inspector-open]')??null;
  const leftToggle=section?.querySelector<HTMLButtonElement>('button[title="Bal panel"]')??null;
  const inspectorToggle=section?.querySelector<HTMLButtonElement>('button[title="Inspector"]')??null;
  return{section,workspace,leftToggle,inspectorToggle};
}

export function VisualBuilderMobileWorkspace(){
  const markerRef=useRef<HTMLSpanElement>(null);
  const[drawerOpen,setDrawerOpen]=useState(false);

  const closePanels=useCallback(()=>{
    const{workspace,leftToggle,inspectorToggle}=resolveWorkspace(markerRef.current);
    if(!workspace)return;
    if(workspace.dataset.leftCollapsed==='false')leftToggle?.click();
    if(workspace.dataset.inspectorOpen==='true')inspectorToggle?.click();
  },[]);

  useEffect(()=>{
    const{section,workspace,leftToggle,inspectorToggle}=resolveWorkspace(markerRef.current);
    if(!section||!workspace||!leftToggle||!inspectorToggle)return;
    section.dataset.mobileBuilderWorkspace='true';
    const media=window.matchMedia(COMPACT_QUERY);

    const sync=()=>{
      if(!media.matches){setDrawerOpen(false);return;}
      setDrawerOpen(workspace.dataset.leftCollapsed==='false'||workspace.dataset.inspectorOpen==='true');
    };
    const collapseForCompact=()=>{
      if(!media.matches){sync();return;}
      if(workspace.dataset.leftCollapsed==='false')leftToggle.click();
      if(workspace.dataset.inspectorOpen==='true')inspectorToggle.click();
      window.requestAnimationFrame(sync);
    };
    const onSectionClick=(event:MouseEvent)=>{
      if(!media.matches)return;
      const button=(event.target as Element|null)?.closest<HTMLButtonElement>('button')??null;
      if(button===leftToggle&&workspace.dataset.leftCollapsed==='true'&&workspace.dataset.inspectorOpen==='true')inspectorToggle.click();
      if(button===inspectorToggle&&workspace.dataset.inspectorOpen==='false'&&workspace.dataset.leftCollapsed==='false')leftToggle.click();
    };
    const observer=new MutationObserver(records=>{
      if(media.matches){
        for(const record of records){
          if(record.attributeName==='data-inspector-open'&&workspace.dataset.inspectorOpen==='true'&&workspace.dataset.leftCollapsed==='false')leftToggle.click();
          if(record.attributeName==='data-left-collapsed'&&workspace.dataset.leftCollapsed==='false'&&workspace.dataset.inspectorOpen==='true')inspectorToggle.click();
        }
      }
      window.requestAnimationFrame(sync);
    });
    const onMediaChange=()=>collapseForCompact();
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'&&media.matches)closePanels();};

    observer.observe(workspace,{attributes:true,attributeFilter:['data-left-collapsed','data-inspector-open']});
    section.addEventListener('click',onSectionClick,true);
    media.addEventListener('change',onMediaChange);
    window.addEventListener('keydown',onKeyDown);
    window.requestAnimationFrame(collapseForCompact);

    return()=>{
      observer.disconnect();
      section.removeEventListener('click',onSectionClick,true);
      media.removeEventListener('change',onMediaChange);
      window.removeEventListener('keydown',onKeyDown);
      delete section.dataset.mobileBuilderWorkspace;
    };
  },[closePanels]);

  return <>
    <span ref={markerRef} hidden data-visual-builder-mobile-workspace/>
    {drawerOpen?<button type="button" className="vb-mobile-workspace-scrim" aria-label="Szerkesztőpanel bezárása" onClick={closePanels}/>:null}
    <style>{`
      @media (max-width:820px){
        section[data-mobile-builder-workspace="true"]{position:relative;overflow:hidden}
        section[data-mobile-builder-workspace="true"]>.vb-mobile-workspace-scrim{position:fixed;inset:0;z-index:270;margin:0;padding:0;border:0;background:rgba(19,35,30,.34);backdrop-filter:blur(2px);cursor:pointer}
        section[data-mobile-builder-workspace="true"]>div:last-child{min-height:100dvh!important;grid-template-rows:auto minmax(0,1fr)!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header{grid-template-columns:40px minmax(0,1fr)!important;grid-template-areas:"brand page" "view view" "back actions"!important;gap:6px 8px!important;padding:8px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:first-child{grid-area:brand!important;min-width:40px!important;width:40px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:first-child>span:last-child{display:none!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:first-child>span:first-child{width:40px!important;height:40px!important;border-radius:12px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>a{grid-area:back!important;width:40px!important;min-width:40px!important;height:44px!important;padding:0!important;justify-content:center!important;font-size:0!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>a svg{width:17px!important;height:17px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>label{grid-area:page!important;min-width:0!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>label select{height:44px!important;font-size:13px!important;padding-left:12px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(2){grid-area:view!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important;padding:4px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(2) button{min-width:0!important;height:44px!important;justify-content:center!important;font-size:11px!important;padding:0 8px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3){grid-area:actions!important;justify-self:stretch!important;justify-content:flex-start!important;min-width:0!important;max-width:100%!important;overflow-x:auto!important;overscroll-behavior-x:contain;scrollbar-width:none;padding-bottom:1px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)::-webkit-scrollbar{display:none}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>span{display:none!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button{flex:0 0 auto!important;min-width:44px!important;height:44px!important;font-size:11px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(1),
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(2),
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(3),
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(4),
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(6),
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(7){width:44px!important;padding:0!important;font-size:0!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(5){padding:0 12px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(3)>button:nth-of-type(8){min-width:104px!important;padding:0 14px!important}

        section[data-mobile-builder-workspace="true"] [data-left-collapsed][data-inspector-open]{height:calc(100dvh - 158px)!important;min-height:0!important;overflow:hidden!important;grid-template-columns:1fr!important;position:relative!important}
        section[data-mobile-builder-workspace="true"] [data-left-collapsed][data-inspector-open]>main{min-width:0!important;width:100%!important;padding:30px 10px 72px!important;overflow:auto!important}
        section[data-mobile-builder-workspace="true"] [data-left-collapsed][data-inspector-open]>main [data-builder-node-id] button{min-width:36px;min-height:36px}

        section[data-mobile-builder-workspace="true"] aside[data-collapsed],
        section[data-mobile-builder-workspace="true"] aside[data-open]{position:fixed!important;z-index:280!important;left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto!important;height:min(74dvh,760px)!important;max-height:calc(100dvh - 78px)!important;border:1px solid #d9e4e1!important;border-radius:20px!important;background:#fff!important;box-shadow:0 24px 64px rgba(20,39,33,.24)!important;overflow:hidden!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed][data-collapsed="true"],
        section[data-mobile-builder-workspace="true"] aside[data-open][data-open="false"]{display:none!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed]{display:grid!important;grid-template-rows:auto minmax(0,1fr)!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]{display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important}

        section[data-mobile-builder-workspace="true"] nav[aria-label="Visual Builder fő navigáció"]{display:flex!important;gap:4px!important;overflow-x:auto!important;overscroll-behavior-x:contain;padding:10px!important;scrollbar-width:none;background:#fbfdfc!important;border-bottom:1px solid #d9e4e1!important}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Visual Builder fő navigáció"]::-webkit-scrollbar{display:none}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Visual Builder fő navigáció"] button{flex:0 0 auto!important;min-height:44px!important;padding:0 12px!important;font-size:11px!important;box-shadow:none!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed]>div:last-child{min-height:0!important;overflow:auto!important;padding:16px!important;-webkit-overflow-scrolling:touch}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] input,
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] select,
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] textarea{min-height:46px!important;font-size:13px!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] a[href*="/admin/tartalom/builder?page="]{min-height:54px!important;padding:10px!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] a[href*="/admin/tartalom/builder?page="] strong{font-size:12px!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] a[href*="/admin/tartalom/builder?page="] small{font-size:9px!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed] article button{min-height:42px!important;font-size:11px!important}

        section[data-mobile-builder-workspace="true"] aside[data-open]>div:first-child{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:10px!important;min-height:auto!important;padding:14px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]>div:first-child>div:first-child strong{font-size:13px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]>div:first-child>div:first-child small{font-size:9px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]>div:first-child>div:last-child{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;width:100%!important;padding:4px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]>div:first-child>div:last-child button{min-height:42px!important;font-size:10px!important;padding:0 8px!important}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Inspector navigáció"]{display:flex!important;gap:6px!important;overflow-x:auto!important;overscroll-behavior-x:contain;padding:8px 10px!important;scrollbar-width:none!important}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Inspector navigáció"]::-webkit-scrollbar{display:none}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Inspector navigáció"] button{flex:0 0 auto!important;min-width:108px!important;height:44px!important;font-size:11px!important;padding:0 12px!important;text-overflow:clip!important}
        section[data-mobile-builder-workspace="true"] aside[data-open]>div:last-child{min-height:0!important;overflow:auto!important;padding:14px!important;-webkit-overflow-scrolling:touch}
        section[data-mobile-builder-workspace="true"] aside[data-open] section{padding:14px!important;margin-bottom:12px!important;border-radius:14px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open] section strong{font-size:12px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open] section small{font-size:9px!important;line-height:1.45!important}
        section[data-mobile-builder-workspace="true"] aside[data-open] input:not([type="checkbox"]),
        section[data-mobile-builder-workspace="true"] aside[data-open] select,
        section[data-mobile-builder-workspace="true"] aside[data-open] textarea{min-height:46px!important;font-size:13px!important;padding:10px 11px!important}
        section[data-mobile-builder-workspace="true"] aside[data-open] button{min-height:42px;font-size:11px}
        section[data-mobile-builder-workspace="true"] aside[data-open] section>div:has(>button:nth-child(4)):not(:has(>button:nth-child(5))){grid-template-columns:1fr!important}
      }
      @media (max-width:480px){
        section[data-mobile-builder-workspace="true"]>div:last-child>header{grid-template-columns:38px minmax(0,1fr)!important;padding:7px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:first-child,
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:first-child>span:first-child{width:38px!important;height:38px!important}
        section[data-mobile-builder-workspace="true"]>div:last-child>header>div:nth-of-type(2) button{font-size:10px!important}
        section[data-mobile-builder-workspace="true"] [data-left-collapsed][data-inspector-open]{height:calc(100dvh - 154px)!important}
        section[data-mobile-builder-workspace="true"] aside[data-collapsed],
        section[data-mobile-builder-workspace="true"] aside[data-open]{left:6px!important;right:6px!important;bottom:6px!important;height:min(78dvh,760px)!important;border-radius:18px!important}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Visual Builder fő navigáció"] button{min-height:46px!important}
        section[data-mobile-builder-workspace="true"] nav[aria-label="Inspector navigáció"] button{min-width:112px!important;height:46px!important}
      }
      @media (prefers-reduced-motion:reduce){
        section[data-mobile-builder-workspace="true"] *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}
      }
    `}</style>
  </>;
}
