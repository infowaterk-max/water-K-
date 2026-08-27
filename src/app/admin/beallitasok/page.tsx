import { createClient } from '@/lib/supabase/server';
import { getIntegrationRegistry } from '@/lib/integrations/registry';
import { IntegrationJobControl } from '@/components/admin/integration-job-control';

const stateLabel:Record<string,string>={ready:'Aktív',configured:'Konfigurálva',blocked:'Külső adatra vár',not_configured:'Nincs konfigurálva'};

export default async function AdminSettingsPage(){
  const integrations=getIntegrationRegistry();
  let jobs:Array<{id:string;kind:string;provider:string;status:string;attempt_count:number;last_error:string|null;created_at:string;order_id:string|null}>=[];
  let webhooks:Array<{id:string;provider:string;status:string;signature_valid:boolean;created_at:string;error_message:string|null}>=[];
  try{
    const supabase=await createClient();
    const [jobResult,webhookResult]=await Promise.all([
      supabase.from('integration_jobs').select('id,kind,provider,status,attempt_count,last_error,created_at,order_id').order('created_at',{ascending:false}).limit(25),
      supabase.from('webhook_events').select('id,provider,status,signature_valid,created_at,error_message').order('created_at',{ascending:false}).limit(25),
    ]);
    if(!jobResult.error&&jobResult.data) jobs=jobResult.data;
    if(!webhookResult.error&&webhookResult.data) webhooks=webhookResult.data;
  }catch{}
  const problems=jobs.filter(j=>j.status==='failed'||j.status==='blocked').length;
  return <section className="adminMain">
    <span className="eyebrow">Admin · Beállítások</span><h1 className="sectionTitle">Integrációk és műveleti állapot</h1>
    <div className="cards">{integrations.map(item=><section className="card" key={item.id}><div className="adminToolbar"><h2>{item.label}</h2><span className="badge">{stateLabel[item.state]}</span></div><p className="muted">{item.detail}</p></section>)}</div>
    <div className="cards"><section className="card"><span className="badge">Outbox</span><h2>{jobs.length} művelet</h2><p className="muted">Legutóbbi külső integrációs feladatok.</p></section><section className="card"><span className="badge">Figyelmeztetés</span><h2>{problems}</h2><p className="muted">Blokkolt vagy sikertelen integrációs feladat.</p></section><section className="card"><span className="badge">Webhook</span><h2>{webhooks.length}</h2><p className="muted">Legutóbbi bejövő események.</p></section></div>
    <div className="tableCard"><h2>Integrációs outbox</h2><table className="adminTable"><thead><tr><th>Provider</th><th>Művelet</th><th>Állapot</th><th>Próba</th><th>Hiba</th><th>Időpont</th><th>Művelet</th></tr></thead><tbody>{jobs.map(job=><tr key={job.id}><td>{job.provider}</td><td>{job.kind}</td><td><span className="badge">{job.status}</span></td><td>{job.attempt_count}</td><td>{job.last_error??'—'}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(job.created_at))}</td><td><IntegrationJobControl id={job.id} disabled={job.status==='processing'||job.status==='succeeded'}/></td></tr>)}</tbody></table>{jobs.length===0&&<p className="muted" style={{padding:20}}>Még nincs integrációs feladat.</p>}</div>
    <div className="tableCard"><h2>Webhook napló</h2><table className="adminTable"><thead><tr><th>Provider</th><th>Állapot</th><th>Aláírás</th><th>Hiba</th><th>Időpont</th></tr></thead><tbody>{webhooks.map(event=><tr key={event.id}><td>{event.provider}</td><td><span className="badge">{event.status}</span></td><td>{event.signature_valid?'Hiteles':'Nem hitelesített'}</td><td>{event.error_message??'—'}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(event.created_at))}</td></tr>)}</tbody></table>{webhooks.length===0&&<p className="muted" style={{padding:20}}>Még nincs webhook esemény.</p>}</div>
  </section>;
}
