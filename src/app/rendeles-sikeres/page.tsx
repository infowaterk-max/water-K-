import Link from 'next/link';
import { formatHuf } from '@/lib/catalog';

export default async function OrderSuccess({ searchParams }: { searchParams: Promise<{ order?: string; status?: string; total?: string }> }) {
  const params = await searchParams;
  const order = params.order ?? 'Water-K rendelés';
  const total = Number(params.total ?? 0);
  const cardPayment = params.status === 'pending_payment';

  return (
    <main className="section">
      <div className="shell confirmationShell">
        <span className="successMark">✓</span>
        <span className="eyebrow">Rendelés rögzítve</span>
        <h1 className="sectionTitle">Köszönjük. A rendelésed megvan.</h1>
        <p className="lead">Rendelési azonosító: <strong>{order}</strong></p>
        {total > 0 && <div className="confirmationTotal">{formatHuf(total)}</div>}
        <div className="card confirmationNextStep">
          <span className="badge">Következő lépés</span>
          <h2>{cardPayment ? 'Bankkártyás fizetés – K&H' : 'Banki átutalás'}</h2>
          <p className="muted">{cardPayment ? 'A staging verzió biztonsági okból még nem indít valódi banki tranzakciót. A hivatalos K&H sandbox szerződés bekötése után innen történik az átirányítás, a rendelés pedig csak hitelesített banki callback után lesz fizetett.' : 'Az éles rendszerben a rendelési visszaigazolással együtt küldjük az átutalási adatokat. A rendelés állapota a beérkezett fizetés után frissül.'}</p>
        </div>
        <div className="orderTimeline"><div><strong>1</strong><span>Rendelés rögzítve</span></div><div><strong>2</strong><span>Fizetés ellenőrzése</span></div><div><strong>3</strong><span>Csomagolás</span></div><div><strong>4</strong><span>Szállítás</span></div></div>
        <div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/fiokom">Fiókom</Link></div>
      </div>
    </main>
  );
}
