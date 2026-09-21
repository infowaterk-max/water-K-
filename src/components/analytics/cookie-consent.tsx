'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import { useAnalytics } from '@/components/analytics/analytics-provider';

const TEMPLATE_VARS=['--shoporation-color-background','--shoporation-color-surface','--shoporation-color-surface-muted','--shoporation-color-text','--shoporation-color-muted-text','--shoporation-color-border','--shoporation-color-primary','--shoporation-color-primary-contrast','--shoporation-color-accent','--shoporation-radius-m','--shoporation-body-font'] as const;

export function CookieConsent(){
  const {consent,accept,reject}=useAnalytics();
  const[templateStyle,setTemplateStyle]=useState<CSSProperties|undefined>();
  useEffect(()=>{
    let frame=0;
    const sync=()=>{
      const sources=[...document.querySelectorAll<HTMLElement>('[data-storefront-template]')];
      for(const source of sources){
        const computed=getComputedStyle(source),vars:Record<string,string>={};
        for(const name of TEMPLATE_VARS){const value=computed.getPropertyValue(name).trim();if(value)vars[name]=value;}
        if(vars['--shoporation-color-surface']&&vars['--shoporation-color-text']){
          setTemplateStyle(vars as CSSProperties);
          return true;
        }
      }
      return false;
    };
    if(!sync())frame=requestAnimationFrame(sync);
    const observer=new MutationObserver(()=>{if(sync())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-storefront-template']});
    const timer=window.setTimeout(()=>{sync();observer.disconnect()},1200);
    return()=>{if(frame)cancelAnimationFrame(frame);window.clearTimeout(timer);observer.disconnect()};
  },[]);
  if(consent!=='unknown')return null;
  return <div className="cookieBanner" data-template-aware-cookie="true" style={templateStyle} role="dialog" aria-live="polite" aria-label="Analitikai hozzájárulás">
    <div><strong>Segítesz jobbá tenni a webáruházat?</strong><p>Az alap működéshez szükséges technikai tároláson felül csak hozzájárulás után használunk analitikai mérést.</p><Link href="/adatvedelem">Adatkezelési tájékoztató</Link></div>
    <div className="actions"><button type="button" className="btn btnGhost" onClick={reject}>Csak szükséges</button><button type="button" className="btn btnPrimary" onClick={accept}>Analitika engedélyezése</button></div>
  </div>;
}
