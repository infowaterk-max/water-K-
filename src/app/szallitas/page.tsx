import type {Metadata} from 'next';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';
import {formatHuf} from '@/lib/catalog';
import {getCommerceSettings} from '@/lib/commerce/settings';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

export async function generateMetadata():Promise<Metadata>{
  const instance=await getCurrentWebshopInstance(),brand=instance?.brand.name??'Shoperation';
  return{title:'Szállítás',description:`${brand} aktuális szállítási, csomagpont- és átvételi lehetőségei.`,alternates:{canonical:'/szallitas'}};
}

export default async function ShippingPage(){
  const[settings,instance]=await Promise.all([getCommerceSettings(),getCurrentWebshopInstance()]);
  const brand=instance?.brand.name??'Shoperation';
  const parcelPoints=settings.shippingOptions.filter(option=>option.kind==='parcel_point');
  const pickups=settings.shippingOptions.filter(option=>option.kind==='pickup');
  return <StorefrontContentShell pageKey="legal"><main className="section"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span>
    <h1 className="sectionTitle">Szállítás</h1>
    <p className="lead">Az itt megjelenő lehetőségek a webshop aktuálisan aktivált szállítási szolgáltatóiból és díjbeállításaiból származnak.</p>

    <section aria-labelledby="shipping-methods"><h2 id="shipping-methods">Szállítási módok és díjak</h2>
      {settings.shippingOptions.length?<div className="cards">{settings.shippingOptions.map(option=><article className="card" key={option.code}>
        <span className="badge">{option.kind==='parcel_point'?'Csomagpont':option.kind==='home_delivery'?'Házhozszállítás':'Személyes átvétel'}</span>
        <h3>{option.label}</h3>
        <p className="muted">{option.kind==='pickup'?'Díjmentes személyes átvétel.':`Aktuális alapdíj: ${formatHuf(option.fee)}.`}</p>
      </article>)}</div>:<div className="card"><h3>A szállítási módok beállítás alatt állnak</h3><p className="muted">A pénztár csak ténylegesen aktivált szállítási lehetőséget enged kiválasztani.</p></div>}
    </section>

    <div className="splitFeature">
      <section className="featurePanel"><span className="eyebrow">Várható teljesítés</span><h2>Az aktív szolgáltató szerint</h2><p className="muted">A konkrét kézbesítési vagy átvételi információt a rendeléshez elérhető szolgáltató és a rendelés visszaigazolása adja. A webshop nem jelenít meg kitalált általános határidőt.</p></section>
      <section className="featurePanel"><span className="eyebrow">Ingyenes szállítás</span><h2>{settings.freeShippingThreshold>0?`${formatHuf(settings.freeShippingThreshold)} felett`:'Nincs általános küszöb beállítva'}</h2><p className="muted">{settings.freeShippingThreshold>0?'A jogosultságot a pénztár az aktuális kosár és a kiválasztott mód alapján számolja.':'A szállítási díjat az aktív szállítási mód határozza meg.'}</p></section>
    </div>

    <section className="card"><h2>Csomagpont és személyes átvétel</h2>
      <p className="muted">{parcelPoints.length?`Elérhető csomagponti mód: ${parcelPoints.map(option=>option.label).join(' · ')}.`:'Jelenleg nincs aktivált csomagponti mód.'}</p>
      <p className="muted">{pickups.length?`Elérhető személyes átvétel: ${pickups.map(option=>option.label).join(' · ')}.`:'Jelenleg nincs aktivált személyes átvételi mód.'}</p>
    </section>
  </div></main></StorefrontContentShell>;
}
