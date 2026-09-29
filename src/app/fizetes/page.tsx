import type {Metadata} from 'next';
import {StorefrontContentShell} from '@/components/content/storefront-content-shell';
import {getCommerceSettings} from '@/lib/commerce/settings';
import {getCurrentWebshopInstance} from '@/lib/instances/access';

const flowLabel=(flow:string)=>flow==='online_redirect'?'Online bankkártyás / szolgáltatói fizetés':flow==='bank_transfer'?'Banki átutalás':flow==='cash_on_delivery'?'Utánvét':'Aktív fizetési mód';

export async function generateMetadata():Promise<Metadata>{
  const instance=await getCurrentWebshopInstance(),brand=instance?.brand.name??'Shoperation';
  return{title:'Fizetés',description:`${brand} aktuálisan engedélyezett fizetési módjai és fizetési folyamata.`,alternates:{canonical:'/fizetes'}};
}

export default async function PaymentPage(){
  const[settings,instance]=await Promise.all([getCommerceSettings(),getCurrentWebshopInstance()]);
  const brand=instance?.brand.name??'Shoperation';
  return <StorefrontContentShell pageKey="legal"><main className="section"><div className="shell">
    <span className="eyebrow">{brand} · vásárlási információk</span>
    <h1 className="sectionTitle">Fizetés</h1>
    <p className="lead">A pénztár csak azokat a fizetési módokat kínálja fel, amelyeket ehhez a webshophoz ténylegesen aktiváltak és checkout-ready állapotban konfiguráltak.</p>

    <section aria-labelledby="payment-methods"><h2 id="payment-methods">Aktív fizetési módok</h2>
      {settings.paymentOptions.length?<div className="cards">{settings.paymentOptions.map(option=><article className="card" key={option.code}>
        <span className="badge">{flowLabel(option.flow)}</span>
        <h3>{option.label}</h3>
        <p className="muted">{option.flow==='online_redirect'?'A rendelési folyamat a konfigurált fizetési szolgáltató biztonságos lépésére irányíthat.':option.flow==='bank_transfer'?'A szükséges utalási információkat a rendelési folyamat és a visszaigazolás közli.':'Az utánvét csak akkor választható, ha a kereskedő az adott rendeléshez engedélyezte.'}</p>
      </article>)}</div>:<div className="card"><h3>A fizetési módok beállítás alatt állnak</h3><p className="muted">Aktív provider nélkül a pénztár nem kínál fel mesterséges fallback fizetési módot.</p></div>}
    </section>

    <div className="splitFeature">
      <section className="featurePanel"><span className="eyebrow">Bankkártya</span><h2>Provider-alapú</h2><p className="muted">Online bankkártyás fizetés kizárólag aktív és megfelelően konfigurált szolgáltató esetén jelenik meg.</p></section>
      <section className="featurePanel"><span className="eyebrow">Átutalás és utánvét</span><h2>Merchant-beállítás szerint</h2><p className="muted">A pénztár nem feltételezi automatikusan ezek elérhetőségét: csak az engedélyezett módok választhatók.</p></section>
    </div>

    <section className="card"><h2>Fizetési folyamat</h2><ol className="featureList">
      <li>A vásárló a pénztárban az adott rendeléshez elérhető módok közül választ.</li>
      <li>A végleges összesítő a rendelés aktuális fizetendő összegét mutatja.</li>
      <li>Online szolgáltatói folyamat csak a rendelés véglegesítése után indulhat.</li>
      <li>A fizetés és a rendelés állapota a tényleges provider-visszajelzés alapján frissül.</li>
    </ol></section>
  </div></main></StorefrontContentShell>;
}
