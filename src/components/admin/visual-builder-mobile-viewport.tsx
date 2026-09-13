'use client';

import {useEffect,useRef} from 'react';

const COMPACT_QUERY='(max-width: 820px)';

function findBuilderSection(marker:HTMLSpanElement|null){
  return marker?.closest<HTMLElement>('section[data-storefront-builder-theme]')??null;
}

function findViewportButton(section:HTMLElement,label:'Desktop'|'Tablet'|'Mobil'){
  return Array.from(section.querySelectorAll<HTMLButtonElement>('button')).find(button=>button.textContent?.trim()===label)??null;
}

export function VisualBuilderMobileViewport(){
  const markerRef=useRef<HTMLSpanElement>(null);
  const compactActivatedRef=useRef(false);

  useEffect(()=>{
    const section=findBuilderSection(markerRef.current);
    if(!section)return;
    section.dataset.mobileBuilderViewport='true';
    const media=window.matchMedia(COMPACT_QUERY);

    const sync=()=>{
      if(!media.matches){compactActivatedRef.current=false;return;}
      if(compactActivatedRef.current)return;
      compactActivatedRef.current=true;
      const mobileButton=findViewportButton(section,'Mobil');
      if(mobileButton&&mobileButton.getAttribute('data-active')!=='true')mobileButton.click();
    };

    media.addEventListener('change',sync);
    window.requestAnimationFrame(sync);
    return()=>{
      media.removeEventListener('change',sync);
      delete section.dataset.mobileBuilderViewport;
    };
  },[]);

  return <>
    <span ref={markerRef} hidden data-visual-builder-mobile-viewport/>
    <style>{`
      @media (max-width:820px){
        section[data-mobile-builder-viewport="true"] [data-viewport="mobile"]{
          width:min(100%,390px)!important;
          max-width:390px!important;
          transform:scale(1)!important;
          transform-origin:top center!important;
          margin-inline:auto!important;
        }
        section[data-mobile-builder-viewport="true"] [data-viewport="mobile"] [data-builder-node-id]{touch-action:manipulation}
      }
    `}</style>
  </>;
}
