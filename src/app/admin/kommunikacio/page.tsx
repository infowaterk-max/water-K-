import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getDigitalOfficeAccess} from '@/lib/digital-office/access';
import {createAdminClient} from '@/lib/supabase/admin';

export const dynamic='force-dynamic';

type CustomerThread={id:string;subject:string;customer_email:string|null;order_id:string|null;status:string;priority:string;assigned_to:string|null;last_read_at:string|null;updated_at:string;conversation_type:'customer'};
type OfficeMessage={id:string;thread_id:string;author_id:string|null;kind:string;body:string;created_at:string};
type OfficeTask={id:string;thread_id:string|null;title:string;status:'open'|'done'|'cancelled';assigned_to:string|null;due_at:string|null;created_at:string;completed_at:string|null};
type CommunicationJob={id:string;recipient_email:string;template_key:string;status:string;scheduled_at:string;requires_approval:boolean;approved_at:string|null;last_error:string|null;created_at:string};
type AccessibleThreadRow={thread_id:string};
type InternalThread={id:string;subject:string;updated_at:string;conversation_type:'internal_private'|'internal_group'};
type Participant={thread_id:string;user_id:string;last_read_at:string|null};
type Mention={message_id:string;thread_id:string;mentioned_user_id:string;seen_at:string|null;created_at:string};
type Attachment={id:string;message_id:string;thread_id:string|null;original_name:string;byte_size:number|string;source:string;created_at:string};
type Profile={id:string;email:string|null;full_name:string|null};

type FocusItem={label:string;detail:string;href:string;badge:string;tone?:'warn'|'danger'};
type DeadlineItem={label:string;detail:string;time:string;href:string;hot?:boolean};
type ActivityItem={label:string;detail:string;time:string;initials:string};
type NoticeItem={label:string;time:string;tone?:'danger'|'muted'};

