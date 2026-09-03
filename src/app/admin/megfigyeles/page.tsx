import Link from 'next/link';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { humanizeCode,severityLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type K={events_24h:number;errors_24h:number;critical_24h:number;avg_duration_ms_24h:number;p95_duration_ms_24h:number;last_event_at:string|null};
type R={id:number;correlation_id:string;category:string;severity:string;event_name:string;duration_ms:number|null;status_code:number|null;source:string;occurred_at:string};

export default async function Page(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[kpiResult,issueResult]=await Promise.all([
    a.from('observability_kpis').select('*').maybeSingle(),
    a.from('observability_issue_queue').select('*').order('occurred_at',{ascending:false}).limit(100),
  ]);
  const x=(kpiResult.data??{events_24h:0,errors_24h:0,critical_24h:0,avg_duration_ms_24h:0,p95_duration_ms_24h:0,last_event_at:null}) as K;
  const rows=(issueResult.data??[]) as R[];
  const loadError=Boolean(kpiResult.error||issueResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Rendszerfigyelés</span>
    <h1 className="sectionTitle">Megfigyelési központ</h1>
    <p className="lead">Adatvédelmi szempontból szűrt rendszeresemények, hibák és válaszidő-mutatók. Innen gyorsan látható, ha a platform vagy valamelyik kritikus integráció romló állapotot mutat.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A megfigyelési adatok egy része most nem tölthető be.</strong></div>}

    <div className="actions"><Link className="btn btnGhost" href="/api/health">Rendszerállapot</Link><Link className="btn btnGhost" href="/admin/muveletek">Platform műveletek</Link></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Esemény 24h</span><div className="price">{x.events_24h}</div></div>
      <div className="card"><span className="badge">Hiba 24h</span><div className="price">{x.errors_24h}</div></div>
      <div className="card"><span className="badge">Kritikus</span><div className="price">{x.critical_24h}</div></div>
      <div className="card"><span className="badge">Átlagos válaszidő</span><div className="price">{x.avg_duration_ms_24h} ms</div></div>
      <div className="card"><span className="badge">P95 válaszidő</span><div className="price">{x.p95_duration_ms_24h} ms</div></div>
      <div className="card"><span className="badge">Utolsó esemény</span><div className="price" style={{fontSize:18}}>{x.last_event_at?new Date(x.last_event_at).toLocaleString('hu-HU'):'—'}</div></div>
    </div>

    <section className="auditGuide">
      <div><span className="eyebrow">Mit érdemes nézni?</span><h2>Hibaszám + súlyosság + válaszidő együtt</h2></div>
      <p>Egyetlen lassú kérés még nem feltétlenül incidens. Kritikus esemény, növekvő hibaszám vagy tartós P95-romlás viszont kivizsgálást igényel.</p>
    </section>

    <section className="card">
      <h2>Figyelmet igénylő események</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Idő</th><th>Súlyosság</th><th>Kategória</th><th>Esemény</th><th>Válaszidő</th><th>Korreláció</th></tr></thead>
        <tbody>{rows.map(v=><tr key={v.id}>
          <td>{new Date(v.occurred_at).toLocaleString('hu-HU')}</td>
          <td><span className={`adminStatePill ${stateTone(v.severity)}`}>{severityLabel(v.severity)}</span></td>
          <td>{humanizeCode(v.category)}</td>
          <td><strong>{humanizeCode(v.event_name)}</strong><div className="muted">{humanizeCode(v.source)} · HTTP {v.status_code??'—'}</div></td>
          <td>{v.duration_ms??'—'} ms</td>
          <td><details><summary>Azonosító</summary><code>{v.correlation_id}</code></details></td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&rows.length===0&&<p className="muted">Nincs figyelmeztető vagy kritikus esemény az elmúlt 7 napban.</p>}
    </section>
  </section>;
}
