import { createAdminClient } from '@/lib/supabase/admin';
import { AssuranceRunButton,AssuranceFindingActions } from '@/components/admin/assurance-actions';
import { requirePlatformOperator } from '@/lib/auth/platform-operator';

export const dynamic='force-dynamic';

type Ready={assurance_score:number;controls:number;fresh_passes:number;stale_controls:number;critical_open:number;high_open:number;accepted_risks:number;readiness_status:string};
type Finding={finding_id:string;status:string;severity:string;title:string;description:string;occurrence_count:number;age_hours:number|string;accepted_risk_expires_at:string|null;control_key:string;control_version:number;category:string;evidence_hash:string|null;evidence_captured_at:string|null};
type Control={control_key:string;version:number;name:string;category:string;severity:string;weight:number;status:string|null;captured_at:string|null;stale:boolean};
type Run={id:string;status:string;started_at:string;controls_checked:number;controls_passed:number;evidence_bundle_hash:string};

const severityLabel:Record<string,string>={critical:'Kritikus',high:'Magas',medium:'Közepes',low:'Alacsony',info:'Tájékoztató'};
const findingStatusLabel:Record<string,string>={open:'Nyitott',acknowledged:'Átvett',accepted_risk:'Elfogadott kockázat',resolved:'Megoldott'};
const controlStatusLabel:Record<string,string>={pass:'Megfelelt',passed:'Megfelelt',fail:'Hiba',failed:'Hiba',warning:'Figyelmeztetés',unknown:'Nincs mérés'};
const readinessLabel:Record<string,string>={ready:'Rendben',healthy:'Rendben',degraded:'Figyelmet igényel',blocked:'Blokkolt',unknown:'Nincs elég adat'};
const categoryLabel:Record<string,string>={security:'Biztonság',operations:'Működés',database:'Adatbázis',release:'Kiadás',tenant:'Tenant izoláció',integration:'Integráció',availability:'Elérhetőség'};

const readable=(value:string,map:Record<string,string>)=>map[value]??value.replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
const toneForSeverity=(severity:string)=>severity==='critical'?'danger':severity==='high'?'warning':severity==='medium'?'warning':'neutral';
const toneForControl=(status:string|null,stale:boolean)=>stale?'warning':status==='pass'||status==='passed'?'ok':status==='fail'||status==='failed'?'danger':'neutral';