const empty=<T,>()=>Promise.resolve({data:[] as T[],error:null});
const short=(value:string,max=72)=>value.length>max?`${value.slice(0,max-1)}…`:value;
const fileSize=(value:number|string)=>{const bytes=Number(value);if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;return`${bytes} B`;};
const initials=(value:string)=>value.split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'DI';
const timeAgo=(value:string,now=Date.now())=>{const minutes=Math.max(0,Math.round((now-Date.parse(value))/60000));if(minutes<1)return'most';if(minutes<60)return`${minutes} p`;const hours=Math.floor(minutes/60);if(hours<24)return`${hours} ó`;return`${Math.floor(hours/24)} n`;};
const dayKey=(value:string|Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const timeLabel=(value:string)=>new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const dateLabel=(value:Date)=>new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(value);

export default async function DigitalOfficeHome(){
  const access=await getDigitalOfficeAccess();
  if(!access)redirect('/admin/hozzaferes-megtagadva');
  const{actor,scope,officeEmail,advancedEmail,canSupport,canMarketing,canChat}=access;
  const now=new Date();
  const today=dayKey(now);
  const db=createAdminClient();

  const[profileResult,threadResult,taskResult,jobResult,accessibleResult]=await Promise.all([
    db.from('profiles').select('id,email,full_name').eq('id',actor.id).maybeSingle(),
    officeEmail&&canSupport?db.from('office_threads').select('id,subject,customer_email,order_id,status,priority,assigned_to,last_read_at,updated_at,conversation_type').eq('instance_id',scope.instanceId).eq('conversation_type','customer').order('updated_at',{ascending:false}).limit(160):empty<CustomerThread>(),
    officeEmail&&canSupport?db.from('office_tasks').select('id,thread_id,title,status,assigned_to,due_at,created_at,completed_at').eq('instance_id',scope.instanceId).eq('status','open').order('due_at',{ascending:true,nullsFirst:false}).limit(120):empty<OfficeTask>(),
    advancedEmail&&canMarketing?db.from('communication_jobs').select('id,recipient_email,template_key,status,scheduled_at,requires_approval,approved_at,last_error,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(220):empty<CommunicationJob>(),
    canChat?db.rpc('office_accessible_thread_ids_v1',{p_instance_id:scope.instanceId,p_user_id:actor.id}):empty<AccessibleThreadRow>(),
  ]);

  const profile=(profileResult.data??null)as Profile|null;
  const threads=(threadResult.data??[])as CustomerThread[];
  const tasks=(taskResult.data??[])as OfficeTask[];
  const jobs=(jobResult.data??[])as CommunicationJob[];
  const threadIds=threads.map(thread=>thread.id);
  const accessibleIds=accessibleResult.error?[]:((accessibleResult.data??[])as AccessibleThreadRow[]).map(row=>row.thread_id);

  const[messageResult,chatThreadResult,chatMessageResult,participantResult,mentionResult]=await Promise.all([
    threadIds.length?db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).in('kind',['email_in','email_out']).order('created_at',{ascending:false}).limit(1200):empty<OfficeMessage>(),
    accessibleIds.length?db.from('office_threads').select('id,subject,updated_at,conversation_type').eq('instance_id',scope.instanceId).in('id',accessibleIds).in('conversation_type',['internal_private','internal_group']).is('archived_at',null).order('updated_at',{ascending:false}).limit(120):empty<InternalThread>(),
    accessibleIds.length?db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at').eq('instance_id',scope.instanceId).in('thread_id',accessibleIds).eq('kind','internal').order('created_at',{ascending:false}).limit(800):empty<OfficeMessage>(),
    accessibleIds.length?db.from('office_thread_participants').select('thread_id,user_id,last_read_at').eq('instance_id',scope.instanceId).in('thread_id',accessibleIds).eq('user_id',actor.id).is('left_at',null):empty<Participant>(),
    accessibleIds.length?db.from('office_message_mentions').select('message_id,thread_id,mentioned_user_id,seen_at,created_at').eq('instance_id',scope.instanceId).in('thread_id',accessibleIds).eq('mentioned_user_id',actor.id).is('seen_at',null).order('created_at',{ascending:false}).limit(80):empty<Mention>(),
  ]);

  const customerMessages=(messageResult.data??[])as OfficeMessage[];
  const chatThreads=(chatThreadResult.data??[])as InternalThread[];
  const chatMessages=(chatMessageResult.data??[])as OfficeMessage[];
  const chatParticipants=(participantResult.data??[])as Participant[];
  const mentions=(mentionResult.data??[])as Mention[];

  const unreadThread=(thread:CustomerThread)=>customerMessages.some(message=>message.thread_id===thread.id&&message.kind==='email_in'&&(!thread.last_read_at||Date.parse(message.created_at)>Date.parse(thread.last_read_at)));
  const unreadCustomerThreads=threads.filter(thread=>thread.status==='open'&&unreadThread(thread));
  const ownOpenThreads=threads.filter(thread=>thread.status==='open'&&thread.assigned_to===actor.id);
  const urgentUnreadThreads=unreadCustomerThreads.filter(thread=>thread.priority==='urgent');
  const myTasks=tasks.filter(task=>task.assigned_to===actor.id);
  const todayTasks=myTasks.filter(task=>task.due_at&&dayKey(task.due_at)===today);
  const overdueTasks=myTasks.filter(task=>task.due_at&&Date.parse(task.due_at)<now.getTime()&&dayKey(task.due_at)!==today);

  const lastReadByThread=new Map(chatParticipants.map(row=>[row.thread_id,row.last_read_at]));
  const unreadChatThreadIds=new Set<string>();
  for(const thread of chatThreads){
    const lastRead=lastReadByThread.get(thread.id);
    if(chatMessages.some(message=>message.thread_id===thread.id&&message.author_id!==actor.id&&(!lastRead||Date.parse(message.created_at)>Date.parse(lastRead))))unreadChatThreadIds.add(thread.id);
  }
  const chatAttention=unreadChatThreadIds.size+mentions.length;
  const awaitingApproval=jobs.filter(job=>job.status==='pending'&&job.requires_approval&&!job.approved_at);
  const problemJobs=jobs.filter(job=>job.status==='failed'||job.status==='blocked');
  const interventionCount=awaitingApproval.length+problemJobs.length;

  const threadMap=new Map(threads.map(thread=>[thread.id,thread]));
  const chatThreadMap=new Map(chatThreads.map(thread=>[thread.id,thread]));
  const focus:FocusItem[]=[];
  for(const thread of urgentUnreadThreads.slice(0,1))focus.push({label:`Sürgős ügyfélválasz · ${thread.subject}`,detail:`${thread.customer_email??'Ügyfél'} · ${thread.assigned_to===actor.id?'hozzád rendelve':'nyitott ügy'}`,href:`/admin/kommunikacio/iroda?thread=${thread.id}`,badge:'Sürgős',tone:'danger'});
  for(const job of awaitingApproval.slice(0,1))focus.push({label:'E-mail jóváhagyás szükséges',detail:`${job.recipient_email} · ${timeLabel(job.scheduled_at)}-ra ütemezve`,href:'/admin/kommunikacio/felugyelet?status=approval',badge:'Jóváhagyás',tone:'warn'});
  for(const mention of mentions.slice(0,1)){const thread=chatThreadMap.get(mention.thread_id);focus.push({label:`@említés${thread?` · ${thread.subject}`:''}`,detail:'Olvasatlan Team Chat említés',href:`/admin/kommunikacio/chat?thread=${mention.thread_id}`,badge:'Team Chat'});}
  for(const task of todayTasks.slice(0,1))focus.push({label:task.title,detail:`Feladat${task.due_at?` · ma ${timeLabel(task.due_at)}`:''}`,href:task.thread_id?`/admin/kommunikacio/iroda?thread=${task.thread_id}`:'/admin/kommunikacio#feladatok',badge:'Feladat'});
  for(const job of problemJobs.slice(0,1)){if(focus.length<4)focus.push({label:'Sikertelen vagy blokkolt e-mail küldés',detail:`${job.recipient_email} · ${job.last_error?short(job.last_error,58):job.status}`,href:'/admin/kommunikacio/felugyelet?status=problem',badge:'Küldési hiba',tone:'danger'});}
  while(focus.length<4){
    const fallback=unreadCustomerThreads[focus.length]??null;
    if(!fallback)break;
    focus.push({label:fallback.subject,detail:`${fallback.customer_email??'Ügyfél'} · olvasatlan ügy`,href:`/admin/kommunikacio/iroda?thread=${fallback.id}`,badge:'E-mail'});
  }

  const deadlines:DeadlineItem[]=[
    ...todayTasks.map(task=>({label:task.title,detail:task.thread_id?'Kapcsolt ügyfélfeladat':'Saját feladat',time:task.due_at?timeLabel(task.due_at):'Ma',href:task.thread_id?`/admin/kommunikacio/iroda?thread=${task.thread_id}`:'/admin/kommunikacio#feladatok',hot:Boolean(task.due_at&&Date.parse(task.due_at)<now.getTime()+60*60*1000)})),
    ...jobs.filter(job=>job.status==='pending'&&dayKey(job.scheduled_at)===today).map(job=>({label:job.requires_approval&&!job.approved_at?'Jóváhagyásra váró e-mail':'Ütemezett e-mail',detail:job.recipient_email,time:timeLabel(job.scheduled_at),href:'/admin/kommunikacio/felugyelet',hot:job.requires_approval&&!job.approved_at})),
  ].sort((a,b)=>a.time.localeCompare(b.time,'hu')).slice(0,4);

  const participantAuthorIds=[...new Set(chatMessages.map(message=>message.author_id).filter((value):value is string=>Boolean(value)))];
  const accessibleMessageIds=[...new Set([...customerMessages.map(message=>message.id),...chatMessages.map(message=>message.id)])];
  const[authorResult,attachmentResult]=await Promise.all([
    participantAuthorIds.length?db.from('profiles').select('id,email,full_name').in('id',participantAuthorIds):empty<Profile>(),
    accessibleMessageIds.length?db.from('office_message_attachments').select('id,message_id,thread_id,original_name,byte_size,source,created_at').eq('instance_id',scope.instanceId).in('message_id',accessibleMessageIds).eq('status','ready').order('created_at',{ascending:false}).limit(8):empty<Attachment>(),
  ]);
  const authorMap=new Map(((authorResult.data??[])as Profile[]).map(item=>[item.id,item]));
  const attachments=(attachmentResult.data??[])as Attachment[];

  const activities:ActivityItem[]=[
    ...customerMessages.slice(0,12).map(message=>{const thread=threadMap.get(message.thread_id);const sender=message.kind==='email_in'?(thread?.customer_email??'Ügyfél'):(message.author_id===actor.id?'Te':'Munkatárs');return{label:sender,detail:message.kind==='email_in'?`új ügyfélüzenet · ${thread?.subject??'ügyfélthread'}`:`válaszolt · ${thread?.subject??'ügyfélthread'}`,time:timeAgo(message.created_at),initials:initials(sender)};}),
    ...chatMessages.slice(0,12).map(message=>{const sender=message.author_id===actor.id?'Te':(message.author_id?(authorMap.get(message.author_id)?.full_name||authorMap.get(message.author_id)?.email||'Munkatárs'):'Munkatárs');return{label:sender,detail:`Team Chat · ${chatThreadMap.get(message.thread_id)?.subject??'beszélgetés'}`,time:timeAgo(message.created_at),initials:initials(sender)};}),
  ].sort((a,b)=>{
    const minutes=(value:string)=>value==='most'?0:value.endsWith(' p')?Number(value.slice(0,-2)):value.endsWith(' ó')?Number(value.slice(0,-2))*60:Number(value.slice(0,-2))*1440;
    return minutes(a.time)-minutes(b.time);
  }).slice(0,3);

  const notices:NoticeItem[]=[];
  for(const mention of mentions.slice(0,1))notices.push({label:`@említés: ${chatThreadMap.get(mention.thread_id)?.subject??'Team Chat'}`,time:timeAgo(mention.created_at)});
  for(const thread of urgentUnreadThreads.slice(0,1))notices.push({label:`Új sürgős ügyféllevél · ${thread.subject}`,time:timeAgo(thread.updated_at),tone:'danger'});
  for(const job of problemJobs.slice(0,1))notices.push({label:'Küldési probléma beavatkozást igényel',time:timeAgo(job.created_at),tone:'danger'});
  for(const thread of threads.filter(item=>item.status==='closed').slice(0,1))notices.push({label:`Lezárt ügy · ${thread.subject}`,time:timeAgo(thread.updated_at),tone:'muted'});

  const greetingHour=Number(new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',hourCycle:'h23'}).format(now));
  const greeting=greetingHour<10?'Jó reggelt!':greetingHour<18?'Szép napot!':'Jó estét!';
  const displayName=profile?.full_name?.trim().split(/\s+/)[0]??'';
  const loadError=Boolean(profileResult.error||threadResult.error||taskResult.error||jobResult.error||accessibleResult.error||messageResult.error||chatThreadResult.error||chatMessageResult.error||participantResult.error||mentionResult.error||authorResult.error||attachmentResult.error);

  return <main className="digitalOfficeDashboardPage">
    <section className="digitalOfficeDashboardHero">
      <div><h1>{greeting} <span>{displayName?`${displayName}, `:''}itt a mai munkatér.</span></h1><p>Csak az jelenik meg, ami valóban figyelmet vagy beavatkozást igényel.</p></div>
      <div className="digitalOfficeDashboardDate"><strong>{dateLabel(now)}</strong><span>{scope.isPlatform?'Platform munkatér':'Aktuális webshop munkatere'}</span></div>
    </section>

    {loadError&&<div className="errorNotice digitalOfficeDashboardError" role="alert"><strong>A Digitális Iroda összképének egy része most nem tölthető be.</strong><p>A hiányzó adatokat nem tekintjük nullának vagy rendben lévő állapotnak.</p></div>}

    <section className="digitalOfficeDashboardMetrics" aria-label="Mai állapot">
      <Link href="/admin/kommunikacio/iroda?filter=unread" className="digitalOfficeDashboardMetric"><span className="digitalOfficeDashboardIcon">✉</span><span><small>Olvasatlan ügyféllevelek</small><strong>{officeEmail&&canSupport?unreadCustomerThreads.length:'—'}</strong><em>{officeEmail&&canSupport?`${ownOpenThreads.length} saját ügy · ${urgentUnreadThreads.length} sürgős`:'Nincs hozzáférés'}</em></span></Link>
      <a href="#feladatok" className="digitalOfficeDashboardMetric"><span className="digitalOfficeDashboardIcon">✓</span><span><small>Nyitott feladataim</small><strong>{officeEmail&&canSupport?myTasks.length:'—'}</strong><em>{officeEmail&&canSupport?`${todayTasks.length} ma esedékes${overdueTasks.length?` · ${overdueTasks.length} lejárt`:''}`:'Nincs hozzáférés'}</em></span></a>
      <Link href="/admin/kommunikacio/chat?filter=unread" className="digitalOfficeDashboardMetric"><span className="digitalOfficeDashboardIcon">@</span><span><small>Team Chat figyelmeztetés</small><strong>{canChat?chatAttention:'—'}</strong><em>{canChat?`${unreadChatThreadIds.size} olvasatlan · ${mentions.length} említés`:'Nincs hozzáférés'}</em></span></Link>
      <Link href="/admin/kommunikacio/felugyelet?status=problem" className="digitalOfficeDashboardMetric"><span className="digitalOfficeDashboardIcon">!</span><span><small>Beavatkozást igényel</small><strong>{advancedEmail&&canMarketing?interventionCount:'—'}</strong><em>{advancedEmail&&canMarketing?`${awaitingApproval.length} jóváhagyás · ${problemJobs.length} küldési hiba`:'Nincs hozzáférés'}</em></span></Link>
    </section>

    <section className="digitalOfficeDashboardPrimaryGrid">
      <article className="digitalOfficeDashboardPanel">
        <header><div><small>Prioritás</small><h2>Mai fókusz</h2></div><Link href="/admin/kommunikacio/iroda">Összes megnyitása →</Link></header>
        {focus.length?focus.map((item,index)=><Link href={item.href} className="digitalOfficeFocusItem" key={`${item.href}-${index}`}><b data-first={index===0?'true':'false'}>{index+1}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span><em data-tone={item.tone??'default'}>{item.badge}</em></Link>):<div className="digitalOfficeDashboardEmpty"><strong>Nincs sürgős teendő.</strong><span>A jelenlegi adatok alapján nincs kiemelt beavatkozás.</span></div>}
      </article>

      <article className="digitalOfficeDashboardPanel" id="feladatok">
        <header><div><small>Saját munka</small><h2>Feladataim</h2></div><Link href="/admin/kommunikacio/iroda">Ügyfélmunkák →</Link></header>
        <div className="digitalOfficeTaskTabs"><span>Ma ({todayTasks.length})</span><span>Közelgő ({Math.max(0,myTasks.length-todayTasks.length-overdueTasks.length)})</span><span>Lejárt ({overdueTasks.length})</span></div>
        {myTasks.slice(0,4).map(task=><Link href={task.thread_id?`/admin/kommunikacio/iroda?thread=${task.thread_id}`:'/admin/kommunikacio'} className="digitalOfficeTaskRow" key={task.id}><i/><span><strong>{task.title}</strong><small>{task.thread_id?threadMap.get(task.thread_id)?.subject??'Kapcsolt ügyfélthread':'Önálló feladat'}</small></span><em data-hot={Boolean(task.due_at&&Date.parse(task.due_at)<now.getTime())?'true':'false'}>{task.due_at?(dayKey(task.due_at)===today?timeLabel(task.due_at):new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',month:'short',day:'numeric'}).format(new Date(task.due_at))):'Nincs határidő'}</em></Link>)}
        {!myTasks.length&&<div className="digitalOfficeDashboardEmpty"><strong>Nincs nyitott saját feladat.</strong><span>A hozzád rendelt feladatok itt jelennek meg.</span></div>}
      </article>

      <article className="digitalOfficeDashboardPanel">
        <header><div><small>Időzítés</small><h2>Mai határidők</h2></div><Link href="/admin/kommunikacio/felugyelet">Ütemezések →</Link></header>
        <div className="digitalOfficeDeadlineList">{deadlines.map((item,index)=><Link href={item.href} key={`${item.href}-${index}`} className="digitalOfficeDeadlineItem" data-hot={item.hot?'true':'false'}><time>{item.time}</time><i/><span><strong>{item.label}</strong><small>{item.detail}</small></span></Link>)}</div>
        {!deadlines.length&&<div className="digitalOfficeDashboardEmpty"><strong>Nincs mai határidő.</strong><span>A mai feladatok és ütemezett kommunikáció itt jelenik meg.</span></div>}
      </article>
    </section>

    <section className="digitalOfficeDashboardLowerGrid">
      <article className="digitalOfficeDashboardPanel digitalOfficeDashboardSmall"><header><div><small>Csapat</small><h2>Legutóbbi aktivitás</h2></div><Link href="/admin/kommunikacio/chat">Team Chat →</Link></header>{activities.map((item,index)=><div className="digitalOfficeActivity" key={`${item.label}-${index}`}><b>{item.initials}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span><time>{item.time}</time></div>)}{!activities.length&&<div className="digitalOfficeDashboardEmpty"><span>Még nincs megjeleníthető kommunikációs aktivitás.</span></div>}</article>
      <article className="digitalOfficeDashboardPanel digitalOfficeDashboardSmall" id="jovahagyasok"><header><div><small>Kommunikáció</small><h2>Jóváhagyások & problémák</h2></div><Link href="/admin/kommunikacio/felugyelet">Központ →</Link></header>{awaitingApproval.slice(0,2).map(job=><Link href="/admin/kommunikacio/felugyelet?status=approval" className="digitalOfficeApproval" key={job.id}><span><strong>{job.recipient_email}</strong><small>{job.template_key}</small></span><em data-tone="warn">Jóváhagyásra vár</em></Link>)}{problemJobs.slice(0,2).map(job=><Link href="/admin/kommunikacio/felugyelet?status=problem" className="digitalOfficeApproval" key={job.id}><span><strong>{job.recipient_email}</strong><small>{job.template_key}</small></span><em data-tone="danger">{job.status==='blocked'?'Blokkolt':'Sikertelen'}</em></Link>)}{!awaitingApproval.length&&!problemJobs.length&&<div className="digitalOfficeDashboardEmpty"><strong>Nincs kommunikációs probléma.</strong><span>Jóváhagyásra váró vagy hibás küldés nem látható.</span></div>}</article>
      <article className="digitalOfficeDashboardPanel digitalOfficeDashboardSmall"><header><div><small>Figyelem</small><h2>Értesítések</h2></div><Link href="/admin/kommunikacio/iroda">Ügyek →</Link></header>{notices.map((notice,index)=><div className="digitalOfficeNotice" key={`${notice.label}-${index}`}><i data-tone={notice.tone??'default'}/><strong>{notice.label}</strong><time>{notice.time}</time></div>)}{!notices.length&&<div className="digitalOfficeDashboardEmpty"><span>Nincs új, figyelmet igénylő esemény.</span></div>}</article>
    </section>

    <section className="digitalOfficeDashboardBottomGrid">
      <article className="digitalOfficeDashboardPanel digitalOfficeDashboardFiles"><header><div><small>Csatolmányok</small><h2>Legutóbbi fájlok</h2></div><Link href="/admin/kommunikacio/iroda">Levelezés →</Link></header><div className="digitalOfficeFileGrid">{attachments.slice(0,4).map(file=>{const ext=file.original_name.split('.').pop()?.toUpperCase().slice(0,3)||'FILE';const relatedThread=threadMap.get(file.thread_id??'')??chatThreadMap.get(file.thread_id??'');return <div className="digitalOfficeFileRow" key={file.id}><b>{ext}</b><span><strong>{file.original_name}</strong><small>{file.source==='internal_upload'?'Team Chat':'Ügyfél e-mail'}{relatedThread?` · ${relatedThread.subject}`:''}</small></span><em>{fileSize(file.byte_size)}</em></div>;})}</div>{!attachments.length&&<div className="digitalOfficeDashboardEmpty"><span>Még nincs megjeleníthető, ellenőrzött csatolmány.</span></div>}</article>
      <article className="digitalOfficeDashboardPanel digitalOfficeDashboardQuick"><header><div><small>Műveletek</small><h2>Gyors műveletek</h2></div></header><div className="digitalOfficeQuickGrid"><Link href="/admin/kommunikacio/iroda"><b>✉</b><span>E-mail</span></Link><a href="#feladatok"><b>✓</b><span>Feladatok</span></a><Link href="/admin/kommunikacio/chat"><b>☵</b><span>Team Chat</span></Link><Link href="/admin/email-sablonok"><b>▦</b><span>Sablonok</span></Link></div></article>
    </section>
  </main>;
}
