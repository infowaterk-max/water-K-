import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getIntegrationRegistry } from '@/lib/integrations/registry';
import { IntegrationJobControl } from '@/components/admin/integration-job-control';

export const dynamic='force-dynamic';
const stateLabel:Record<string,string>={ready:'Aktív',configured:'Konfigurálva',blocked:'Külső adatra vár',not_configured:'Nincs konfigurálva'};
const statusLabel:Record<string,string>={pending:'Várakozik',processing:'Folyamatban',succeeded:'Sikeres',failed:'Sikertelen',blocked:'Blokkolt'};
const kindLabel:Record<string,string>={payment_create:'Fizetés indítása',payment_callback:'Fizetési callback',shipment_create:'Szállítás létrehozása',invoice_create:'Számlakészítés',email_send:'E-mail küldés'};

export default async function AdminSettingsPage(){
  const integrations=getIntegrationRegistry();
  let jobs:Array<{id:string;kind:string;provider:string;status:string;attempt_count:number;last_error:string|null;created_at:string;updated_at:string;order_id:string|null}>=[];
  let webhooks:Array<{id:string;provider:string;status:string;signature_valid:boolean;created_at:string;error_message:string|null}>=[];
  let dbHealthy=false; let dataLoadError=false;
  try{
    const admin=createAdminClient();
    const [jobResult,webhookResult,pingResult]=await Promise.all([
      admin.from('integration_jobs').select('id,kind,provider,status,attempt_count,last_error,created_at,updated_at,order_id').order('created_at',{ascending:false}).limit(25),
      admin.from('webhook_events').select('id,provider,status,signature_valid,created_at,error_message').order('created_at',{ascending:false}).limit(25),
      admin.from('products').select('id').limit(1),
    ]);
    if(jobResult.error||webhookResult.error||pingResult.error)dataLoadError=true;
    if(!jobResult.error&&jobResult.data)jobs=jobResult.data;
    if(!webhookResult.error&&webhookResult.data)webhooks=webhookResult.data;
    dbHealthy=!pingResult.error;
  }catch{dataLoadError=true;}
  const problems=jobs.filter(j=>j.status==='failed'||j.status==='blocked').length;
  const queued=jobs.filter(j=>j.status==='pending'||j.status==='processing').length;
  const staleProcessing=jobs.filter(j=>j.status==='processing'&&Date.now()-new Date(j.updated_at).getTime()>30*60*1000).length;
  const invalidWebhooks=webhooks.filter(event=>!event.signature_valid).length;
  const cronConfigured=Boolean(process.env.CRON_SECRET);
  const serverKeyConfigured=Boolean(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
  const emailConfigured=Boolean(process.env.RESEND_API_KEY||process.env.EMAIL_API_KEY);
  const operationalRisk=problems+staleProcessing+invalidWebhooks+(cronConfigured?0:1)+(serverKeyConfigured?0:1);
  return <section className="adminMain settingsPage">
    <span className="eyebrow">Admin · Beállítások</span><h1 className="sectionTitle">Integrációk és rendszerállapot</h1><p className="lead">Csak konfigurációs állapotot mutatunk; titkos kulcsérték ezen a felületen soha nem jelenik meg.</p>
    {dataLoadError&&<div className="errorNotice" role="alert"><strong>Az operációs adatok egy része nem tölthető be.</strong> A nulla értékeket ilyenkor ne tekintsd biztosan hibamentes állapotnak.</div>}
    {operationalRisk>0&&<section className="card"><div className="adminToolbar"><div><span className="eyebrow">Rendszerfigyelmeztetés</span><h2>{operationalRisk} ellenőrizendő tétel</h2><p className="muted">Sikertelen/blokkolt feladat: {problems} · beragadt feldolgozás: {staleProcessing} · nem hiteles webhook: {invalidWebhooks}.</p></div><Link className="btn btnPrimary" href="/admin/integraciok">Integrációs központ</Link></div></section>}
    <div className="cards">{integrations.map(item=><section className="card" key={item.id}><div className="adminToolbar"><h2>{item.label}</h2><span className="badge">{stateLabel[item.state]}</span></div><p className="muted">{item.detail}</p></section>)}</div>
    <div className="cards"><section className="card"><span className="badge">Adatbázis</span><h2>{dbHealthy?'Elérhető':'Hiba'}</h2><p className="muted">Szerveroldali Supabase lekérdezési próba.</p></section><section className="card"><span className="badge">Admin kulcs</span><h2>{serverKeyConfigured?'Konfigurálva':'Hiányzik'}</h2><p className="muted">A service-role/secret értéket nem jelenítjük meg.</p></section><section className="card"><span className="badge">Worker</span><h2>{cronConfigured?'Védett':'Nincs kulcs'}</h2><p className="muted">CRON_SECRET csak jelenlét szerint ellenőrizve.</p></section><section className="card"><span className="badge">E-mail</span><h2>{emailConfigured?'Konfigurálva':'Nincs kulcs'}</h2><p className="muted">Tranzakciós e-mail provider kulcsának jelenléte.</p></section></div>
    <div className="cards"><section className="card"><span className="badge">Sorban</span><h2>{queued}</h2><p className="muted">Függő vagy éppen futó integrációs művelet.</p></section><section className="card"><span className="badge">Figyelmeztetés</span><h2>{problems}</h2><p className="muted">Blokkolt vagy sikertelen integrációs feladat.</p></section><section className="card"><span className="badge">Webhook</span><h2>{webhooks.length}</h2><p className="muted">Nem hiteles esemény: {invalidWebhooks}.</p></section></div>
    <div className="tableCard"><div className="adminToolbar"><div><h2>Integrációs outbox</h2><p className="muted">A belső, RLS-sel védett feladatlista szerveroldali admin klienssel olvasva.</p></div><Link className="btn" href="/admin/integraciok">Teljes műveleti központ</Link></div><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Integrációs outbox</caption><thead><tr><th scope="col">Szolgáltató</th><th scope="col">Művelet</th><th scope="col">Állapot</th><th scope="col">Próba</th><th scope="col">Hiba</th><th scope="col">Időpont</th><th scope="col">Művelet</th></tr></thead><tbody>{jobs.map(job=><tr key={job.id}><td><Link className="textLink" href={`/admin/beallitasok/integraciok/${job.id}`}><strong>{job.provider}</strong></Link></td><td>{kindLabel[job.kind]??job.kind}</td><td><span className="badge">{statusLabel[job.status]??job.status}</span></td><td>{job.attempt_count}</td><td>{job.last_error??'—'}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(job.created_at))}</td><td><IntegrationJobControl id={job.id} disabled={job.status==='processing'||job.status==='succeeded'}/></td></tr>)}</tbody></table></div>{!dataLoadError&&jobs.length===0&&<p className="muted" style={{padding:20}}>Még nincs integrációs feladat.</p>}</div>
    <div className="tableCard"><h2>Webhook napló</h2><div className="adminTableScroll"><table className="adminTable"><caption className="srOnly">Webhook események</caption><thead><tr><th scope="col">Szolgáltató</th><th scope="col">Állapot</th><th scope="col">Aláírás</th><th scope="col">Hiba</th><th scope="col">Időpont</th></tr></thead><tbody>{webhooks.map(event=><tr key={event.id}><td>{event.provider}</td><td><span className="badge">{event.status}</span></td><td>{event.signature_valid?'Hiteles':'Nem hitelesített'}</td><td>{event.error_message??'—'}</td><td>{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(event.created_at))}</td></tr>)}</tbody></table></div>{!dataLoadError&&webhooks.length===0&&<p className="muted" style={{padding:20}}>Még nincs webhook esemény.</p>}</div>
  </section>;
}
