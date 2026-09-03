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
};

export default async function PlatformControlCenterPage(){
  const user=await requirePlatformOperator();
  const admin=createAdminClient();
  const [{data:instances},{count:operatorCount}]=await Promise.all([
    admin.from('webshop_instances')
      .select('id,slug,name,subscription_plan,status')
      .order('created_at',{ascending:false})
      .limit(50),
    admin.from('platform_operators').select('user_id',{count:'exact',head:true}),
  ]);

  const rows=(instances??[]) as InstanceRow[];
  const pilotCount=rows.filter(row=>row.status==='pilot').length;
  const activeCount=rows.filter(row=>row.status==='active').length;

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Platform</span>
    <h1 className="sectionTitle">Platform irányítóközpont</h1>
    <p className="lead">Rendszerszintű áttekintés az ügyfél-webshopokról és a platform működési állapotáról. Ez a nézet tenant nélkül is használható.</p>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Webshop példány</span><div className="price">{rows.length}</div></div>
      <div className="card"><span className="badge">Pilot</span><div className="price">{pilotCount}</div></div>
      <div className="card"><span className="badge">Aktív</span><div className="price">{activeCount}</div></div>
      <div className="card"><span className="badge">Platform kezelő</span><div className="price">{operatorCount??0}</div></div>
    </div>

    {rows.length===0&&<section className="card">
      <span className="badge">Első production tenant</span>
      <h2>Még nincs létrehozott ügyfél-webshop.</h2>
      <p className="muted">A platformtulajdonosi hozzáférés működik. A következő biztonságos lépés az első Pilot / Alap / B2C tenant atomi provisionálása.</p>
      <div className="actions"><Link className="btn btnPrimary" href="/admin/platform/webaruhazak">Ügyfél-webshop létrehozása</Link></div>
    </section>}

    {rows.length>0&&<section className="card">
      <h2>Legutóbbi webshopok</h2>
      <div className="adminTableScroll"><table className="adminTable"><thead><tr><th>Név</th><th>Azonosító</th><th>Csomag</th><th>Állapot</th></tr></thead><tbody>
        {rows.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.slug}</td><td>Shoperation {row.subscription_plan==='pro'?'Pro':'Alap'}</td><td>{row.status}</td></tr>)}
      </tbody></table></div>
      <div className="actions"><Link className="btn btnPrimary" href="/admin/platform/webaruhazak">Ügyfél-webshopok kezelése</Link></div>
    </section>}

    <section className="card">
      <h2>Platform műveletek</h2>
      <div className="actions">
        <Link className="btn btnGhost" href="/admin/biztositekok">Biztosítékok</Link>
        <Link className="btn btnGhost" href="/admin/kiadasok">Kiadási központ</Link>
        <Link className="btn btnGhost" href="/admin/megfigyeles">Megfigyelés</Link>
        <Link className="btn btnGhost" href="/admin/naplo">Platform napló</Link>
      </div>
      <p className="muted">Bejelentkezve: {user.email??'platform kezelő'}</p>
    </section>
  </section>;
}
