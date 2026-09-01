'use client';

import Script from 'next/script';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Consent='unknown'|'accepted'|'rejected';
type AnalyticsContextValue={consent:Consent;accept:()=>void;reject:()=>void;track:(event:string,params?:Record<string,string|number|boolean>)=>void};
const AnalyticsContext=createContext<AnalyticsContextValue|null>(null);
const STORAGE_KEY='shoperation-analytics-consent';

export function AnalyticsProvider({children}:{children:React.ReactNode}){
  const [consent,setConsent]=useState<Consent>('unknown');
  const measurementId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  useEffect(()=>{const stored=localStorage.getItem(STORAGE_KEY);if(stored==='accepted'||stored==='rejected')setConsent(stored)},[]);
  const api=useMemo<AnalyticsContextValue>(()=>({
    consent,
    accept(){localStorage.setItem(STORAGE_KEY,'accepted');setConsent('accepted')},
    reject(){localStorage.setItem(STORAGE_KEY,'rejected');setConsent('rejected')},
    track(event,params={}){if(consent!=='accepted')return;const w=window as typeof window & {gtag?:(...args:unknown[])=>void};w.gtag?.('event',event,params)},
  }),[consent]);
  return <AnalyticsContext.Provider value={api}>
    {measurementId&&consent==='accepted'&&<><Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive"/><Script id="shoperation-ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`}</Script></>}
    {children}
  </AnalyticsContext.Provider>;
}

export function useAnalytics(){const value=useContext(AnalyticsContext);if(!value)throw new Error('useAnalytics must be used within AnalyticsProvider');return value}
