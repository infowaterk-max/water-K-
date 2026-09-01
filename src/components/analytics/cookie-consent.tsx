'use client';

import Link from 'next/link';
import { useAnalytics } from '@/components/analytics/analytics-provider';

export function CookieConsent(){
  const {consent,accept,reject}=useAnalytics();
  if(consent!=='unknown')return null;
  return <div className="cookieBanner" role="dialog" aria-live="polite" aria-label="Analitikai hozzájárulás">
    <div><strong>Segítesz jobbá tenni a webáruházat?</strong><p>Az alap működéshez szükséges technikai tároláson felül csak hozzájárulás után használunk analitikai mérést.</p><Link href="/adatvedelem">Adatkezelési tájékoztató</Link></div>
    <div className="actions"><button type="button" className="btn btnGhost" onClick={reject}>Csak szükséges</button><button type="button" className="btn btnPrimary" onClick={accept}>Analitika engedélyezése</button></div>
  </div>;
}
