'use client';

import {useEffect} from 'react';

const MOBILE_BREAKPOINT=850;
const MAX_TOUCH_DESKTOP_VIEWPORT=1280;

/**
 * Marks the narrow touch-device case where the browser is explicitly exposing
 * a desktop-sized layout viewport (for example Android "Desktop site" mode).
 *
 * Important: this component does not resize, zoom or counter-scale the app.
 * Normal mobile remains CSS/media-query driven. The marker is only used to
 * preserve the real desktop workspace when a touch browser asks for desktop.
 */
export function AdminMobileDesktopCompat(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>('.adminGrid');
    if(!root)return;

    const sync=()=>{
      const layoutWidth=window.innerWidth;
      const primaryCoarse=window.matchMedia('(pointer: coarse)').matches;
      const anyCoarse=window.matchMedia('(any-pointer: coarse)').matches;
      const noHover=window.matchMedia('(hover: none)').matches;
      const touchCapable=(navigator.maxTouchPoints??0)>0||primaryCoarse||anyCoarse||('ontouchstart'in window);
      const desktopSiteTouch=touchCapable
        &&layoutWidth>MOBILE_BREAKPOINT
        &&layoutWidth<=MAX_TOUCH_DESKTOP_VIEWPORT
        &&(primaryCoarse||anyCoarse||noHover);

      if(desktopSiteTouch)root.dataset.desktopSiteTouch='true';
      else delete root.dataset.desktopSiteTouch;
    };

    sync();
    window.addEventListener('resize',sync);
    window.addEventListener('orientationchange',sync);
    return()=>{
      window.removeEventListener('resize',sync);
      window.removeEventListener('orientationchange',sync);
      delete root.dataset.desktopSiteTouch;
    };
  },[]);

  return null;
}
