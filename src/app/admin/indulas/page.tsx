import Link from 'next/link';
import { getProducts } from '@/lib/catalog-server';
import { getCommerceSettings } from '@/lib/commerce/settings';
import { getCurrentWebshopInstance } from '@/lib/instances/access';
import { getCurrentPlan } from '@/lib/plans/access';

export default async function LaunchReadinessPage(){
  const [instance,plan,products,commerce]=await Promise.all([
    getCurrentWebshopInstance(),
    getCurrentPlan(),
    getProducts(),
    getCommerceSettings(),
  ]);

  const brandReady=Boolean(instance?.brand.name&&instance.brand.supportEmail);
  const storefrontReady=Boolean(instance?.storefront.heroTitle||instance?.brand.tagline);
  const catalogReady=products.length>0;
  const shippingReady=commerce.shippingOptions.length>0;
  const paymentReady=commerce.paymentOptions.length>0;
  const publicUrlReady=Boolean(instance?.brand.publicSiteUrl);
  const checks=[
    {label:'Webshop példány',done:Boolean(instance),detail:instance?`${instance.name} · ${plan==='pro'?'Pro':'Alap'} csomag`:'A webshop példány még nincs hozzárendelve.',href:'/admin/beallitasok'},
    {label:'Arculat és kapcsolat',done:brandReady,detail:brandReady?'Név és ügyfélszolgálati e-mail beállítva.':'Állítsd be a márkanevet és a kapcsolati e-mailt.',href:'/admin/beallitasok'},
    {label:'Kezdőoldal tartalma',done:storefrontReady,detail:storefrontReady?'A nyitóoldal rendelkezik saját tartalommal.':'Add meg a hero címet, leírást és fő üzeneteket.',href:'/admin/beallitasok'},
    {label:'Termékkatalógus',done:catalogReady,detail:catalogReady?`${products.length} termék elérhető a katalógusban.`:'Még nincs feltöltött termék.',href:'/admin/termekek'},
    {label:'Szállítás',done:shippingReady,detail:shippingReady?`${commerce.shippingOptions.length} aktív szállítási mód.`:'Aktiválj legalább egy szállítási módot.',href:'/admin/beallitasok/fizetes-szallitas'},
    {label:'Fizetés',done:paymentReady,detail:paymentReady?`${commerce.paymentOptions.length} aktív fizetési mód.`:'Aktiválj legalább egy fizetési módot.',href:'/admin/beallitasok/fizetes-szallitas'},
    {label:'Publikus cím',done:publicUrlReady,detail:publicUrlReady?instance?.brand.publicSiteUrl??'Beállítva':'Adj meg preview vagy saját domain címet.',href:'/admin/beallitasok'},
  ];
  const completed=checks.filter(item=>item.done).length;
  const percent=Math.round((completed/checks.length)*100);
  const ready=completed===checks.length;

  return <section className="adminMain launchPage">
    <div className="launchHero">
      <div>
        <span className="eyebrow">Shoperation indítási központ</span>
        <h1 className="sectionTitle">Készen áll a webshop az indulásra?</h1>
        <p className="lead">Egyetlen oldalon látod, mi van már beállítva, és mi hiányzik még ahhoz, hogy a webshop biztonságosan kipróbálható vagy élesíthető legyen.</p>
      </div>
      <div className="launchScore" aria-label={`Indítási készültség ${percent}%`}>
        <strong>{percent}%</strong><span>{completed}/{checks.length} ellenőrzés kész</span>
      </div>
    </div>

    <div className={`launchStatus ${ready?'ready':'pending'}`}>
      <span>{ready?'✓':'•'}</span>
      <div><strong>{ready?'A webshop technikailag előkészített.':'Az induláshoz még van néhány teendő.'}</strong><p>{ready?'Most már érdemes teljes rendelési próbát és végső ellenőrzést futtatni.':'A hiányzó pontok nem hibák: a friss webshop alapból biztonságosan, üresen és kikapcsolt szolgáltatókkal indul.'}</p></div>
    </div>

    <div className="launchChecklist">
      {checks.map((item,index)=><Link className={`launchCheck ${item.done?'done':'todo'}`} href={item.href} key={item.label}>
        <span className="launchCheckIndex">{item.done?'✓':index+1}</span>
        <span className="launchCheckBody"><strong>{item.label}</strong><small>{item.detail}</small></span>
        <span className="launchCheckAction">{item.done?'Megnyitás':'Beállítás'} →</span>
      </Link>)}
    </div>

    <div className="launchActions">
      <Link className="btn btnPrimary" href="/">Webshop előnézet megnyitása</Link>
      <Link className="btn btnGhost" href="/admin">Vissza az áttekintéshez</Link>
    </div>
  </section>;
}
