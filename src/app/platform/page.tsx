import type {Metadata} from 'next';
import Link from 'next/link';
import {PlatformActivationForm} from '@/lib/auth/platform-activation-form';
import {workforceLoginHref} from '@/lib/auth/workforce-return-target';

export const metadata:Metadata={
  title:'Shoperation Platform',
  description:'Rendszerszintű Shoperation belépés.',
  robots:{index:false,follow:false},
};

export default function PlatformPage(){
  return <main className="section accountPage">
    <div className="shell">
      <span className="eyebrow">Shoperation Platform</span>
      <h1 className="sectionTitle">Rendszerszintű belépés</h1>
      <p className="lead">Ez a felület a Shoperation tulajdonosainak és platformszintű üzemeltetőinek készült. Webshop-vásárlói fiókokhoz használd a Fiókom oldalt.</p>
      <section className="card">
        <h2>Már van workforce fiókod?</h2>
        <p className="muted">A platform-, admin- és staff belépés ugyanazt a canonical workforce hitelesítési folyamatot használja.</p>
        <Link className="btn btnPrimary" href={workforceLoginHref('/admin/platform')}>Staff / admin belépés</Link>
      </section>
      <PlatformActivationForm/>
    </div>
  </main>;
}
