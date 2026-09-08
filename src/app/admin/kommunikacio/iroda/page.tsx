import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OfficeCustomerEmailForm } from '@/components/admin/office-customer-email-form';
import { OfficePrivateMessageForm } from '@/components/admin/office-private-message-form';
import { getAdminRequestUser } from '@/lib/auth/admin-api';
import { hasStoreCapability } from '@/lib/auth/store-capabilities';
import { hasStorePermission } from '@/lib/auth/store-rbac';
import { requirePlanFeature } from '@/lib/plans/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCurrentStoreContext } from '@/lib/instances/scope';
import {
  addMessageAction,
  completeTaskAction,
  createPrivateThreadAction,
  createTaskAction,
  createThreadAction,
  managePrivateParticipantAction,
  markThreadReadAction,
  transferPrivateThreadOwnerAction,
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
};
type Message={id:string;thread_id:string;author_id:string|null;kind:string;body:string;created_at:string;communication_job_id:string|null;subject:string|null};
type Task={id:string;thread_id:string|null;title:string;status:string;assigned_to:string|null;due_at:string|null;created_at:string};
type Order={id:string;order_number:string;customer_email:string;status:string};
type CommercialOffer={id:string;status:string;total_net_huf:number|string|null;created_at:string};
type ReturnCase={id:string;order_id:string;customer_email:string;status:string;refund_amount_gross_huf:number|null;requested_at:string};
type SupportTicket={id:string;ticket_number:string;order_id:string|null;subject:string;status:string;priority:string;created_at:string};
type Job={id:string;status:string;last_error:string|null};
type ThreadParticipant={thread_id:string;user_id:string;participant_role:'owner'|'member';last_read_at:string|null;left_at:string|null};
type Mention={message_id:string;thread_id:string;mentioned_user_id:string;mentioned_by:string;seen_at:string|null;created_at:string};
type ObjectLink={id:string;message_id:string;thread_id:string;object_type:'order'|'commercial_offer'|'return_case'|'support_ticket'|'task';object_id:string};
type Attachment={id:string;message_id:string;thread_id:string;original_name:string;content_type:string;byte_size:number|string;status:'ready'};
type Binding={user_id:string;role_code:string;instance_id:string|null;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type Assignee={userId:string;label:string};
type AccessibleThreadRow={thread_id:string};
type ObjectOption={value:string;label:string};

const kindLabel:Record<string,string>={
  internal:'Belső üzenet',note:'Belső jegyzet',email_in:'Bejövő e-mail',email_out:'Kimenő e-mail',
};
const jobLabel:Record<string,string>={
  pending:'Küldésre vár',processing:'Küldés folyamatban',sent:'Elküldve',failed:'Küldési hiba',blocked:'Blokkolva',cancelled:'Törölve',
};
const priorityLabel:Record<string,string>={low:'Alacsony',normal:'Normál',high:'Magas',urgent:'Sürgős'};
const supportRoles=new Set(['owner','admin','order_manager','support']);
const active=(validUntil:string|null)=>!validUntil||Date.parse(validUntil)>Date.now();
const shortId=(id:string)=>`${id.slice(0,8)}…`;
const huf=(value:number|string|null)=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:0}).format(Number(value??0));
const fileSize=(value:number|string)=>{
  const bytes=Number(value);
  if(!Number.isFinite(bytes)||bytes<=0)return'—';
  if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;
  if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;
  return`${bytes} B`;
};

