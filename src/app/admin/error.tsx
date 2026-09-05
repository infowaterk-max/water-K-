'use client';

export default function AdminError({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <section className="adminMain adminAccessDenied" role="alert">
    <span className="eyebrow">Admin · Hiba</span>
    <h1 className="sectionTitle">Ez az admin nézet most nem nyitható meg.</h1>
    <p className="lead">Lehet, hogy a szerepköröd nem engedi ezt a műveletet, vagy az oldal átmenetileg nem tölthető be. A rendszer nem hajt végre automatikusan ismételt módosítást.</p>
    <div className="actions"><button className="btn btnPrimary" type="button" onClick={reset}>Újrapróbálás</button><a className="btn btnGhost" href="/admin">Vissza az adminhoz</a></div>
  </section>;
}
