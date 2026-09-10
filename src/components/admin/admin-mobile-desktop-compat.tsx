'use client';

import {useEffect} from 'react';

const MOBILE_BREAKPOINT=850;
const MAX_DESKTOP_SITE_LAYOUT_WIDTH=1280;
const MIN_TOUCH_DPR=1.25;
const FALLBACK_MOBILE_WIDTH=430;

function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value));}

export function AdminMobileDesktopCompat(){
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>('.adminGrid');
    if(!root)return;

    const sync=()=>{
      const layoutWidth=window.innerWidth;
      const visual=window.visualViewport;
      const dpr=Math.max(1,window.devicePixelRatio||1);
      const primaryCoarse=window.matchMedia('(pointer: coarse)').matches;
      const anyCoarse=window.matchMedia('(any-pointer: coarse)').matches;
      const touchCapable=(navigator.maxTouchPoints??0)>0||primaryCoarse||anyCoarse||('ontouchstart'in window);
      const densitySignal=dpr>=MIN_TOUCH_DPR;
      const scaledVisualSignal=Boolean(visual&&visual.scale>0&&visual.scale<0.98);
      const desktopSiteTouch=touchCapable
        &&layoutWidth>MOBILE_BREAKPOINT
        &&layoutWidth<=MAX_DESKTOP_SITE_LAYOUT_WIDTH
        &&(primaryCoarse||anyCoarse||densitySignal||scaledVisualSignal);

      if(!desktopSiteTouch){
        delete root.dataset.mobileDesktopCompat;
        root.style.removeProperty('--admin-mobile-desktop-width');
        root.style.removeProperty('--admin-mobile-desktop-height');
        root.style.removeProperty('--admin-mobile-desktop-scale');
        return;
      }

      const widthFromDensity=dpr>1?layoutWidth/dpr:0;
      const widthFromVisual=visual&&visual.scale>0&&visual.scale<0.98?visual.width*visual.scale:0;
      const estimated=[widthFromDensity,widthFromVisual]
        .filter(value=>Number.isFinite(value)&&value>=280&&value<=560)
        .sort((a,b)=>a-b)[0]??FALLBACK_MOBILE_WIDTH;
      const mobileWidth=clamp(Math.round(estimated),360,480);
      const scale=layoutWidth/mobileWidth;
      const mobileHeight=Math.max(1,Math.round(window.innerHeight/scale));

      root.dataset.mobileDesktopCompat='true';
      root.style.setProperty('--admin-mobile-desktop-width',`${mobileWidth}px`);
      root.style.setProperty('--admin-mobile-desktop-height',`${mobileHeight}px`);
      root.style.setProperty('--admin-mobile-desktop-scale',String(scale));
    };

    sync();
    window.addEventListener('resize',sync);
    window.addEventListener('orientationchange',sync);
    window.visualViewport?.addEventListener('resize',sync);
    return()=>{
      window.removeEventListener('resize',sync);
      window.removeEventListener('orientationchange',sync);
      window.visualViewport?.removeEventListener('resize',sync);
      delete root.dataset.mobileDesktopCompat;
      root.style.removeProperty('--admin-mobile-desktop-width');
      root.style.removeProperty('--admin-mobile-desktop-height');
      root.style.removeProperty('--admin-mobile-desktop-scale');
    };
  },[]);

  return null;
}
