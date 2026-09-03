import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';

export const dynamic='force-dynamic';

type InstanceRow={
  id:string;
  slug:string;
  name:string;
  subscription_plan:'alap'|'pro';
  status:'pilot'|'active'|'suspended'|'archived';
  created_at:string;
};

const statusLabel:Record<InstanceRow['status'],string>={
  pilot:'Pilot',
  active:'Aktív',
  suspended:'Felfüggesztett',
  archived:'Archivált',
};

const statusTone:Record<InstanceRow['status'],string>={
  pilot:'warning',
  active:'ok',
  suspended:'danger',
  archived:'neutral',
};

export default async function PlatformControlCenterPage(){
  const user=await requirePlatformOperator();
  const admin=createAdminClient();

  const[
    {data:instances,error:listError},
    {count:instanceCount,error:countError},
    {count:pilotCount},
    {count:activeCount},
    {count:suspendedCount},
    {count:operatorCount,error:operatorError},
  ]=await Promise.all([
    admin.from('webshop_instances')
      .select('id,slug,name,subscription_plan,status,created_at')
      .order('created_at',{ascending:false})
      .limit(12),
    admin.from('webshop_instances').select('id',{count:'exact',head:true}),
    admin.from('webshop_instances').select('id',{count:'exact',head:true}).eq('status','pilot'),
    admin.from('webshop_instances').select('id',{count:'exact',head:true}).eq('status','active'),
    admin.from('webshop_instances').select('id',{count:'exact',head:true}).eq('status','suspended'),
    admin.from('platform_operators').select('user_id',{count:'exact',head:true}),
  ]);

  const rows=(instances??[]) as InstanceRow[];
  const loadError=Boolean(listError||countError||operatorError);

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Platform</span>
    <h1 className="sectionTitle">Platform irányítóközpont</h1>
    <p className="lead">Rendszerszintű áttekintés az ügyfél-webshopokról és a platform működési állapotáról. Ez a nézet tenant nélkül is használható.</p>

    {loadError&&<div className="errorNotice" role="alert"><strong>Az összes platformmutató nem tölthető be.</strong><p>Az elérhető adatok ettől még megjelennek; a hiányzó értékeket ne tekintsd nullának.</p></div>}

    <section className="auditGuide">
      <div>
        <span className="eyebrow">Mit látsz itt?</span>
        <h2>Platformszintű állapot, nem egyetlen webshop adminja</h2>
      </div>
      <p>A számlálók az összes webshop példányból készülnek. A lenti lista csak a legutóbbi 12 példányt mutatja, ezért a lista elemszáma nem azonos a teljes platformmérettel.</p>
    </section>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Webshop példány</span><div className="price">{instanceCount??'—'}</div><p className="muted">Összes létrehozott példány</p></div>
      <div className="card"><span className="badge">Aktív</span><div className="price">{activeCount??'—'}</div><p className="muted">Éles működésre állított webshop</p></div>
      <div className="card"><span className="badge">Pilot</span><div className="price">{pilotCount??'—'}</div><p className="muted">Bevezetés vagy ellenőrzés alatt</p></div>
      <div className="card"><span className="badge">Felfüggesztett</span><div className="price">{suspendedCount??'—'}</div><p className="muted">Ideiglenesen leállított példány</p></div>
      <div className="card"><span className="badge">Platform kezelő</span><div className="price">{operatorCount??'—'}</div><p className="muted">Rendszerszintű hozzáféréssel</p></div>
    </div>

    {(instanceCount??0)===0&&<section className="card">
      <span className="badge">Első production tenant</span>
      <h2>Még nincs létrehozott ügyfél-webshop.</h2>
      <p className="muted">A platformtulajdonosi hozzáférés működik. A következő biztonságos lépés az első Pilot / Alap / B2C tenant atomi provisionálása.</p>
      <div className="actions"><Link className="btn btnPrimary" href="/admin/platform/webaruhazak">Ügyfél-webshop létrehozása</Link></div>
    </section>}

    {rows.length>0&&<section className="card">
      <div className="adminToolbar">
        <div><span className="eyebrow">Legfrissebb példányok</span><h2>Webshopok állapota</h2></div>
        <Link className="btn btnPrimary" href="/admin/platform/webaruhazak">Összes webshop kezelése</Link>
      </div>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Név</th><th>Azonosító</th><th>Csomag</th><th>Állapot</th><th>Létrehozva</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.id}>
          <td><strong>{row.name}</strong></td>
          <td><code>{row.slug}</code></td>
          <td>Shoperation {row.subscription_plan==='pro'?'Pro':'Alap'}</td>
          <td><span className={`adminStatePill ${statusTone[row.status]}`}>{statusLabel[row.status]}</span></td>
          <td>{new Date(row.created_at).toLocaleDateString('hu-HU')}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}

    <section className="card">
      <div className="adminToolbar"><div><span className="eyebrow">Rendszerfelügyelet</span><h2>Platform műveletek</h2></div></div>
      <div className="auditGuideGrid">
        <Link className="auditGuideLink" href="/admin/biztositekok"><strong>Biztosítékok</strong><span>Biztonsági és működési kontrollok, eltérések, bizonyítékok.</span></Link>
        <Link className="auditGuideLink" href="/admin/intezkedesek"><strong>Intézkedési központ</strong><span>Feltárt problémákból képzett javaslatok és végrehajtási folyamat.</span></Link>
        <Link className="auditGuideLink" href="/admin/megfigyeles"><strong>Megfigyelés</strong><span>Platformállapot és üzemi jelek folyamatos áttekintése.</span></Link>
        <Link className="auditGuideLink" href="/admin/naplo"><strong>Platform napló</strong><span>Ki, mikor, melyik webshopban milyen kritikus módosítást végzett.</span></Link>
      </div>
      <p className="muted">Bejelentkezve: {user.email??'platform kezelő'}</p>
    </section>
  </section>;
}
