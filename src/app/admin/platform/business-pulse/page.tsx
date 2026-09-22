import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';
import {activateBusinessPulseTrialAction,startBusinessPulseTrialAction} from './actions';

export const dynamic='force-dynamic';

type Instance={id:string;name:string;slug:string;status:string;subscription_plan:string};
type Trial={id:string;instance_id:string;status:string;starts_at:string;ends_at:string;retention_until:string|null;activation_plan:string|null;created_at:string};
type Report={trial_id:string;recommended_plan:'alap'|'pro';confidence:string};
const date=(value:string)=>new Date(value).toLocaleDateString('hu-HU');

export default async function PlatformBusinessPulsePage(){
  await requirePlatformOperator();
  const db=createAdminClient();
  const[{data:instances,error:instanceError},{data:trials,error:trialError},{data:reports,error:reportError}]=await Promise.all([
    db.from('webshop_instances').select('id,name,slug,status,subscription_plan').in('status',['pilot','active']).order('created_at',{ascending:true}),
    db.from('business_pulse_trials').select('id,instance_id,status,starts_at,ends_at,retention_until,activation_plan,created_at').order('created_at',{ascending:false}).limit(100),
    db.from('business_pulse_reports').select('trial_id,recommended_plan,confidence').order('generated_at',{ascending:false}).limit(100),
  ]);
  const rows=(instances??[]) as Instance[],trialRows=(trials??[]) as Trial[],reportRows=(reports??[]) as Report[];
  const latest=new Map<string,Trial>();for(const trial of trialRows)if(!latest.has(trial.instance_id))latest.set(trial.instance_id,trial);
  const reportByTrial=new Map(reportRows.map(report=>[report.trial_id,report]));
  const loadError=Boolean(instanceError||trialError||reportError);

  return <section className="adminMain">
    <span className="eyebrow">Shoperation Platform · Block 10</span>
    <h1 className="sectionTitle">Business Pulse trial vezérlés</h1>
    <p className="lead">A 30 napos teljes Pro trial kizárólag Pilot + Alap webshopnál indítható. A próba nem írja át a csomagot; a 30. napi Business Pulse után külön Alap vagy Pro aktiválási döntés szükséges.</p>
    {loadError&&<div className="errorNotice" role="alert"><strong>A trial-állapot nem tölthető be teljesen.</strong><p>Ilyen állapotban ne indíts vagy aktiválj trialt.</p></div>}

    {!loadError&&<section className="card"><div className="adminTableScroll"><table className="adminTable">
      <thead><tr><th>Webshop</th><th>Jelenlegi csomag</th><th>Trial</th><th>Business Pulse</th><th>Művelet</th></tr></thead>
      <tbody>{rows.map(instance=>{
        const trial=latest.get(instance.id),report=trial?reportByTrial.get(trial.id):undefined;
        const retentionExpired=Boolean(trial?.status==='paused'&&trial.retention_until&&new Date(trial.retention_until).getTime()<Date.now());
        const canStart=instance.status==='pilot'&&instance.subscription_plan==='alap'&&!trial;
        return <tr key={instance.id}>
          <td><strong>{instance.name}</strong><br/><code>{instance.slug}</code></td>
          <td>Shoperation {instance.subscription_plan==='pro'?'Pro':'Alap'} · {instance.status}</td>
          <td>{trial?<><strong>{trial.status}</strong><br/><span className="muted">{date(trial.starts_at)} – {date(trial.ends_at)}</span>{trial.retention_until&&<><br/><span className="muted">Adatretention: {date(trial.retention_until)}</span></>}</>:'nincs'}</td>
          <td>{report?<>Javaslat: <strong>{report.recommended_plan==='pro'?'Pro':'Alap'}</strong><br/><span className="muted">Bizonyosság: {report.confidence}</span></>:'—'}</td>
          <td>
            {canStart&&<form action={startBusinessPulseTrialAction}><input type="hidden" name="instanceId" value={instance.id}/><button className="btn btnPrimary" type="submit">30 napos trial indítása</button></form>}
            {!trial&&instance.subscription_plan==='pro'&&<span className="badge">Már Pro · trial nem szükséges</span>}
            {!trial&&instance.status!=='pilot'&&<span className="badge">Trial csak Pilot állapotból</span>}
            {trial?.status==='active'&&<span className="badge">Aktív trial</span>}
            {trial&&['completed','paused'].includes(trial.status)&&!retentionExpired&&<div className="actions">
              <form action={activateBusinessPulseTrialAction}><input type="hidden" name="trialId" value={trial.id}/><input type="hidden" name="plan" value="alap"/><button className="btn" type="submit">Aktiválás Alapként</button></form>
              <form action={activateBusinessPulseTrialAction}><input type="hidden" name="trialId" value={trial.id}/><input type="hidden" name="plan" value="pro"/><button className="btn btnPrimary" type="submit">Aktiválás Próként</button></form>
            </div>}
            {retentionExpired&&<span className="badge">Retention lejárt · automatikus törlés nincs</span>}
            {trial?.status==='activated'&&<span className="badge">Aktiválva: {trial.activation_plan==='pro'?'Pro':'Alap'}</span>}
          </td>
        </tr>;
      })}</tbody>
    </table></div></section>}
  </section>;
}