export default async function AssurancePage(){
  await requirePlatformOperator();
  const a=createAdminClient();
  const[readinessResult,findingResult,controlResult,runResult]=await Promise.all([
    a.from('assurance_readiness').select('*').maybeSingle(),
    a.from('assurance_finding_queue').select('*').order('severity',{ascending:false}).limit(250),
    a.from('assurance_latest_control_results').select('*').order('control_key'),
    a.from('assurance_recent_runs').select('*').limit(10),
  ]);

  const ready=(readinessResult.data??{assurance_score:0,controls:0,fresh_passes:0,stale_controls:0,critical_open:0,high_open:0,accepted_risks:0,readiness_status:'unknown'}) as Ready;
  const findings=(findingResult.data??[]) as Finding[];
  const controls=(controlResult.data??[]) as Control[];
  const history=(runResult.data??[]) as Run[];
  const loadError=Boolean(readinessResult.error||findingResult.error||controlResult.error||runResult.error);
  const lastRun=history[0]??null;

  return <section className="adminMain">
    <span className="eyebrow">Shoperation · Platformbiztonság</span>
    <h1 className="sectionTitle">Biztosítékok</h1>
    <p className="lead">Automatikus kontrollokkal ellenőrizzük, hogy a platform kritikus biztonsági és működési szabályai ténylegesen teljesülnek-e, és van-e friss bizonyíték az eredményre.</p>

    {loadError&&<div className="errorNotice" role="alert"><strong>Az ellenőrzési adatok egy része most nem tölthető be.</strong><p>Ne tekintsd zöldnek azt a kontrollt, amelyhez nincs friss eredmény.</p></div>}

    <section className="auditGuide">
      <div><span className="eyebrow">Mit jelent ez az oldal?</span><h2>Nem egy újabb napló, hanem ellenőrizhető bizonyíték</h2></div>
      <div className="auditGuideGrid">
        <div><strong>1. Kontroll</strong><span>Egy konkrét szabály, például tenant izoláció, jogosultság vagy release-biztonság.</span></div>
        <div><strong>2. Eltérés</strong><span>Ha a kontroll nem teljesül, nyitott eltérés jön létre súlyossággal és életkorral.</span></div>
        <div><strong>3. Bizonyíték</strong><span>A futás eredményéhez időbélyeg és bizonyíték-hash tartozik, így visszakövethető.</span></div>
      </div>
    </section>

    <div className="actions"><AssuranceRunButton/></div>

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Biztosítéki pontszám</span><div className="price">{ready.assurance_score}%</div><p><span className={`adminStatePill ${ready.readiness_status==='ready'||ready.readiness_status==='healthy'?'ok':ready.readiness_status==='blocked'?'danger':'warning'}`}>{readable(ready.readiness_status,readinessLabel)}</span></p></div>
      <div className="card"><span className="badge">Friss, megfelelt kontroll</span><div className="price">{ready.fresh_passes}/{ready.controls}</div><p className="muted">A friss ellenőrzésekből ennyi felelt meg.</p></div>
      <div className="card"><span className="badge">Kritikus eltérés</span><div className="price">{ready.critical_open}</div><p className="muted">Release előtt mindig kivizsgálandó.</p></div>
      <div className="card"><span className="badge">Magas eltérés</span><div className="price">{ready.high_open}</div><p className="muted">Rövid határidővel kezelendő.</p></div>
      <div className="card"><span className="badge">Elavult mérés</span><div className="price">{ready.stale_controls}</div><p className="muted">Újrafuttatást igénylő kontroll.</p></div>
      <div className="card"><span className="badge">Elfogadott kockázat</span><div className="price">{ready.accepted_risks}</div><p className="muted">Dokumentált, időben korlátozott kivétel.</p></div>
    </div>

    <section className="card">
      <div className="adminToolbar"><div><span className="eyebrow">Kezelendő tételek</span><h2>Nyitott eltérések</h2></div><span className="muted">{findings.length} tétel</span></div>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Kontroll</th><th>Súlyosság</th><th>Állapot</th><th>Kor</th><th>Bizonyíték</th><th>Művelet</th></tr></thead>
        <tbody>{findings.map(x=><tr key={x.finding_id}>
          <td><strong>{x.title}</strong><div className="muted">{readable(x.category,categoryLabel)} · {x.description}</div><details><summary>Technikai azonosító</summary><code>{x.control_key} · v{x.control_version}</code></details></td>
          <td><span className={`adminStatePill ${toneForSeverity(x.severity)}`}>{readable(x.severity,severityLabel)}</span></td>
          <td>{readable(x.status,findingStatusLabel)}{x.accepted_risk_expires_at&&<div className="muted">lejár: {new Date(x.accepted_risk_expires_at).toLocaleDateString('hu-HU')}</div>}</td>
          <td>{Number(x.age_hours).toFixed(1)} óra<div className="muted">{x.occurrence_count} előfordulás</div></td>
          <td><code>{x.evidence_hash?.slice(0,10)??'Nincs'}</code><div className="muted">{x.evidence_captured_at?new Date(x.evidence_captured_at).toLocaleString('hu-HU'):'Nincs friss bizonyíték'}</div></td>
          <td><AssuranceFindingActions findingId={x.finding_id} status={x.status} severity={x.severity}/></td>
        </tr>)}</tbody>
      </table></div>
      {findings.length===0&&<p className="muted">Nincs nyitott biztosítéki eltérés.</p>}
    </section>

    <section className="card">
      <div className="adminToolbar"><div><span className="eyebrow">Teljes kontrollkészlet</span><h2>Kontrollfedettség</h2></div><span className="muted">{controls.length} kontroll</span></div>
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Kontroll</th><th>Kategória</th><th>Súly</th><th>Eredmény</th><th>Frissesség</th></tr></thead>
        <tbody>{controls.map(x=><tr key={x.control_key}>
          <td><strong>{x.name}</strong><details><summary>Technikai azonosító</summary><code>{x.control_key} · v{x.version}</code></details></td>
          <td>{readable(x.category,categoryLabel)}</td>
          <td>{x.weight}</td>
          <td><span className={`adminStatePill ${toneForControl(x.status,x.stale)}`}>{readable(x.status??'unknown',controlStatusLabel)}</span></td>
          <td>{x.stale?'Elavult':'Friss'}{x.captured_at&&<div className="muted">{new Date(x.captured_at).toLocaleString('hu-HU')}</div>}</td>
        </tr>)}</tbody>
      </table></div>
      {controls.length===0&&<p className="muted">Még nincs rögzített kontrolleredmény. Futtasd le az első ellenőrzést.</p>}
    </section>

    <section className="card">
      <div className="adminToolbar"><div><span className="eyebrow">Futtatási előzmények</span><h2>Legutóbbi bizonyítéki csomagok</h2></div>{lastRun&&<span className="muted">Utolsó futás: {new Date(lastRun.started_at).toLocaleString('hu-HU')}</span>}</div>
      {history.map(x=><div className="auditRunRow" key={x.id}><span><strong>{x.controls_passed}/{x.controls_checked} kontroll megfelelt</strong><br/><span className="muted">{new Date(x.started_at).toLocaleString('hu-HU')} · {readable(x.status,{completed:'Befejezett',failed:'Sikertelen',running:'Folyamatban'})}</span></span><code>{x.evidence_bundle_hash.slice(0,12)}</code></div>)}
      {!history.length&&<p className="muted">Még nincs bizonyítéki csomag.</p>}
    </section>
  </section>;
}
