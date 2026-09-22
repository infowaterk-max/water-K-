import Link from 'next/link';
import{getCommerceSettings,type CommerceSettings}from'@/lib/commerce/settings';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{getCurrentPlan}from'@/lib/plans/access';
import{getAdminContent}from'@/lib/content/server';
import{getStorefrontTemplateDemoCatalogStatusForInstance,type StorefrontTemplateDemoCatalogStatus}from'@/lib/builder/storefront-template-demo-catalog-server';
import{openWebshopAction}from'./actions';
import{requireCurrentStoreContext}from'@/lib/instances/scope';

const emptyCommerce:CommerceSettings={shippingOptions:[],paymentOptions:[],freeShippingThreshold:0};
const emptyCatalogStatus:StorefrontTemplateDemoCatalogStatus={realProductCount:0,fixtureProductCount:0,adoptedProductCount:0,activeProductCount:0};
type Priority='required'|'recommended';
type SearchParams={launch?:string;demoRemoved?:string};
type Props={searchParams?:Promise<SearchParams>};
const notices:Record<string,string>={
  opened:'A webshop megnyílt: a publikus vásárlói felület mostantól elérhető.',
  blocked:'A megnyitás blokkolva: előbb teljesítsd az összes kötelező indulási feltételt.',
  'no-instance':'Nincs megnyitható webshop példány.',
  'already-open':'A webshop már publikus.',
  error:'A megnyitás mentése nem sikerült.',
};

