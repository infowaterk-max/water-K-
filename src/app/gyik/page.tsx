import type{Metadata}from'next';
import Link from'next/link';
import{getCurrentWebshopInstance}from'@/lib/instances/access';
import{getCommerceSettings}from'@/lib/commerce/settings';
import{getPublicContentBySlug}from'@/lib/content/server';
import{RichContent}from'@/components/content/rich-content';
import{StorefrontContentShell}from'@/components/content/storefront-content-shell';

export const metadata:Metadata={title:'Gyakori kérdések',description:'Gyakori kérdések a vásárlásról, fizetésről és szállításról.',alternates:{canonical:'/gyik'}};

type FaqItem={question:string;answer:string};
type FaqGroup={eyebrow:string;title:string;items:FaqItem[]};

export default async function FaqPage(){
 const[instance,commerce,custom]=await Promise.all([getCurrentWebshopInstance(),getCommerceSettings(),getPublicContentBySlug('page','gyik')]);
 if(custom)return <StorefrontContentShell><main className="section contentPage faqPage"><div className="shell"><span className="eyebrow">Segítség</span><h1 className="sectionTitle">{custom.title}</h1>{custom.excerpt&&<p className="lead">{custom.excerpt}</p>}<section className="card"><RichContent body={custom.body}/></section></div></main></StorefrontContentShell>;

 const brandName=instance?.brand.name||instance?.name||'Webshop';
 const shippingLabels=commerce.shippingOptions.map(o=>o.label).join(', ');
 const paymentLabels=commerce.paymentOptions.map(o=>o.label).join(', ');
 const threshold=commerce.freeShippingThreshold;
 const groups:FaqGroup[]=[
  {eyebrow:'Rendelés',title:'Vásárlás és rendelési folyamat',items:[
   {question:'Hogyan történik a rendelés?',answer:'Tedd a kiválasztott termékeket a kosárba, majd a pénztárban add meg a szükséges adatokat. A rendszer a rendelés rögzítése előtt újra ellenőrzi az aktuális árat, készletet és rendelési feltételeket.'},
   {question:'Hol látom a rendeléseimet?',answer:'Bejelentkezés után a Fiókom oldalon jelennek meg a webshophoz tartozó rendeléseid és azok aktuális adatai.'},
   {question:'Hol találom a rendeléshez tartozó dokumentumokat?',answer:'Ha a rendeléshez számla vagy más letölthető dokumentum válik elérhetővé, azt a fiókod megfelelő rendelési vagy dokumentum nézetében éred el.'},
  ]},
  {eyebrow:'Szállítás és fizetés',title:'Aktív lehetőségek és díjak',items:[
   {question:'Milyen szállítási módok érhetők el?',answer:shippingLabels?`Jelenleg aktív: ${shippingLabels}. A pénztár az adott rendeléshez ténylegesen használható lehetőségeket mutatja.`:'Jelenleg nincs aktív online szállítási mód. A pénztár nem ajánl fel nem konfigurált szolgáltatást.'},
   {question:'Milyen fizetési módok érhetők el?',answer:paymentLabels?`Jelenleg aktív: ${paymentLabels}. A pénztár csak ténylegesen engedélyezett és konfigurált fizetési módot kínál fel.`:'Jelenleg nincs aktív online fizetési mód. A pénztár nem kínál fel nem konfigurált fizetési szolgáltatást.'},
   {question:'Van ingyenes szállítás?',answer:threshold>0?`${threshold.toLocaleString('hu-HU')} Ft rendelési értéktől alkalmazható díjmentes szállítás az arra jogosult módoknál. A végleges jogosultságot és díjat a pénztár mutatja.`:'Nincs általános ingyenes szállítási értékhatár beállítva. A végleges szállítási díjat a pénztár mutatja.'},
  ]},
  {eyebrow:'Fiók és ügyintézés',title:'Visszaküldés, ügyek és segítség',items:[
   {question:'Hogyan indíthatok visszaküldést?',answer:'A konkrét rendeléshez tartozó visszaküldési vagy visszatérítési kérelmet bejelentkezés után, a Fiókom Visszaküldés részében indíthatod el.'},
   {question:'Hol követhetem a beküldött ügyemet?',answer:'A Fiókom Ügyeim és Visszaküldés nézetében követheted a rendelkezésre álló állapot- és visszatérítési információkat.'},
   {question:'Mi van, ha nem találom itt a választ?',answer:'A Kapcsolat oldalon közvetlenül felveheted a kapcsolatot a webshoppal. Rendeléssel kapcsolatos kérdésnél érdemes a rendelési azonosítót is megadni.'},
  ]},
 ];

 return <StorefrontContentShell><main className="section contentPage faqPage" data-system-info-page="faq"><div className="shell">
  <span className="eyebrow">{brandName} · segítség</span>
  <h1 className="sectionTitle">Gyakori kérdések</h1>
  <p className="lead">A legfontosabb válaszok a vásárlásról, szállításról, fizetésről és fiókos ügyintézésről.</p>
  <div className="faqGroups">{groups.map(group=><section className="featurePanel faqGroup" key={group.eyebrow}><span className="eyebrow">{group.eyebrow}</span><h2>{group.title}</h2><div className="faqGrid">{group.items.map(item=><details className="faqItem" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>)}</div>
  <section className="card faqHelpCard"><span className="eyebrow">További segítség</span><h2>Kapcsolódó információk</h2><p className="muted">A részletes szállítási, fizetési és visszaküldési információk külön oldalon is elérhetők.</p><div className="actions"><Link className="btn btnGhost" href="/oldal/szallitas">Szállítás</Link><Link className="btn btnGhost" href="/oldal/fizetes">Fizetés</Link><Link className="btn btnGhost" href="/oldal/visszakuldes">Visszaküldés</Link><Link className="btn btnPrimary" href="/kapcsolat">Kapcsolat</Link></div></section>
 </div></main></StorefrontContentShell>;
}
