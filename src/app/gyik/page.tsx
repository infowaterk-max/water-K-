import type { Metadata } from 'next';

export const metadata:Metadata={title:'Gyakori kérdések',description:'Gyakori kérdések a Water-K használatáról, kiszerelésekről, rendelésről és szállításról.',alternates:{canonical:'/gyik'}};

const items=[
  ['Mire használható a Water-K?','Kertészeti, gyepes, dísznövényes, fa- és cserjetelepítési felhasználásra, ahol a cél a gyökérzóna vízmegtartásának támogatása.'],
  ['Mennyi ideig fejti ki a hatását?','A termékkoncepció akár több éves működésre készült; a tényleges időtartamot a talaj, a nedvesedési ciklusok és a használat módja is befolyásolja.'],
  ['Melyik kiszerelést válasszam?','A 40 g kipróbáláshoz és kisebb ültetésekhez, a 750 g általános kerti felhasználáshoz, a 25 kg pedig jóváhagyott viszonteladói és professzionális felhasználásra való.'],
  ['Hogyan történik a rendelés?','A kosár és a pénztár után a rendelést a Water-K saját webshopmotorja rögzíti. A végleges árakat és készletet a szerveroldal ellenőrzi.'],
  ['Kapok visszaigazolást a rendelésről?','Igen. A rendszer tranzakciós értesítéseket készít elő a rendelés létrehozásáról, fizetéséről, feladásáról és teljesítéséről.'],
  ['Hol látom a rendeléseimet?','Bejelentkezés után a Fiókom oldalon megjelennek a korábbi rendelések, a rendelés részletei, a számla és a nyomkövetési információk, amikor elérhetők.'],
];

export default function FaqPage(){
  const jsonLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:items.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
  return <main className="section"><div className="shell"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><span className="eyebrow">Segítség</span><h1 className="sectionTitle">Gyakori kérdések</h1><p className="lead">A legfontosabb válaszok a Water-K termékről és a vásárlásról.</p><div className="faqGrid">{items.map(([q,a])=><details className="faqItem" key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></main>;
}
