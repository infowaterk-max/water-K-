import Link from 'next/link';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { ReleaseActions,ReleaseCiButton,ReleaseCreateForm,ReleaseCycleButton } from '@/components/admin/release-center-actions';
import { ciStatusLabel,releaseRiskLabel,releaseStatusLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Row={candidate_id:string;version_label:string;source_ref:string;source_sha:string;risk_class:string;change_summary:string;status:string;ci_status:string;ci_trusted:boolean;assurance_score:number|null;stale:boolean;window_allowed:boolean;policy_name:string;approval_mode:string;approval_count:number;change_count:number};
type Kpi={draft:number;awaiting_decision:number;approved:number;stale_candidates:number;high_impact_open:number};

export default async function Page(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[queueResult,kpiResult]=await Promise.all([
    a.from('release_candidate_queue').select('*').order('created_at',{ascending:false}).limit(200),
    a.from('release_governance_kpis').select('*').maybeSingle(),
  ]);
  const rows=(queueResult.data??[]) as Row[];
  const kpi=(kpiResult.data??{draft:0,awaiting_decision:0,approved:0,stale_candidates:0,high_impact_open:0}) as Kpi;
  const loadError=Boolean(queueResult.error||kpiResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Kiadásirányítás</span>
    <h1 className="sectionTitle">Kiadási központ</h1>
    <p className="lead">Egy új Shoperation-kiadás csak megbízható CI, friss biztosítékok, visszaállítási terv és a szükséges jóváhagyás után léphet tovább. Ez a felület önmagában nem indít éles deployt.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A kiadási adatok egy része most nem tölthető be.</strong><p>Hiányos kapuadat mellett ne hagyj jóvá kiadást.</p></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Kiadási folyamat</span><h2>Jelölt → ellenőrzések → jóváhagyás → rollout</h2></div>
      <div className="auditGuideGrid">
        <div><strong>Jelölt</strong><span>A kiadás forrása, változásai és kockázati osztálya rögzített.</span></div>
        <div><strong>Ellenőrzések</strong><span>CI, biztosítékok és kiadási ablak együtt adják a döntési alapot.</span></div>
        <div><strong>Jóváhagyás</strong><span>A szükséges számú emberi döntés nélkül a jelölt nem léphet tovább.</span></div>
        <div><strong>Rollout</strong><span>A tényleges környezeti bevezetés külön kapukon és utóellenőrzésen halad át.</span></div>
      </div>
    </section>

    <div className="actions"><ReleaseCycleButton/><Link className="btn btnGhost" href="/admin/biztositekok">Biztosítékok</Link><Link className="btn btnGhost" href="/admin/rollout">Rollout központ</Link></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Vázlat</span><div className="price">{kpi.draft}</div></div>
      <div className="card"><span className="badge">Döntésre vár</span><div className="price">{kpi.awaiting_decision}</div></div>
      <div className="card"><span className="badge">Jóváhagyott</span><div className="price">{kpi.approved}</div></div>
      <div className="card"><span className="badge">Elavult bizonyíték</span><div className="price">{kpi.stale_candidates}</div></div>
      <div className="card"><span className="badge">Magas hatású</span><div className="price">{kpi.high_impact_open}</div></div>
    </div>

    <ReleaseCreateForm/>

    <section className="card">
      <h2>Kiadási jelöltek</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Verzió</th><th>Forrás</th><th>Kockázat</th><th>Ellenőrzések</th><th>Állapot</th><th>Jóváhagyás</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.candidate_id}>
          <td><strong>{r.version_label}</strong><div className="muted">{r.change_summary} · {r.change_count} változás</div></td>
          <td>{r.source_ref}<div className="muted"><code>{r.source_sha.slice(0,12)}</code></div></td>
          <td><span className={`adminStatePill ${stateTone(r.risk_class)}`}>{releaseRiskLabel(r.risk_class)}</span><div className="muted">{r.policy_name}</div></td>
          <td><strong>CI: {ciStatusLabel(r.ci_status)}</strong> · {r.ci_trusted?'megbízható':'nem megbízható'}<div className="muted">Biztosíték: {r.assurance_score??'—'} · {r.stale?'elavult':'friss'} · kiadási ablak: {r.window_allowed?'nyitott':'zárt'}</div></td>
          <td><span className={`adminStatePill ${stateTone(r.status)}`}>{releaseStatusLabel(r.status)}</span></td>
          <td>{r.approval_count}/{r.approval_mode==='dual'?2:1}</td>
          <td><div className="actions">{r.ci_status!=='success'&&['draft','evaluated','ready'].includes(r.status)&&<ReleaseCiButton id={r.candidate_id}/>}<ReleaseActions id={r.candidate_id} status={r.status}/></div></td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted">Még nincs kiadási jelölt.</p>}
    </section>
  </section>;
}
