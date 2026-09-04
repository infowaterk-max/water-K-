import { getCurrentWebshopInstance } from '@/lib/instances/access';

export default async function PilotAcceptancePage(){
  const instance=await getCurrentWebshopInstance();
  const pilot=instance?.status==='pilot';
  return <section className="adminMain">
    <span className="eyebrow">Production pilot</span>
    <h1 className="sectionTitle">Manuális acceptance mód</h1>
    <p className="lead">A storefront a nyilvánosság előtt zárva marad. Az acceptance munkamenet csak ebben a böngészőben, legfeljebb 2 órára nyitja meg a pilot webshopot.</p>
    <section className="card">
      <h2>{instance?.name??'Webshop'} · {instance?.status??'nincs aktív tenant'}</h2>
      {pilot?<>
        <p className="muted">Indítás után nyisd meg a webshopot, majd jelentkezz ki a vásárlói/admin fiókból. A külön acceptance cookie megmarad, így ugyanabban a böngészőben valódi guest customerként tesztelhető a katalógus, kosár és checkout.</p>
        <div className="actions">
          <form action="/api/pilot-access/start" method="post"><button className="btn btnPrimary" type="submit">Guest acceptance indítása</button></form>
          <form action="/api/pilot-access/end" method="post"><button className="btn btnGhost" type="submit">Acceptance mód lezárása</button></form>
        </div>
      </>:<p className="errorNotice">Ez a hozzáférés kizárólag <code>pilot</code> státuszú webshopnál indítható.</p>}
    </section>
  </section>;
}
