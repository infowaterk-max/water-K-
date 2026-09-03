import Link from 'next/link';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostReleaseActions,PostReleaseCycleButton,RollbackDecision,StartPostReleaseButton } from '@/components/admin/post-release-actions';
import { releaseRiskLabel,releaseStatusLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Row={session_id:string;release_candidate_id:string;version_label:string;source_ref:string;source_sha:string;risk_class:string;status:string;started_at:string;observation_ends_at:string;trusted_evidence_count:number;trusted_passes:number;critical_open:number;high_open:number;evidence_bundle_hash:string};
type Candidate={id:string;version_label:string;source_ref:string;source_sha:string};
type Kpi={observing:number;degraded:number;rollback_recommended:number;stable:number;closed:number;overdue:number};

export default async function Page(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[queueResult,kpiResult,candidateResult]=await Promise.all([
    a.from('post_release_session_queue').select('*').order('started_at',{ascending:false}).limit(200),
    a.from('post_release_kpis').select('*').maybeSingle(),
    a.from('release_candidates').select('id,version_label,source_ref,source_sha').eq('status','approved').order('approved_at',{ascending:false}).limit(50),
  ]);
  const rows=(queueResult.data??[]) as Row[];
  const kpi=(kpiResult.data??{observing:0,degraded:0,rollback_recommended:0,stable:0,closed:0,overdue:0}) as Kpi;
  const started=new Set(rows.map(r=>r.release_candidate_id));
  const candidates=((candidateResult.data??[]) as Candidate[]).filter(x=>!started.has(x.id));
  const loadError=Boolean(queueResult.error||kpiResult.error||candidateResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Kiadás utáni ellenőrzés</span>
    <h1 className="sectionTitle">Utóellenőrzési központ</h1>
    <p className="lead">Kiadás utáni megfigyelés, regressziók és visszaállítási döntési kapu. A rendszer jelez és bizonyítékot gyűjt, de nem hajt végre automatikus visszaállítást.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>Az utóellenőrzési adatok egy része most nem tölthető be.</strong></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Mi történik release után?</span><h2>Megfigyelés → stabilitási döntés → lezárás vagy rollback-javaslat</h2></div>
      <p>A kiadás csak akkor tekinthető lezártnak, ha a megfigyelési időszak alatt a bizonyítékok frissek, és nincs nyitott kritikus vagy magas eltérés.</p>
    </section>

    <div className="actions"><PostReleaseCycleButton/><Link className="btn btnGhost" href="/admin/kiadasok">Kiadási központ</Link><Link className="btn btnGhost" href="/admin/biztositekok">Biztosítékok</Link></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Megfigyelés</span><div className="price">{kpi.observing}</div></div>
      <div className="card"><span className="badge">Figyelmet igényel</span><div className="price">{kpi.degraded}</div></div>
      <div className="card"><span className="badge">Visszaállítás javasolt</span><div className="price">{kpi.rollback_recommended}</div></div>
      <div className="card"><span className="badge">Stabil</span><div className="price">{kpi.stable}</div></div>
      <div className="card"><span className="badge">Lejárt megfigyelés</span><div className="price">{kpi.overdue}</div></div>
    </div>

    {candidates.length>0&&<section className="card"><h2>Indítható jóváhagyott kiadások</h2>{candidates.map(x=><div className="auditRunRow" key={x.id}><span><strong>{x.version_label}</strong><br/><span className="muted">{x.source_ref} · {x.source_sha.slice(0,12)}</span></span><StartPostReleaseButton candidateId={x.id}/></div>)}</section>}

    <section className="card">
      <h2>Utóellenőrzések</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Kiadás</th><th>Forrás</th><th>Bizonyíték</th><th>Eltérés</th><th>Megfigyelési ablak</th><th>Állapot</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.session_id}>
          <td><strong>{r.version_label}</strong><div className="muted">{releaseRiskLabel(r.risk_class)}</div></td>
          <td>{r.source_ref}<div className="muted"><code>{r.source_sha.slice(0,12)}</code></div></td>
          <td>{r.trusted_passes}/{r.trusted_evidence_count} sikeres<div className="muted"><code>{r.evidence_bundle_hash?.slice(0,12)??'—'}</code></div></td>
          <td>Kritikus: {r.critical_open} · magas: {r.high_open}</td>
          <td>{new Date(r.started_at).toLocaleString('hu-HU')}<div className="muted">vége: {new Date(r.observation_ends_at).toLocaleString('hu-HU')}</div></td>
          <td><span className={`adminStatePill ${stateTone(r.status)}`}>{releaseStatusLabel(r.status)}</span></td>
          <td><PostReleaseActions id={r.session_id} status={r.status}/>{['degraded','rollback_recommended'].includes(r.status)&&<RollbackDecision id={r.session_id}/>}</td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted">Még nincs utóellenőrzési folyamat.</p>}
    </section>
  </section>;
}
