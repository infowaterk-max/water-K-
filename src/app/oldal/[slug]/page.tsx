import type{Metadata}from'next';
import Link from'next/link';
import{notFound}from'next/navigation';
import{getPublicPageBySlug}from'@/lib/content/server';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{getCommerceSettings}from'@/lib/commerce/settings';
import{formatHuf}from'@/lib/catalog';
import{RichContent}from'@/components/content/rich-content';
import{TemplateDemoContentNotice}from'@/components/content/template-demo-content-notice';
import{StorefrontContentShell}from'@/components/content/storefront-content-shell';

export const dynamic='force-dynamic';

const SYSTEM_INFO:Record<string,{title:string;description:string}>={
  szallitas:{title:'Szállítás',description:'Aktív szállítási módok, díjak és kézbesítési információk.'},
  fizetes:{title:'Fizetés',description:'Aktív fizetési módok és a rendelés fizetési folyamata.'},
  visszakuldes:{title:'Visszaküldés',description:'Visszaküldési tájékoztató és vásárlói ügyintézés.'},
};

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const{slug}=await params,item=await getPublicPageBySlug(slug);
 if(item)return{title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,alternates:{canonical:`/oldal/${item.slug}`},openGraph:{type:'website',title:item.seoTitle??item.title,description:item.seoDescription??item.excerpt??undefined,url:`/oldal/${item.slug}`}};
 const system=SYSTEM_INFO[slug];
 return system?{title:system.title,description:system.description,alternates:{canonical:`/oldal/${slug}`}}:{};
}

