import Link from 'next/link';
import { OfficeCustomerEmailForm } from '@/components/admin/office-customer-email-form';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import {
  addMessageAction,
  addPrivateMessageAction,
  completeTaskAction,
  createPrivateThreadAction,
  createTaskAction,
  createThreadAction,
  markThreadReadAction,
  updateThreadAction,
} from './actions';

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
  updated_at:string;
  conversation_type:'customer'|'internal_private'|'internal_group';
  mailbox_key:string|null;
};
type Message={id:string;thread_id:string;kind:string;body:string;created_at:string;communication_job_id:string|null;subject:string|null};
type Task={id:string;thread_id:string|null;title:string;status:string;due_at:string|null};
type Order={id:string;order_number:string;customer_email:string;status:string};
type Job={id:string;status:string;last_error:string|null};
type ParticipantRead={thread_id:string;last_read_at:string|null};
type Binding={user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type Assignee={userId:string;label:string};
type ReplyDraft={id:string;thread_id:string;body:string;revision:number;updated_at:string};
type Mailbox={mailbox_key:string};
type EmailRoute={thread_id:string};
type AccessibleThreadRow={thread_id:string};

const kindLabel:Record<string,string>={
  internal:'Belső üzenet',note:'Belső jegyzet',email_in:'Bejövő e-mail',email_out:'Kimenő e-mail',
};
const jobLabel:Record<string,string>={
  pending:'Küldésre vár',processing:'Küldés folyamatban',sent:'Elküldve',failed:'Küldési hiba',blocked:'Blokkolva',cancelled:'Törölve',
};
const priorityLabel:Record<string,string>={low:'Alacsony',normal:'Normál',high:'Magas',urgent:'Sürgős'};
const supportRoles=new Set(['owner','admin','order_manager','support']);
const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();

export default async function OfficeWorkspace({searchParams}:{searchParams:Promise<{q?:string;filter?:string}>}){
  await requirePlanFeature('officeCommunication');
  const actor=await getAdminRequestUser('support.manage');
  if(!actor)throw new Error('Nincs jogosultság.');
  const scope=await requireCurrentStoreContext('support.manage');
  const{q='',filter='open'}=await searchParams;
  const db=createAdminClient();

  const{data:accessibleData,error:accessibleError}=await db.rpc('office_accessible_thread_ids_v1',{
    p_instance_id:scope.instanceId,
    p_user_id:actor.id,
  });
  const accessibleIds=accessibleError?null:((accessibleData??[])as AccessibleThreadRow[]).map(row=>row.thread_id);

  const threadQuery=db.from('office_threads')
    .select('id,subject,customer_email,order_id,status,priority,assigned_to,last_read_at,updated_at,conversation_type,mailbox_key')
    .eq('instance_id',scope.instanceId)
    .order('updated_at',{ascending:false})
    .limit(200);
  const{data:t,error:threadError}=accessibleIds===null
    ? await threadQuery.eq('conversation_type','customer')
    : accessibleIds.length
      ? await threadQuery.in('id',accessibleIds)
      : {data:[],error:null};

  const threads=(t??[])as Thread[];
  const threadIds=threads.map(thread=>thread.id);

  const messagePromise=threadIds.length
    ? db.from('office_messages').select('id,thread_id,kind,body,created_at,communication_job_id,subject')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500)
    : Promise.resolve({data:[] as Message[],error:null});
  const participantPromise=threadIds.length
    ? db.from('office_thread_participants').select('thread_id,last_read_at')
      .eq('instance_id',scope.instanceId).eq('user_id',actor.id).in('thread_id',threadIds).is('left_at',null)
    : Promise.resolve({data:[] as ParticipantRead[],error:null});
  const replyDraftPromise=threadIds.length
    ? db.from('office_drafts').select('id,thread_id,body,revision,updated_at')
      .eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','reply')
      .in('thread_id',threadIds).order('updated_at',{ascending:false}).limit(200)
    : Promise.resolve({data:[] as ReplyDraft[],error:null});
  const routePromise=threadIds.length
    ? db.from('office_thread_email_routes').select('thread_id')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds)
    : Promise.resolve({data:[] as EmailRoute[],error:null});
  const mailboxPromise=db.from('office_mailboxes').select('mailbox_key')
    .eq('instance_id',scope.instanceId).eq('is_active',true);
  const taskPromise=db.from('office_tasks').select('id,thread_id,title,status,due_at')
    .eq('instance_id',scope.instanceId).eq('status','open').order('due_at',{ascending:true,nullsFirst:false}).limit(200);
  const orderPromise=db.from('orders').select('id,order_number,customer_email,status')
    .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300);
  const jobPromise=db.from('communication_jobs').select('id,status,last_error')
    .eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1500);
  const bindingPromise=scope.organizationId
    ? db.from('role_bindings').select('user_id,role_code,instance_id,valid_until')
      .eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString())
      .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`)
    : Promise.resolve({data:[] as Binding[],error:null});

  const[
    {data:m,error:messageError},
    {data:participantData,error:participantError},
    {data:replyDraftData,error:replyDraftError},
    {data:routeData,error:routeError},
    {data:mailboxData,error:mailboxError},
    {data:k,error:taskError},
    {data:o,error:orderError},
    {data:j,error:jobError},
    {data:bindingData,error:bindingError},
  ]=await Promise.all([
    messagePromise,participantPromise,replyDraftPromise,routePromise,mailboxPromise,taskPromise,orderPromise,jobPromise,bindingPromise,
  ]);

  const messages=(m??[])as Message[];
  const reads=(participantData??[])as ParticipantRead[];
  const readMap=new Map(reads.map(row=>[row.thread_id,row.last_read_at]));
  const replyDraftMap=new Map<string,ReplyDraft>();
  for(const draft of (replyDraftData??[])as ReplyDraft[]){
    if(!replyDraftMap.has(draft.thread_id))replyDraftMap.set(draft.thread_id,draft);
  }
  const routedThreadIds=new Set(((routeData??[])as EmailRoute[]).map(route=>route.thread_id));
  const activeMailboxKeys=new Set(((mailboxData??[])as Mailbox[]).map(mailbox=>mailbox.mailbox_key));
  const allTasks=(k??[])as Task[];
  const visibleThreadIds=new Set(threadIds);
  const tasks=allTasks.filter(task=>task.thread_id===null||visibleThreadIds.has(task.thread_id));
  const orders=(o??[])as Order[];
  const jobMap=new Map(((j??[])as Job[]).map(x=>[x.id,x]));

  const bindings=((bindingData??[])as Binding[]).filter(row=>active(row.valid_until)&&supportRoles.has(row.role_code));
  const teamUserIds=[...new Set(bindings.map(row=>row.user_id))];
  const{data:profileData,error:profileError}=teamUserIds.length
    ? await db.from('profiles').select('id,email,full_name').in('id',teamUserIds)
    : {data:[] as Profile[],error:null};
  const profileMap=new Map(((profileData??[])as Profile[]).map(profile=>[profile.id,profile]));
  const assignees:Assignee[]=teamUserIds.map(userId=>{
    const profile=profileMap.get(userId);
    return{userId,label:profile?.full_name||profile?.email||`${userId.slice(0,8)}…`};
  }).sort((a,b)=>a.label.localeCompare(b.label,'hu'));

  const loadError=Boolean(
    threadError||messageError||taskError||orderError||jobError||participantError||replyDraftError||routeError||mailboxError||bindingError||profileError
  );
  const privacyFallback=Boolean(accessibleError);
  const canAct=!loadError&&!privacyFallback;
  const now=Date.now();

  const lastReadFor=(thread:Thread)=>readMap.get(thread.id)??null;
  const unread=(thread:Thread)=>{
    const lastRead=lastReadFor(thread);
    return messages.some(message=>
      message.thread_id===thread.id
      &&(thread.conversation_type==='customer'?message.kind==='email_in':message.kind==='internal')
      &&(!lastRead||new Date(message.created_at)>new Date(lastRead))
    );
  };
  const overdue=tasks.filter(x=>x.due_at&&new Date(x.due_at).getTime()<now);
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
        <span className="eyebrow">Pro · Digitális iroda</span>
        <h1 className="sectionTitle">Ügyfélkommunikációs és belső munkatér</h1>
        <p className="lead">Ügyféllevelek, felelősség, feladatok és résztvevő-védett belső beszélgetések egy helyen.</p>
      </div>
      <div className="adminToolbar">
        <Link className="btn btnPrimary" href="/admin/kommunikacio/iroda/uj">Új e-mail</Link>
        <Link className="btn btnGhost" href="/admin/kommunikacio">Küldési központ</Link>
      </div>
    </div>

    {privacyFallback&&<div className="errorNotice" role="alert">
      <strong>A privacy-foundation még nem érhető el ebben a környezetben.</strong>
      <p>Biztonsági okból ilyenkor csak a régi ügyfél-threadek tölthetők be, privát belső beszélgetés nem jelenik meg és nem módosítható.</p>
    </div>}
    {loadError&&<div className="errorNotice" role="alert">
      <strong>A kommunikációs munkatér adatainak egy része most nem tölthető be.</strong>
      <p>Hiányos adatok mellett a nulla és üres állapotokat ne tekintsd véglegesnek.</p>
    </div>}

    <div className="cards adminMetricCards">
      <article className="card"><span className="badge">Nyitott ügyek</span><div className="price">{threadError?'—':threads.filter(x=>x.status==='open').length}</div></article>
      <article className="card"><span className="badge">Saját olvasatlan</span><div className="price">{threadError||messageError||participantError?'—':threads.filter(unread).length}</div></article>
      <article className="card"><span className="badge">Lejárt feladat</span><div className="price">{taskError?'—':overdue.length}</div></article>
      <article className="card"><span className="badge">Saját reply draft</span><div className="price">{replyDraftError?'—':replyDraftMap.size}</div></article>
    </div>

    <form className="adminToolbar">
      <input name="q" defaultValue={q} placeholder="Keresés téma, e-mail vagy rendelés alapján"/>
      <select name="filter" defaultValue={filter}>
        <option value="open">Nyitott</option><option value="unread">Olvasatlan</option><option value="urgent">Sürgős</option><option value="closed">Lezárt</option><option value="all">Összes</option>
      </select>
      <button className="btn btnPrimary">Szűrés</button>
    </form>

    <div className="splitFeature">
      <section className="featurePanel">
        <h2>Új ügyfélügy</h2>
        {canAct?<form action={createThreadAction} className="stackForm">
          <input name="subject" required placeholder="Téma"/>
          <select name="orderId" defaultValue=""><option value="">Nincs konkrét rendelés</option>{orders.slice(0,100).map(order=><option key={order.id} value={order.id}>{order.order_number} · {order.customer_email}</option>)}</select>
          <input name="email" type="email" placeholder="Ügyfél e-mail"/>
          <textarea name="body" required rows={3} placeholder="Ügyhöz tartozó belső összefoglaló"/>
          <button className="btn btnPrimary">Létrehozás</button>
        </form>:<p className="muted">Teljes adat- és privacy foundation szükséges új ügy létrehozásához.</p>}
      </section>

      <section className="featurePanel">
        <h2>Új privát belső beszélgetés</h2>
        <p className="muted">A tartalmat kizárólag az aktív résztvevők láthatják. Tulajdonosi vagy platform rang önmagában nem ad betekintést.</p>
        {canAct?<form action={createPrivateThreadAction} className="stackForm">
          <input name="subject" required placeholder="Belső beszélgetés témája"/>
          <label><span>Résztvevők</span><select name="participantUserId" multiple required size={Math.min(8,Math.max(3,assignees.length))}>{assignees.filter(member=>member.userId!==actor.id).map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select></label>
          <textarea name="body" required rows={3} placeholder="Első privát belső üzenet"/>
          <button className="btn btnPrimary">Privát beszélgetés indítása</button>
        </form>:<p className="muted">A privát beszélgetés csak teljes privacy foundation mellett indítható.</p>}
      </section>
    </div>

    <section className="featurePanel">
      <h2>Feladatriasztások</h2>
      {overdue.slice(0,10).map(task=><div className="card" key={task.id}>
        <strong>{task.title}</strong>
        <p className="muted">Lejárt: {new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(task.due_at!))}</p>
        {canAct?<form action={completeTaskAction}><input type="hidden" name="id" value={task.id}/><button className="btn btnGhost">Kész</button></form>:<span className="muted">Csak megtekintés</span>}
      </div>)}
      {!taskError&&!overdue.length&&<p className="muted">Nincs lejárt feladat.</p>}
    </section>

    <section>
      <span className="eyebrow">{threadError?'—':visible.length} találat</span>
      <h2>Beszélgetések</h2>
      <div className="cards">
        {visible.map(thread=>{
          const threadMessages=messages.filter(message=>message.thread_id===thread.id).slice(0,10);
          const order=orders.find(item=>item.id===thread.order_id);
          const isUnread=unread(thread);
          const isPrivate=thread.conversation_type!=='customer';
          const replyDraft=replyDraftMap.get(thread.id);
          const sendingConfigured=Boolean(
            thread.mailbox_key&&activeMailboxKeys.has(thread.mailbox_key)&&routedThreadIds.has(thread.id)
          );
          return <article className="card" key={thread.id}>
            <div className="adminToolbar">
              <span className="badge">{isPrivate?(thread.conversation_type==='internal_private'?'Privát belső':'Belső csoport'):priorityLabel[thread.priority]}</span>
              {isUnread&&<span className="badge">Olvasatlan</span>}
              {replyDraft&&<span className="badge">Saját piszkozat</span>}
              {order&&<Link className="textLink" href={`/admin/rendelesek/${order.id}`}>{order.order_number}</Link>}
            </div>
            <h3>{thread.subject}</h3>
            <p className="muted">{isPrivate?'Résztvevő-védett beszélgetés':`${thread.customer_email??'Nincs ügyfél e-mail'} · ${thread.assigned_to?profileMap.get(thread.assigned_to)?.full_name||profileMap.get(thread.assigned_to)?.email||'Van felelős':'Nincs felelős'}`}</p>

            {!isPrivate&&canAct&&<form action={updateThreadAction} className="adminToolbar">
              <input type="hidden" name="threadId" value={thread.id}/>
              <select name="priority" defaultValue={thread.priority}><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select>
              <select name="status" defaultValue={thread.status}><option value="open">Nyitott</option><option value="closed">Lezárt</option></select>
              <select name="assigneeUserId" defaultValue={thread.assigned_to??''}><option value="">Nincs felelős</option>{assignees.map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select>
              <button className="btn btnGhost">Frissítés</button>
            </form>}

            {canAct&&isUnread&&<form action={markThreadReadAction}><input type="hidden" name="threadId" value={thread.id}/><button className="btn btnGhost">Olvasottnak jelölöm</button></form>}

            <div className="integrationList">
              {threadMessages.map(message=>{
                const job=message.communication_job_id?jobMap.get(message.communication_job_id):null;
                return <div key={message.id}>
                  <span><strong>{kindLabel[message.kind]??message.kind}</strong>{message.subject&&<><br/>{message.subject}</>}<br/><span className="muted" style={{whiteSpace:'pre-wrap'}}>{message.body}</span></span>
                  <span className="muted">{job?jobLabel[job.status]??job.status:new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short'}).format(new Date(message.created_at))}</span>
                </div>;
              })}
            </div>

            {isPrivate
              ? canAct&&<form action={addPrivateMessageAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><textarea name="body" required rows={2} placeholder="Privát belső üzenet"/><button className="btn btnGhost">Belső üzenet küldése</button></form>
              : canAct?<>
                <div className="splitFeature">
                  <form action={addMessageAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><select name="kind"><option value="internal">Ügyhöz tartozó belső üzenet</option><option value="note">Jegyzet</option></select><textarea name="body" required rows={2} placeholder="Az ügyön dolgozó csapatnak"/><button className="btn btnGhost">Belső bejegyzés</button></form>
                  {thread.customer_email&&<OfficeCustomerEmailForm
                    threadId={thread.id}
                    sendingConfigured={sendingConfigured}
                    initialDraft={replyDraft?{id:replyDraft.id,revision:replyDraft.revision,body:replyDraft.body}:undefined}
                  />}
                </div>
                <form action={createTaskAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><input name="title" required placeholder="Kapcsolódó feladat"/><input name="due" type="datetime-local"/><button className="btn btnGhost">Feladat létrehozása</button></form>
              </>:<div className="adminAuditNotice"><strong>Üzenetküldés átmenetileg letiltva.</strong><p>A munkatér teljes adatainak betöltése szükséges.</p></div>}
          </article>;
        })}
      </div>
      {!threadError&&!visible.length&&<div className="card"><p className="muted">Nincs a szűrésnek megfelelő ügy.</p></div>}
    </section>
  </section>;
}
