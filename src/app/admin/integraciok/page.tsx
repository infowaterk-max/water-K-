import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { IntegrationJobControl } from '@/components/admin/integration-job-control';
import { requirePlanFeature } from '@/lib/plans/access';
import { requireCurrentStoreContext } from '@/lib/instances/scope';

const kindLabels:Record<string,string>={payment_create:'Fizetés indítása',payment_callback:'Fizetési callback',shipment_create:'Szállítás létrehozása',invoice_create:'Számlakészítés',email_send:'E-mail küldés',logistics_email:'Logisztikai partner értesítése'};
const statusLabels:Record<string,string>={pending:'Várakozik',processing:'Folyamatban',succeeded:'Sikeres',failed:'Sikertelen',blocked:'Blokkolt'};
type Job={id:string;order_id:string|null;kind:string;provider:string;status:string;attempt_count:number|null;last_error:string|null;next_attempt_at:string|null;created_at:string;updated_at:string};
type Props={searchParams:Promise<{status?:string}>};

export default async function IntegrationsAdmin({searchParams}:Props){
  await requirePlanFeature('advancedIntegrations');
  const scope=await requireCurrentStoreContext('integrations.manage');
  const params=await searchParams; const status=(params.status??'').trim(); let jobs:Job[]=[]; let loadError=false;
  try{const admin=createAdminClient();let query=admin.from('integration_jobs').select('id,order_id,kind,provider,status,attempt_count,last_error,next_attempt_at,created_at,updated_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(200);if(status&&Object.prototype.hasOwnProperty.call(statusLabels,status))query=query.eq('status',status);const result=await query;if(result.error)loadError=true;else jobs=(result.data??[]) as Job[];}catch{loadError=true;}
  const counts=Object.fromEntries(Object.keys(statusLabels).map(key=>[key,jobs.filter(job=>job.status===key).length]));
  return <section className="adminMain"><span className="eyebrow">Pro · Integrációk</span><h1 className="sectionTitle">Integrációs műveleti központ</h1><p className="lead">Fizetés, számlázás, futár és tranzakciós e-mail feladatok részletes állapota és kézi újrafuttatása.</p>
    {loadError&&<div className="errorNotice" role="alert">Az integrációs feladatok most nem tölthetők be. Ne indíts manuális ismétlést, amíg a lista nem frissül.</div>}
    <div className="cards" aria-label="Integrációs állapotok">{Object.entries(statusLabels).map(([key,label])=><Link key={key} className="card textLink" href={`/admin/integraciok?status=${key}`}><strong>{counts[key]??0}</strong><p className="muted">{label}</p></Link>)}</div>
    <div className="actions"><Link className="btn btnGhost" href="/admin/integraciok">Összes feladat</Link></div>
    <div className="tableCard"><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Integrációs feladatok</caption><thead><tr><th scope="col">Feladat</th><th scope="col">Szolgáltató</th><th scope="col">Állapot</th><th scope="col">Próbálkozás</th><th scope="col">Következő futás</th><th scope="col">Hiba</th><th scope="col">Művelet</th></tr></thead><tbody>{jobs.map(job=><tr key={job.id}><td><strong>{kindLabels[job.kind]??job.kind}</strong>{job.order_id&&<><br/><Link className="textLink" href={`/admin/rendelesek/${job.order_id}`}>Rendelés megnyitása</Link></>}</td><td>{job.provider}</td><td><span className="badge">{statusLabels[job.status]??job.status}</span></td><td>{job.attempt_count??0}</td><td>{job.next_attempt_at?new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(job.next_attempt_at)):'—'}</td><td>{job.last_error?<span className="muted">{job.last_error}</span>:'—'}</td><td><IntegrationJobControl id={job.id} disabled={job.status==='processing'||job.status==='succeeded'}/></td></tr>)}</tbody></table></div>{!loadError&&jobs.length===0&&<p className="muted" style={{padding:20}}>Nincs a szűrésnek megfelelő integrációs feladat.</p>}</div>
  </section>;
}
