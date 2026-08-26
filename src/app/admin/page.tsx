import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function Admin() {
  await requireAdmin();

  return <main className="adminGrid"><aside className="adminSide"><strong>Water-K Admin</strong><Link href="/admin">Áttekintés</Link><Link href="/admin/termekek">Termékek</Link><Link href="/admin/rendelesek">Rendelések</Link><Link href="/admin/ugyfelek">Ügyfelek</Link><Link href="/admin/beallitasok">Beállítások</Link><Link href="/">Webshop megnyitása</Link></aside><section className="adminMain"><span className="eyebrow">Saját admin</span><h1 className="sectionTitle">Irányítópult</h1><p className="lead">A dashboard szerveroldali admin jogosultság mögött fut; a szerepkört nem a felhasználó által módosítható metadata alapján ellenőrizzük.</p><div className="cards"><div className="card"><h3>Rendelések</h3><div className="price">—</div><p className="muted">A staging adatbázis bekötése után élő adat.</p></div><div className="card"><h3>Bevétel</h3><div className="price">—</div><p className="muted">Fizetett rendelések bruttó forgalma.</p></div><div className="card"><h3>Készletfigyelés</h3><div className="price">3</div><p className="muted">Jelenlegi induló termékkínálat.</p></div></div></section></main>;
}
