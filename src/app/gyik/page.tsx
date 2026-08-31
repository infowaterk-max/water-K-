import type { Metadata } from 'next';
import { getCurrentWebshopInstance } from '@/lib/webshop-instance';
import { getCommerceSettings } from '@/lib/commerce/settings';

export const metadata: Metadata = {
  title: 'Gyakori kérdések',
  description: 'Gyakori kérdések a vásárlásról, fizetésről, szállításról és rendeléskezelésről.',
  alternates: { canonical: '/gyik' },
};

export default async function FaqPage() {
  const [instance, commerce] = await Promise.all([
    getCurrentWebshopInstance(),
    getCommerceSettings(),
  ]);
  const brandName = instance?.brandName || instance?.name || 'Webshop';
  const shippingLabels = commerce.shippingOptions.map((option) => option.label).join(', ');
  const paymentLabels = commerce.paymentOptions.map((option) => option.label).join(', ');
  const threshold = commerce.freeShippingThreshold;

  const items = [
    [
      'Hogyan történik a rendelés?',
      'Tedd a kiválasztott termékeket a kosárba, majd a pénztárban add meg a szükséges számlázási és szállítási adatokat. A végleges árakat, készletet és az elérhető szolgáltatókat a rendszer szerveroldalon ellenőrzi.',
    ],
    [
      'Milyen szállítási módok érhetők el?',
      shippingLabels
        ? `Jelenleg ezek a szállítási módok választhatók: ${shippingLabels}. Az aktuális lehetőségeket a pénztár mindig a webshop beállításai alapján mutatja.`
        : 'A jelenlegi webshop-beállítások alapján nincs aktív online választható szállítási mód. Kérdés esetén vedd fel a kapcsolatot az ügyfélszolgálattal.',
    ],
    [
      'Milyen fizetési módok érhetők el?',
      paymentLabels
        ? `Jelenleg ezek a fizetési módok választhatók: ${paymentLabels}. A pénztár csak az adott webshophoz aktívan beállított lehetőségeket engedi kiválasztani.`
        : 'A jelenlegi webshop-beállítások alapján nincs aktív online választható fizetési mód. Kérdés esetén vedd fel a kapcsolatot az ügyfélszolgálattal.',
    ],
    [
      'Van ingyenes szállítás?',
      threshold > 0
        ? `A webshop jelenlegi beállítása szerint ${threshold.toLocaleString('hu-HU')} Ft rendelési értéktől alkalmazható díjmentes szállítás az arra jogosult szállítási módoknál.`
        : 'A webshop jelenlegi beállítása nem tartalmaz általános ingyenes szállítási értékhatárt. Az egyes átvételi módok ettől függetlenül lehetnek díjmentesek.',
    ],
    [
      'Kapok visszaigazolást a rendelésről?',
      'Igen. A rendszer a webshop kommunikációs beállításai szerint tranzakciós értesítéseket készít elő a rendelés fontos állapotváltozásairól.',
    ],
    [
      'Hol látom a rendeléseimet?',
      'Bejelentkezés után a Fiókom oldalon megjelenhetnek a korábbi rendelések, a rendelési részletek, valamint az elérhető számla- és nyomkövetési információk.',
    ],
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <main className="section">
      <div className="shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <span className="eyebrow">Segítség</span>
        <h1 className="sectionTitle">Gyakori kérdések</h1>
        <p className="lead">A legfontosabb válaszok a {brandName} webshopban történő vásárlásról.</p>
        <div className="faqGrid">
          {items.map(([q, a]) => (
            <details className="faqItem" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
