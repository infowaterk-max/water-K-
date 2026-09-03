import Link from 'next/link';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { environmentLabel,rolloutDecisionLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Readiness={environment_key:string;display_name:string;source_sha:string|null;trusted_passes:number;trusted_failures:number;smoke_pass:boolean;security_pass:boolean;migration_pass:boolean;evidence_bundle_hash:string};
type Decision={id:string;environment_key:string;source_sha:string;decision:string;note:string;created_at:string};

const gateReady=(row:Readiness)=>row.trusted_failures===0&&row.smoke_pass&&row.security_pass&&(row.environment_key==='preview'||row.migration_pass);
const gatePill=(pass:boolean,label:string)=><span className={`adminStatePill ${pass?'ok':'warning'}`}>{pass?`✓ ${label}`:`— ${label}`}</span>;

export default async function RolloutPage(){
  await requirePlatformOperator();
  const db=createAdminClient();
  const[readinessResult,decisionResult]=await Promise.all([
    db.from('rollout_readiness').select('*').order('environment_key'),
    db.from('rollout_decisions').select('id,environment_key,source_sha,decision,note,created_at').order('created_at',{ascending:false}).limit(30),
  ]);
  const rows=(readinessResult.data??[]) as Readiness[];
  const history=(decisionResult.data??[]) as Decision[];
  const ready=rows.filter(gateReady).length;
  const blocked=rows.filter(row=>!gateReady(row)).length;
  const loadError=Boolean(readinessResult.error||decisionResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Biztonságos bevezetés</span>
    <h1 className="sectionTitle">Rollout központ</h1>
    <p className="lead">Itt látszik, hogy a jóváhagyott kiadás készen áll-e a preview, staging és production környezetekre. A rollout nem történik automatikusan: a kapuk döntéstámogatást és visszakövethető bizonyítékot adnak.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A rollout adatok egy része most nem tölthető be.</strong><p>Hiányzó kapueredmény mellett a biztonságos döntés NO-GO.</p></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Környezeti kapuk</span><h2>Preview → Staging → Production</h2></div>
      <p>Minden környezet külön bizonyítékot kap. A zöld CI önmagában nem elég: smoke, biztonsági és — ahol szükséges — migrációs ellenőrzés együtt adja a GO alapját.</p>
    </section>

    <div className="actions"><Link className="btn btnGhost" href="/admin/kiadasok">Kiadási központ</Link><Link className="btn btnGhost" href="/admin/utoellenorzes">Utóellenőrzés</Link></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Környezeti kapuk</span><div className="price">{rows.length}</div></div>
      <div className="card"><span className="badge">Készen áll</span><div className="price">{ready}</div></div>
      <div className="card"><span className="badge">Blokkolt / hiányos</span><div className="price">{blocked}</div></div>
      <div className="card"><span className="badge">Legutóbbi döntések</span><div className="price">{history.length}</div><p className="muted">legfeljebb 30 bejegyzés</p></div>
    </div>

    <section className="card">
      <h2>Környezeti kapuk</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Környezet</th><th>Forrás</th><th>Kapuk</th><th>Megbízható eredmény</th><th>Állapot</th><th>Bizonyíték</th></tr></thead>
        <tbody>{rows.map(r=><tr key={`${r.environment_key}:${r.source_sha??'none'}`}>
          <td><strong>{r.display_name||environmentLabel(r.environment_key)}</strong><div className="muted">{environmentLabel(r.environment_key)}</div></td>
          <td><code>{r.source_sha?.slice(0,12)??'—'}</code></td>
          <td><div className="actions">{gatePill(r.smoke_pass,'Smoke')}{gatePill(r.security_pass,'Biztonság')}{r.environment_key!=='preview'&&gatePill(r.migration_pass,'Migráció')}</div></td>
          <td>{r.trusted_passes} sikeres · {r.trusted_failures} hibás</td>
          <td><span className={`adminStatePill ${gateReady(r)?'ok':'warning'}`}>{gateReady(r)?'GO-ra kész':'Nem kész'}</span></td>
          <td><code>{r.evidence_bundle_hash?.slice(0,14)??'—'}</code></td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted">Még nincs kiértékelt környezeti kapu.</p>}
    </section>

    <section className="card">
      <h2>GO / NO-GO döntési napló</h2>
      {history.length===0?<p className="muted">Még nincs rollout döntés.</p>:<div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Környezet</th><th>Döntés</th><th>Forrás</th><th>Indoklás</th><th>Idő</th></tr></thead>
        <tbody>{history.map(d=><tr key={d.id}>
          <td>{environmentLabel(d.environment_key)}</td>
          <td><span className={`adminStatePill ${stateTone(d.decision)}`}>{rolloutDecisionLabel(d.decision)}</span></td>
          <td><code>{d.source_sha.slice(0,12)}</code></td><td>{d.note||'—'}</td><td>{new Date(d.created_at).toLocaleString('hu-HU')}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </section>;
}
