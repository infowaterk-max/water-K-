import Link from 'next/link';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { communicationTemplates } from '@/lib/communication/templates';
import { renderCommunicationPreview } from '@/lib/communication/preview';
import { CommunicationJobActions } from '@/components/admin/communication-job-actions';

export const dynamic='force-dynamic';

type Job={id:string;recipient_email:string;purpose:string;template_key:string;payload:Record<string,unknown>|null;status:string;attempts:number;scheduled_at:string;sent_at:string|null;last_error:string|null;provider_message_id:string|null;created_at:string;requires_approval:boolean;approved_at:string|null};
type WorkerRun={id:string;source:string;status:string;recovered:number;claimed:number;sent:number;failed:number;blocked:number;error_message:string|null;started_at:string;finished_at:string|null};
type Event={id:string;job_id:string;action:string;previous_status:string|null;new_status:string|null;created_at:string};
type Consent={email:string;status:string};

const statusLabel:Record<string,string>={pending:'Várakozik',processing:'Feldolgozás',sent:'Elküldve',failed:'Hibás',blocked:'Blokkolva',cancelled:'Törölve'};
const runStatusLabel:Record<string,string>={running:'Fut',success:'Sikeres',failed:'Hibás'};
const actionLabel:Record<string,string>={cancel:'Törlés',reschedule:'Átütemezés',retry:'Újrapróbálás',approve:'Jóváhagyás'};
const templateByKey=new Map(communicationTemplates.map(t=>[t.key,t]));

