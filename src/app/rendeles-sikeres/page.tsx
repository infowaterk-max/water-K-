import Link from 'next/link';

export default async function OrderSuccess({ searchParams }: { searchParams: Promise<{ order?: string; status?: string }> }) {
  const params = await searchParams;
  const order = params.order ?? 'Water-K rendelés';
  const cardPayment = params.status === 'pending_payment';

  return (
    <main className="section">
      <div className="shell confirmationShell">
        <span className="successMark">✓</span>
        <span className="eyebrow">Rendelés rögzítve</span>
        <h1 className="sectionTitle">Köszönjük a rendelést.</h1>
        <p className="lead">Rendelési azonosító: <strong>{order}</strong></p>
        <div className="card">
          <h2>{cardPayment ? 'A következő lépés a bankkártyás fizetés.' : 'Átutalásos rendelés.'}</h2>
          <p className="muted">{cardPayment ? 'A staging verzió még nem továbbít a K&H fizetőoldalára. Az éles K&H sandbox integráció bekötésekor innen indul majd a banki tranzakció.' : 'Az éles rendszerben e-mailben küldjük majd az átutalási adatokat és a rendelés visszaigazolását.'}</p>
        </div>
        <div className="actions"><Link className="btn btnPrimary" href="/webaruhaz">Vissza a webáruházba</Link><Link className="btn btnGhost" href="/fiokom">Fiókom</Link></div>
      </div>
    </main>
  );
}
