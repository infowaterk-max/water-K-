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
  rolunk:{title:'Rólunk',description:'A webshop bemutatkozó információinak helye.'},
  fenntarthatosag:{title:'Fenntarthatóság',description:'A kereskedő által közzétett fenntarthatósági információk helye.'},
  karrier:{title:'Karrier',description:'A kereskedő által közzétett karrierinformációk helye.'},
};

const EDITORIAL_INFO:Record<string,{title:string;lead:string;body:string}>={
 rolunk:{title:'Rólunk',lead:'A webshop bemutatkozó tartalma még nincs közzétéve.',body:'A kereskedő a Tartalom és SEO modulban teheti közzé a saját történetét, csapatát és bemutatkozó információit. Addig ezen az oldalon nem jelenítünk meg kitalált céges állításokat.'},
 fenntarthatosag:{title:'Fenntarthatóság',lead:'Jelenleg nincs közzétett fenntarthatósági tájékoztató.',body:'Konkrét vállalást, minősítést vagy környezeti állítást csak a kereskedő által jóváhagyott tartalomból jelenítünk meg.'},
 karrier:{title:'Karrier',lead:'Jelenleg nincs közzétett karrierinformáció.',body:'Nyitott pozíciót vagy jelentkezési lehetőséget csak akkor jelenítünk meg, ha azt a kereskedő ténylegesen közzétette.'},
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
    <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/oldal/fizetes">Fizetési információk</Link></div>
  </div></main>;
 }
 if(slug==='fizetes'){
  return <main className="section contentPage systemInfoPage" data-system-info-page="payment"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Fizetés</h1><p className="lead">Csak azok a fizetési módok jelennek meg, amelyek ennél a webshopnál ténylegesen aktívak és konfiguráltak.</p>
    <div className="systemInfoStack">
      {settings.paymentOptions.length?<div className="cards">{settings.paymentOptions.map(option=><article className="card" key={option.code}><span className="badge">Aktív fizetési mód</span><h2>{option.label}</h2><p className="muted">{option.flow==='bank_transfer'?'A rendelés véglegesítése után a webshop az átutaláshoz szükséges információkat adja meg.':option.flow==='cash_on_delivery'?'A fizetés a rendelés átvételéhez kapcsolódik.':'A fizetés biztonságos online fizetési folyamatban történik; a pénztár jelzi a következő lépést.'}</p></article>)}</div>:<div className="card"><h2>A fizetési módok beállítás alatt állnak</h2><p className="muted">A pénztár nem kínál fel nem konfigurált fizetési szolgáltatást.</p></div>}
      <section className="featurePanel systemInfoGuide"><span className="eyebrow">Hogyan működik?</span><h2>A pénztár mindig az aktív lehetőségeket mutatja.</h2><div className="cards"><article className="card"><span className="badge">1</span><h3>Fizetési mód kiválasztása</h3><p className="muted">A rendelésnél válassz a webshophoz ténylegesen engedélyezett fizetési módok közül.</p></article><article className="card"><span className="badge">2</span><h3>Végösszeg ellenőrzése</h3><p className="muted">A fizetés előtt ellenőrizheted a rendelés végleges összegét és a kapcsolódó díjakat.</p></article><article className="card"><span className="badge">3</span><h3>Visszaigazolás</h3><p className="muted">A rendelés elküldése után a kiválasztott fizetési módnak megfelelő következő lépést és visszaigazolást kapod.</p></article></div></section>
      <section className="card"><h2>Rendelés után</h2><p className="muted">A kiválasztott fizetési mód a rendelés adatai között is megjelenik. A fizetés állapotát és a rendeléshez tartozó dokumentumokat a fiókodban követheted, amikor azok elérhetővé válnak.</p></section>
    </div>
    <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/oldal/szallitas">Szállítási információk</Link></div>
  </div></main>;
 }
 if(slug==='visszakuldes')return <main className="section contentPage systemInfoPage" data-system-info-page="returns"><div className="shell">
   <span className="eyebrow">{brand} · vásárlási információk</span><h1 className="sectionTitle">Visszaküldés</h1>
   <p className="lead">A konkrét rendeléshez tartozó visszaküldési vagy visszatérítési kérelmet bejelentkezés után, a vásárlói fiókban lehet elindítani és követni.</p>
   <div className="systemInfoStack">
    <section className="featurePanel systemInfoGuide"><span className="eyebrow">Hogyan működik?</span><h2>A visszaküldés mindig egy konkrét rendeléshez kapcsolódik.</h2><div className="cards"><article className="card"><span className="badge">1</span><h3>Rendelés kiválasztása</h3><p className="muted">Jelentkezz be, és válaszd ki azt a lezárt vagy kiszállított rendelést, amelyhez kérelmet szeretnél indítani.</p></article><article className="card"><span className="badge">2</span><h3>Tételek és ok megadása</h3><p className="muted">Jelöld meg a visszaküldendő termékeket és mennyiséget, majd add meg röviden az ügy okát és részleteit.</p></article><article className="card"><span className="badge">3</span><h3>Kérelem elküldése</h3><p className="muted">A beküldött ügyet a webshop ellenőrzi. A kérelem elküldése önmagában nem jelent automatikus pénzvisszatérítést.</p></article></div></section>
    <section className="card"><span className="eyebrow">Ügykövetés</span><h2>A folyamat állapotát a fiókodban látod.</h2><p className="muted">A visszaküldési központban követheted az ügy állapotát és az esetlegesen rögzített visszatérítési információkat.</p><div className="actions"><Link className="btn btnPrimary" href="/fiokom/visszakuldes">Visszaküldési központ</Link><Link className="btn btnGhost" href="/fiokom/ugyek">Összes ügyem</Link></div></section>
    <section className="card"><span className="eyebrow">Fontos</span><h2>A részletes feltételeket az ÁSZF tartalmazza.</h2><p className="muted">A jogosultságot és a határidőket mindig az adott rendelésre és vásárlásra érvényes feltételek alapján kell megítélni. Ez az oldal az operatív ügyintézés menetét mutatja.</p><div className="actions"><Link className="btn btnGhost" href="/aszf">ÁSZF megnyitása</Link><Link className="btn btnGhost" href="/kapcsolat">Kapcsolat</Link></div></section>
   </div>
   <div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/fiokom/visszakuldes">Visszaküldés indítása</Link><Link className="btn btnGhost" href="/webaruhaz">Vissza a webáruházba</Link></div>
  </div></main>;
 const editorial=EDITORIAL_INFO[slug];
 if(!editorial)return null;
 return <main className="section contentPage systemInfoPage" data-system-info-page={slug}><div className="shell"><span className="eyebrow">{brand} · információ</span><h1 className="sectionTitle">{editorial.title}</h1><p className="lead">{editorial.lead}</p><section className="card"><p className="muted">{editorial.body}</p></section><div className="actions systemInfoActions"><Link className="btn btnPrimary" href="/kapcsolat">Kapcsolat</Link><Link className="btn btnGhost" href="/">Vissza a főoldalra</Link></div></div></main>;
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
