import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OfficeCustomerEmailForm } from '@/components/admin/office-customer-email-form';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { hasStoreCapability } from '@/lib/auth/store-capabilities';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import { completeTaskAction,createTaskAction,updateThreadAction } from './actions';
import { markCustomerThreadReadAction } from './customer-read-actions';

export const dynamic='force-dynamic';

type Thread={
  id:string;
  subject:string;
  customer_email:string|null;
  order_id:string|null;
  status:string;
  priority:string;
  assigned_to:string|null;
  last_read_at:string|null;
  mailbox_key:string|null;
  updated_at:string;
  conversation_type:'customer';
};
type Message={id:string;thread_id:string;author_id:string|null;kind:string;body:string;created_at:string;communication_job_id:string|null;subject:string|null};
type Task={id:string;thread_id:string|null;title:string;status:string;assigned_to:string|null;due_at:string|null;created_at:string};
type Order={id:string;order_number:string;customer_email:string;status:string};
type Job={id:string;status:string;last_error:string|null};
type Binding={user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type ReplyDraft={id:string;thread_id:string|null;body:string;revision:number;updated_at:string};
type Mailbox={mailbox_key:string;is_active:boolean};
type EmailRoute={thread_id:string};
type Assignee={userId:string;label:string};

const priorityLabel:Record<string,string>={low:'Alacsony',normal:'Normál',high:'Magas',urgent:'Sürgős'};
const jobLabel:Record<string,string>={pending:'Küldésre vár',processing:'Küldés folyamatban',sent:'Elküldve',failed:'Küldési hiba',blocked:'Blokkolva',cancelled:'Törölve'};
const supportRoles=new Set(['owner','admin','order_manager','support']);
const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();

export default async function CustomerEmailWorkspace({searchParams}:{searchParams:Promise<{q?:string;filter?:string}>}){
  await requirePlanFeature('officeCommunication');
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)redirect('/admin/hozzaferes-megtagadva');
  const scope=await requireCurrentStoreContext('support.manage');
  const{q='',filter='open'}=await searchParams;
  const db=createAdminClient();

  const[
    threadResult,taskResult,orderResult,jobResult,bindingResult,draftResult,mailboxResult,
  ]=await Promise.all([
    db.from('office_threads')
      .select('id,subject,customer_email,order_id,status,priority,assigned_to,last_read_at,mailbox_key,updated_at,conversation_type')
      .eq('instance_id',scope.instanceId).eq('conversation_type','customer')
      .order('updated_at',{ascending:false}).limit(200),
    db.from('office_tasks').select('id,thread_id,title,status,assigned_to,due_at,created_at')
      .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300),
    db.from('orders').select('id,order_number,customer_email,status')
      .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300),
    db.from('communication_jobs').select('id,status,last_error')
      .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1500),
    scope.organizationId
      ?db.from('role_bindings').select('user_id,role_code,instance_id,valid_until')
        .eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString())
        .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`)
      :Promise.resolve({data:[] as Binding[],error:null}),
    db.from('office_drafts').select('id,thread_id,body,revision,updated_at')
      .eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','reply')
      .order('updated_at',{ascending:false}).limit(200),
    db.from('office_mailboxes').select('mailbox_key,is_active')
      .eq('instance_id',scope.instanceId).eq('is_active',true).limit(50),
  ]);

  const threads=(threadResult.data??[])as Thread[];
  const threadIds=threads.map(thread=>thread.id);
  const messageResult=threadIds.length
    ?await db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at,communication_job_id,subject')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).in('kind',['email_in','email_out'])
      .order('created_at',{ascending:false}).limit(1500)
    :{data:[] as Message[],error:null};
  const routeResult=threadIds.length
    ?await db.from('office_thread_email_routes').select('thread_id')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds)
    :{data:[] as EmailRoute[],error:null};

  const bindings=((bindingResult.data??[])as Binding[]).filter(row=>active(row.valid_until));
  const supportUserIds=[...new Set(bindings.filter(row=>supportRoles.has(row.role_code)).map(row=>row.user_id))];
  const profileResult=supportUserIds.length
    ?await db.from('profiles').select('id,email,full_name').in('id',supportUserIds)
    :{data:[] as Profile[],error:null};
  const profileMap=new Map(((profileResult.data??[])as Profile[]).map(profile=>[profile.id,profile]));
  const labelFor=(userId:string)=>profileMap.get(userId)?.full_name||profileMap.get(userId)?.email||`${userId.slice(0,8)}…`;
  const assignees:Assignee[]=supportUserIds.map(userId=>({userId,label:labelFor(userId)})).sort((a,b)=>a.label.localeCompare(b.label,'hu'));

  const messages=(messageResult.data??[])as Message[];
  const tasks=((taskResult.data??[])as Task[]).filter(task=>task.thread_id===null||threadIds.includes(task.thread_id));
  const orders=(orderResult.data??[])as Order[];
  const jobMap=new Map(((jobResult.data??[])as Job[]).map(job=>[job.id,job]));
  const drafts=(draftResult.data??[])as ReplyDraft[];
  const draftByThread=new Map<string,ReplyDraft>();
  for(const draft of drafts){if(draft.thread_id&&!draftByThread.has(draft.thread_id))draftByThread.set(draft.thread_id,draft);}
  const routedThreadIds=new Set(((routeResult.data??[])as EmailRoute[]).map(route=>route.thread_id));
  const activeMailboxKeys=new Set(((mailboxResult.data??[])as Mailbox[]).filter(mailbox=>mailbox.is_active).map(mailbox=>mailbox.mailbox_key));
  const canChat=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{resourceOwnerUserId:actor.id,resourceAssignedUserId:actor.id});

  const loadError=Boolean(threadResult.error||taskResult.error||orderResult.error||jobResult.error||bindingResult.error||draftResult.error||mailboxResult.error||messageResult.error||routeResult.error||profileResult.error);
  const now=Date.now();
  const unread=(thread:Thread)=>messages.some(message=>message.thread_id===thread.id&&message.kind==='email_in'&&(!thread.last_read_at||new Date(message.created_at)>new Date(thread.last_read_at)));
  const overdue=tasks.filter(task=>task.status==='open'&&task.due_at&&new Date(task.due_at).getTime()<now);
  const needle=q.trim().toLowerCase();
  const visible=threads.filter(thread=>
    (filter==='all'
      ||filter==='unread'&&unread(thread)
      ||filter==='urgent'&&thread.priority==='urgent'
      ||filter==='closed'&&thread.status==='closed'
      ||filter==='open'&&thread.status==='open')
    &&(!needle
      ||thread.subject.toLowerCase().includes(needle)
      ||thread.customer_email?.toLowerCase().includes(needle)
      ||orders.find(order=>order.id===thread.order_id)?.order_number.toLowerCase().includes(needle))
  );

  return <section className="adminMain">
    <div className="sectionIntro">
      <div>
        <span className="eyebrow">Pro · Ügyféllevelezés</span>
        <h1 className="sectionTitle">Webshop ↔ ügyfél e-mail munkatér</h1>
        <p className="lead">Ez a felület kizárólag a webshop és az ügyfelek közötti e-mailes kommunikációhoz tartozik. A munkatársi beszélgetések külön Team Chatben zajlanak.</p>
      </div>
      <div className="adminToolbar">
        {canChat&&<Link className="btn btnGhost" href="/admin/kommunikacio/chat">Team Chat</Link>}
        <Link className="btn btnGhost" href="/admin/kommunikacio/felugyelet">Küldési felügyelet</Link>
        <Link className="btn btnPrimary" href="/admin/kommunikacio/iroda/uj">Új e-mail</Link>
      </div>
    </div>

    <div className="adminAuditNotice">
      <strong>Külön kommunikációs csatorna</strong>
      <p>Az ügyfél nem lehet Team Chat résztvevő, a belső Team Chat üzenetek pedig nem jelennek meg ezen az oldalon. Küldés csak később jóváhagyott külön Digitális Iroda postafiókból aktiválható; a működő webshop jelenlegi e-mail címeit nem használjuk.</p>
    </div>
    {loadError&&<div className="errorNotice" role="alert"><strong>Az ügyféllevelezés adatainak egy része most nem tölthető be.</strong><p>Hiányos adatok mellett módosítást nem tekintünk biztonságosan végrehajthatónak.</p></div>}

    <div className="cards adminMetricCards">
      <article className="card"><span className="badge">Nyitott ügyféllevelek</span><div className="price">{threadResult.error?'—':threads.filter(thread=>thread.status==='open').length}</div></article>
      <article className="card"><span className="badge">Olvasatlan bejövő</span><div className="price">{loadError?'—':threads.filter(unread).length}</div></article>
      <article className="card"><span className="badge">Sürgős</span><div className="price">{threadResult.error?'—':threads.filter(thread=>thread.status==='open'&&thread.priority==='urgent').length}</div></article>
      <article className="card"><span className="badge">Lejárt feladat</span><div className="price">{taskResult.error?'—':overdue.length}</div></article>
    </div>

    <form className="adminToolbar">
      <input name="q" defaultValue={q} placeholder="Keresés téma, ügyfél e-mail vagy rendelés alapján"/>
      <select name="filter" defaultValue={filter}>
        <option value="open">Nyitott</option><option value="unread">Olvasatlan</option><option value="urgent">Sürgős</option><option value="closed">Lezárt</option><option value="all">Összes</option>
      </select>
      <button className="btn btnPrimary">Szűrés</button>
    </form>

    {overdue.length>0&&<section className="featurePanel"><h2>Lejárt ügyfélkommunikációs feladatok</h2>{overdue.slice(0,10).map(task=><div className="card" key={task.id}><strong>{task.title}</strong><p className="muted">Lejárt: {new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(task.due_at!))}</p>{!loadError&&<form action={completeTaskAction}><input type="hidden" name="id" value={task.id}/><button className="btn btnGhost">Kész</button></form>}</div>)}</section>}

    <section>
      <span className="eyebrow">{threadResult.error?'—':visible.length} találat</span>
      <h2>Ügyféllevelezések</h2>
      <div className="cards">
        {visible.map(thread=>{
          const threadMessages=messages.filter(message=>message.thread_id===thread.id).slice(0,20).reverse();
          const order=orders.find(item=>item.id===thread.order_id);
          const isUnread=unread(thread);
          const sendingConfigured=Boolean(thread.mailbox_key&&activeMailboxKeys.has(thread.mailbox_key)&&routedThreadIds.has(thread.id));
          const replyDraft=draftByThread.get(thread.id);
          return <article className="card" key={thread.id}>
            <div className="adminToolbar">
              <span className="badge">{priorityLabel[thread.priority]??thread.priority}</span>
              {isUnread&&<span className="badge">Olvasatlan</span>}
              {replyDraft&&<span className="badge">Saját piszkozat</span>}
              {order&&<Link className="textLink" href={`/admin/rendelesek/${order.id}`}>{order.order_number}</Link>}
            </div>
            <h3>{thread.subject}</h3>
            <p className="muted">{thread.customer_email??'Nincs ügyfél e-mail'} · {thread.assigned_to?labelFor(thread.assigned_to):'Nincs felelős'}</p>

            {!loadError&&<form action={updateThreadAction} className="adminToolbar">
              <input type="hidden" name="threadId" value={thread.id}/>
              <select name="priority" defaultValue={thread.priority}><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select>
              <select name="status" defaultValue={thread.status}><option value="open">Nyitott</option><option value="closed">Lezárt</option></select>
              <select name="assigneeUserId" defaultValue={thread.assigned_to??''}><option value="">Nincs felelős</option>{assignees.map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select>
              <button className="btn btnGhost">Frissítés</button>
            </form>}

            {isUnread&&!loadError&&<form action={markCustomerThreadReadAction}><input type="hidden" name="threadId" value={thread.id}/><button className="btn btnGhost">Olvasottnak jelölöm</button></form>}

            <div className="integrationList">
              {threadMessages.map(message=>{
                const job=message.communication_job_id?jobMap.get(message.communication_job_id):null;
                return <div key={message.id}><div><strong>{message.kind==='email_in'?'Ügyfél → webshop':'Webshop → ügyfél'}</strong>{message.subject&&<><br/>{message.subject}</>}<br/><span className="muted" style={{whiteSpace:'pre-wrap'}}>{message.body}</span></div><span className="muted">{job?jobLabel[job.status]??job.status:new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(message.created_at))}</span></div>;
              })}
            </div>

            {thread.customer_email&&!loadError&&<section className="featurePanel"><h4>Válasz az ügyfélnek</h4><OfficeCustomerEmailForm threadId={thread.id} sendingConfigured={sendingConfigured} initialDraft={replyDraft?{id:replyDraft.id,revision:replyDraft.revision,body:replyDraft.body}:undefined}/></section>}
            {!loadError&&<form action={createTaskAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><input name="title" required placeholder="Kapcsolódó feladat"/><input name="due" type="datetime-local"/><button className="btn btnGhost">Feladat létrehozása</button></form>}
          </article>;
        })}
      </div>
      {!threadResult.error&&!visible.length&&<div className="card"><p className="muted">Nincs a szűrésnek megfelelő ügyféllevelezés.</p></div>}
    </section>
  </section>;
}
