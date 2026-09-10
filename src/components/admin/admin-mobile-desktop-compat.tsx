'use client';

import {useEffect} from 'react';

const MOBILE_BREAKPOINT=850;
const MAX_TOUCH_DESKTOP_VIEWPORT=1280;
const DESKTOP_CANVAS_WIDTH=1440;

/**
 * Marks the narrow touch-device case where the browser is explicitly exposing
 * a desktop-sized layout viewport (for example Android "Desktop site" mode).
 *
 * Normal mobile remains CSS/media-query driven. In desktop-site mode we keep
 * the real desktop canvas and only expose a compensated viewport height. A
 * phone browser scales the 1440px canvas down from its smaller layout viewport;
 * without the same ratio on height, 100vh would render physically too short.
 */
export function AdminMobileDesktopCompat(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>('.adminGrid');
    if(!root)return;

    const clear=()=>{
      delete root.dataset.desktopSiteTouch;
      root.style.removeProperty('--admin-desktop-site-height');
    };

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

      if(!desktopSiteTouch){
        clear();
        return;
      }

      const widthCompensation=Math.max(1,DESKTOP_CANVAS_WIDTH/layoutWidth);
      const compensatedHeight=Math.ceil(window.innerHeight*widthCompensation);
      root.dataset.desktopSiteTouch='true';
      root.style.setProperty('--admin-desktop-site-height',`${compensatedHeight}px`);
    };

    sync();
    window.addEventListener('resize',sync);
    window.addEventListener('orientationchange',sync);
    return()=>{
      window.removeEventListener('resize',sync);
      window.removeEventListener('orientationchange',sync);
      clear();
    };
  },[]);

  return null;
}
