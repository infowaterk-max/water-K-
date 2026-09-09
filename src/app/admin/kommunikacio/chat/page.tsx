import Link from'next/link';
import{redirect}from'next/navigation';
import{OfficePrivateMessageForm}from'@/components/admin/office-private-message-form';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasStoreCapability}from'@/lib/auth/store-capabilities';
import{hasStorePermission}from'@/lib/auth/store-rbac';
import{hasCurrentPlanFeature,requirePlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{
  createPrivateThreadAction,
  managePrivateParticipantAction,
  markThreadReadAction,
  transferPrivateThreadOwnerAction,
}from'./actions';

export const dynamic='force-dynamic';

type Thread={id:string;subject:string;status:string;updated_at:string;conversation_type:'internal_private'|'internal_group'};
type Message={id:string;thread_id:string;author_id:string|null;kind:string;body:string;created_at:string};
type Participant={thread_id:string;user_id:string;participant_role:'owner'|'member';last_read_at:string|null};
type Mention={message_id:string;thread_id:string;mentioned_user_id:string;seen_at:string|null};
type ObjectLink={id:string;message_id:string;thread_id:string;object_type:'order'|'commercial_offer'|'return_case'|'support_ticket'|'task';object_id:string};
type Attachment={id:string;message_id:string;thread_id:string;original_name:string;byte_size:number|string};
type Binding={user_id:string;valid_until:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type Order={id:string;order_number:string;status:string};
type Offer={id:string;status:string;total_net_huf:number|string|null};
type ReturnCase={id:string;order_id:string;status:string};
type Ticket={id:string;ticket_number:string;subject:string;status:string};
type Task={id:string;title:string;status:string};
type ObjectOption={value:string;label:string};

type AccessibleThreadRow={thread_id:string};
const active=(until:string|null)=>!until||Date.parse(until)>Date.now();
const shortId=(id:string)=>`${id.slice(0,8)}…`;
const fileSize=(value:number|string)=>{const bytes=Number(value);if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;return`${bytes} B`};

export default async function TeamChatPage({searchParams}:{searchParams:Promise<{q?:string;filter?:string}>}){
  await requirePlanFeature('teamChat');
  const actor=await getAdminRequestUser();
  if(!actor)redirect('/admin/hozzaferes-megtagadva');
  const scope=await requireCurrentStoreContext();
  const canChat=await hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat',{resourceOwnerUserId:actor.id,resourceAssignedUserId:actor.id});
  if(!canChat)redirect('/admin/hozzaferes-megtagadva');
  const[canBusinessObjects,secureAttachments]=await Promise.all([
    scope.isPlatform?Promise.resolve(true):hasStorePermission(scope.instanceId,'support.manage'),
    hasCurrentPlanFeature('teamChatSecureAttachments'),
  ]);
  const{q='',filter='all'}=await searchParams;
  const db=createAdminClient();
  const{data:accessibleData,error:accessibleError}=await db.rpc('office_accessible_thread_ids_v1',{p_instance_id:scope.instanceId,p_user_id:actor.id});
  const accessibleIds=accessibleError?null:((accessibleData??[])as AccessibleThreadRow[]).map(row=>row.thread_id);
  if(accessibleIds===null)return <section className="adminMain"><div className="errorNotice"><strong>A Team Chat jogosultsági adatai most nem igazolhatók.</strong><p>Biztonsági okból egyetlen belső beszélgetést sem mutatunk.</p></div></section>;

  const empty=<T,>()=>Promise.resolve({data:[]as T[],error:null});
  const threadResult=accessibleIds.length?await db.from('office_threads').select('id,subject,status,updated_at,conversation_type').eq('instance_id',scope.instanceId).in('id',accessibleIds).in('conversation_type',['internal_private','internal_group']).order('updated_at',{ascending:false}).limit(200):{data:[]as Thread[],error:null};
  const threads=(threadResult.data??[])as Thread[],threadIds=threads.map(t=>t.id);
  const[
    messageResult,participantResult,mentionResult,objectLinkResult,attachmentResult,bindingResult,
    orderResult,offerResult,returnResult,ticketResult,taskResult,
  ]=await Promise.all([
    threadIds.length?db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).eq('kind','internal').order('created_at',{ascending:false}).limit(1500):empty<Message>(),
    threadIds.length?db.from('office_thread_participants').select('thread_id,user_id,participant_role,last_read_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).is('left_at',null):empty<Participant>(),
    threadIds.length?db.from('office_message_mentions').select('message_id,thread_id,mentioned_user_id,seen_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500):empty<Mention>(),
    threadIds.length?db.from('office_message_object_links').select('id,message_id,thread_id,object_type,object_id').eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(1500):empty<ObjectLink>(),
    secureAttachments&&threadIds.length?db.from('office_message_attachments').select('id,message_id,thread_id,original_name,byte_size').eq('instance_id',scope.instanceId).in('thread_id',threadIds).eq('status','ready').order('created_at',{ascending:false}).limit(1500):empty<Attachment>(),
    scope.organizationId?db.from('role_bindings').select('user_id,valid_until').eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString()).or(`instance_id.eq.${scope.instanceId},instance_id.is.null`):empty<Binding>(),
    canBusinessObjects?db.from('orders').select('id,order_number,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(150):empty<Order>(),
    canBusinessObjects?db.from('commercial_offers').select('id,status,total_net_huf').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Offer>(),
    canBusinessObjects?db.from('return_cases').select('id,order_id,status').eq('instance_id',scope.instanceId).order('requested_at',{ascending:false}).limit(100):empty<ReturnCase>(),
    canBusinessObjects?db.from('support_tickets').select('id,ticket_number,subject,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Ticket>(),
    canBusinessObjects?db.from('office_tasks').select('id,title,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Task>(),
  ]);

  const loadError=Boolean(threadResult.error||messageResult.error||participantResult.error||mentionResult.error||objectLinkResult.error||attachmentResult.error||bindingResult.error||orderResult.error||offerResult.error||returnResult.error||ticketResult.error||taskResult.error);
  const messages=(messageResult.data??[])as Message[],participants=(participantResult.data??[])as Participant[],mentions=(mentionResult.data??[])as Mention[],links=(objectLinkResult.data??[])as ObjectLink[],attachments=(attachmentResult.data??[])as Attachment[];
  const bindings=((bindingResult.data??[])as Binding[]).filter(row=>active(row.valid_until));
  const userIds=[...new Set(bindings.map(row=>row.user_id))];
  const profileResult=userIds.length?await db.from('profiles').select('id,email,full_name').in('id',userIds):{data:[]as Profile[],error:null};
  const profileMap=new Map(((profileResult.data??[])as Profile[]).map(p=>[p.id,p]));
  const chatDecisions=await Promise.all(userIds.map(async userId=>({userId,allowed:await hasStoreCapability(scope.instanceId,userId,'office.internal_chat',{resourceOwnerUserId:userId,resourceAssignedUserId:userId})})));
  const chatUserIds=new Set(chatDecisions.filter(row=>row.allowed).map(row=>row.userId));
  const chatUsers=userIds.filter(id=>chatUserIds.has(id));
  const labelFor=(id:string)=>profileMap.get(id)?.full_name||profileMap.get(id)?.email||shortId(id);

  const orders=(orderResult.data??[])as Order[],offers=(offerResult.data??[])as Offer[],returns=(returnResult.data??[])as ReturnCase[],tickets=(ticketResult.data??[])as Ticket[],tasks=(taskResult.data??[])as Task[];
  const objectOptions:ObjectOption[]=canBusinessObjects?[
    ...orders.map(o=>({value:`order:${o.id}`,label:`Rendelés · ${o.order_number} · ${o.status}`})),
    ...offers.map(o=>({value:`commercial_offer:${o.id}`,label:`Árajánlat · ${shortId(o.id)} · ${o.status}`})),
    ...returns.map(r=>({value:`return_case:${r.id}`,label:`Visszáru · ${orders.find(o=>o.id===r.order_id)?.order_number??shortId(r.id)} · ${r.status}`})),
    ...tickets.map(t=>({value:`support_ticket:${t.id}`,label:`Ügyfélszolgálat · ${t.ticket_number} · ${t.subject}`})),
    ...tasks.map(t=>({value:`task:${t.id}`,label:`Feladat · ${t.title} · ${t.status}`})),
  ]:[];

  const lastRead=new Map(participants.filter(p=>p.user_id===actor.id).map(p=>[p.thread_id,p.last_read_at]));
  const unread=(thread:Thread)=>messages.some(m=>m.thread_id===thread.id&&m.author_id!==actor.id&&(!lastRead.get(thread.id)||new Date(m.created_at)>new Date(lastRead.get(thread.id)!)));
  const mentionThreads=new Set(mentions.filter(m=>m.mentioned_user_id===actor.id&&!m.seen_at).map(m=>m.thread_id));
  const needle=q.trim().toLowerCase();
  const visible=threads.filter(thread=>(filter==='all'||filter==='unread'&&unread(thread)||filter==='mentions'&&mentionThreads.has(thread.id))&&(!needle||thread.subject.toLowerCase().includes(needle)));

  const renderObject=(link:ObjectLink)=>{
    if(!canBusinessObjects)return null;
    if(link.object_type==='order'){const o=orders.find(x=>x.id===link.object_id);return o?<div className="adminAuditNotice" key={link.id}><strong>Rendelés · {o.order_number}</strong><p>{o.status}</p><Link className="textLink" href={`/admin/rendelesek/${o.id}`}>Rendelés megnyitása</Link></div>:null}
    if(link.object_type==='commercial_offer'){const o=offers.find(x=>x.id===link.object_id);return o?<div className="adminAuditNotice" key={link.id}><strong>Árajánlat · {shortId(o.id)}</strong><p>{o.status}</p></div>:null}
    if(link.object_type==='return_case'){const r=returns.find(x=>x.id===link.object_id);return r?<div className="adminAuditNotice" key={link.id}><strong>Visszáru · {orders.find(o=>o.id===r.order_id)?.order_number??shortId(r.id)}</strong><p>{r.status}</p><Link className="textLink" href="/admin/visszaru">Visszáruk megnyitása</Link></div>:null}
    if(link.object_type==='support_ticket'){const t=tickets.find(x=>x.id===link.object_id);return t?<div className="adminAuditNotice" key={link.id}><strong>Ügyfélszolgálat · {t.ticket_number}</strong><p>{t.subject} · {t.status}</p><Link className="textLink" href="/admin/ugyfelszolgalat">Ügyfélszolgálat megnyitása</Link></div>:null}
    const task=tasks.find(x=>x.id===link.object_id);return task?<div className="adminAuditNotice" key={link.id}><strong>Feladat · {task.title}</strong><p>{task.status}</p></div>:null;
  };

  return <section className="adminMain">
    <div className="sectionIntro"><div><span className="eyebrow">Team Chat 2.0 · Alap</span><h1 className="sectionTitle">Belső munkatársi chat</h1><p className="lead">Munkatárs ↔ munkatárs kommunikáció. Az ügyfelek nem résztvevői ennek a felületnek.</p></div>{await hasCurrentPlanFeature('officeCommunication')&&<Link className="btn btnGhost" href="/admin/kommunikacio">Ügyféllevelezés</Link>}</div>
    <div className="adminAuditNotice"><strong>Adatvédelmi határ</strong><p>A beszélgetést csak az aktív résztvevők olvashatják. Owner/Admin szerepkör önmagában nem ad betekintést a privát chat tartalmába. A chat tartalma 12 hónapos megőrzési szabályt kap; az audit nem másolja az üzenetek szövegét.</p></div>
    {!secureAttachments&&<div className="adminAuditNotice"><strong>Secure Attachments · Pro</strong><p>A szöveges chat, @említések és üzleti objektumhivatkozások az Alap részei. Biztonságos fájlcsatolmányok a Pro Team Chat 2.1 funkcióban lesznek elérhetők.</p></div>}
    {loadError&&<div className="errorNotice"><strong>A Team Chat adatainak egy része nem tölthető be.</strong><p>Hiányos adatok mellett a chatműveleteket biztonsági okból letiltjuk.</p></div>}

    <div className="cards adminMetricCards"><article className="card"><span className="badge">Beszélgetések</span><div className="price">{threadResult.error?'—':threads.length}</div></article><article className="card"><span className="badge">Olvasatlan</span><div className="price">{loadError?'—':threads.filter(unread).length}</div></article><article className="card"><span className="badge">@ Említések</span><div className="price">{loadError?'—':mentionThreads.size}</div></article></div>

    <section className="featurePanel"><h2>Új belső beszélgetés</h2>{!loadError?<form action={createPrivateThreadAction} className="stackForm"><input name="subject" required placeholder="Téma"/><label><span>Résztvevők</span><select name="participantUserId" multiple required size={Math.min(8,Math.max(3,chatUsers.length))}>{chatUsers.filter(id=>id!==actor.id).map(id=><option key={id} value={id}>{labelFor(id)}</option>)}</select></label>{canBusinessObjects&&<label className="stackForm"><span>Kapcsolt webshop-objektum</span><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{objectOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}<textarea name="body" required rows={3} maxLength={10000} placeholder="Első belső üzenet"/><button className="btn btnPrimary">Beszélgetés indítása</button></form>:<p className="muted">A teljes Team Chat read model szükséges új beszélgetéshez.</p>}</section>

    <form className="adminToolbar"><input name="q" defaultValue={q} placeholder="Keresés a beszélgetések témájában"/><select name="filter" defaultValue={filter}><option value="all">Összes</option><option value="unread">Olvasatlan</option><option value="mentions">@ Említések</option></select><button className="btn btnPrimary">Szűrés</button></form>

    <div className="cards">{visible.map(thread=>{
      const threadMessages=messages.filter(m=>m.thread_id===thread.id).slice(0,20).reverse();
      const threadParticipants=participants.filter(p=>p.thread_id===thread.id);
      const actorParticipant=threadParticipants.find(p=>p.user_id===actor.id);
      const isOwner=actorParticipant?.participant_role==='owner';
      const members=threadParticipants.filter(p=>p.participant_role==='member');
      const available=chatUsers.filter(id=>id!==actor.id&&!threadParticipants.some(p=>p.user_id===id));
      const mentionOptions=threadParticipants.filter(p=>p.user_id!==actor.id&&chatUserIds.has(p.user_id)).map(p=>({userId:p.user_id,label:labelFor(p.user_id)}));
      return <article className="card" key={thread.id}><div className="adminToolbar"><span className="badge">{thread.conversation_type==='internal_private'?'1:1':'Csoport'}</span>{unread(thread)&&<span className="badge">Olvasatlan</span>}{mentionThreads.has(thread.id)&&<span className="badge">@ Megemlítettek</span>}</div><h3>{thread.subject}</h3><div className="adminToolbar">{threadParticipants.map(p=><span className="badge" key={p.user_id}>{labelFor(p.user_id)}{p.participant_role==='owner'?' · tulajdonos':''}</span>)}</div>
      {!loadError&&isOwner&&<div className="stackForm">{available.length>0&&<form action={managePrivateParticipantAction} className="adminToolbar"><input type="hidden" name="threadId" value={thread.id}/><input type="hidden" name="operation" value="add"/><select name="targetUserId" required defaultValue=""><option value="" disabled>Új résztvevő…</option>{available.map(id=><option key={id} value={id}>{labelFor(id)}</option>)}</select><button className="btn btnGhost">Hozzáadás</button></form>}{threadParticipants.length>2&&members.length>0&&<div className="adminToolbar">{members.map(p=><form action={managePrivateParticipantAction} key={p.user_id}><input type="hidden" name="threadId" value={thread.id}/><input type="hidden" name="operation" value="remove"/><input type="hidden" name="targetUserId" value={p.user_id}/><button className="btn btnGhost">Eltávolítás: {labelFor(p.user_id)}</button></form>)}</div>}{members.length>0&&<form action={transferPrivateThreadOwnerAction} className="adminToolbar"><input type="hidden" name="threadId" value={thread.id}/><select name="targetUserId" required defaultValue=""><option value="" disabled>Új tulajdonos…</option>{members.map(p=><option key={p.user_id} value={p.user_id}>{labelFor(p.user_id)}</option>)}</select><button className="btn btnGhost">Tulajdonjog átadása</button></form>}</div>}
      {(unread(thread)||mentionThreads.has(thread.id))&&!loadError&&<form action={markThreadReadAction}><input type="hidden" name="threadId" value={thread.id}/><button className="btn btnGhost">Olvasottnak jelölöm</button></form>}
      <div className="integrationList">{threadMessages.map(message=><div key={message.id}><div><strong>{message.author_id?labelFor(message.author_id):'Rendszer'}</strong><br/><span className="muted" style={{whiteSpace:'pre-wrap'}}>{message.body}</span>{mentions.filter(m=>m.message_id===message.id).length>0&&<div className="adminToolbar">{mentions.filter(m=>m.message_id===message.id).map(m=><span className="badge" key={m.mentioned_user_id}>@{labelFor(m.mentioned_user_id)}{m.mentioned_user_id===actor.id&&!m.seen_at?' · új':''}</span>)}</div>}{links.filter(l=>l.message_id===message.id).map(renderObject)}{secureAttachments&&attachments.filter(a=>a.message_id===message.id).length>0&&<div className="adminToolbar">{attachments.filter(a=>a.message_id===message.id).map(a=><a className="textLink" href={`/api/admin/office/attachments/${a.id}`} key={a.id}>📎 {a.original_name} · {fileSize(a.byte_size)}</a>)}</div>}</div><span className="muted">{new Intl.DateTimeFormat('hu-HU',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Budapest'}).format(new Date(message.created_at))}</span></div>)}</div>
      {!loadError&&<OfficePrivateMessageForm threadId={thread.id} mentionOptions={mentionOptions} objectOptions={objectOptions}/>}</article>;
    })}</div>
    {!threadResult.error&&!visible.length&&<div className="card"><p className="muted">Nincs a szűrésnek megfelelő belső beszélgetés.</p></div>}
  </section>;
}
