import type { Metadata } from 'next';
import { PlatformAuthForm } from '@/components/auth/platform-auth-form';

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
      <PlatformAuthForm/>
    </div>
  </main>;
}
