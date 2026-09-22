import Link from 'next/link';

type Props={
  title?:string;
  description?:string;
};

export function AdminAccessDenied({
  title='Nincs jogosultságod ehhez a modulhoz.',
  description='A fiókod aktív, de a jelenlegi webshop-szerepköröd nem engedi ennek a területnek a megnyitását. Válassz egy olyan modult a menüből, amelyhez van hozzáférésed, vagy kérj magasabb jogosultságot a webshop tulajdonosától.',
}:Props={}){
  return <section className="adminMain adminAccessDenied" role="alert" data-access-state="denied">
    <span className="eyebrow">Jogosultság · 403</span>
    <h1 className="sectionTitle">{title}</h1>
    <p className="lead">{description}</p>
    <div className="actions"><Link className="btn btnPrimary" href="/admin">Vissza az adminhoz</Link><Link className="btn btnGhost" href="/fiokom">Saját fiók</Link></div>
  </section>;
}
