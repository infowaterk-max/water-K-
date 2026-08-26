export default function AdminPage() {
  return (
    <section className="adminMain">
      <span className="eyebrow">Saját admin</span>
      <h1 className="sectionTitle">Irányítópult</h1>
      <p className="lead">A teljes admin szekció központi, szerveroldali jogosultsági kapu mögött fut.</p>
      <div className="cards">
        <div className="card"><h3>Rendelések</h3><div className="price">—</div><p className="muted">A staging adatbázis bekötése után élő adat.</p></div>
        <div className="card"><h3>Bevétel</h3><div className="price">—</div><p className="muted">Fizetett rendelések bruttó forgalma.</p></div>
        <div className="card"><h3>Készletfigyelés</h3><div className="price">3</div><p className="muted">Jelenlegi induló termékkínálat.</p></div>
      </div>
    </section>
  );
}
