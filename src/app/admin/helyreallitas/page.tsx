import Link from 'next/link';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';
import { createAdminClient } from '@/lib/supabase/admin';
import { DrillActions,DrillPlanForm,FindingActions,RecoveryCycleButton } from '@/components/admin/recovery-center-actions';
import { criticalityLabel,recoveryStatusLabel,severityLabel,stateTone } from '@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type Service={objective_id:string;service_key:string;name:string;criticality:string;rto_minutes:number;rpo_minutes:number;backup_status:string|null;restore_status:string|null;drill_status:string|null;measured_rto_minutes:number|null;measured_rpo_minutes:number|null;critical_open:number;high_open:number;backup_stale:boolean;readiness_status:string};
type Finding={finding_id:string;severity:string;status:string;title:string;description:string;occurrence_count:number;service_name:string};
type Drill={id:string;status:string;scenario:string;planned_at:string;measured_rto_minutes:number|null;measured_rpo_minutes:number|null};
type Kpi={services:number;ready:number;degraded:number;blocked:number;stale_backups:number;overdue_drills:number};

export default async function Page(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[serviceResult,findingResult,drillResult,kpiResult]=await Promise.all([
    a.from('recovery_service_readiness').select('*').order('service_key'),
    a.from('recovery_finding_queue').select('*').limit(200),
    a.from('recovery_drills').select('*').order('planned_at',{ascending:false}).limit(50),
    a.from('recovery_kpis').select('*').maybeSingle(),
  ]);
  const services=(serviceResult.data??[]) as Service[];
  const findings=(findingResult.data??[]) as Finding[];
  const drills=(drillResult.data??[]) as Drill[];
  const kpi=(kpiResult.data??{services:0,ready:0,degraded:0,blocked:0,stale_backups:0,overdue_drills:0}) as Kpi;
  const loadError=Boolean(serviceResult.error||findingResult.error||drillResult.error||kpiResult.error);

  return <section className="adminMain">
    <span className="eyebrow">Platform · Üzletmenet-folytonosság</span>
    <h1 className="sectionTitle">Helyreállítási központ</h1>
    <p className="lead">Helyreállítási célok, mentési és visszaállítási bizonyítékok, próbák és emberi döntések. A felület ellenőriz és dokumentál; nem indít automatikus visszaállítást.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A helyreállítási adatok egy része most nem tölthető be.</strong><p>Hiányzó mentési vagy próbaeredmény nem tekinthető sikeresnek.</p></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">RTO és RPO</span><h2>Mennyi idő és adatvesztés fér bele?</h2></div>
      <div className="auditGuideGrid">
        <div><strong>RTO</strong><span>A maximálisan elfogadható helyreállítási idő egy kiesés után.</span></div>
        <div><strong>RPO</strong><span>A maximálisan elfogadható adatvesztési időablak.</span></div>
        <div><strong>Próba</strong><span>A célértékeket rendszeres helyreállítási gyakorlatokkal kell bizonyítani.</span></div>
      </div>
    </section>

    <div className="actions"><RecoveryCycleButton/><Link className="btn btnGhost" href="/admin/utoellenorzes">Utóellenőrzés</Link><Link className="btn btnGhost" href="/admin/biztositekok">Biztosítékok</Link></div>
    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Szolgáltatás</span><div className="price">{kpi.services}</div></div>
      <div className="card"><span className="badge">Helyreállításra kész</span><div className="price">{kpi.ready}</div></div>
      <div className="card"><span className="badge">Figyelmet igényel</span><div className="price">{kpi.degraded}</div></div>
      <div className="card"><span className="badge">Blokkolt</span><div className="price">{kpi.blocked}</div></div>
      <div className="card"><span className="badge">Elavult mentés</span><div className="price">{kpi.stale_backups}</div></div>
      <div className="card"><span className="badge">Lejárt próba</span><div className="price">{kpi.overdue_drills}</div></div>
    </div>

    <section className="card">
      <h2>Helyreállítási készültség</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Szolgáltatás</th><th>Cél</th><th>Mentés / visszaállítás</th><th>Próba</th><th>Eltérés</th><th>Állapot</th></tr></thead>
        <tbody>{services.map(x=><tr key={x.objective_id}>
          <td><strong>{x.name}</strong><div className="muted">{criticalityLabel(x.criticality)} · <code>{x.service_key}</code></div></td>
          <td>RTO {x.rto_minutes} perc · RPO {x.rpo_minutes} perc</td>
          <td>Mentés: {recoveryStatusLabel(x.backup_status)}{x.backup_stale?' · elavult':''}<div className="muted">Visszaállítás: {recoveryStatusLabel(x.restore_status)}</div></td>
          <td>{recoveryStatusLabel(x.drill_status)}<div className="muted">Mért RTO/RPO: {x.measured_rto_minutes??'—'}/{x.measured_rpo_minutes??'—'} perc</div></td>
          <td>Kritikus: {x.critical_open} · magas: {x.high_open}</td>
          <td><span className={`adminStatePill ${stateTone(x.readiness_status)}`}>{recoveryStatusLabel(x.readiness_status)}</span></td>
        </tr>)}</tbody>
      </table></div>
      {!loadError&&services.length===0&&<p className="muted">Még nincs kiértékelt helyreállítási szolgáltatás.</p>}
    </section>

    <DrillPlanForm/>

    <section className="card">
      <h2>Helyreállítási próbák</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Állapot</th><th>Forgatókönyv</th><th>Tervezett időpont</th><th>Eredmény</th><th>Művelet</th></tr></thead>
        <tbody>{drills.map(x=><tr key={x.id}>
          <td><span className={`adminStatePill ${stateTone(x.status)}`}>{recoveryStatusLabel(x.status)}</span></td>
          <td>{x.scenario}</td><td>{new Date(x.planned_at).toLocaleString('hu-HU')}</td>
          <td>RTO/RPO: {x.measured_rto_minutes??'—'}/{x.measured_rpo_minutes??'—'} perc</td><td><DrillActions id={x.id} status={x.status}/></td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="card">
      <h2>Nyitott helyreállítási eltérések</h2>
      {findings.map(x=><div className="integrationList" key={x.finding_id}>
        <span><strong>{x.title}</strong><div className="muted">{x.service_name} · {severityLabel(x.severity)} · {x.description} · {x.occurrence_count} előfordulás</div></span>
        <FindingActions id={x.finding_id} status={x.status}/>
      </div>)}
      {!loadError&&findings.length===0&&<p className="muted">Nincs nyitott eltérés.</p>}
    </section>
  </section>;
}