export default async function CommunicationAdmin(){
  await requirePlanFeature('officeCommunication');
  const scope=await requireCurrentStoreContext('marketing.manage');
  const admin=createAdminClient();
  const [{data:jobData,error:jobError},{data:runData,error:runError},{data:eventData,error:eventError},{data:consentData,error:consentError}]=await Promise.all([
    admin.from('communication_jobs').select('id,recipient_email,purpose,template_key,payload,status,attempts,scheduled_at,sent_at,last_error,provider_message_id,created_at,requires_approval,approved_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(500),
    admin.from('communication_worker_runs').select('id,source,status,recovered,claimed,sent,failed,blocked,error_message,started_at,finished_at').eq('instance_id',scope.instanceId).order('started_at',{ascending:false}).limit(30),
    admin.from('communication_job_events').select('id,job_id,action,previous_status,new_status,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(50),
    admin.from('marketing_consents').select('email,status,occurred_at').eq('instance_id',scope.instanceId).eq('channel','email').order('occurred_at',{ascending:false}).limit(10000),
  ]);
  const jobs=(jobData??[]) as Job[];
  const runs=(runData??[]) as WorkerRun[];
  const events=(eventData??[]) as Event[];
  const latestConsent=new Map<string,string>();
  for(const row of (consentData??[]) as (Consent&{occurred_at?:string})[]){const key=row.email.trim().toLowerCase();if(!latestConsent.has(key))latestConsent.set(key,row.status);}
  const count=(s:string)=>jobs.filter(j=>j.status===s).length;
  const lastRun=runs[0]??null;
  const staleRunning=runs.filter(r=>r.status==='running'&&Date.now()-new Date(r.started_at).getTime()>30*60*1000).length;
  const awaitingApproval=jobs.filter(j=>j.status==='pending'&&j.requires_approval&&!j.approved_at);
  const loadError=Boolean(jobError||runError||eventError||consentError);
  const scheduledLabel=(value:string)=>new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));

  return <section className="adminMain">
    <div className="sectionIntro"><div><span className="eyebrow">Pro · Digitális iroda</span><h1 className="sectionTitle">Kommunikációs műveleti központ</h1><p className="lead">A webshop adminba épített e-mailes munkatér: küldési sor, előnézet, kézi jóváhagyás, auditnapló és háttérfolyamat-felügyelet. A normál rendelési értesítések továbbra is az Alap webshop részei.</p></div><Link className="btn btnPrimary" href="/admin/kommunikacio/iroda">Belső munkatér</Link></div>
    {loadError&&<div className="errorNotice" role="alert"><strong>A kommunikációs felügyelet egy része most nem olvasható.</strong> A hiányzó adatokat nem tekintjük üres vagy hibamentes állapotnak.</div>}
    <div className="cards adminMetricCards"><div className="card"><span className="badge">Jóváhagyásra vár</span><div className="price">{jobError?'—':awaitingApproval.length}</div></div><div className="card"><span className="badge">Hibás / blokkolt</span><div className="price">{jobError?'—':count('failed')+count('blocked')}</div></div><div className="card"><span className="badge">Utolsó háttérfutás</span><div className="price">{runError?'—':lastRun?runStatusLabel[lastRun.status]??lastRun.status:'Nincs futás'}</div></div><div className="card"><span className="badge">Beragadt futás</span><div className="price">{runError?'—':staleRunning}</div></div></div>

    {!jobError&&awaitingApproval.length>0&&<section><h2>Jóváhagyásra váró üzenetek</h2><div className="cards">{awaitingApproval.slice(0,20).map(j=>{const preview=renderCommunicationPreview(j.template_key,j.payload??{});const consent=j.purpose==='marketing'?(consentError?null:latestConsent.get(j.recipient_email.trim().toLowerCase())==='granted'):true;return <article className="card" key={j.id}><span className="badge">{j.purpose==='marketing'?(consent===null?'Marketing · hozzájárulás nem ellenőrizhető':consent?'Marketing · engedélyezett':'Marketing · nincs hozzájárulás'):'Tranzakciós'}</span><strong>{j.recipient_email}</strong><h3>{preview?.subject??'Ismeretlen sablon'}</h3><p style={{whiteSpace:'pre-wrap'}}>{preview?.body}</p><CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/></article>})}</div></section>}

    <section className="tableCard communicationQueueSection"><h2>Teljes küldési sor</h2>
      <div className="adminTableScroll communicationQueueDesktop"><table className="adminTable"><thead><tr><th>Címzett</th><th>Típus</th><th>Állapot</th><th>Ütemezés</th><th>Műveletek</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td>{j.recipient_email}</td><td><strong>{templateByKey.get(j.template_key)?.subject??j.template_key}</strong><details><summary>Technikai sablonazonosító</summary><code>{j.template_key}</code></details></td><td>{statusLabel[j.status]??j.status}</td><td>{scheduledLabel(j.scheduled_at)}</td><td>{!jobError?<CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/>:<span className="muted">Adatbetöltés szükséges</span>}</td></tr>)}</tbody></table></div>
      <div className="communicationQueueCards">{jobs.map(j=><article className="communicationQueueCard" key={j.id}><div className="communicationQueueCardHead"><strong>{j.recipient_email}</strong><span className="adminStatePill">{statusLabel[j.status]??j.status}</span></div><div><span className="communicationQueueLabel">Típus</span><strong>{templateByKey.get(j.template_key)?.subject??j.template_key}</strong></div><div><span className="communicationQueueLabel">Ütemezés</span><span>{scheduledLabel(j.scheduled_at)}</span></div><details><summary>Technikai sablonazonosító</summary><code>{j.template_key}</code></details>{!jobError?<CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/>:<span className="muted">Adatbetöltés szükséges</span>}</article>)}</div>
      {!jobError&&jobs.length===0&&<p className="muted">Nincs kiküldési feladat.</p>}
    </section>

    <section className="card"><h2>Legutóbbi admin műveletek</h2>{events.map(e=><p key={e.id}><strong>{actionLabel[e.action]??e.action}</strong> · {e.job_id.slice(0,8)}</p>)}{!eventError&&events.length===0&&<p className="muted">Még nincs admin műveleti esemény.</p>}</section>
    <section className="card"><h2>Háttérfolyamat futások</h2>{runs.slice(0,10).map(r=><p key={r.id}>{runStatusLabel[r.status]??r.status} · {r.sent} elküldve · {r.failed+r.blocked} probléma</p>)}{!runError&&runs.length===0&&<p className="muted">Még nincs háttérfolyamat-futás.</p>}</section>
    <section className="card"><h2>Sablonregiszter</h2>{communicationTemplates.map(t=><p key={t.key}><strong>{t.subject}</strong> · {t.purpose==='marketing'?'Marketing':'Tranzakciós'}</p>)}</section>
  </section>;
}
