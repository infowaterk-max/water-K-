import {requirePlatformOperator} from '@/lib/auth/platform-operator';
import {createAdminClient} from '@/lib/supabase/admin';
import {startBusinessPulseTrialAction} from './actions';

export const dynamic='force-dynamic';

type Instance={id:string;name:string;slug:string;status:string;subscription_plan:string};
type Trial={id:string;instance_id:string;status:string;starts_at:string;ends_at:string;created_at:string};

function date(value:string){return new Date(value).toLocaleDateString('hu-HU')}

export default async function PlatformBusinessPulsePage(){
  await requirePlatformOperator();
  const db=createAdminClient();
  const[{data:instances,error:instanceError},{data:trials,error:trialError}]=await Promise.all([
    db.from('webshop_instances').select('id,name,slug,status,subscription_plan').in('status',['pilot','active']).order('created_at',{ascending:true}),
    db.from('business_pulse_trials').select('id,instance_id,status,starts_at,ends_at,created_at').order('created_at',{ascending:false}).limit(100),
  ]);
  const rows=(instances??[]) as Instance[];
  const trialRows=(trials??[]) as Trial[];
  const latest=new Map<string,Trial>();
  for(const trial of trialRows)if(!latest.has(trial.instance_id))latest.set(trial.instance_id,trial);

  return <section className="adminMain">
    <span className="eyebrow">Shoperation Platform · Block 10</span>
    <h1 className="sectionTitle">Business Pulse trial vezérlés</h1>
    <p className="lead">A 30 napos teljes Pro trial explicit platformművelet. Nem módosítja a webshop Alap/Pro csomagmezőjét vagy pilot/active státuszát; csak időkorlátos, release-elt Pro entitlementeket hoz létre.</p>
    {(instanceError||trialError)&&<div className="errorNotice" role="alert"><strong>A trial-állapot nem tölthető be teljesen.</strong><p>Ilyen állapotban ne indíts új trialt.</p></div>}

    {!instanceError&&!trialError&&<section className="card">
      <div className="adminTableScroll"><table className="adminTable">
        <thead><tr><th>Webshop</th><th>Jelenlegi csomag</th><th>Trial</th><th>Időablak</th><th>Művelet</th></tr></thead>
        <tbody>{rows.map(instance=>{
          const trial=latest.get(instance.id);
          const active=trial?.status==='active';
          return <tr key={instance.id}>
            <td><strong>{instance.name}</strong><br/><code>{instance.slug}</code></td>
            <td>Shoperation {instance.subscription_plan==='pro'?'Pro':'Alap'} · {instance.status}</td>
            <td>{trial?.status??'nincs'}</td>
            <td>{trial?`${date(trial.starts_at)} – ${date(trial.ends_at)}`:'—'}</td>
            <td>{active?<span className="badge">Aktív trial</span>:<form action={startBusinessPulseTrialAction}><input type="hidden" name="instanceId" value={instance.id}/><button className="btn btnPrimary" type="submit">30 napos trial indítása</button></form>}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>}
  </section>;
}
