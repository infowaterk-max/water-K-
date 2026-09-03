import Link from'next/link';
import{createAdminClient}from'@/lib/supabase/admin';
import{formatHuf}from'@/lib/catalog';
import{AlertActions,ControlCycleButton,TaskActions}from'@/components/admin/control-tower-actions';
import{requirePlanFeature}from'@/lib/plans/access';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{hasStorePermission}from'@/lib/auth/store-rbac';
import{alertStatusLabel,displayRecommendation,severityLabel,stateTone,taskStatusLabel}from'@/lib/admin/operational-display';

export const dynamic='force-dynamic';

type AlertRow={alert_id:string;alert_key:string;category:string;alert_type:string;severity:string;priority_score:number;status:string;title:string;description:string;recommended_action:string|null;order_id:string|null;customer_id:string|null;reseller_id:string|null;variant_id:string|null;opportunity_id:string|null;occurrence_count:number;detected_at:string;last_detected_at:string;snoozed_until:string|null;age_hours:number;task_id:string|null;task_status:string|null;task_due_at:string|null;task_overdue:boolean};
type Kpi={open_alerts:number;critical_alerts:number;high_alerts:number;over_24h_alerts:number;overdue_tasks:number;operations_alerts:number;inventory_alerts:number;commercial_alerts:number;service_alerts:number;commercial_value_at_risk_net_huf:number|string;avg_alert_age_hours:number|string;control_health_score:number};
type Health={open_system_alerts:number;critical_system_alerts:number;failed_or_blocked_integration_jobs:number;failed_webhooks_7d:number;last_control_cycle_at:string|null};
type Cat={category:string;severity:string;alert_count:number;max_priority:number;avg_age_hours:number|string};

const labels:Record<string,string>={operations:'Műveletek',inventory:'Készlet',service:'Ügyfélszolgálat',commercial:'Értékesítés',customer:'Ügyfélérték',system:'Rendszer'};
const moduleRoutes:Record<string,string>={operations:'/admin/muveletek',inventory:'/admin/keszlet-elemzes',service:'/admin/ugyfelszolgalat',commercial:'/admin/ertekesites',customer:'/admin/ugyfelertek',system:'/admin/integraciok'};

