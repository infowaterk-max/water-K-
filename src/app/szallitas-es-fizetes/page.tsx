import type { Metadata } from 'next';
import Link from 'next/link';
import { freeShippingThreshold, shippingOptions } from '@/lib/commerce/pricing';
import { formatHuf } from '@/lib/catalog';

export const metadata:Metadata={title:'Szállítás és fizetés',description:'Water-K szállítási és fizetési lehetőségek, díjmentes szállítási küszöb és rendelési folyamat.'};

export default function ShippingPaymentPage(){
 return <main className="section"><div className="shell"><span className="eyebrow">Vásárlási információk</span><h1 className="sectionTitle">Szállítás és fizetés</h1><p className="lead">Átlátható díjak, szerveroldali ár- és készletellenőrzés, nyomon követhető rendelési folyamat.</p>
  <div className="cards">{shippingOptions.map(option=><article className="card" key={option.id}><span className="badge">{option.id.toUpperCase()}</span><h2>{option.label}</h2><p className="muted">A pontos díjat a pénztár a kosár értéke és a választott mód alapján számítja.</p></article>)}</div>
  <div className="splitFeature"><section className="featurePanel"><span className="eyebrow">Díjmentes szállítás</span><h2>{formatHuf(freeShippingThreshold)} felett</h2><p className="muted">A rendszer automatikusan alkalmazza a díjmentes szállítást a jogosult rendeléseknél.</p></section><section className="featurePanel"><span className="eyebrow">Fizetés</span><h2>Banki átutalás és K&H</h2><p className="muted">A bankkártyás K&H mód csak akkor jelenik meg a pénztárban, amikor a banki integráció ténylegesen konfigurálva van.</p></section></div>
  <div className="card"><h2>Rendelési folyamat</h2><ol className="featureList"><li>Termék és kiszerelés kiválasztása.</li><li>Szállítási és számlázási adatok megadása.</li><li>A szerver újraellenőrzi az árat, jogosultságot és készletet.</li><li>A rendelés rögzítése után a rendszer kezeli a készletet és a kapcsolódó integrációs feladatokat.</li></ol><Link className="btn btnPrimary" href="/webaruhaz">Vásárlás indítása</Link></div>
 </div></main>;
}
