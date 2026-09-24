'use client';

import type{CSSProperties}from'react';
import Link from 'next/link';
import {useAnalytics} from '@/components/analytics/analytics-provider';
import {getStorefrontCookieConsentPreset,type StorefrontCookieConsentPreset} from '@/lib/builder/storefront-cookie-consent-presets';
import{useStorefrontSystemSurfaceTheme}from'@/components/storefront/storefront-system-surface-theme';

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
  const theme=useStorefrontSystemSurfaceTheme();
  const preset=theme?getStorefrontCookieConsentPreset(theme.templateKey):null;
  const resolved=theme&&preset?{templateKey:theme.templateKey,preset,style:{...presetFallbackStyle(preset),...theme.style} as CSSProperties}:null;

  if(consent!=='unknown')return null;
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
