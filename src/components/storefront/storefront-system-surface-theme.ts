'use client';

import{useEffect,useState,type CSSProperties}from'react';

export const STOREFRONT_SYSTEM_SURFACE_THEME_VARS=Object.freeze([
 '--shoporation-color-background',
 '--shoporation-color-surface',
 '--shoporation-color-surface-muted',
 '--shoporation-color-text',
 '--shoporation-color-muted-text',
 '--shoporation-color-border',
 '--shoporation-color-primary',
 '--shoporation-color-primary-contrast',
 '--shoporation-color-accent',
 '--shoporation-radius-m',
 '--shoporation-radius-l',
 '--shoporation-heading-font',
 '--shoporation-body-font',
] as const);

export type StorefrontSystemSurfaceTheme={
 templateKey:string;
 templateVersion:number|null;
 style:CSSProperties;
};

export function useStorefrontSystemSurfaceTheme(){
 const[theme,setTheme]=useState<StorefrontSystemSurfaceTheme|null>(null);
 useEffect(()=>{
  let frame=0;
  const sync=()=>{
   const sources=[...document.querySelectorAll<HTMLElement>('[data-storefront-template],[data-template-key]')];
   for(const source of sources){
    const templateKey=(source.getAttribute('data-storefront-template')??source.getAttribute('data-template-key')??'').trim();
    if(!templateKey)continue;
    const versionRaw=(source.getAttribute('data-storefront-template-version')??source.getAttribute('data-template-version')??'').trim();
    const versionNumber=versionRaw?Number(versionRaw):NaN;
    const computed=getComputedStyle(source),vars:Record<string,string>={};
    for(const name of STOREFRONT_SYSTEM_SURFACE_THEME_VARS){const value=computed.getPropertyValue(name).trim();if(value)vars[name]=value;}
    setTheme({templateKey,templateVersion:Number.isInteger(versionNumber)&&versionNumber>0?versionNumber:null,style:vars as CSSProperties});
    return true;
   }
   return false;
  };
  if(!sync())frame=requestAnimationFrame(sync);
  const observer=new MutationObserver(()=>{if(sync())observer.disconnect()});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-storefront-template','data-template-key','data-storefront-template-version','data-template-version']});
  const timer=window.setTimeout(()=>{sync();observer.disconnect()},1600);
  return()=>{if(frame)cancelAnimationFrame(frame);window.clearTimeout(timer);observer.disconnect()};
 },[]);
 return theme;
}
