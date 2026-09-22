import type { Metadata } from 'next';
import Link from 'next/link';
import { formatHuf } from '@/lib/catalog';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export async function generateMetadata():Promise<Metadata>{const instance=await getCurrentWebshopInstance(),brand=instance?.brand.name??'Shoperation';return{title:'Szállítás és fizetés',description:`${brand} szállítási és fizetési lehetőségei és rendelési folyamata.`,alternates:{canonical:'/szallitas-es-fizetes'}}}

export default async function ShippingPaymentPage(){
 const [settings,instance]=await Promise.all([getCommerceSettings(),getCurrentWebshopInstance()]);
 const brand=instance?.brand.name??'Shoperation';
 return <main className="section"><div className="shell"><span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Szállítás és fizetés</h1><p className="lead">Az itt megjelenő lehetőségek az adott webáruház aktív szolgáltatói beállításaiból származnak.</p>
  {settings.shippingOptions.length?<div className="cards">{settings.shippingOptions.map(option=><article className="card" key={option.code}><span className="badge">{option.kind==='parcel_point'?'Csomagpont':option.kind==='home_delivery'?'Házhozszállítás':'Átvétel'}</span><h2>{option.label}</h2><p className="muted">{option.kind==='pickup'?'Személyes átvétel díjmentesen.':`Alap szállítási díj: ${formatHuf(option.fee)}.`}</p></article>)}</div>:<div className="card"><h2>A szállítási módok beállítás alatt állnak</h2><p className="muted">A pénztár csak ténylegesen aktivált szállítási lehetőségeket jelenít meg.</p></div>}
  <div className="splitFeature"><section className="featurePanel"><span className="eyebrow">Díjmentes szállítás</span><h2>{settings.freeShippingThreshold>0?`${formatHuf(settings.freeShippingThreshold)} felett`:'Nincs általános küszöb beállítva'}</h2><p className="muted">{settings.freeShippingThreshold>0?'A rendszer automatikusan alkalmazza a díjmentes szállítást a jogosult rendelésekre.':'A szállítási díjat a kiválasztott aktív szállítási mód határozza meg.'}</p></section><section className="featurePanel"><span className="eyebrow">Fizetés</span><h2>{settings.paymentOptions.length?settings.paymentOptions.map(option=>option.label).join(' · '):'Beállítás alatt'}</h2><p className="muted">Csak azok a fizetési módok jelennek meg a pénztárban, amelyek ehhez a webáruházhoz ténylegesen aktiválva és konfigurálva vannak.</p></section></div>
  <div className="card"><h2>Rendelési folyamat</h2><ol className="featureList"><li>Termék kiválasztása és kosárba helyezése.</li><li>Szállítási, számlázási és fizetési adatok megadása.</li><li>A véglegesítés előtt újra ellenőrizzük az árat, az elérhető készletet és a választható szolgáltatásokat.</li><li>A rendelés rögzítése után visszaigazolást kapsz, és megkezdjük a fizetéshez, számlázáshoz és szállításhoz tartozó feldolgozást.</li></ol><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás indítása</Link></div>
 </div></main>;
}
