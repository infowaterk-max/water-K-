import Link from 'next/link';
import { getCurrentWebshopInstance } from '@/lib/instances/access';

export default async function PilotAcceptancePage(){
  const instance=await getCurrentWebshopInstance();
  const pilot=instance?.status==='pilot';
  const gitSha=process.env.VERCEL_GIT_COMMIT_SHA?.trim()||'ismeretlen';
  const deploymentHost=process.env.VERCEL_URL?.trim()||'ismeretlen';
  const vercelEnv=process.env.VERCEL_ENV?.trim()||process.env.NODE_ENV||'ismeretlen';
  const productionEnvironment=vercelEnv==='production';

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

    <section className="card" data-product-documents-acceptance-v1 style={{marginTop:18}}>
      <span className="eyebrow">Digital Commerce · Product Documents</span>
      <h2>Merchant E2E acceptance</h2>
      <p className="lead">Ez a checklist kizárólag valódi, bejelentkezett merchant admin sessionből futtatható. Service-role impersonation, kézzel gyártott JWT, SQL-runneres auth vagy közvetlen adatbázis-módosítás nem acceptance bizonyíték.</p>
      <div className="adminAuditNotice" data-acceptance-exact-deployment>
        <strong>Exact deployment evidence</strong>
        <p>Git SHA: <code data-acceptance-git-sha>{gitSha}</code></p>
        <p>Deployment: <code data-acceptance-deployment>{deploymentHost}</code></p>
        <p>Vercel környezet: <code data-acceptance-environment>{vercelEnv}</code></p>
      </div>
      {productionEnvironment&&<div className="errorNotice" role="alert">STOP: Product Documents mutációs acceptance production környezeten nem futtatható. Használj bizonyítottan non-production preview/staging targetet.</div>}
      <div className="adminAuditNotice" style={{marginTop:12}}><strong>Fail-closed előfeltétel</strong><p>A Vercel környezet ÉS a kapcsolt Supabase target non-production volta legyen bizonyított. Ha a database target nem azonosítható biztonságosan, az acceptance státusz: <strong>NOT PROVEN</strong>.</p></div>
      <ol className="stack" data-product-documents-acceptance-checklist style={{gap:10,marginTop:16,paddingLeft:22}}>
        <li><strong>Valódi merchant auth.</strong> A merchant normál admin belépéssel nyissa meg ezt az oldalt; az authot nem szabad technikai kerülőúttal szimulálni.</li>
        <li><strong>Feltöltés + aktiválás.</strong> A <Link href="/admin/termekek/dokumentumok">Termékdokumentumok</Link> oldalon tölts fel egy tesztfájlt <em>Bejelentkezett fiók</em> láthatósággal, és ellenőrizd az „A termékdokumentum aktiválva.” visszajelzést.</li>
        <li><strong>Public scope.</strong> Tölts fel külön <em>Nyilvános termékoldal</em> dokumentumot, indíts guest acceptance sessiont, majd a storefront termékoldalon ellenőrizd a megjelenést és a rövid élettartamú, engedélyezett letöltést. Permanent public storage URL nem elfogadható.</li>
        <li><strong>Account scope.</strong> Valódi customer/order kontextusban ellenőrizd a <Link href="/fiokom/letoltesek">Dokumentumok és letöltések</Link> központot: a Product Documents jelenjen meg külön authorityként a Digital Goods és Customer/Order Documents mellett.</li>
        <li><strong>Variant scope.</strong> Egy másik tesztdokumentumot köss konkrét aktív változathoz; csak a megfelelő variant kontextusban legyen felfedezhető.</li>
        <li><strong>Revoke + audit.</strong> Vond vissza a tesztdokumentum storefront hozzáférését, ellenőrizd, hogy a korábbi hozzáférés többé nem használható, majd nézd meg az <Link href="/admin/audit">Audit és műveleti napló</Link> tenant-szűrt bizonyítékát.</li>
        <li><strong>Fixture cleanup.</strong> A tesztfájlokat és teszt-dokumentumokat kizárólag a meglévő alkalmazás-lifecycle szerint takarítsd el; közvetlen DB/storage törlés nem acceptance lépés.</li>
      </ol>
      <div className="actions" style={{marginTop:16}}>
        <Link className="btn btnPrimary" href="/admin/termekek/dokumentumok">Termékdokumentumok megnyitása</Link>
        <Link className="btn btnGhost" href="/admin/audit">Audit megnyitása</Link>
      </div>
      <p className="muted" data-product-documents-acceptance-status style={{marginTop:12}}>A checklist megjelenése önmagában nem PASS. Merchant E2E csak akkor PROVEN, ha a teljes folyamat ugyanazon exact SHA/deploymenten, valódi merchant sessionnel és bizonyítottan non-production targeten sikeresen végigfutott.</p>
    </section>
  </section>;
}
