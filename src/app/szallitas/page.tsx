import type {Metadata} from 'next';
import Link from 'next/link';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';
import {RichContent} from '@/components/content/rich-content';
import {TemplateDemoContentNotice} from '@/components/content/template-demo-content-notice';
import {formatHuf} from '@/lib/catalog';
import {getCommerceSettings} from '@/lib/commerce/settings';
import {getPublicPageBySlug} from '@/lib/content/server';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

export async function generateMetadata():Promise<Metadata>{
  const [instance,item]=await Promise.all([getCurrentWebshopInstance(),getPublicPageBySlug('szallitas')]);
  const brand=instance?.brand.name??'Shoperation';
  return{
    title:item?.seoTitle??item?.title??'Szállítás',
    description:item?.seoDescription??item?.excerpt??`${brand} aktív szállítási módjai, díjai és kézbesítési információi.`,
    alternates:{canonical:'/szallitas'},
  };
}

export default async function ShippingPage(){
  const [settings,instance,item]=await Promise.all([getCommerceSettings(),getCurrentWebshopInstance(),getPublicPageBySlug('szallitas')]);
  const brand=instance?.brand.name??'Shoperation';
  if(item)return <StorefrontContentShell pageKey="legal"><main className="section contentPage"><div className="shell">{item.templateDemoState==='fixture'?<TemplateDemoContentNotice/>:null}<span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">{item.title}</h1>{item.excerpt&&<p className="lead">{item.excerpt}</p>}<section className="card"><RichContent body={item.body}/></section><div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/fizetes">Fizetési információk</Link></div></div></main></StorefrontContentShell>;
  return <StorefrontContentShell pageKey="legal"><main className="section contentPage systemInfoPage" data-system-info-page="shipping"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Szállítás</h1>
    <p className="lead">Az itt látható lehetőségek a webshop jelenleg aktív szállítási beállításaiból származnak.</p>
    <div className="systemInfoStack">
      {settings.shippingOptions.length?<div className="cards">{settings.shippingOptions.map(option=><article className="card" key={option.code}><span className="badge">{option.kind==='parcel_point'?'Csomagpont':option.kind==='home_delivery'?'Házhozszállítás':option.kind==='pickup'?'Személyes átvétel':'Szállítás'}</span><h2>{option.label}</h2><p className="muted">{option.kind==='pickup'?'A személyes átvételhez nem számítunk fel szállítási díjat.':`Alap szállítási díj: ${formatHuf(option.fee)}.`}</p></article>)}</div>:<div className="card"><h2>A szállítási módok beállítás alatt állnak</h2><p className="muted">A pénztár csak ténylegesen aktivált és elérhető szállítási lehetőségeket ajánl fel.</p></div>}
      <section className="featurePanel"><span className="eyebrow">Díjmentes szállítás</span><h2>{settings.freeShippingThreshold>0?`${formatHuf(settings.freeShippingThreshold)} felett`:'Nincs általános értékhatár beállítva'}</h2><p className="muted">{settings.freeShippingThreshold>0?'A rendszer a jogosult rendeléseknél automatikusan alkalmazza a díjmentes szállítást.':'A fizetendő szállítási díjat a pénztárban kiválasztott aktív szállítási mód határozza meg.'}</p></section>
      <section className="featurePanel systemInfoGuide"><span className="eyebrow">Hogyan működik?</span><h2>A végleges lehetőséget mindig a pénztár mutatja.</h2><div className="cards"><article className="card"><span className="badge">1</span><h3>Rendelési adatok</h3><p className="muted">Add meg pontosan a kézbesítéshez szükséges adatokat.</p></article><article className="card"><span className="badge">2</span><h3>Elérhető módok</h3><p className="muted">A pénztár csak az adott rendeléshez használható, aktív szállítási módokat kínálja fel.</p></article><article className="card"><span className="badge">3</span><h3>Díj ellenőrzése</h3><p className="muted">A végleges szállítási díjat még a rendelés elküldése előtt látod.</p></article></div></section>
      <section className="card"><h2>Rendelés után</h2><p className="muted">A kiválasztott szállítási mód a rendelési adatok között is megjelenik. Ha az adott szolgáltató nyomkövetési adatot biztosít, azt a fiókod rendelési nézetében érheted el.</p></section>
    </div>
    <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/fizetes">Fizetési információk</Link></div>
  </div></main></StorefrontContentShell>;
}