function SystemInfoPage({slug,brand,settings}:{slug:string;brand:string;settings:Awaited<ReturnType<typeof getCommerceSettings>>}){
 if(slug==='szallitas'){
  return <main className="section contentPage systemInfoPage" data-system-info-page="shipping"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Szállítás</h1>
    <p className="lead">Az itt látható lehetőségek a webshop jelenleg aktív szállítási beállításaiból származnak.</p>
    <div className="systemInfoStack">
      {settings.shippingOptions.length?<div className="cards">{settings.shippingOptions.map(option=><article className="card" key={option.code}><span className="badge">{option.kind==='parcel_point'?'Csomagpont':option.kind==='home_delivery'?'Házhozszállítás':option.kind==='pickup'?'Személyes átvétel':'Szállítás'}</span><h2>{option.label}</h2><p className="muted">{option.kind==='pickup'?'A személyes átvételhez nem számítunk fel szállítási díjat.':`Alap szállítási díj: ${formatHuf(option.fee)}.`}</p></article>)}</div>:<div className="card"><h2>A szállítási módok beállítás alatt állnak</h2><p className="muted">A pénztár csak ténylegesen aktivált és elérhető szállítási lehetőségeket ajánl fel.</p></div>}
      <section className="featurePanel"><span className="eyebrow">Díjmentes szállítás</span><h2>{settings.freeShippingThreshold>0?`${formatHuf(settings.freeShippingThreshold)} felett`:'Nincs általános értékhatár beállítva'}</h2><p className="muted">{settings.freeShippingThreshold>0?'A rendszer a jogosult rendeléseknél automatikusan alkalmazza a díjmentes szállítást.':'A fizetendő szállítási díjat a pénztárban kiválasztott aktív szállítási mód határozza meg.'}</p></section>
      <section className="featurePanel systemInfoGuide"><span className="eyebrow">Hogyan működik?</span><h2>A végleges lehetőséget mindig a pénztár mutatja.</h2><div className="cards"><article className="card"><span className="badge">1</span><h3>Rendelési adatok</h3><p className="muted">Add meg pontosan a kézbesítéshez szükséges adatokat.</p></article><article className="card"><span className="badge">2</span><h3>Elérhető módok</h3><p className="muted">A pénztár csak az adott rendeléshez használható, aktív szállítási módokat kínálja fel.</p></article><article className="card"><span className="badge">3</span><h3>Díj ellenőrzése</h3><p className="muted">A végleges szállítási díjat még a rendelés elküldése előtt látod.</p></article></div></section>
      <section className="card"><h2>Rendelés után</h2><p className="muted">A kiválasztott szállítási mód a rendelési adatok között is megjelenik. Ha az adott szolgáltató nyomkövetési adatot biztosít, azt a fiókod rendelési nézetében érheted el.</p></section>
    </div>
    <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás</Link><Link className="btn btnGhost" href="/oldal/fizetes">Fizetési információk</Link></div>
  </div></main>;
 }
 if(slug==='fizetes'){
  return <main className="section contentPage systemInfoPage" data-system-info-page="payment"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Fizetés</h1><p className="lead">Csak azok a fizetési módok jelennek meg, amelyek ennél a webshopnál ténylegesen aktívak és konfiguráltak.</p>
    {settings.paymentOptions.length?<div className="cards">{settings.paymentOptions.map(option=><article className="card" key={option.code}><span className="badge">Aktív fizetési mód</span><h2>{option.label}</h2></article>)}</div>:<div className="card"><h2>A fizetési módok beállítás alatt állnak</h2><p className="muted">A pénztár nem kínál fel nem konfigurált fizetési szolgáltatást.</p></div>}
    <div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás</Link><Link className="btn btnGhost" href="/oldal/szallitas">Szállítási információk</Link></div>
  </div></main>;
 }
 return <main className="section contentPage systemInfoPage" data-system-info-page="returns"><div className="shell">
   <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Visszaküldés</h1>
   <p className="lead">A konkrét rendeléshez tartozó visszaküldést bejelentkezés után, a vásárlói fiókban lehet elindítani és követni.</p>
   <section className="card"><h2>Rendeléshez kapcsolódó ügyintézés</h2><p className="muted">Nyisd meg a visszaküldési központot, válaszd ki az érintett rendelést és kövesd a megjelenő lépéseket.</p><div className="actions"><Link className="btn btnPrimary" href="/fiokom/visszakuldes">Visszaküldési központ</Link><Link className="btn btnGhost" href="/kapcsolat">Kapcsolat</Link></div></section>
  </div></main>;
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
 const{slug}=await params,item=await getPublicPageBySlug(slug);
 const instance=await getCurrentWebshopInstance(),base=(instance?.brand.publicSiteUrl??process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000').replace(/\/$/,''),brandName=instance?.brand.name??'Webáruház';
 if(!item){
  if(!SYSTEM_INFO[slug])notFound();
  const settings=await getCommerceSettings();
  return <StorefrontContentShell><SystemInfoPage slug={slug} brand={brandName} settings={settings}/></StorefrontContentShell>;
 }
 const structured={'@context':'https://schema.org','@type':'WebPage',name:item.title,description:item.seoDescription??item.excerpt??undefined,url:`${base}/oldal/${item.slug}`,dateModified:item.updatedAt,isPartOf:{'@type':'WebSite',name:brandName,url:base}};
 const content=item.kind==='landing'?<><section className="hero"><div className="shell">{item.templateDemoState==='fixture'?<TemplateDemoContentNotice/>:null}<span className="eyebrow">{item.title}</span><h1>{item.heroTitle??item.title}</h1>{(item.heroSubtitle??item.excerpt)&&<p className="lead">{item.heroSubtitle??item.excerpt}</p>}{item.ctaLabel&&item.ctaHref&&<Link className="btn btnPrimary" href={item.ctaHref}>{item.ctaLabel}</Link>}</div></section><section className="section"><div className="shell"><div className="featurePanel"><RichContent body={item.body}/></div></div></section></>:<section className="section contentPage"><div className="shell">{item.templateDemoState==='fixture'?<TemplateDemoContentNotice/>:null}<span className="eyebrow">Információ</span><h1 className="sectionTitle">{item.title}</h1>{item.excerpt&&<p className="lead">{item.excerpt}</p>}<section className="card"><RichContent body={item.body}/></section></div></section>;
 return <StorefrontContentShell><main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured)}}/>{content}</main></StorefrontContentShell>;
}