export default async function LaunchReadinessPage({searchParams}:Props){
  const scope=await requireCurrentStoreContext('store.manage');
  const query:SearchParams=searchParams?await searchParams:{};
  const safeCommerce=getCommerceSettings().catch(()=>emptyCommerce);
  const safeCatalog=getStorefrontTemplateDemoCatalogStatusForInstance(scope.instanceId).catch(()=>emptyCatalogStatus);
  const[instance,plan,catalogStatus,commerce,content]=await Promise.all([
    getCurrentWebshopInstance().catch(()=>null),
    getCurrentPlan(),
    safeCatalog,
    safeCommerce,
    getAdminContent().catch(()=>[]),
  ]);
  const published=new Set(content.filter(x=>x.status==='published').map(x=>x.slug));
  const brandReady=Boolean(instance?.brand.name&&(instance.brand.supportEmail||instance.brand.supportPhone));
  const storefrontReady=Boolean(instance?.storefront.heroTitle||instance?.brand.tagline);
  const catalogReady=catalogStatus.realProductCount>0;
  const shippingReady=commerce.shippingOptions.length>0;
  const paymentReady=commerce.paymentOptions.length>0;
  const publicUrlReady=Boolean(instance?.brand.publicSiteUrl);
  const demoSuffix=catalogStatus.fixtureProductCount>0
    ?` · ${catalogStatus.fixtureProductCount} demótermék csak előnézethez; megnyitáskor automatikusan törlődik.`
    :'';
  const checks:{label:string;done:boolean;detail:string;href:string;priority:Priority}[]=[
    {label:'Webshop példány',done:Boolean(instance),detail:instance?`${instance.name} · ${plan==='pro'?'Pro':'Alap'} csomag`:'A webshop példány még nincs hozzárendelve.',href:'/admin/beallitasok',priority:'required'},
    {label:'Arculat és kapcsolat',done:brandReady,detail:brandReady?'Márkanév és ügyfélszolgálati elérhetőség beállítva.':'Állítsd be a márkanevet és legalább egy ügyfélszolgálati elérhetőséget.',href:'/admin/beallitasok',priority:'required'},
    {label:'Termékkatalógus',done:catalogReady,detail:catalogReady?`${catalogStatus.realProductCount} saját termék indulásra kész${demoSuffix}`:`Legalább 1 saját, aktív termék szükséges az induláshoz${demoSuffix}`,href:'/admin/termekek',priority:'required'},
    {label:'Szállítás',done:shippingReady,detail:shippingReady?`${commerce.shippingOptions.length} aktív szállítási mód.`:'Aktiválj legalább egy szállítási módot.',href:'/admin/beallitasok/fizetes-szallitas?tab=szallitas',priority:'required'},
    {label:'Fizetés',done:paymentReady,detail:paymentReady?`${commerce.paymentOptions.length} aktív fizetési mód.`:'Aktiválj legalább egy fizetési módot.',href:'/admin/beallitasok/fizetes-szallitas?tab=fizetes',priority:'required'},
    {label:'ÁSZF',done:published.has('aszf'),detail:published.has('aszf')?'Saját ÁSZF közzétéve.':'Készítsd el és tedd közzé a webshop saját ÁSZF oldalát.',href:'/admin/tartalom',priority:'required'},
    {label:'Adatkezelés',done:published.has('adatvedelem'),detail:published.has('adatvedelem')?'Saját adatkezelési tájékoztató közzétéve.':'Készítsd el és tedd közzé az adatkezelési tájékoztatót.',href:'/admin/tartalom',priority:'required'},
    {label:'Impresszum',done:published.has('impresszum'),detail:published.has('impresszum')?'Impresszum közzétéve.':'Készítsd el a webshop üzemeltetői impresszumát.',href:'/admin/tartalom',priority:'required'},
    {label:'Kezdőoldal tartalma',done:storefrontReady,detail:storefrontReady?'A nyitóoldal rendelkezik saját tartalommal.':'Adj meg saját fő üzeneteket és kezdőoldali tartalmat.',href:'/admin/beallitasok',priority:'recommended'},
    {label:'GYIK',done:published.has('gyik'),detail:published.has('gyik')?'Saját GYIK közzétéve.':'Érdemes a leggyakoribb vásárlói kérdéseket összegyűjteni.',href:'/admin/tartalom',priority:'recommended'},
    {label:'Publikus cím',done:publicUrlReady,detail:publicUrlReady?instance?.brand.publicSiteUrl??'Beállítva':'Adj meg saját domain vagy publikus címet.',href:'/admin/beallitasok',priority:'recommended'},
  ];
  const required=checks.filter(x=>x.priority==='required');
  const requiredDone=required.filter(x=>x.done).length;
  const recommended=checks.filter(x=>x.priority==='recommended');
  const recommendedDone=recommended.filter(x=>x.done).length;
  const ready=requiredDone===required.length;
  const percent=Math.round(requiredDone/required.length*100);
  const isLive=instance?.status==='active';
  const demoRemoved=Math.max(0,Number.parseInt(query.demoRemoved??'0',10)||0);
  const notice=query.launch&&notices[query.launch]
    ?notices[query.launch]+(query.launch==='opened'&&demoRemoved>0?` ${demoRemoved} demótermék automatikusan eltávolítva.`:'')
    :null;

  return <section className="adminMain launchPage">
    {notice&&<div className={query.launch==='opened'?'successNotice':'adminAuditNotice'}>{notice}</div>}
    <div className="launchHero"><div><span className="eyebrow">Shoperation indítási központ</span><h1 className="sectionTitle">Készen áll a webshop az indulásra?</h1><p className="lead">A kötelező feladatok a nyitást blokkolják, az ajánlottak a vásárlói élményt és a minőséget javítják.</p></div><div className="launchScore" aria-label={`Kötelező készültség ${percent}%`}><strong>{percent}%</strong><span>{requiredDone}/{required.length} kötelező kész</span></div></div>
    <div className={`launchStatus ${ready?'ready':'pending'}`}><span>{ready?'✓':'!'}</span><div><strong>{isLive?'A webshop publikus és fogad látogatókat.':ready?'A kötelező indulási feltételek teljesültek.':'A webshop még nem áll készen a nyitásra.'}</strong><p>{ready?`Ajánlott feladatok: ${recommendedDone}/${recommended.length} kész.`:`Még ${required.length-requiredDone} kötelező feladat hiányzik.`}</p></div></div>
    <div className="launchChecklist">{checks.map((item,index)=><Link className={`launchCheck ${item.done?'done':'todo'}`} href={item.href} key={item.label}><span className="launchCheckIndex">{item.done?'✓':index+1}</span><span className="launchCheckBody"><span className={`launchPriority ${item.priority}`}>{item.priority==='required'?'Kötelező':'Ajánlott'}</span><strong>{item.label}</strong><small>{item.detail}</small></span><span className="launchCheckAction">{item.done?'Megnyitás':'Beállítás'} →</span></Link>)}</div>
    {!isLive&&catalogStatus.fixtureProductCount>0?<div className="adminAuditNotice" role="note"><strong>{catalogStatus.fixtureProductCount} demótermék található a webshopban.</strong><br/>A „Megnyitom a webshopom” művelettel ezeket a rendszer automatikusan eltávolítja. Saját termékeidet ez nem érinti, a törlés és a megnyitás pedig auditnaplóba kerül.</div>:null}
    <div className="launchActions"><Link className="btn btnGhost" href="/">Webshop előnézet megnyitása</Link>{!isLive&&<form action={openWebshopAction}><button className="btn btnPrimary" type="submit" disabled={!ready}>Megnyitom a webshopom</button></form>}<Link className="btn btnGhost" href="/admin">Vissza az áttekintéshez</Link></div>
    <p className="muted">Pilot állapotban a vásárlói felület csak bejelentkezett webshop-adminnak vagy platformüzemeltetőnek látható. A nyilvános hozzáférés kizárólag a „Megnyitom a webshopom” művelet után válik elérhetővé.</p>
  </section>;
}