function ObjectSelect({options}:{options:ObjectOption[]}){
  return <label className="stackForm"><span>Kapcsolt üzleti objektum</span><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export default async function OfficeWorkspace({searchParams}:{searchParams:Promise<{q?:string;filter?:string}>}){
  await requirePlanFeature('officeCommunication');
  const actor=await getAdminRequestUser();
  if(!actor)redirect('/admin/hozzaferes-megtagadva');
  const scope=await requireCurrentStoreContext();
  const[canSupportWorkspace,canInternalChat]=await Promise.all([
    scope.isPlatform?Promise.resolve(true):hasStorePermission(scope.instanceId,'support.manage'),
    hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{
      resourceOwnerUserId:actor.id,
      resourceAssignedUserId:actor.id,
    }),
  ]);
  if(!canSupportWorkspace&&!canInternalChat)redirect('/admin/hozzaferes-megtagadva');

  const{q='',filter='open'}=await searchParams;
  const db=createAdminClient();
  const{data:accessibleData,error:accessibleError}=await db.rpc('office_accessible_thread_ids_v1',{
    p_instance_id:scope.instanceId,
    p_user_id:actor.id,
  });
  const accessibleIds=accessibleError?null:((accessibleData??[])as AccessibleThreadRow[]).map(row=>row.thread_id);

  const threadQuery=db.from('office_threads')
    .select('id,subject,customer_email,order_id,status,priority,assigned_to,last_read_at,updated_at,conversation_type')
    .eq('instance_id',scope.instanceId)
    .order('updated_at',{ascending:false})
    .limit(200);
  const{data:t,error:threadError}=accessibleIds===null
    ? canSupportWorkspace
      ? await threadQuery.eq('conversation_type','customer')
      : {data:[],error:null}
    : accessibleIds.length
      ? await threadQuery.in('id',accessibleIds)
      : {data:[],error:null};

  const threads=(t??[])as Thread[];
  const threadIds=threads.map(thread=>thread.id);
  const empty=<T,>()=>Promise.resolve({data:[] as T[],error:null});

  const messagePromise=threadIds.length
    ? db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at,communication_job_id,subject')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500)
    : empty<Message>();
  const participantPromise=threadIds.length
    ? db.from('office_thread_participants').select('thread_id,user_id,participant_role,last_read_at,left_at')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).is('left_at',null)
    : empty<ThreadParticipant>();
  const mentionPromise=threadIds.length
    ? db.from('office_message_mentions').select('message_id,thread_id,mentioned_user_id,mentioned_by,seen_at,created_at')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500)
    : empty<Mention>();
  const objectLinkPromise=threadIds.length
    ? db.from('office_message_object_links').select('id,message_id,thread_id,object_type,object_id')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500)
    : empty<ObjectLink>();
  const attachmentPromise=threadIds.length
    ? db.from('office_message_attachments').select('id,message_id,thread_id,original_name,content_type,byte_size,status')
      .eq('instance_id',scope.instanceId).in('thread_id',threadIds).eq('status','ready').order('created_at',{ascending:false}).limit(1500)
    : empty<Attachment>();

  // Chat-only access never opens broad tenant business datasets. Business cards remain support-authorized until
  // their individual resource capabilities are migrated with full scope-aware read models.
  const taskPromise=canSupportWorkspace
    ? db.from('office_tasks').select('id,thread_id,title,status,assigned_to,due_at,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300)
    : empty<Task>();
  const orderPromise=canSupportWorkspace
    ? db.from('orders').select('id,order_number,customer_email,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(300)
    : empty<Order>();
  const offerPromise=canSupportWorkspace
    ? db.from('commercial_offers').select('id,status,total_net_huf,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(150)
    : empty<CommercialOffer>();
  const returnPromise=canSupportWorkspace
    ? db.from('return_cases').select('id,order_id,customer_email,status,refund_amount_gross_huf,requested_at').eq('instance_id',scope.instanceId).order('requested_at',{ascending:false}).limit(150)
    : empty<ReturnCase>();
  const ticketPromise=canSupportWorkspace
    ? db.from('support_tickets').select('id,ticket_number,order_id,subject,status,priority,created_at').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(150)
    : empty<SupportTicket>();
  const jobPromise=canSupportWorkspace
    ? db.from('communication_jobs').select('id,status,last_error').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(1500)
    : empty<Job>();
  const bindingPromise=scope.organizationId
    ? db.from('role_bindings').select('user_id,role_code,instance_id,valid_until')
      .eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString())
      .or(`instance_id.eq.${scope.instanceId},instance_id.is.null`)
    : empty<Binding>();

  const[
    {data:m,error:messageError},
    {data:participantData,error:participantError},
    {data:mentionData,error:mentionError},
    {data:objectLinkData,error:objectLinkError},
    {data:attachmentData,error:attachmentError},
    {data:k,error:taskError},
    {data:o,error:orderError},
    {data:offerData,error:offerError},
    {data:returnData,error:returnError},
    {data:ticketData,error:ticketError},
    {data:j,error:jobError},
    {data:bindingData,error:bindingError},
  ]=await Promise.all([
    messagePromise,participantPromise,mentionPromise,objectLinkPromise,attachmentPromise,taskPromise,orderPromise,offerPromise,returnPromise,ticketPromise,jobPromise,bindingPromise,
  ]);

  const messages=(m??[])as Message[];
  const participants=(participantData??[])as ThreadParticipant[];
  const actorReads=participants.filter(row=>row.user_id===actor.id);
  const readMap=new Map(actorReads.map(row=>[row.thread_id,row.last_read_at]));
  const mentions=(mentionData??[])as Mention[];
  const objectLinks=(objectLinkData??[])as ObjectLink[];
  const attachments=(attachmentData??[])as Attachment[];
  const allTasks=(k??[])as Task[];
  const visibleThreadIds=new Set(threadIds);
  const tasks=allTasks.filter(task=>task.thread_id===null||visibleThreadIds.has(task.thread_id));
  const openTasks=tasks.filter(task=>task.status==='open');
  const orders=(o??[])as Order[];
  const offers=(offerData??[])as CommercialOffer[];
  const returns=(returnData??[])as ReturnCase[];
  const tickets=(ticketData??[])as SupportTicket[];
  const jobMap=new Map(((j??[])as Job[]).map(x=>[x.id,x]));

  const bindings=((bindingData??[])as Binding[]).filter(row=>active(row.valid_until));
  const teamUserIds=[...new Set(bindings.map(row=>row.user_id))];
  const supportUserIds=new Set(bindings.filter(row=>supportRoles.has(row.role_code)).map(row=>row.user_id));
  const{data:profileData,error:profileError}=teamUserIds.length
    ? await db.from('profiles').select('id,email,full_name').in('id',teamUserIds)
    : {data:[] as Profile[],error:null};
  const profileMap=new Map(((profileData??[])as Profile[]).map(profile=>[profile.id,profile]));
  const chatDecisions=await Promise.all(teamUserIds.map(async userId=>({
    userId,
    allowed:await hasStoreCapability(scope.instanceId,userId,'office.internal_chat',{
      resourceOwnerUserId:userId,
      resourceAssignedUserId:userId,
    }),
  })));
  const chatUserIds=new Set(chatDecisions.filter(row=>row.allowed).map(row=>row.userId));
  const labelFor=(userId:string)=>{
    const profile=profileMap.get(userId);
    return profile?.full_name||profile?.email||`${userId.slice(0,8)}…`;
  };
  const supportAssignees:Assignee[]=teamUserIds.filter(userId=>supportUserIds.has(userId)).map(userId=>({userId,label:labelFor(userId)})).sort((a,b)=>a.label.localeCompare(b.label,'hu'));
  const chatAssignees:Assignee[]=teamUserIds.filter(userId=>chatUserIds.has(userId)).map(userId=>({userId,label:labelFor(userId)})).sort((a,b)=>a.label.localeCompare(b.label,'hu'));

  const objectOptions:ObjectOption[]=canSupportWorkspace?[
    ...orders.slice(0,100).map(order=>({value:`order:${order.id}`,label:`Rendelés · ${order.order_number} · ${order.status}`})),
    ...offers.slice(0,60).map(offer=>({value:`commercial_offer:${offer.id}`,label:`Árajánlat · ${shortId(offer.id)} · ${offer.status} · ${huf(offer.total_net_huf)} Ft nettó`})),
    ...returns.slice(0,60).map(item=>({value:`return_case:${item.id}`,label:`Visszáru · ${orders.find(order=>order.id===item.order_id)?.order_number??shortId(item.id)} · ${item.status}`})),
    ...tickets.slice(0,60).map(ticket=>({value:`support_ticket:${ticket.id}`,label:`Ügyfélszolgálat · ${ticket.ticket_number} · ${ticket.subject}`})),
    ...tasks.slice(0,60).map(task=>({value:`task:${task.id}`,label:`Feladat · ${task.title} · ${task.status}`})),
  ]:[];

  const loadError=Boolean(
    threadError||messageError||taskError||orderError||jobError||participantError||mentionError||objectLinkError||attachmentError||offerError||returnError||ticketError||bindingError||profileError
  );
  const privacyFallback=Boolean(accessibleError);
  const canReadAct=!loadError&&!privacyFallback;
  const canCustomerAct=canReadAct&&canSupportWorkspace;
  const canPrivateAct=canReadAct&&canInternalChat;
  const now=Date.now();

  const lastReadFor=(thread:Thread)=>readMap.get(thread.id)??null;
  const unread=(thread:Thread)=>{
    const lastRead=lastReadFor(thread);
    return messages.some(message=>
      message.thread_id===thread.id
      &&(thread.conversation_type==='customer'?message.kind==='email_in':message.kind==='internal')
      &&message.author_id!==actor.id
      &&(!lastRead||new Date(message.created_at)>new Date(lastRead))
    );
  };
  const unseenMentions=mentions.filter(mention=>mention.mentioned_user_id===actor.id&&!mention.seen_at&&visibleThreadIds.has(mention.thread_id));
  const mentionThreadIds=new Set(unseenMentions.map(mention=>mention.thread_id));
  const overdue=openTasks.filter(x=>x.due_at&&new Date(x.due_at).getTime()<now);
  const needle=q.trim().toLowerCase();
  const visible=threads.filter(thread=>
    (filter==='all'
      ||filter==='unread'&&unread(thread)
      ||filter==='mentions'&&mentionThreadIds.has(thread.id)
      ||filter==='urgent'&&thread.priority==='urgent'
      ||filter==='closed'&&thread.status==='closed'
      ||filter==='open'&&thread.status==='open')
    &&(!needle
      ||thread.subject.toLowerCase().includes(needle)
      ||canSupportWorkspace&&thread.customer_email?.toLowerCase().includes(needle)
      ||canSupportWorkspace&&orders.find(order=>order.id===thread.order_id)?.order_number.toLowerCase().includes(needle))
  );

  function renderObjectCard(link:ObjectLink){
    if(!canSupportWorkspace)return null;
    if(link.object_type==='order'){
      const object=orders.find(item=>item.id===link.object_id);
      return object?<div className="adminAuditNotice" key={link.id}><strong>Rendelés · {object.order_number}</strong><p>Aktuális DB-állapot: {object.status}</p><Link className="textLink" href={`/admin/rendelesek/${object.id}`}>Rendelés megnyitása</Link></div>:null;
    }
    if(link.object_type==='commercial_offer'){
      const object=offers.find(item=>item.id===link.object_id);
      return object?<div className="adminAuditNotice" key={link.id}><strong>Árajánlat · {shortId(object.id)}</strong><p>Aktuális DB-állapot: {object.status} · {huf(object.total_net_huf)} Ft nettó</p></div>:null;
    }
    if(link.object_type==='return_case'){
      const object=returns.find(item=>item.id===link.object_id);
      const order=object?orders.find(item=>item.id===object.order_id):null;
      return object?<div className="adminAuditNotice" key={link.id}><strong>Visszáru · {order?.order_number??shortId(object.id)}</strong><p>Aktuális DB-állapot: {object.status}{object.refund_amount_gross_huf?` · ${huf(object.refund_amount_gross_huf)} Ft`:''}</p><Link className="textLink" href="/admin/visszaru">Visszáruk megnyitása</Link></div>:null;
    }
    if(link.object_type==='support_ticket'){
      const object=tickets.find(item=>item.id===link.object_id);
      return object?<div className="adminAuditNotice" key={link.id}><strong>Ügyfélszolgálat · {object.ticket_number}</strong><p>{object.subject}<br/>Aktuális DB-állapot: {object.status}</p><Link className="textLink" href="/admin/ugyfelszolgalat">Ügyfélszolgálat megnyitása</Link></div>:null;
    }
    const object=tasks.find(item=>item.id===link.object_id);
    return object?<div className="adminAuditNotice" key={link.id}><strong>Feladat · {object.title}</strong><p>Aktuális DB-állapot: {object.status}{object.due_at?` · Határidő: ${new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(object.due_at))}`:''}</p></div>:null;
  }

  return <section className="adminMain">
    <div className="sectionIntro">
      <div>
        <span className="eyebrow">Pro · Digitális iroda</span>
        <h1 className="sectionTitle">Ügyfélkommunikációs és belső munkatér</h1>
        <p className="lead">Ügyféllevelek, felelősség, feladatok és résztvevő-védett belső beszélgetések egy helyen.</p>
      </div>
      {canSupportWorkspace&&<Link className="btn btnGhost" href="/admin/kommunikacio">Küldési központ</Link>}
    </div>

    {privacyFallback&&<div className="errorNotice" role="alert">
      <strong>A privacy-foundation még nem érhető el ebben a környezetben.</strong>
      <p>Biztonsági okból privát belső beszélgetés nem jelenik meg és nem módosítható. Ügyfél-thread fallback csak meglévő support-joggal engedélyezett.</p>
    </div>}
    {loadError&&<div className="errorNotice" role="alert">
      <strong>A Team Chat foundation adatainak egy része most nem tölthető be.</strong>
      <p>Hiányos adatok mellett a nulla és üres állapotokat ne tekintsd véglegesnek. Hiányos mention-, participant-, objektumlink- vagy csatolmányadat mellett a privát chat módosításait biztonsági okból letiltjuk.</p>
    </div>}
    {!canSupportWorkspace&&canInternalChat&&<div className="adminAuditNotice">
      <strong>Egyéni belső chat jogosultság</strong>
      <p>Csak a résztvevőként engedélyezett belső beszélgetéseket látod. Ez a jogosultság önmagában nem ad hozzáférést rendelésekhez, ajánlatokhoz, visszárukhoz vagy ügyféladatokhoz.</p>
    </div>}

    <div className="cards adminMetricCards">
      <article className="card"><span className="badge">Nyitott ügyek</span><div className="price">{threadError?'—':threads.filter(x=>x.status==='open').length}</div></article>
      <article className="card"><span className="badge">Saját olvasatlan</span><div className="price">{threadError||messageError||participantError?'—':threads.filter(unread).length}</div></article>
      <article className="card"><span className="badge">@ Említések</span><div className="price">{mentionError?'—':unseenMentions.length}</div></article>
      {canSupportWorkspace&&<article className="card"><span className="badge">Lejárt feladat</span><div className="price">{taskError?'—':overdue.length}</div></article>}
      <article className="card"><span className="badge">Privát belső</span><div className="price">{threadError?'—':threads.filter(x=>x.conversation_type!=='customer').length}</div></article>
    </div>

    <form className="adminToolbar">
      <input name="q" defaultValue={q} placeholder={canSupportWorkspace?'Keresés téma, e-mail vagy rendelés alapján':'Keresés belső beszélgetés témája alapján'}/>
      <select name="filter" defaultValue={filter}>
        <option value="open">Nyitott</option><option value="unread">Olvasatlan</option><option value="mentions">@ Említések</option><option value="urgent">Sürgős</option><option value="closed">Lezárt</option><option value="all">Összes</option>
      </select>
      <button className="btn btnPrimary">Szűrés</button>
    </form>

    <div className="splitFeature">
      {canSupportWorkspace&&<section className="featurePanel">
        <h2>Új ügyfélügy</h2>
        {canCustomerAct?<form action={createThreadAction} className="stackForm">
          <input name="subject" required placeholder="Téma"/>
          <select name="orderId" defaultValue=""><option value="">Nincs konkrét rendelés</option>{orders.slice(0,100).map(order=><option key={order.id} value={order.id}>{order.order_number} · {order.customer_email}</option>)}</select>
          <input name="email" type="email" placeholder="Ügyfél e-mail"/>
          <textarea name="body" required rows={3} placeholder="Ügyhöz tartozó belső összefoglaló"/>
          <button className="btn btnPrimary">Létrehozás</button>
        </form>:<p className="muted">Teljes adat- és privacy foundation szükséges új ügy létrehozásához.</p>}
      </section>}

      {canInternalChat&&<section className="featurePanel">
        <h2>Új privát belső beszélgetés</h2>
        <p className="muted">A tartalmat kizárólag az aktív résztvevők láthatják. A létrehozó lesz a thread tulajdonosa; ezt a szerepet capability vagy platformrang nem helyettesíti.</p>
        {canPrivateAct?<form action={createPrivateThreadAction} className="stackForm">
          <input name="subject" required placeholder="Belső beszélgetés témája"/>
          <label><span>Résztvevők</span><select name="participantUserId" multiple required size={Math.min(8,Math.max(3,chatAssignees.length))}>{chatAssignees.filter(member=>member.userId!==actor.id).map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select></label>
          {canSupportWorkspace&&<ObjectSelect options={objectOptions}/>} 
          <textarea name="body" required rows={3} placeholder="Első privát belső üzenet"/>
          <button className="btn btnPrimary">Privát beszélgetés indítása</button>
        </form>:<p className="muted">A privát beszélgetés csak teljes Team Chat foundation és aktív belső chat jogosultság mellett indítható.</p>}
      </section>}
    </div>

    {canSupportWorkspace&&<section className="featurePanel">
      <h2>Feladatriasztások</h2>
      {overdue.slice(0,10).map(task=><div className="card" key={task.id}>
        <strong>{task.title}</strong>
        <p className="muted">Lejárt: {new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(task.due_at!))}</p>
        {canCustomerAct?<form action={completeTaskAction}><input type="hidden" name="id" value={task.id}/><button className="btn btnGhost">Kész</button></form>:<span className="muted">Csak megtekintés</span>}
      </div>)}
      {!taskError&&!overdue.length&&<p className="muted">Nincs lejárt feladat.</p>}
    </section>}

    <section>
      <span className="eyebrow">{threadError?'—':visible.length} találat</span>
      <h2>Beszélgetések</h2>
      <div className="cards">
        {visible.map(thread=>{
          const threadMessages=messages.filter(message=>message.thread_id===thread.id).slice(0,10);
          const order=canSupportWorkspace?orders.find(item=>item.id===thread.order_id):undefined;
          const isUnread=unread(thread);
          const isPrivate=thread.conversation_type!=='customer';
          const threadParticipants=participants.filter(participant=>participant.thread_id===thread.id);
          const actorParticipant=threadParticipants.find(participant=>participant.user_id===actor.id);
          const isThreadOwner=isPrivate&&actorParticipant?.participant_role==='owner';
          const memberParticipants=threadParticipants.filter(participant=>participant.participant_role==='member');
          const availableParticipants=chatAssignees.filter(member=>member.userId!==actor.id&&!threadParticipants.some(participant=>participant.user_id===member.userId));
          const mentionableParticipants=threadParticipants.filter(participant=>participant.user_id!==actor.id&&chatUserIds.has(participant.user_id));
          const mentionOptions=mentionableParticipants.map(participant=>({userId:participant.user_id,label:labelFor(participant.user_id)}));
          const hasUnseenMention=mentionThreadIds.has(thread.id);
          return <article className="card" key={thread.id}>
            <div className="adminToolbar">
              <span className="badge">{isPrivate?(thread.conversation_type==='internal_private'?'Privát 1:1':'Belső csoport'):priorityLabel[thread.priority]}</span>
              {isUnread&&<span className="badge">Olvasatlan</span>}
              {hasUnseenMention&&<span className="badge">@ Megemlítettek</span>}
              {order&&<Link className="textLink" href={`/admin/rendelesek/${order.id}`}>{order.order_number}</Link>}
            </div>
            <h3>{thread.subject}</h3>
            <p className="muted">{isPrivate?'Résztvevő-védett beszélgetés':`${thread.customer_email??'Nincs ügyfél e-mail'} · ${thread.assigned_to?labelFor(thread.assigned_to):'Nincs felelős'}`}</p>

            {isPrivate&&<div className="stackForm">
              <div className="adminToolbar"><strong>Résztvevők</strong><span className="muted">{threadParticipants.length}/25</span></div>
              <div className="adminToolbar">
                {threadParticipants.map(participant=><span className="badge" key={participant.user_id}>{labelFor(participant.user_id)}{participant.participant_role==='owner'?' · tulajdonos':''}</span>)}
              </div>
              {canPrivateAct&&isThreadOwner&&<>
                {availableParticipants.length>0&&<form action={managePrivateParticipantAction} className="adminToolbar">
                  <input type="hidden" name="threadId" value={thread.id}/><input type="hidden" name="operation" value="add"/>
                  <select name="targetUserId" required defaultValue=""><option value="" disabled>Új résztvevő…</option>{availableParticipants.map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select>
                  <button className="btn btnGhost">Hozzáadás</button>
                </form>}
                {threadParticipants.length>2&&memberParticipants.length>0&&<div className="adminToolbar">
                  {memberParticipants.map(participant=><form action={managePrivateParticipantAction} key={participant.user_id}>
                    <input type="hidden" name="threadId" value={thread.id}/><input type="hidden" name="operation" value="remove"/><input type="hidden" name="targetUserId" value={participant.user_id}/>
                    <button className="btn btnGhost">Eltávolítás: {labelFor(participant.user_id)}</button>
                  </form>)}
                </div>}
                {memberParticipants.length>0&&<form action={transferPrivateThreadOwnerAction} className="adminToolbar">
                  <input type="hidden" name="threadId" value={thread.id}/>
                  <select name="targetUserId" required defaultValue=""><option value="" disabled>Új tulajdonos…</option>{memberParticipants.map(participant=><option key={participant.user_id} value={participant.user_id}>{labelFor(participant.user_id)}</option>)}</select>
                  <button className="btn btnGhost">Tulajdonjog átadása</button>
                </form>}
              </>}
            </div>}

            {!isPrivate&&canCustomerAct&&<form action={updateThreadAction} className="adminToolbar">
              <input type="hidden" name="threadId" value={thread.id}/>
              <select name="priority" defaultValue={thread.priority}><option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option></select>
              <select name="status" defaultValue={thread.status}><option value="open">Nyitott</option><option value="closed">Lezárt</option></select>
              <select name="assigneeUserId" defaultValue={thread.assigned_to??''}><option value="">Nincs felelős</option>{supportAssignees.map(member=><option key={member.userId} value={member.userId}>{member.label}</option>)}</select>
              <button className="btn btnGhost">Frissítés</button>
            </form>}

            {canReadAct&&(isUnread||hasUnseenMention)&&<form action={markThreadReadAction}><input type="hidden" name="threadId" value={thread.id}/><button className="btn btnGhost">Olvasottnak jelölöm</button></form>}

            <div className="integrationList">
              {threadMessages.map(message=>{
                const job=canSupportWorkspace&&message.communication_job_id?jobMap.get(message.communication_job_id):null;
                const messageMentions=mentions.filter(mention=>mention.message_id===message.id);
                const messageObjectLinks=objectLinks.filter(link=>link.message_id===message.id);
                const messageAttachments=attachments.filter(attachment=>attachment.message_id===message.id);
                return <div key={message.id}>
                  <div>
                    <strong>{kindLabel[message.kind]??message.kind}</strong>{message.author_id&&<span className="muted"> · {labelFor(message.author_id)}</span>}
                    {message.subject&&<><br/>{message.subject}</>}<br/><span className="muted" style={{whiteSpace:'pre-wrap'}}>{message.body}</span>
                    {messageMentions.length>0&&<div className="adminToolbar">{messageMentions.map(mention=><span className="badge" key={mention.mentioned_user_id}>@{labelFor(mention.mentioned_user_id)}{mention.mentioned_user_id===actor.id&&!mention.seen_at?' · új':''}</span>)}</div>}
                    {messageObjectLinks.map(renderObjectCard)}
                    {messageAttachments.length>0&&<div className="adminToolbar">{messageAttachments.map(attachment=><a className="textLink" href={`/api/admin/office/attachments/${attachment.id}`} key={attachment.id}>📎 {attachment.original_name} · {fileSize(attachment.byte_size)}</a>)}</div>}
                  </div>
                  <span className="muted">{job?jobLabel[job.status]??job.status:new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(message.created_at))}</span>
                </div>;
              })}
            </div>

            {isPrivate
              ? canPrivateAct&&<OfficePrivateMessageForm threadId={thread.id} mentionOptions={mentionOptions} objectOptions={objectOptions}/>
              : canCustomerAct?<>
                <div className="splitFeature">
                  <form action={addMessageAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><select name="kind"><option value="internal">Ügyhöz tartozó belső üzenet</option><option value="note">Jegyzet</option></select><textarea name="body" required rows={2} placeholder="Az ügyön dolgozó csapatnak"/><button className="btn btnGhost">Belső bejegyzés</button></form>
                  {thread.customer_email&&<OfficeCustomerEmailForm threadId={thread.id}/>} 
                </div>
                <form action={createTaskAction} className="stackForm"><input type="hidden" name="threadId" value={thread.id}/><input name="title" required placeholder="Kapcsolódó feladat"/><input name="due" type="datetime-local"/><button className="btn btnGhost">Feladat létrehozása</button></form>
              </>:<div className="adminAuditNotice"><strong>Üzenetküldés átmenetileg letiltva.</strong><p>A munkatér teljes jogosultsági és Team Chat adatainak betöltése szükséges.</p></div>}
          </article>;
        })}
      </div>
      {!threadError&&!visible.length&&<div className="card"><p className="muted">Nincs a szűrésnek megfelelő ügy.</p></div>}
    </section>
  </section>;
}
