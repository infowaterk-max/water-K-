import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { createClient } from '@/lib/supabase/server';

export default async function AccountPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  if (!configured) {
    return (
      <main className="section accountPage">
        <div className="shell">
          <span className="eyebrow">Water-K fiók</span>
          <h1 className="sectionTitle">A saját vásárlói központod.</h1>
          <p className="lead">Rendelések, számlázási adatok, céges és viszonteladói státusz egyetlen letisztult felületen.</p>
          <div className="cards accountFeatureGrid">
            <article className="card"><span className="stepIndex">01</span><h3>Rendeléseim</h3><p className="muted">Korábbi és folyamatban lévő rendelések, fizetési és szállítási állapot.</p></article>
            <article className="card"><span className="stepIndex">02</span><h3>Céges adatok</h3><p className="muted">Számlázási adatok, adószám és alapértelmezett címek.</p></article>
            <article className="card"><span className="stepIndex">03</span><h3>Viszonteladói fiók</h3><p className="muted">Jóváhagyás után külön partnerárak és partnerfunkciók.</p></article>
          </div>
          <div className="card accountConfigCard">
            <div><span className="badge">Staging</span><h2>A hitelesítés bekötésre vár.</h2><p className="muted">A publikus webshop addig is teljesen tesztelhető. A Supabase projekt kulcsainak beállítása után ezen az oldalon automatikusan aktiválódik a belépés és regisztráció.</p></div>
            <Link className="btn btnPrimary" href="/webaruhaz">Vásárlás fiók nélkül</Link>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="section accountPage">
      <div className="shell">
        <span className="eyebrow">Water-K fiók</span>
        <h1 className="sectionTitle">{user ? 'Üdv újra a Water-K-ban.' : 'Belépés vagy regisztráció'}</h1>
        {user ? (
          <>
            <div className="accountWelcome card"><div><span className="badge">Aktív fiók</span><h2>{user.email}</h2><p className="muted">A következő adatbázis-csomagban innen éred el a rendeléseidet és mentett címeidet.</p></div><Link className="btn btnPrimary" href="/webaruhaz">Új rendelés</Link></div>
            <div className="cards accountFeatureGrid"><article className="card"><h3>Rendelések</h3><div className="price">—</div><p className="muted">Élő rendelési előzmények bekötésre készen.</p></article><article className="card"><h3>Fióktípus</h3><div className="price">Vásárló</div><p className="muted">Céges és viszonteladói profil támogatással.</p></article><article className="card"><h3>Mentett címek</h3><div className="price">—</div><p className="muted">Gyorsabb következő pénztárfolyamathoz.</p></article></div>
          </>
        ) : <AuthForm />}
      </div>
    </main>
  );
}
