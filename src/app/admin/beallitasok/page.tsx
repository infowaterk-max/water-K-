export default function AdminSettingsPage() {
  return (
    <section className="adminMain">
      <span className="eyebrow">Admin · Beállítások</span>
      <h1 className="sectionTitle">Integrációk és beállítások</h1>
      <div className="cards">
        <section className="card"><h2>K&H</h2><p className="muted">A banki sandbox hitelesítő adatok bekötése után innen felügyelhető a fizetési kapcsolat állapota.</p></section>
        <section className="card"><h2>Szállítás</h2><p className="muted">Foxpost, GLS és MPL adapterek konfigurációs állapota kerül ide.</p></section>
        <section className="card"><h2>Supabase</h2><p className="muted">Adatbázis, hitelesítés és jogosultsági konfiguráció állapota.</p></section>
      </div>
    </section>
  );
}
