'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {useAnalytics} from '@/components/analytics/analytics-provider';
import {getStorefrontCookieConsentPreset,type StorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';

const TEMPLATE_VARS=['--shoporation-color-background','--shoporation-color-surface','--shoporation-color-surface-muted','--shoporation-color-text','--shoporation-color-muted-text','--shoporation-color-border','--shoporation-color-primary','--shoporation-color-primary-contrast','--shoporation-color-accent','--shoporation-radius-m','--shoporation-body-font'] as const;

type ResolvedCookieTheme={templateKey:string;preset:StorefrontCookieConsentPreset;style:CSSProperties};

function presetFallbackStyle(preset:StorefrontCookieConsentPreset):CSSProperties{
  return{
    ['--shoporation-color-surface' as string]:preset.fallback.surface,
    ['--shoporation-color-surface-muted' as string]:preset.fallback.surfaceMuted,
    ['--shoporation-color-text' as string]:preset.fallback.text,
    ['--shoporation-color-muted-text' as string]:preset.fallback.mutedText,
    ['--shoporation-color-border' as string]:preset.fallback.border,
    ['--shoporation-color-primary' as string]:preset.fallback.primary,
    ['--shoporation-color-primary-contrast' as string]:preset.fallback.primaryContrast,
    ['--shoporation-color-accent' as string]:preset.fallback.accent,
    maxWidth:preset.maxWidth,
    borderRadius:preset.radius,
    borderWidth:preset.borderWidth,
    boxShadow:preset.shadow,
    backdropFilter:`blur(${preset.backdropBlur})`,
  } as CSSProperties;
}

export function CookieConsent(){
  const{consent,accept,reject}=useAnalytics();
  const[resolved,setResolved]=useState<ResolvedCookieTheme|null>(null);

  useEffect(()=>{
    let frame=0;
    const sync=()=>{
      const sources=[...document.querySelectorAll<HTMLElement>('[data-storefront-template],[data-template-key]')];
      for(const source of sources){
        const templateKey=(source.getAttribute('data-storefront-template')??source.getAttribute('data-template-key')??'').trim();
        const preset=getStorefrontCookieConsentPreset(templateKey);
        if(!preset)continue;
        const computed=getComputedStyle(source),vars:Record<string,string>={};
        for(const name of TEMPLATE_VARS){const value=computed.getPropertyValue(name).trim();if(value)vars[name]=value;}
        setResolved({templateKey,preset,style:{...presetFallbackStyle(preset),...vars} as CSSProperties});
        return true;
      }
      return false;
    };
    if(!sync())frame=requestAnimationFrame(sync);
    const observer=new MutationObserver(()=>{if(sync())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','data-storefront-template','data-template-key']});
    const timer=window.setTimeout(()=>{sync();observer.disconnect()},1600);
    return()=>{if(frame)cancelAnimationFrame(frame);window.clearTimeout(timer);observer.disconnect()};
  },[]);

  if(consent!=='unknown')return null;
  const preset=resolved?.preset;
  return <div
    className="cookieBanner"
    data-template-aware-cookie="true"
    data-cookie-template-key={resolved?.templateKey??'generic'}
    data-cookie-preset={preset?.presetId??'generic-safe-fallback'}
    data-cookie-layout={preset?.layout??'split'}
    data-cookie-align={preset?.align??'center'}
    style={resolved?.style}
    role="dialog"
    aria-live="polite"
    aria-label="Analitikai hozzájárulás"
  >
    <div className="cookieBannerCopy">
      <strong className="cookieBannerTitle" style={preset?{textTransform:preset.titleTransform,letterSpacing:preset.titleLetterSpacing}:undefined}>Segítesz jobbá tenni a webáruházat?</strong>
      <p>Az alap működéshez szükséges technikai tároláson felül csak hozzájárulás után használunk analitikai mérést.</p>
      <Link href="/adatvedelem">Adatkezelési tájékoztató</Link>
    </div>
    <div className="actions"><button type="button" className="btn btnGhost" onClick={reject}>Csak szükséges</button><button type="button" className="btn btnPrimary" onClick={accept}>Analitika engedélyezése</button></div>
  </div>;
}
