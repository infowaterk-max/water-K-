import Link from 'next/link';
import {redirect} from 'next/navigation';
import {DigitalOfficeChatDock} from '@/components/admin/digital-office-chat-dock';
import {OfficeCustomerEmailForm} from '@/components/admin/office-customer-email-form';
import {getAdminRequestUser} from '@/lib/auth/admin-api';
import {hasStoreCapability} from '@/lib/auth/store-capabilities';
import {hasCurrentPlanFeature,requirePlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';
import {requireCurrentStoreContext} from '@/lib/instances/scope';
import {completeTaskAction,createTaskAction,updateThreadAction} from './actions';
import {markCustomerThreadReadAction} from './customer-read-actions';

export const dynamic='force-dynamic';

type Thread={id:string;subject:string;customer_email:string|null;order_id:string|null;status:string;priority:string;assigned_to:string|null;last_read_at:string|null;mailbox_key:string|null;updated_at:string;conversation_type:'customer'};
type Message={id:string;thread_id:string;author_id:string|null;acting_for_user_id:string|null;kind:string;body:string;created_at:string;communication_job_id:string|null;subject:string|null;cc_emails:string[];bcc_emails:string[];attachment_count:number};
type Attachment={id:string;message_id:string;original_name:string;byte_size:number|string};
type ObjectLink={id:string;message_id:string;object_type:'order'|'commercial_offer'|'return_case'|'support_ticket'|'task';object_id:string};
type Task={id:string;thread_id:string|null;title:string;status:string;assigned_to:string|null;due_at:string|null;created_at:string};
type Order={id:string;order_number:string;customer_email:string;status:string};
type Job={id:string;status:string;last_error:string|null};
type Binding={user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type ReplyDraft={id:string;thread_id:string|null;body:string;cc_emails:string[];bcc_emails:string[];revision:number;updated_at:string};
type Mailbox={mailbox_key:string;is_active:boolean};
type EmailRoute={thread_id:string};
type Assignee={userId:string;label:string};
type InboxFilter='inbox'|'unread'|'mine'|'drafts'|'sent'|'urgent'|'closed'|'all';

const priorityLabel:Record<string,string>={low:'Alacsony',normal:'Normál',high:'Magas',urgent:'Sürgős'};
const jobLabel:Record<string,string>={pending:'Küldésre vár',processing:'Küldés folyamatban',sent:'Elküldve',failed:'Küldési hiba',blocked:'Blokkolva',cancelled:'Törölve'};
const objectLabel:Record<ObjectLink['object_type'],string>={order:'Rendelés',commercial_offer:'Árajánlat',return_case:'Visszáru',support_ticket:'Ügyfélszolgálat',task:'Feladat'};
const supportRoles=new Set(['owner','admin','order_manager','support']);
const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();
const shortId=(id:string)=>`${id.slice(0,8)}…`;
const shortText=(value:string,max=92)=>value.length>max?`${value.slice(0,max-1)}…`:value;
const fileSize=(value:number|string)=>{const bytes=Number(value);if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;return`${bytes} B`};
const initials=(value:string)=>value.split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'Ü';

export default async function CustomerEmailWorkspace({searchParams}:{searchParams:Promise<{q?:string;filter?:string;thread?:string;chat?:string}>}){
  await requirePlanFeature('officeCommunication');
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)redirect('/admin/hozzaferes-megtagadva');
  const scope=await requireCurrentStoreContext('support.manage');
  const advancedEmail=await hasCurrentPlanFeature('officeCommunicationAdvanced');
  const{q='',filter:rawFilter='inbox',thread:requestedThreadId,chat:selectedChatId}=await searchParams;
  const allowedFilters=new Set<InboxFilter>(['inbox','unread','mine','drafts','sent','urgent','closed','all']);
  const normalizedRaw=rawFilter==='open'?'inbox':rawFilter;
  const filter=allowedFilters.has(normalizedRaw as InboxFilter)?normalizedRaw as InboxFilter:'inbox';
  const db=createAdminClient();

  const[threadResult,taskResult,orderResult,jobResult,bindingResult,draftResult,mailboxResult]=await Promise.all([
    db.from('office_threads').select('id,subject,customer_email,order_id,status,priority,assigned_to,last_read_at,mailbox_key,updated_at,conversation_type').eq('instance_id',scope.instanceId).eq('conversation_type','customer').order('updated_at',{ascending:false}).limit(200),
    db.from('office_tasks').select('id,thread_id,title,status,assigned_to,due_at,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300),
    db.from('orders').select('id,order_number,customer_email,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300),
    db.from('communication_jobs').select('id,status,last_error').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1500),
    scope.organizationId?db.from('role_bindings').select('user_id,role_code,instance_id,valid_until').eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString()).or(`instance_id.eq.${scope.instanceId},instance_id.is.null`):Promise.resolve({data:[] as Binding[],error:null}),
    db.from('office_drafts').select('id,thread_id,body,cc_emails,bcc_emails,revision,updated_at').eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','reply').order('updated_at',{ascending:false}).limit(200),
    db.from('office_mailboxes').select('mailbox_key,is_active').eq('instance_id',scope.instanceId).eq('is_active',true).limit(50),
  ]);

  const threads=(threadResult.data??[])as Thread[];
  const threadIds=threads.map(thread=>thread.id);
  const messageResult=threadIds.length?await db.from('office_messages').select('id,thread_id,author_id,acting_for_user_id,kind,body,created_at,communication_job_id,subject,cc_emails,bcc_emails,attachment_count').eq('instance_id',scope.instanceId).in('thread_id',threadIds).in('kind',['email_in','email_out']).order('created_at',{ascending:false}).limit(1500):{data:[] as Message[],error:null};
  const messages=(messageResult.data??[])as Message[];
  const messageIds=messages.map(message=>message.id);
  const[routeResult,attachmentResult,objectLinkResult]=await Promise.all([
    threadIds.length?db.from('office_thread_email_routes').select('thread_id').eq('instance_id',scope.instanceId).in('thread_id',threadIds):Promise.resolve({data:[] as EmailRoute[],error:null}),
    messageIds.length?db.from('office_message_attachments').select('id,message_id,original_name,byte_size').eq('instance_id',scope.instanceId).in('message_id',messageIds).in('source',['provider_inbound','customer_outbound']).eq('status','ready').order('created_at',{ascending:true}):Promise.resolve({data:[] as Attachment[],error:null}),
    advancedEmail&&messageIds.length?db.from('office_message_object_links').select('id,message_id,object_type,object_id').eq('instance_id',scope.instanceId).in('message_id',messageIds).order('created_at',{ascending:true}):Promise.resolve({data:[] as ObjectLink[],error:null}),
  ]);

  const bindings=((bindingResult.data??[])as Binding[]).filter(row=>active(row.valid_until));
  const supportUserIds=[...new Set(bindings.filter(row=>supportRoles.has(row.role_code)).map(row=>row.user_id))];
  const evidenceUserIds=[...new Set(messages.flatMap(message=>[message.author_id,message.acting_for_user_id]).filter((value):value is string=>Boolean(value)))];
  const profileIds=[...new Set([...supportUserIds,...evidenceUserIds])];
  const profileResult=profileIds.length?await db.from('profiles').select('id,email,full_name').in('id',profileIds):{data:[] as Profile[],error:null};
  const profileMap=new Map(((profileResult.data??[])as Profile[]).map(profile=>[profile.id,profile]));
  const labelFor=(userId:string)=>profileMap.get(userId)?.full_name||profileMap.get(userId)?.email||shortId(userId);
  const assignees:Assignee[]=supportUserIds.map(userId=>({userId,label:labelFor(userId)})).sort((a,b)=>a.label.localeCompare(b.label,'hu'));

  const attachments=(attachmentResult.data??[])as Attachment[];
  const objectLinks=(objectLinkResult.data??[])as ObjectLink[];
  const tasks=((taskResult.data??[])as Task[]).filter(task=>task.thread_id===null||threadIds.includes(task.thread_id));
  const orders=(orderResult.data??[])as Order[];
  const jobMap=new Map(((jobResult.data??[])as Job[]).map(job=>[job.id,job]));
  const drafts=(draftResult.data??[])as ReplyDraft[];
  const draftByThread=new Map<string,ReplyDraft>();for(const draft of drafts){if(draft.thread_id&&!draftByThread.has(draft.thread_id))draftByThread.set(draft.thread_id,draft)}
  const routedThreadIds=new Set(((routeResult.data??[])as EmailRoute[]).map(route=>route.thread_id));
  const activeMailboxKeys=new Set(((mailboxResult.data??[])as Mailbox[]).filter(mailbox=>mailbox.is_active).map(mailbox=>mailbox.mailbox_key));
  const canChat=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{resourceOwnerUserId:actor.id,resourceAssignedUserId:actor.id});
  const loadError=Boolean(threadResult.error||orderResult.error||jobResult.error||draftResult.error||mailboxResult.error||messageResult.error||routeResult.error||attachmentResult.error||(advancedEmail&&(taskResult.error||bindingResult.error||profileResult.error||objectLinkResult.error)));

  const unread=(thread:Thread)=>messages.some(message=>message.thread_id===thread.id&&message.kind==='email_in'&&(!thread.last_read_at||new Date(message.created_at)>new Date(thread.last_read_at)));
  const hasOutbound=(thread:Thread)=>messages.some(message=>message.thread_id===thread.id&&message.kind==='email_out');
  const needle=q.trim().toLowerCase();
  const matchesFilter=(thread:Thread)=>{
    if(filter==='all')return true;
    if(filter==='inbox')return thread.status==='open';
    if(filter==='unread')return thread.status==='open'&&unread(thread);
    if(filter==='mine')return advancedEmail&&thread.status==='open'&&thread.assigned_to===actor.id;
    if(filter==='drafts')return draftByThread.has(thread.id);
    if(filter==='sent')return hasOutbound(thread);
    if(filter==='urgent')return thread.status==='open'&&thread.priority==='urgent';
    return thread.status==='closed';
  };
  const matchesSearch=(thread:Thread)=>!needle||thread.subject.toLowerCase().includes(needle)||thread.customer_email?.toLowerCase().includes(needle)||orders.find(order=>order.id===thread.order_id)?.order_number.toLowerCase().includes(needle);
  const visible=threads.filter(thread=>matchesFilter(thread)&&matchesSearch(thread));
  const selectedThread=threads.find(thread=>thread.id===requestedThreadId)??visible[0]??null;
  const selectedMessages=selectedThread?messages.filter(message=>message.thread_id===selectedThread.id).slice(0,60).reverse():[];
  const selectedOrder=selectedThread?orders.find(order=>order.id===selectedThread.order_id):undefined;
  const selectedDraft=selectedThread?draftByThread.get(selectedThread.id):undefined;
  const selectedTasks=selectedThread?tasks.filter(task=>task.thread_id===selectedThread.id):[];
  const sendingConfigured=Boolean(selectedThread?.mailbox_key&&activeMailboxKeys.has(selectedThread.mailbox_key)&&routedThreadIds.has(selectedThread.id));
  const now=Date.now();
  const dateTime=new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'});
  const timeOnly=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'});

  const href=(overrides:{filter?:InboxFilter;thread?:string|null;q?:string;chat?:string|null}={})=>{
    const params=new URLSearchParams();
    const nextFilter=overrides.filter??filter;
    const nextQ=overrides.q??q;
    const nextThread=overrides.thread===undefined?selectedThread?.id:overrides.thread;
    const nextChat=overrides.chat===undefined?selectedChatId:overrides.chat;
    if(nextFilter!=='inbox')params.set('filter',nextFilter);
    if(nextQ)params.set('q',nextQ);
    if(nextThread)params.set('thread',nextThread);
    if(nextChat)params.set('chat',nextChat);
    const query=params.toString();return `/admin/kommunikacio/iroda${query?`?${query}`:''}`;
  };
  const threadHref=(thread:Thread)=>href({thread:thread.id});
  const inboxCount=threads.filter(thread=>thread.status==='open').length;
  const unreadCount=threads.filter(thread=>thread.status==='open'&&unread(thread)).length;
  const draftCount=[...draftByThread.keys()].length;
  const mineCount=advancedEmail?threads.filter(thread=>thread.status==='open'&&thread.assigned_to===actor.id).length:0;
  const sentCount=threads.filter(hasOutbound).length;
  const urgentCount=threads.filter(thread=>thread.status==='open'&&thread.priority==='urgent').length;
  const closedCount=threads.filter(thread=>thread.status==='closed').length;

  const navItem=(itemFilter:InboxFilter,label:string,count?:number)=> <Link href={href({filter:itemFilter,thread:null})} aria-current={filter===itemFilter?'page':undefined}><span>{label}</span>{typeof count==='number'&&<b>{count}</b>}</Link>;

  return <section className="adminMain digitalOfficeWorkstationPage">
    {loadError&&<div className="errorNotice digitalOfficeWorkstationError" role="alert"><strong>Az ügyféllevelezés adatainak egy része most nem tölthető be.</strong><p>Hiányos adatok mellett módosítást nem tekintünk biztonságosan végrehajthatónak.</p></div>}

    <div className="digitalOfficeWorkstation">
      <aside className="digitalOfficeLocalRail" aria-label="Digitális Iroda postafiók">
        <div className="digitalOfficeLocalRailTitle"><span>DI</span><div><strong>Digitális Iroda</strong><small>Ügyfélkommunikáció</small></div></div>
        <nav>
          <small>ÜGYKEZELÉS</small>
          {navItem('inbox','Beérkezett',inboxCount)}
          {advancedEmail&&navItem('mine','Saját ügyek',mineCount)}
          {navItem('unread','Olvasatlan',unreadCount)}
          {navItem('drafts','Piszkozatok',draftCount)}
          {navItem('sent','Elküldött',sentCount)}
          {navItem('urgent','Sürgős',urgentCount)}
          {navItem('closed','Lezárt',closedCount)}
          {navItem('all','Összes',threads.length)}
          <small>MUNKATÉR</small>
          {canChat&&<Link href="/admin/kommunikacio/chat"><span>Belső chat</span></Link>}
          {advancedEmail&&<Link href="/admin/kommunikacio/iroda/hub"><span>Communication Hub</span></Link>}
          {advancedEmail&&<Link href="/admin/kommunikacio/felugyelet"><span>Küldési központ</span></Link>}
          <Link href="/admin/kommunikacio/tiltolista"><span>Tiltólista</span></Link>
        </nav>
        <div className="digitalOfficeLocalRailFooter"><span className={sendingConfigured?'isReady':'isLocked'}>{sendingConfigured?'Küldés aktív':'Küldés nincs aktiválva'}</span><small>A jelenlegi webshop e-mail címeit nem használjuk.</small></div>
      </aside>

      <aside className="digitalOfficeThreadListPane" aria-label="Ügyféllevelezések">
        <div className="digitalOfficeThreadToolbar">
          <div><strong>{filter==='inbox'?'Beérkezett':filter==='mine'?'Saját ügyek':filter==='unread'?'Olvasatlan':filter==='drafts'?'Piszkozatok':filter==='sent'?'Elküldött':filter==='urgent'?'Sürgős':filter==='closed'?'Lezárt':'Összes'}</strong><small>{visible.length} beszélgetés</small></div>
          <Link className="btn btnPrimary" href="/admin/kommunikacio/iroda/uj">+ Új</Link>
        </div>
        <form className="digitalOfficeThreadSearch"><input name="q" defaultValue={q} placeholder="Keresés ügyfél, téma, rendelés…"/><input type="hidden" name="filter" value={filter}/><button aria-label="Keresés">⌕</button></form>
        <div className="digitalOfficeQuickFilters"><Link href={href({filter:'inbox',thread:null})} aria-current={filter==='inbox'?'page':undefined}>Összes nyitott</Link><Link href={href({filter:'unread',thread:null})} aria-current={filter==='unread'?'page':undefined}>Olvasatlan</Link><Link href={href({filter:'urgent',thread:null})} aria-current={filter==='urgent'?'page':undefined}>Sürgős</Link></div>
        <div className="digitalOfficeThreadList">
          {visible.map(thread=>{const lastMessage=messages.find(message=>message.thread_id===thread.id);const order=orders.find(item=>item.id===thread.order_id);const draft=draftByThread.get(thread.id);return <Link className="digitalOfficeThreadItem" data-active={selectedThread?.id===thread.id?'true':'false'} key={thread.id} href={threadHref(thread)}>
            <span className="digitalOfficeAvatar">{initials(thread.customer_email??thread.subject)}</span>
            <span className="digitalOfficeThreadItemBody"><span><strong>{thread.customer_email??'Ismeretlen ügyfél'}</strong><time>{timeOnly.format(new Date(thread.updated_at))}</time></span><b>{thread.subject}</b><small>{lastMessage?shortText(lastMessage.body):'Még nincs üzenet'}</small><em>{order&&<i>{order.order_number}</i>}<i data-priority={thread.priority}>{priorityLabel[thread.priority]??thread.priority}</i>{draft&&<i>Piszkozat</i>}</em></span>
            {unread(thread)&&<span className="digitalOfficeUnreadDot" aria-label="Olvasatlan"/>}
          </Link>})}
          {!threadResult.error&&!visible.length&&<div className="digitalOfficeThreadEmpty"><strong>Nincs találat</strong><p>A kiválasztott szűrőhöz nem tartozik ügyféllevelezés.</p></div>}
        </div>
      </aside>

      <main className="digitalOfficeConversationPane">
        {selectedThread?<>
          <header className="digitalOfficeConversationHeader">
            <div><div className="digitalOfficeConversationTitle"><h1>{selectedThread.subject}</h1><span className="adminStatePill" data-status={selectedThread.status==='open'?'processing':'sent'}>{selectedThread.status==='open'?'Nyitott':'Lezárt'}</span><span className="badge">{priorityLabel[selectedThread.priority]??selectedThread.priority}</span></div><p>{selectedThread.customer_email??'Nincs ügyfél e-mail'}{selectedOrder&&<> · <Link className="textLink" href={`/admin/rendelesek/${selectedOrder.id}`}>{selectedOrder.order_number}</Link></>}</p></div>
            <div className="digitalOfficeConversationActions">{unread(selectedThread)&&!loadError&&<form action={markCustomerThreadReadAction}><input type="hidden" name="threadId" value={selectedThread.id}/><button className="btn btnGhost">Olvasottnak</button></form>}{selectedOrder&&<Link className="btn btnGhost" href={`/admin/rendelesek/${selectedOrder.id}`}>Rendelés megnyitása</Link>}</div>
          </header>
          <div className="digitalOfficeConversationMessages">
            {selectedMessages.map(message=>{const job=message.communication_job_id?jobMap.get(message.communication_job_id):null;const messageAttachments=attachments.filter(item=>item.message_id===message.id);const links=objectLinks.filter(item=>item.message_id===message.id);const outbound=message.kind==='email_out';return <article className={outbound?'digitalOfficeMessage isOutbound':'digitalOfficeMessage isInbound'} key={message.id}>
              <div className="digitalOfficeMessageAvatar">{initials(outbound?(message.author_id?labelFor(message.author_id):'Shoporation'):(selectedThread.customer_email??'Ügyfél'))}</div>
              <div className="digitalOfficeMessageCard">
                <header><div><strong>{outbound?(message.author_id?labelFor(message.author_id):'Webshop'):(selectedThread.customer_email??'Ügyfél')}</strong><small>{outbound&&message.acting_for_user_id?` · ${labelFor(message.acting_for_user_id)} nevében`:outbound?' · Shoporation':' · ügyfél'}</small></div><time>{dateTime.format(new Date(message.created_at))}</time></header>
                {message.subject&&<h3>{message.subject}</h3>}
                {!!message.cc_emails?.length&&<small className="digitalOfficeEnvelope">CC: {message.cc_emails.join(', ')}</small>}
                {!!message.bcc_emails?.length&&<small className="digitalOfficeEnvelope">BCC: {message.bcc_emails.join(', ')}</small>}
                <p>{message.body}</p>
                {messageAttachments.length>0&&<div className="digitalOfficeAttachmentRow">{messageAttachments.map(item=><Link key={item.id} href={`/api/admin/office/attachments/${item.id}`}>📎 {item.original_name}<small>{fileSize(item.byte_size)}</small></Link>)}</div>}
                {advancedEmail&&links.length>0&&<div className="digitalOfficeObjectRow">{links.map(link=><span className="badge" key={link.id}>{objectLabel[link.object_type]} · {link.object_type==='order'?(orders.find(order=>order.id===link.object_id)?.order_number??shortId(link.object_id)):shortId(link.object_id)}</span>)}</div>}
                {job&&<footer><span className="adminStatePill" data-status={job.status}>{jobLabel[job.status]??job.status}</span>{job.last_error&&<small>{job.last_error}</small>}</footer>}
              </div>
            </article>})}
            {!selectedMessages.length&&<div className="digitalOfficeConversationEmpty"><strong>Még nincs üzenet.</strong><p>Az első üzenet megjelenése után itt épül fel a teljes ügyféltörténet.</p></div>}
          </div>
          {selectedThread.customer_email&&!loadError&&<section className="digitalOfficeReplyComposer"><div className="digitalOfficeReplyTabs"><strong>Válasz</strong><span>Belső megjegyzéshez használd a Team Chatet.</span></div><OfficeCustomerEmailForm threadId={selectedThread.id} sendingConfigured={sendingConfigured} advancedEmail={advancedEmail} initialDraft={selectedDraft?{id:selectedDraft.id,revision:selectedDraft.revision,ccEmails:selectedDraft.cc_emails??[],bccEmails:selectedDraft.bcc_emails??[],body:selectedDraft.body}:undefined}/></section>}
        </>:<div className="digitalOfficeConversationEmpty isFull"><strong>Válassz egy beszélgetést</strong><p>A levelezés, a válaszmező és az ügyfélkontextus itt jelenik meg.</p></div>}
      </main>

      <aside className="digitalOfficeContextPane" aria-label="Ügyfélkontextus">
        {selectedThread?<>
          <section className="digitalOfficeContextSection"><span className="eyebrow">Ügyfél</span><div className="digitalOfficeCustomerIdentity"><span className="digitalOfficeAvatar isLarge">{initials(selectedThread.customer_email??selectedThread.subject)}</span><div><strong>{selectedThread.customer_email??'Ismeretlen ügyfél'}</strong><small>{selectedOrder?'Rendeléshez kapcsolt ügyfél':'Közvetlen ügyféllevél'}</small></div></div></section>
          {selectedOrder&&<section className="digitalOfficeContextSection"><div className="digitalOfficeContextHeading"><h2>Rendelés</h2><span>{selectedOrder.status}</span></div><strong className="digitalOfficeOrderNumber">{selectedOrder.order_number}</strong><p>{selectedOrder.customer_email}</p><Link className="btn btnGhost" href={`/admin/rendelesek/${selectedOrder.id}`}>Rendelés megnyitása</Link></section>}
          <section className="digitalOfficeContextSection"><h2>Ügykezelés</h2>{!loadError?<form action={updateThreadAction} className="stackForm digitalOfficeContextForm"><input type="hidden" name="threadId" value={selectedThread.id}/><label><span>Prioritás</span><select name="priority" defaultValue={selectedThread.priority}><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select></label><label><span>Állapot</span><select name="status" defaultValue={selectedThread.status}><option value="open">Nyitott</option><option value="closed">Lezárt</option></select></label>{advancedEmail&&<label><span>Felelős</span><select name="assigneeUserId" defaultValue={selectedThread.assigned_to??''}><option value="">Nincs felelős</option>{assignees.map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select></label>}<button className="btn btnPrimary">Mentés</button></form>:<p className="muted">Az ügykezelési adatok most nem módosíthatók.</p>}</section>
          {advancedEmail&&<section className="digitalOfficeContextSection" id="office-tasks"><div className="digitalOfficeContextHeading"><h2>Feladatok</h2><span>{selectedTasks.filter(task=>task.status==='open').length} nyitott</span></div><div className="digitalOfficeTaskList">{selectedTasks.slice(0,8).map(task=><div key={task.id} data-status={task.status}><span><strong>{task.title}</strong><small>{task.due_at?`${new Date(task.due_at).getTime()<now?'Lejárt · ':''}${dateTime.format(new Date(task.due_at))}`:'Nincs határidő'}{task.assigned_to?` · ${labelFor(task.assigned_to)}`:''}</small></span>{task.status==='open'&&!loadError&&<form action={completeTaskAction}><input type="hidden" name="id" value={task.id}/><button title="Kész">✓</button></form>}</div>)}{!selectedTasks.length&&<p className="muted">Nincs kapcsolódó feladat.</p>}</div>{!loadError&&<form action={createTaskAction} className="stackForm digitalOfficeNewTask"><input type="hidden" name="threadId" value={selectedThread.id}/><input name="title" required placeholder="Új feladat"/><input name="due" type="datetime-local"/><button className="btn btnGhost">+ Feladat</button></form>}</section>}
          <section className="digitalOfficeContextSection digitalOfficeSafetyNote"><strong>Biztonsági határ</strong><p>Az ügyféllevelezés és a Team Chat külön csatorna. Küldés csak külön jóváhagyott Digitális Iroda postafiókból történhet.</p></section>
        </>:<div className="digitalOfficeContextPlaceholder"><span>Ü</span><p>Az ügyfél, rendelés és feladatok adatai a kiválasztott beszélgetéshez jelennek meg.</p></div>}
      </aside>
    </div>

    {canChat&&<DigitalOfficeChatDock instanceId={scope.instanceId} actorId={actor.id} baseHref={href({chat:null})} selectedChatId={selectedChatId}/>} 
  </section>;
}
