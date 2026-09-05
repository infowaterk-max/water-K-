import Link from 'next/link';

export default function AccessDeniedPage(){
  return <section className="adminMain adminAccessDenied">
    <span className="eyebrow">Jogosultság · 403</span>
    <h1 className="sectionTitle">Nincs jogosultságod ehhez a modulhoz.</h1>
    <p className="lead">A fiókod aktív, de a jelenlegi webshop-szerepköröd nem engedi ennek a területnek a megnyitását. Válassz egy olyan modult a menüből, amelyhez van hozzáférésed, vagy kérj magasabb jogosultságot a webshop tulajdonosától.</p>
    <div className="actions"><Link className="btn btnPrimary" href="/admin">Vissza az adminhoz</Link><Link className="btn btnGhost" href="/fiokom">Saját fiók</Link></div>
  </section>;
}