export default async function ControlTowerPage(){
  await requirePlanFeature('executiveAnalytics');
  const store=await requireCurrentStoreContext('analytics.read');
  const canManage=store.isPlatform||await hasStorePermission(store.instanceId,'store.manage');
  const a=createAdminClient();
  const[
    {data:q,error:qe},
    {data:k,error:ke},
    {data:h,error:he},
    {data:c,error:ce},
  ]=await Promise.all([
    a.from('control_tower_queue_v2').select('*').eq('instance_id',store.instanceId).order('priority_score',{ascending:false}).order('detected_at',{ascending:true}).limit(250),
    a.from('control_tower_kpis_v2').select('*').eq('instance_id',store.instanceId).maybeSingle(),
    a.from('control_system_health_v2').select('*').eq('instance_id',store.instanceId).maybeSingle(),
    a.from('control_tower_category_summary_v2').select('*').eq('instance_id',store.instanceId).order('alert_count',{ascending:false}),
  ]);

  const rows=(q??[])as AlertRow[],kpi=(k??{open_alerts:0,critical_alerts:0,high_alerts:0,over_24h_alerts:0,overdue_tasks:0,operations_alerts:0,inventory_alerts:0,commercial_alerts:0,service_alerts:0,commercial_value_at_risk_net_huf:0,avg_alert_age_hours:0,control_health_score:100})as Kpi;
  const health=(h??{open_system_alerts:0,critical_system_alerts:0,failed_or_blocked_integration_jobs:0,failed_webhooks_7d:0,last_control_cycle_at:null})as Health,cats=(c??[])as Cat[],loadError=Boolean(qe||ke||he||ce),canAct=canManage&&!loadError;

  return <section className="adminMain">
    <span className="eyebrow">Pro · Üzleti irányítóközpont</span>
    <h1 className="sectionTitle">Irányítóközpont</h1>
    <p className="lead">Egyesített kockázati és döntési sor a műveletek, készlet, ügyfélszolgálat, értékesítés és integrációk fölött. A rendszer javasol és priorizál; magas hatású üzleti állapotot nem módosít automatikusan.</p>
    {canAct?<div className="actions"><ControlCycleButton/></div>:!canManage?<div className="adminAuditNotice"><strong>Csak olvasási jogosultság.</strong><p>A jelzéseket és feladatokat megtekintheted, de kontrollciklust futtatni, jelzést lezárni vagy feladatot módosítani csak webshop-admin jogosultsággal lehet.</p></div>:<div className="adminAuditNotice"><strong>Módosítás átmenetileg letiltva.</strong><p>Hiányos kontrolladat mellett nem futtatunk ciklust és nem módosítunk jelzést vagy feladatot.</p></div>}
    {loadError&&<div className="errorNotice" role="alert"><strong>Az irányítóközpont adatainak egy része most nem tölthető be.</strong> A hiányzó mutatók helyén nem feltételezünk hibamentes állapotot.</div>}

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Kontroll-egészség</span><div className="price">{ke?'—':`${kpi.control_health_score}/100`}</div></div>
      <div className="card"><span className="badge">Nyitott jelzés</span><div className="price">{ke?'—':kpi.open_alerts}</div></div>
      <div className="card"><span className="badge">Kritikus</span><div className="price">{ke?'—':kpi.critical_alerts}</div></div>
      <div className="card"><span className="badge">24 órán túl</span><div className="price">{ke?'—':kpi.over_24h_alerts}</div></div>
      <div className="card"><span className="badge">Lejárt feladat</span><div className="price">{ke?'—':kpi.overdue_tasks}</div></div>
      <div className="card"><span className="badge">Érték kockázatban</span><div className="price">{ke?'—':formatHuf(Number(kpi.commercial_value_at_risk_net_huf))}</div></div>
    </div>

    <section className="card">
      <h2>Rendszerállapot</h2>
      {he?<p className="muted">A rendszerállapot most nem tölthető be.</p>:<p className="muted">Nyitott rendszerjelzés: {health.open_system_alerts} · kritikus: {health.critical_system_alerts} · hibás/blokkolt integrációs feladat: {health.failed_or_blocked_integration_jobs} · sikertelen külső visszajelzés 7 nap: {health.failed_webhooks_7d} · utolsó kontrollciklus: {health.last_control_cycle_at?new Date(health.last_control_cycle_at).toLocaleString('hu-HU'):'még nem futott'}</p>}
    </section>

    <section className="card">
      <h2>Terhelés kategóriánként</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Terület</th><th>Súlyosság</th><th>Darab</th><th>Legmagasabb prioritás</th><th>Átlagos kor</th></tr></thead>
        <tbody>{cats.map(x=><tr key={`${x.category}:${x.severity}`}><td>{labels[x.category]??x.category}</td><td><span className={`adminStatePill ${stateTone(x.severity)}`}>{severityLabel(x.severity)}</span></td><td>{x.alert_count}</td><td>{x.max_priority}</td><td>{Number(x.avg_age_hours).toFixed(1)} óra</td></tr>)}</tbody>
      </table></div>
      {!ce&&cats.length===0&&<p className="muted">Nincs kategóriánkénti nyitott terhelés.</p>}
    </section>

    <section className="card">
      <h2>Döntési és kivételsor</h2>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Jelzés</th><th>Terület</th><th>Súlyosság</th><th>Prioritás</th><th>Kor</th><th>Állapot</th><th>Javaslat</th><th>Feladat</th><th>Forrás</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(r=><tr key={r.alert_id}>
          <td><strong>{r.title}</strong><div className="muted">{r.description}</div></td>
          <td>{labels[r.category]??r.category}</td>
          <td><span className={`adminStatePill ${stateTone(r.severity)}`}>{severityLabel(r.severity)}</span></td>
          <td>{r.priority_score}</td>
          <td>{Number(r.age_hours).toFixed(1)} óra</td>
          <td><span className={`adminStatePill ${stateTone(r.status)}`}>{alertStatusLabel(r.status)}</span>{r.snoozed_until&&<div className="muted">halasztva: {new Date(r.snoozed_until).toLocaleString('hu-HU')}</div>}</td>
          <td>{displayRecommendation(r.recommended_action)}</td>
          <td>{r.task_status?<><strong>{taskStatusLabel(r.task_status)}</strong>{r.task_due_at&&<div className="muted">Határidő: {new Date(r.task_due_at).toLocaleString('hu-HU')}{r.task_overdue?' · LEJÁRT':''}</div>}{canAct?<TaskActions taskId={r.task_id} status={r.task_status}/>:<div className="muted">Csak olvasás</div>}</>:'—'}</td>
          <td><Link className="btn btnGhost" href={moduleRoutes[r.category]??'/admin'}>Forrásmodul</Link></td>
          <td>{canAct?<AlertActions alertId={r.alert_id} status={r.status}/>:<span className="muted">Csak olvasás</span>}</td>
        </tr>)}</tbody>
      </table></div>
      {!qe&&rows.length===0&&<p className="muted">{canAct?'Nincs nyitott kontrolljelzés. Szükség esetén futtasd a kontrollciklust az aktuális állapot kiértékeléséhez.':'Nincs nyitott kontrolljelzés.'}</p>}
    </section>
  </section>;
}
