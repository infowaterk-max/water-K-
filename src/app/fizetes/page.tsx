import type {Metadata} from 'next';
import Link from 'next/link';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';
import {RichContent} from '@/components/content/rich-content';
import {TemplateDemoContentNotice} from '@/components/content/template-demo-content-notice';
import {getCommerceSettings} from '@/lib/commerce/settings';
import {getPublicPageBySlug} from '@/lib/content/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

export async function generateMetadata():Promise<Metadata>{
  const [instance,item]=await Promise.all([getCurrentWebshopInstance(),getPublicPageBySlug('fizetes')]);
  const brand=instance?.brand.name??'Shoperation';
  return{
    title:item?.seoTitle??item?.title??'Fizetés',
    description:item?.seoDescription??item?.excerpt??`${brand} aktív fizetési módjai és a rendelés fizetési folyamata.`,
    alternates:{canonical:'/fizetes'},
  };
}

export default async function PaymentPage(){
  const [settings,instance,item]=await Promise.all([getCommerceSettings(),getCurrentWebshopInstance(),getPublicPageBySlug('fizetes')]);
  const brand=instance?.brand.name??'Shoperation';
  if(item)return <StorefrontContentShell pageKey="legal"><main className="section contentPage"><div className="shell">{item.templateDemoState==='fixture'?<TemplateDemoContentNotice/>:null}<span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">{item.title}</h1>{item.excerpt&&<p className="lead">{item.excerpt}</p>}<section className="card"><RichContent body={item.body}/></section><div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/szallitas">Szállítási információk</Link></div></div></main></StorefrontContentShell>;
  return <StorefrontContentShell pageKey="legal"><main className="section contentPage systemInfoPage" data-system-info-page="payment"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Fizetés</h1>
    <p className="lead">Csak azok a fizetési módok jelennek meg, amelyek ennél a webshopnál ténylegesen aktívak és konfiguráltak.</p>
    <div className="systemInfoStack">
      {settings.paymentOptions.length?<div className="cards">{settings.paymentOptions.map(option=><article className="card" key={option.code}><span className="badge">Aktív fizetési mód</span><h2>{option.label}</h2><p className="muted">{option.flow==='bank_transfer'?'A rendelés véglegesítése után a webshop az átutaláshoz szükséges információkat adja meg.':option.flow==='cash_on_delivery'?'A fizetés a rendelés átvételéhez kapcsolódik.':'A fizetés biztonságos online fizetési folyamatban történik; a pénztár jelzi a következő lépést.'}</p></article>)}</div>:<div className="card"><h2>A fizetési módok beállítás alatt állnak</h2><p className="muted">A pénztár csak ténylegesen aktivált és használható fizetési módokat jelenít meg.</p></div>}
      <section className="featurePanel systemInfoGuide"><span className="eyebrow">Hogyan működik?</span><h2>A pénztár mindig az aktív lehetőségeket mutatja.</h2><div className="cards"><article className="card"><span className="badge">1</span><h3>Fizetési mód kiválasztása</h3><p className="muted">A rendelésnél válassz a webshophoz ténylegesen engedélyezett fizetési módok közül.</p></article><article className="card"><span className="badge">2</span><h3>Végösszeg ellenőrzése</h3><p className="muted">A fizetés előtt ellenőrizheted a rendelés végleges összegét és a kapcsolódó díjakat.</p></article><article className="card"><span className="badge">3</span><h3>Visszaigazolás</h3><p className="muted">A rendelés elküldése után a kiválasztott fizetési módnak megfelelő következő lépést és visszaigazolást kapod.</p></article></div></section>
      <section className="card"><h2>Véglegesítés</h2><p className="muted">A véglegesítés előtt újra ellenőrizzük az árat, az elérhető készletet és a választható szolgáltatásokat.</p></section>
      <section className="card"><h2>Rendelés után</h2><p className="muted">A kiválasztott fizetési mód a rendelés adatai között is megjelenik. A fizetés állapotát és a rendeléshez tartozó dokumentumokat a fiókodban követheted, amikor azok elérhetővé válnak.</p></section>
    </div>
    <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/szallitas">Szállítási információk</Link></div>
  </div></main></StorefrontContentShell>;
}
