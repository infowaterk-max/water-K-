import Link from 'next/link';
import {requirePlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {communicationTemplates} from '@/lib/communication/templates';
import {renderCommunicationPreview} from '@/lib/communication/preview';
import {CommunicationJobActions} from '@/components/admin/communication-job-actions';

export const dynamic='force-dynamic';

type Job={id:string;recipient_email:string;purpose:string;template_key:string;payload:Record<string,unknown>|null;status:string;attempts:number;scheduled_at:string;sent_at:string|null;last_error:string|null;provider_message_id:string|null;created_at:string;requires_approval:boolean;approved_at:string|null};
type WorkerRun={id:string;source:string;status:string;recovered:number;claimed:number;sent:number;failed:number;blocked:number;error_message:string|null;started_at:string;finished_at:string|null};
type Event={id:string;job_id:string;action:string;previous_status:string|null;new_status:string|null;created_at:string};
type Consent={email:string;status:string};
type QueueFilter='all'|'approval'|'pending'|'processing'|'sent'|'problem'|'failed'|'blocked'|'cancelled';

const statusLabel:Record<string,string>={pending:'Várakozik',processing:'Feldolgozás',sent:'Elküldve',failed:'Hibás',blocked:'Blokkolva',cancelled:'Törölve'};
const runStatusLabel:Record<string,string>={running:'Fut',success:'Sikeres',failed:'Hibás'};
const actionLabel:Record<string,string>={cancel:'Törlés',reschedule:'Átütemezés',retry:'Újrapróbálás',approve:'Jóváhagyás'};
const allowedFilters=new Set<QueueFilter>(['all','approval','pending','processing','sent','problem','failed','blocked','cancelled']);
const templateByKey=new Map(communicationTemplates.map(template=>[template.key,template]));

const relatedOrderId=(payload:Record<string,unknown>|null)=>{
  const candidate=payload?.order_id??payload?.orderId;
  return typeof candidate==='string'&&candidate.length>0?candidate:null;
};

export default async function CommunicationSupervision({searchParams}:{searchParams:Promise<{q?:string;status?:string}>}){
  await requirePlanFeature('officeCommunicationAdvanced');
  const scope=await requireCurrentStoreContext('marketing.manage');
  const admin=createAdminClient();
  const{q='',status:requestedStatus='all'}=await searchParams;
  const status=allowedFilters.has(requestedStatus as QueueFilter)?requestedStatus as QueueFilter:'all';

  const[
    {data:jobData,error:jobError},
    {data:runData,error:runError},
    {data:eventData,error:eventError},
    {data:consentData,error:consentError},
  ]=await Promise.all([
    admin.from('communication_jobs').select('id,recipient_email,purpose,template_key,payload,status,attempts,scheduled_at,sent_at,last_error,provider_message_id,created_at,requires_approval,approved_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(500),
    admin.from('communication_worker_runs').select('id,source,status,recovered,claimed,sent,failed,blocked,error_message,started_at,finished_at').eq('instance_id',scope.instanceId).order('started_at',{ascending:false}).limit(30),
    admin.from('communication_job_events').select('id,job_id,action,previous_status,new_status,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(50),
    admin.from('marketing_consents').select('email,status,occurred_at').eq('instance_id',scope.instanceId).eq('channel','email').order('occurred_at',{ascending:false}).limit(10000),
  ]);

  const jobs=(jobData??[])as Job[];
  const runs=(runData??[])as WorkerRun[];
  const events=(eventData??[])as Event[];
  const latestConsent=new Map<string,string>();
  for(const row of(consentData??[])as(Consent&{occurred_at?:string})[]){
    const key=row.email.trim().toLowerCase();
    if(!latestConsent.has(key))latestConsent.set(key,row.status);
  }

  const count=(candidate:string)=>jobs.filter(j=>j.status===candidate).length;
  const lastRun=runs[0]??null;
  const staleRunning=runs.filter(r=>r.status==='running'&&Date.now()-new Date(r.started_at).getTime()>30*60*1000).length;
  const awaitingApproval=jobs.filter(j=>j.status==='pending'&&j.requires_approval&&!j.approved_at);
  const loadError=Boolean(jobError||runError||eventError||consentError);
  const dateFormatter=new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'});
  const dateLabel=(value:string|null)=>value?dateFormatter.format(new Date(value)):'—';
  const needle=q.trim().toLowerCase();
  const matchesStatus=(j:Job)=>{
    if(status==='all')return true;
    if(status==='approval')return j.status==='pending'&&j.requires_approval&&!j.approved_at;
    if(status==='problem')return j.status==='failed'||j.status==='blocked';
    return j.status===status;
  };
  const visibleJobs=jobs.filter(j=>{
    if(!matchesStatus(j))return false;
    if(!needle)return true;
    const template=templateByKey.get(j.template_key);
    const haystack=[j.recipient_email,j.id,j.provider_message_id??'',j.template_key,template?.subject??'',JSON.stringify(j.payload??{})].join(' ').toLowerCase();
    return haystack.includes(needle);
  });

  const renderDetails=(j:Job)=>{
    const orderId=relatedOrderId(j.payload);
    return <details className="communicationJobDetails">
      <summary>Küldési részletek</summary>
      <div className="communicationJobMeta">
        <span><strong>Job ID:</strong> <code>{j.id}</code></span>
        <span><strong>Próbálkozások:</strong> {j.attempts}</span>
        <span><strong>Létrehozva:</strong> {dateLabel(j.created_at)}</span>
        <span><strong>Ütemezve:</strong> {dateLabel(j.scheduled_at)}</span>
        <span><strong>Elküldve:</strong> {dateLabel(j.sent_at)}</span>
        <span><strong>Sablon:</strong> <code>{j.template_key}</code></span>
        {j.provider_message_id&&<span><strong>Provider ID:</strong> <code>{j.provider_message_id}</code></span>}
        {orderId&&<span><strong>Kapcsolt rendelés:</strong> <Link className="textLink" href={`/admin/rendelesek/${orderId}`}>Rendelés megnyitása</Link></span>}
        {j.last_error&&<span className="communicationJobError"><strong>Utolsó hiba:</strong> {j.last_error}</span>}
      </div>
    </details>;
  };

  return <section className="adminMain">
    <div className="sectionIntro">
      <div>
        <span className="eyebrow">Digitális Iroda · Pro</span>
        <h1 className="sectionTitle">Küldési központ</h1>
        <p className="lead">Az ügyfél-e-mailek operatív felügyelete egy helyen: várakozó és folyamatban lévő küldések, jóváhagyások, hibák, újrapróbálás, ütemezés és végrehajtási bizonyítékok.</p>
      </div>
      <div className="adminToolbar">
        <Link className="btn btnGhost" href="/admin/email-sablonok">E-mail sablonok</Link>
        <Link className="btn btnPrimary" href="/admin/kommunikacio/iroda">Ügyféllevelezés</Link>
      </div>
    </div>

    {loadError&&<div className="errorNotice" role="alert"><strong>A Küldési központ adatainak egy része most nem olvasható.</strong><p>A hiányzó adatokat nem tekintjük üres vagy hibamentes állapotnak.</p></div>}

    <div className="cards adminMetricCards">
      <div className="card"><span className="badge">Jóváhagyásra vár</span><div className="price">{jobError?'—':awaitingApproval.length}</div></div>
      <div className="card"><span className="badge">Várakozik</span><div className="price">{jobError?'—':count('pending')}</div></div>
      <div className="card"><span className="badge">Feldolgozás</span><div className="price">{jobError?'—':count('processing')}</div></div>
      <div className="card"><span className="badge">Hibás / blokkolt</span><div className="price">{jobError?'—':count('failed')+count('blocked')}</div></div>
    </div>

    <form className="adminToolbar digitalOfficeFilterBar">
      <input name="q" defaultValue={q} placeholder="Keresés címzett, tárgy, rendelés, job ID vagy provider ID alapján" aria-label="Keresés a küldési sorban"/>
      <select name="status" defaultValue={status} aria-label="Küldési állapot">
        <option value="all">Minden állapot</option>
        <option value="approval">Jóváhagyásra vár</option>
        <option value="pending">Várakozik</option>
        <option value="processing">Feldolgozás</option>
        <option value="sent">Elküldve</option>
        <option value="problem">Minden probléma</option>
        <option value="failed">Hibás</option>
        <option value="blocked">Blokkolva</option>
        <option value="cancelled">Törölve</option>
      </select>
      <button className="btn btnPrimary">Szűrés</button>
    </form>

    {!jobError&&awaitingApproval.length>0&&<section className="featurePanel">
      <div className="digitalOfficeSectionHead"><div><span className="eyebrow">Beavatkozást igényel</span><h2>Jóváhagyásra váró üzenetek</h2></div><span>{awaitingApproval.length} tétel</span></div>
      <div className="cards">{awaitingApproval.slice(0,20).map(j=>{
        const preview=renderCommunicationPreview(j.template_key,j.payload??{});
        const consent=j.purpose==='marketing'?(consentError?null:latestConsent.get(j.recipient_email.trim().toLowerCase())==='granted'):true;
        return <article className="card" key={j.id}>
          <div className="adminToolbar"><span className="badge">{j.purpose==='marketing'?(consent===null?'Marketing · hozzájárulás nem ellenőrizhető':consent?'Marketing · engedélyezett':'Marketing · nincs hozzájárulás'):'Tranzakciós'}</span><span className="adminStatePill" data-status={j.status}>{statusLabel[j.status]??j.status}</span></div>
          <strong>{j.recipient_email}</strong>
          <h3>{preview?.subject??'Ismeretlen sablon'}</h3>
          <p style={{whiteSpace:'pre-wrap'}}>{preview?.body}</p>
          {renderDetails(j)}
          <CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/>
        </article>;
      })}</div>
    </section>}

    <section className="tableCard communicationQueueSection">
      <div className="digitalOfficeSectionHead"><div><span className="eyebrow">Kimenő forgalom</span><h2>Teljes küldési sor</h2></div><span>{jobError?'—':`${visibleJobs.length} / ${jobs.length} tétel`}</span></div>
      <div className="adminTableScroll communicationQueueDesktop"><table className="adminTable"><thead><tr><th>Címzett</th><th>Üzenet</th><th>Állapot</th><th>Ütemezés</th><th>Műveletek</th></tr></thead><tbody>{visibleJobs.map(j=>{
        const template=templateByKey.get(j.template_key);
        return <tr key={j.id}>
          <td><strong>{j.recipient_email}</strong><small className="muted">{j.purpose==='marketing'?'Marketing':'Tranzakciós'}</small></td>
          <td><strong>{template?.subject??j.template_key}</strong>{renderDetails(j)}</td>
          <td><span className="adminStatePill" data-status={j.status}>{statusLabel[j.status]??j.status}</span></td>
          <td>{dateLabel(j.scheduled_at)}</td>
          <td>{!jobError?<CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/>:<span className="muted">Adatbetöltés szükséges</span>}</td>
        </tr>;
      })}</tbody></table></div>
      <div className="communicationQueueCards">{visibleJobs.map(j=><article className="communicationQueueCard" key={j.id}>
        <div className="communicationQueueCardHead"><strong>{j.recipient_email}</strong><span className="adminStatePill" data-status={j.status}>{statusLabel[j.status]??j.status}</span></div>
        <div><span className="communicationQueueLabel">Üzenet</span><strong>{templateByKey.get(j.template_key)?.subject??j.template_key}</strong></div>
        <div><span className="communicationQueueLabel">Ütemezés</span><span>{dateLabel(j.scheduled_at)}</span></div>
        {renderDetails(j)}
        {!jobError?<CommunicationJobActions jobId={j.id} status={j.status} scheduledAt={j.scheduled_at} approved={Boolean(j.approved_at)} requiresApproval={j.requires_approval} allowApproval={j.purpose!=='marketing'||!consentError}/>:<span className="muted">Adatbetöltés szükséges</span>}
      </article>)}</div>
      {!jobError&&visibleJobs.length===0&&<p className="muted" style={{padding:'0 22px 22px'}}>A megadott keresésre vagy szűrőre nincs küldési feladat.</p>}
    </section>

    <div className="digitalOfficeOperationsGrid">
      <section className="card"><h2>Műveleti audit</h2>{events.slice(0,12).map(e=><p key={e.id}><strong>{actionLabel[e.action]??e.action}</strong> · {e.job_id.slice(0,8)} · {e.previous_status??'—'} → {e.new_status??'—'}</p>)}{!eventError&&events.length===0&&<p className="muted">Még nincs admin műveleti esemény.</p>}</section>
      <section className="card"><h2>Háttérfolyamat futások</h2><p><strong>Utolsó futás:</strong> {runError?'—':lastRun?runStatusLabel[lastRun.status]??lastRun.status:'Nincs futás'}</p><p><strong>Beragadt futás:</strong> {runError?'—':staleRunning}</p>{runs.slice(0,8).map(r=><p key={r.id}>{runStatusLabel[r.status]??r.status} · {r.sent} elküldve · {r.failed+r.blocked} probléma{r.error_message?` · ${r.error_message}`:''}</p>)}{!runError&&runs.length===0&&<p className="muted">Még nincs háttérfolyamat-futás.</p>}</section>
      <section className="card"><h2>Sablonregiszter</h2>{communicationTemplates.map(t=><p key={t.key}><strong>{t.subject}</strong> · {t.purpose==='marketing'?'Marketing':'Tranzakciós'}</p>)}<Link className="textLink" href="/admin/email-sablonok">Sablonok kezelése →</Link></section>
    </div>
  </section>;
}
