import Link from'next/link';
import{redirect}from'next/navigation';
import{OfficePrivateMessageForm}from'@/components/admin/office-private-message-form';
import{TeamChatPresenceIndicator,TeamChatPresenceProvider}from'@/components/admin/team-chat-presence';
import{TeamChatReadReceipt}from'@/components/admin/team-chat-read-receipt';
import{getAdminRequestUser}from'@/lib/auth/admin-api';
import{hasStoreCapability}from'@/lib/auth/store-capabilities';
import{hasStorePermission}from'@/lib/auth/store-rbac';
import{hasCurrentPlanFeature,requirePlanFeature}from'@/lib/plans/access';
import{createAdminClient}from'@/lib/supabase/admin';
import{requireCurrentStoreContext}from'@/lib/instances/scope';
import{
  createPrivateThreadAction,
  managePrivateParticipantAction,
  sendDirectMessageAction,
  transferPrivateThreadOwnerAction,
}from'./actions';

export const dynamic='force-dynamic';

type Thread={id:string;subject:string;status:string;updated_at:string;archived_at:string|null;conversation_type:'internal_private'|'internal_group'};
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
type SearchParams={q?:string;filter?:string;thread?:string;to?:string;new?:string;panel?:string};

const active=(until:string|null)=>!until||Date.parse(until)>Date.now();
const shortId=(id:string)=>`${id.slice(0,8)}…`;
const fileSize=(value:number|string)=>{const bytes=Number(value);if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;return`${bytes} B`};
const initials=(value:string)=>value.split(/\s+|@/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'TC';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(value));

export default async function TeamChatPage({searchParams}:{searchParams:Promise<SearchParams>}){
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
  const{q='',filter='all',thread:requestedThreadId='',to:requestedTo='',new:newMode='',panel=''}=await searchParams;
  const db=createAdminClient();
  const{data:accessibleData,error:accessibleError}=await db.rpc('office_accessible_thread_ids_v1',{p_instance_id:scope.instanceId,p_user_id:actor.id});
  const accessibleIds=accessibleError?null:((accessibleData??[])as AccessibleThreadRow[]).map(row=>row.thread_id);
  if(accessibleIds===null)return <section className="adminMain"><div className="errorNotice"><strong>A Team Chat jogosultsági adatai most nem igazolhatók.</strong><p>Biztonsági okból egyetlen belső beszélgetést sem mutatunk.</p></div></section>;

  const empty=<T,>()=>Promise.resolve({data:[]as T[],error:null});
  const threadResult=accessibleIds.length?await db.from('office_threads').select('id,subject,status,updated_at,archived_at,conversation_type').eq('instance_id',scope.instanceId).in('id',accessibleIds).in('conversation_type',['internal_private','internal_group']).order('updated_at',{ascending:false}).limit(250):{data:[]as Thread[],error:null};
  const threads=(threadResult.data??[])as Thread[],threadIds=threads.map(t=>t.id);
  const[
    messageResult,participantResult,mentionResult,objectLinkResult,attachmentResult,bindingResult,
    orderResult,offerResult,returnResult,ticketResult,taskResult,
  ]=await Promise.all([
    threadIds.length?db.from('office_messages').select('id,thread_id,author_id,kind,body,created_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).eq('kind','internal').order('created_at',{ascending:false}).limit(2000):empty<Message>(),
    threadIds.length?db.from('office_thread_participants').select('thread_id,user_id,participant_role,last_read_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).is('left_at',null):empty<Participant>(),
    threadIds.length?db.from('office_message_mentions').select('message_id,thread_id,mentioned_user_id,seen_at').eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(2000):empty<Mention>(),
    threadIds.length?db.from('office_message_object_links').select('id,message_id,thread_id,object_type,object_id').eq('instance_id',scope.instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(2000):empty<ObjectLink>(),
    secureAttachments&&threadIds.length?db.from('office_message_attachments').select('id,message_id,thread_id,original_name,byte_size').eq('instance_id',scope.instanceId).in('thread_id',threadIds).eq('status','ready').order('created_at',{ascending:false}).limit(2000):empty<Attachment>(),
    scope.organizationId?db.from('role_bindings').select('user_id,valid_until').eq('organization_id',scope.organizationId).is('revoked_at',null).lte('valid_from',new Date().toISOString()).or(`instance_id.eq.${scope.instanceId},instance_id.is.null`):empty<Binding>(),
    canBusinessObjects?db.from('orders').select('id,order_number,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(150):empty<Order>(),
    canBusinessObjects?db.from('commercial_offers').select('id,status,total_net_huf').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Offer>(),
    canBusinessObjects?db.from('return_cases').select('id,order_id,status').eq('instance_id',scope.instanceId).order('requested_at',{ascending:false}).limit(100):empty<ReturnCase>(),
    canBusinessObjects?db.from('support_tickets').select('id,ticket_number,subject,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Ticket>(),
    canBusinessObjects?db.from('office_tasks').select('id,title,status').eq('instance_id',scope.instanceId).order('created_at',{ascending:false}).limit(100):empty<Task>(),
  ]);

  const messages=(messageResult.data??[])as Message[],participants=(participantResult.data??[])as Participant[],mentions=(mentionResult.data??[])as Mention[],links=(objectLinkResult.data??[])as ObjectLink[],attachments=(attachmentResult.data??[])as Attachment[];
  const bindings=((bindingResult.data??[])as Binding[]).filter(row=>active(row.valid_until));
  const userIds=[...new Set([...bindings.map(row=>row.user_id),...participants.map(row=>row.user_id)])];
  const profileResult=userIds.length?await db.from('profiles').select('id,email,full_name').in('id',userIds):{data:[]as Profile[],error:null};
  const loadError=Boolean(threadResult.error||messageResult.error||participantResult.error||mentionResult.error||objectLinkResult.error||attachmentResult.error||bindingResult.error||orderResult.error||offerResult.error||returnResult.error||ticketResult.error||taskResult.error||profileResult.error);
  const profileMap=new Map(((profileResult.data??[])as Profile[]).map(p=>[p.id,p]));
  const chatDecisions=await Promise.all(userIds.map(async userId=>({userId,allowed:await hasStoreCapability(scope.instanceId,userId,'office.internal_chat',{resourceOwnerUserId:userId,resourceAssignedUserId:userId})})));
  const chatUserIds=new Set(chatDecisions.filter(row=>row.allowed).map(row=>row.userId));
  const chatUsers=userIds.filter(id=>chatUserIds.has(id));
  const labelFor=(id:string)=>profileMap.get(id)?.full_name||profileMap.get(id)?.email||shortId(id);
  const emailFor=(id:string)=>profileMap.get(id)?.email??'';

  const orders=(orderResult.data??[])as Order[],offers=(offerResult.data??[])as Offer[],returns=(returnResult.data??[])as ReturnCase[],tickets=(ticketResult.data??[])as Ticket[],tasks=(taskResult.data??[])as Task[];
  const objectOptions:ObjectOption[]=canBusinessObjects?[
    ...orders.map(o=>({value:`order:${o.id}`,label:`Rendelés · ${o.order_number} · ${o.status}`})),
    ...offers.map(o=>({value:`commercial_offer:${o.id}`,label:`Árajánlat · ${shortId(o.id)} · ${o.status}`})),
    ...returns.map(r=>({value:`return_case:${r.id}`,label:`Visszáru · ${orders.find(o=>o.id===r.order_id)?.order_number??shortId(r.id)} · ${r.status}`})),
    ...tickets.map(t=>({value:`support_ticket:${t.id}`,label:`Ügyfélszolgálat · ${t.ticket_number} · ${t.subject}`})),
    ...tasks.map(t=>({value:`task:${t.id}`,label:`Feladat · ${t.title} · ${t.status}`})),
  ]:[];

  const participantIds=(threadId:string)=>participants.filter(p=>p.thread_id===threadId).map(p=>p.user_id);
  const isArchived=(thread:Thread)=>Boolean(thread.archived_at);
  const activeThreads=threads.filter(thread=>!isArchived(thread));
  const lastRead=new Map(participants.filter(p=>p.user_id===actor.id).map(p=>[p.thread_id,p.last_read_at]));
  const unread=(thread:Thread)=>!isArchived(thread)&&messages.some(m=>m.thread_id===thread.id&&m.author_id!==actor.id&&(!lastRead.get(thread.id)||new Date(m.created_at)>new Date(lastRead.get(thread.id)!)));
  const activeThreadIds=new Set(activeThreads.map(thread=>thread.id));
  const mentionThreads=new Set(mentions.filter(m=>activeThreadIds.has(m.thread_id)&&m.mentioned_user_id===actor.id&&!m.seen_at).map(m=>m.thread_id));
  const latestMessage=new Map<string,Message>();for(const message of messages){if(!latestMessage.has(message.thread_id))latestMessage.set(message.thread_id,message)}

  const directThreadByPeer=new Map<string,Thread>();
  for(const thread of activeThreads){
    const ids=participantIds(thread.id);
    if(thread.conversation_type!=='internal_private'||ids.length!==2||!ids.includes(actor.id))continue;
    const peer=ids.find(id=>id!==actor.id);if(peer&&!directThreadByPeer.has(peer))directThreadByPeer.set(peer,thread);
  }

  const needle=q.trim().toLowerCase();
  const visiblePeople=chatUsers.filter(id=>id!==actor.id).filter(id=>!needle||`${labelFor(id)} ${emailFor(id)}`.toLowerCase().includes(needle));
  const visibleThreads=activeThreads.filter(thread=>{
    const ids=participantIds(thread.id);const peer=thread.conversation_type==='internal_private'&&ids.length===2?ids.find(id=>id!==actor.id):null;
    const label=peer?labelFor(peer):thread.subject;
    const filterMatch=filter==='all'||filter==='unread'&&unread(thread)||filter==='mentions'&&mentionThreads.has(thread.id);
    return filterMatch&&(!needle||label.toLowerCase().includes(needle));
  });
  const archivedThreads=threads.filter(isArchived).filter(thread=>!needle||thread.subject.toLowerCase().includes(needle));

  const requestedToAllowed=requestedTo&&requestedTo!==actor.id&&chatUserIds.has(requestedTo)?requestedTo:'';
  const directFromTo=requestedToAllowed?directThreadByPeer.get(requestedToAllowed)??null:null;
  const requestedThread=threads.find(thread=>thread.id===requestedThreadId)??directFromTo;
  const creatingDirectTo=requestedToAllowed&&!directFromTo?requestedToAllowed:'';
  const creatingGroup=newMode==='group';
  const selectedThread=requestedThread??(!creatingDirectTo&&!creatingGroup?visibleThreads[0]??null:null);
  const explicitSelection=Boolean(requestedThreadId||requestedToAllowed||creatingGroup);
  const mobileView=panel==='info'&&selectedThread?'info':explicitSelection?'chat':'list';

  const selectedParticipants=selectedThread?participants.filter(p=>p.thread_id===selectedThread.id):[];
  const selectedMemberIds=selectedParticipants.map(p=>p.user_id);
  const selectedPeer=selectedThread&&selectedThread.conversation_type==='internal_private'&&selectedMemberIds.length===2?selectedMemberIds.find(id=>id!==actor.id)??null:null;
  const selectedTitle=selectedThread?(selectedPeer?labelFor(selectedPeer):selectedThread.subject):creatingDirectTo?labelFor(creatingDirectTo):creatingGroup?'Új csoportos beszélgetés':'Válassz beszélgetést';
  const selectedMessages=selectedThread?messages.filter(m=>m.thread_id===selectedThread.id).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)):[];
  const selectedOwner=selectedParticipants.find(p=>p.participant_role==='owner');
  const isSelectedOwner=selectedOwner?.user_id===actor.id;
  const available=chatUsers.filter(id=>id!==actor.id&&!selectedMemberIds.includes(id));
  const selectedMentionOptions=selectedParticipants.filter(p=>p.user_id!==actor.id&&chatUserIds.has(p.user_id)).map(p=>({userId:p.user_id,label:labelFor(p.user_id)}));

  const renderObject=(link:ObjectLink)=>{
    if(!canBusinessObjects)return null;
    if(link.object_type==='order'){const o=orders.find(x=>x.id===link.object_id);return o?<Link className="teamChatObjectCard" key={link.id} href={`/admin/rendelesek/${o.id}`}><span>Rendelés</span><strong>{o.order_number}</strong><small>{o.status}</small></Link>:null}
    if(link.object_type==='commercial_offer'){const o=offers.find(x=>x.id===link.object_id);return o?<span className="teamChatObjectCard" key={link.id}><span>Árajánlat</span><strong>{shortId(o.id)}</strong><small>{o.status}</small></span>:null}
    if(link.object_type==='return_case'){const r=returns.find(x=>x.id===link.object_id);return r?<Link className="teamChatObjectCard" key={link.id} href="/admin/visszaru"><span>Visszáru</span><strong>{orders.find(o=>o.id===r.order_id)?.order_number??shortId(r.id)}</strong><small>{r.status}</small></Link>:null}
    if(link.object_type==='support_ticket'){const t=tickets.find(x=>x.id===link.object_id);return t?<Link className="teamChatObjectCard" key={link.id} href="/admin/ugyfelszolgalat"><span>Ügyfélszolgálat</span><strong>{t.ticket_number}</strong><small>{t.subject}</small></Link>:null}
    const task=tasks.find(x=>x.id===link.object_id);return task?<span className="teamChatObjectCard" key={link.id}><span>Feladat</span><strong>{task.title}</strong><small>{task.status}</small></span>:null;
  };

  const groupThreads=(filter==='archived'?archivedThreads:visibleThreads).filter(thread=>thread.conversation_type==='internal_group'||participantIds(thread.id).length>2);

  return <TeamChatPresenceProvider><section className="teamChatWorkspace" data-mobile-view={mobileView}>
    {loadError&&<div className="errorNotice teamChatLoadError"><strong>A Team Chat adatainak egy része nem tölthető be.</strong><p>Hiányos adatok mellett a chatműveleteket biztonsági okból letiltjuk.</p></div>}

    <aside className="teamChatPeoplePane" aria-label="Munkatársak és beszélgetések">
      <header className="teamChatPeopleHeader"><div><strong>Team Chat</strong><small>Belső munkatársi kommunikáció</small></div><Link className="teamChatNewButton" href="/admin/kommunikacio/chat?new=group" aria-label="Új csoportos beszélgetés">＋</Link></header>
      <form className="teamChatSearch"><input name="q" defaultValue={q} placeholder="Keresés munkatársra…"/><button aria-label="Keresés">⌕</button></form>
      <nav className="teamChatFilterTabs" aria-label="Chat szűrők">
        <Link href="/admin/kommunikacio/chat" aria-current={filter==='all'?'page':undefined}>Összes</Link>
        <Link href="/admin/kommunikacio/chat?filter=unread" aria-current={filter==='unread'?'page':undefined}>Olvasatlan</Link>
        <Link href="/admin/kommunikacio/chat?filter=mentions" aria-current={filter==='mentions'?'page':undefined}>@Említések</Link>
        <Link href="/admin/kommunikacio/chat?filter=archived" aria-current={filter==='archived'?'page':undefined}>Archív</Link>
      </nav>

      <div className="teamChatPeopleScroll">
        {filter!=='archived'&&<section className="teamChatPeopleSection"><div className="teamChatSectionLabel"><span>Munkatársak</span><b>{visiblePeople.length}</b></div>{visiblePeople.length?visiblePeople.map(userId=>{
          const direct=directThreadByPeer.get(userId);const last=direct?latestMessage.get(direct.id):null;const activeSelection=(creatingDirectTo===userId)||(selectedPeer===userId);
          return <Link key={userId} className="teamChatPersonRow" data-active={activeSelection?'true':'false'} href={direct?`/admin/kommunikacio/chat?thread=${direct.id}`:`/admin/kommunikacio/chat?to=${userId}`}>
            <span className="teamChatAvatar">{initials(labelFor(userId))}</span>
            <span className="teamChatPersonBody"><span><strong>{labelFor(userId)}</strong>{direct&&unread(direct)&&<i className="teamChatUnreadDot"/>}</span><TeamChatPresenceIndicator userId={userId}/><small>{last?last.body:'Kattints és írj üzenetet'}</small></span>
            {last&&<time>{dateLabel(last.created_at)}</time>}
          </Link>;
        }):<p className="teamChatEmptyList">Nincs találat.</p>}</section>}

        <section className="teamChatPeopleSection"><div className="teamChatSectionLabel"><span>{filter==='archived'?'Archivált':'Csoportok'}</span><b>{groupThreads.length}</b></div>{groupThreads.map(thread=>{
          const last=latestMessage.get(thread.id);return <Link key={thread.id} className="teamChatPersonRow" data-active={selectedThread?.id===thread.id?'true':'false'} href={`/admin/kommunikacio/chat?thread=${thread.id}${filter==='archived'?'&filter=archived':''}`}>
            <span className="teamChatAvatar isGroup">👥</span><span className="teamChatPersonBody"><span><strong>{thread.subject}</strong>{unread(thread)&&<i className="teamChatUnreadDot"/>}</span><small>{last?last.body:`${participantIds(thread.id).length} résztvevő`}</small></span>{last&&<time>{dateLabel(last.created_at)}</time>}
          </Link>})}{groupThreads.length===0&&<p className="teamChatEmptyList">Nincs ilyen beszélgetés.</p>}</section>
      </div>
    </aside>

    <main className="teamChatConversationPane">
      {(selectedThread||creatingDirectTo||creatingGroup)?<>
        <header className="teamChatConversationHeader">
          <Link className="teamChatMobileBack" href="/admin/kommunikacio/chat">←</Link>
          <span className="teamChatAvatar isLarge">{creatingGroup?'👥':initials(selectedTitle)}</span>
          <div className="teamChatConversationIdentity"><strong>{selectedTitle}</strong>{selectedPeer?<TeamChatPresenceIndicator userId={selectedPeer}/>:creatingDirectTo?<TeamChatPresenceIndicator userId={creatingDirectTo}/>:selectedThread?<small>{selectedParticipants.length} résztvevő</small>:<small>Új csoport</small>}</div>
          {selectedThread&&<Link className="teamChatInfoButton" href={`/admin/kommunikacio/chat?thread=${selectedThread.id}&panel=info`} aria-label="Beszélgetés adatai">ⓘ</Link>}
        </header>

        {selectedThread&&<TeamChatReadReceipt threadId={selectedThread.id} unread={unread(selectedThread)}/>} 

        {creatingGroup?<div className="teamChatCreatePanel"><div><h1>Új csoport</h1><p>Válaszd ki a résztvevőket, adj nevet a beszélgetésnek, és küldd el az első üzenetet.</p></div>{!loadError?<form action={createPrivateThreadAction} className="teamChatCreateForm"><input name="subject" required maxLength={180} placeholder="Csoport neve"/><label><span>Résztvevők</span><select name="participantUserId" multiple required size={Math.min(8,Math.max(4,visiblePeople.length))}>{visiblePeople.map(id=><option key={id} value={id}>{labelFor(id)}</option>)}</select></label><textarea name="body" required rows={4} maxLength={10000} placeholder="Első üzenet…"/>{canBusinessObjects&&<details><summary>＋ Rendelés vagy más objektum</summary><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{objectOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></details>}<button className="btn btnPrimary">Csoport létrehozása</button></form>:<p className="muted">A teljes Team Chat read model szükséges új beszélgetéshez.</p>}</div>
        :creatingDirectTo?<><div className="teamChatMessages teamChatMessagesEmpty"><div><strong>Még nincs üzenetváltás.</strong><p>Írj {labelFor(creatingDirectTo)} részére; az első üzenettel automatikusan létrejön a közvetlen beszélgetés.</p></div></div>{!loadError&&<form action={sendDirectMessageAction} className="teamChatDirectStarter"><input type="hidden" name="targetUserId" value={creatingDirectTo}/><textarea name="body" required rows={3} maxLength={10000} placeholder={`Üzenet ${labelFor(creatingDirectTo)} részére…`}/>{canBusinessObjects&&<details><summary>＋ Rendelés vagy más objektum</summary><select name="objectRef" defaultValue=""><option value="">Nincs kapcsolt objektum</option>{objectOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></details>}<button className="btn btnPrimary">Küldés</button></form>}</>
        :selectedThread?<><div className="teamChatMessages">{selectedMessages.length?selectedMessages.map(message=>{
          const mine=message.author_id===actor.id;const author=message.author_id?labelFor(message.author_id):'Rendszer';const messageMentions=mentions.filter(m=>m.message_id===message.id);const messageLinks=links.filter(l=>l.message_id===message.id);const messageAttachments=attachments.filter(a=>a.message_id===message.id);
          return <article className={`teamChatMessage${mine?' isMine':''}`} key={message.id}><span className="teamChatMessageAvatar">{initials(author)}</span><div className="teamChatMessageBubble"><header><strong>{mine?'Te':author}</strong><time>{dateLabel(message.created_at)}</time></header><p>{message.body}</p>{messageMentions.length>0&&<div className="teamChatMentionRow">{messageMentions.map(mention=><span key={`${message.id}-${mention.mentioned_user_id}`}>@{labelFor(mention.mentioned_user_id)}</span>)}</div>}{messageLinks.length>0&&<div className="teamChatObjectRow">{messageLinks.map(renderObject)}</div>}{messageAttachments.length>0&&<div className="teamChatAttachmentRow">{messageAttachments.map(a=><a className="teamChatObjectCard" key={a.id} href={`/api/admin/office/attachments/${a.id}`}><span>Csatolmány</span><strong>{a.original_name}</strong><small>{fileSize(a.byte_size)}</small></a>)}</div>}</div></article>;
        }):<div className="teamChatMessagesEmpty"><div><strong>Nincs üzenet.</strong><p>Írj az alsó mezőben a beszélgetés elindításához.</p></div></div>}</div>{!selectedThread.archived_at&&!loadError&&<div className="teamChatComposer"><OfficePrivateMessageForm compact threadId={selectedThread.id} mentionOptions={selectedMentionOptions} objectOptions={objectOptions}/></div>}{selectedThread.archived_at&&<div className="teamChatArchivedNotice">Ez a beszélgetés archivált, ezért új üzenet nem küldhető.</div>}</>:null}
      </>:<div className="teamChatNoSelection"><div><span>💬</span><strong>Válassz munkatársat</strong><p>Kattints egy névre, és már írhatod is az üzenetet.</p></div></div>}
    </main>

    <aside className="teamChatInfoPane" id="team-chat-info" aria-label="Beszélgetés adatai">
      {selectedThread?<>
        <header className="teamChatInfoHeader"><Link className="teamChatMobileBack" href={`/admin/kommunikacio/chat?thread=${selectedThread.id}`}>←</Link><div><strong>Beszélgetés adatai</strong><small>{selectedTitle}</small></div></header>
        <section className="teamChatInfoSection"><div className="teamChatSectionLabel"><span>Résztvevők</span><b>{selectedParticipants.length}</b></div><div className="teamChatParticipantList">{selectedParticipants.map(participant=><div key={participant.user_id}><span className="teamChatAvatar">{initials(labelFor(participant.user_id))}</span><span><strong>{participant.user_id===actor.id?'Te':labelFor(participant.user_id)}</strong><TeamChatPresenceIndicator userId={participant.user_id}/><small>{participant.participant_role==='owner'?'Beszélgetésgazda':'Résztvevő'}</small></span>{isSelectedOwner&&participant.user_id!==actor.id&&<form action={managePrivateParticipantAction}><input type="hidden" name="threadId" value={selectedThread.id}/><input type="hidden" name="targetUserId" value={participant.user_id}/><input type="hidden" name="operation" value="remove"/><button aria-label={`${labelFor(participant.user_id)} eltávolítása`}>×</button></form>}</div>)}</div>
          {isSelectedOwner&&available.length>0&&<form action={managePrivateParticipantAction} className="teamChatAddParticipant"><input type="hidden" name="threadId" value={selectedThread.id}/><input type="hidden" name="operation" value="add"/><select name="targetUserId" required defaultValue=""><option value="" disabled>＋ Résztvevő hozzáadása</option>{available.map(id=><option key={id} value={id}>{labelFor(id)}</option>)}</select><button className="btn btnGhost">Hozzáadás</button></form>}
        </section>
        {isSelectedOwner&&selectedParticipants.length>1&&<section className="teamChatInfoSection"><h2>Beszélgetésgazda</h2><form action={transferPrivateThreadOwnerAction} className="teamChatOwnerTransfer"><input type="hidden" name="threadId" value={selectedThread.id}/><select name="targetUserId" required defaultValue=""><option value="" disabled>Gazda átadása…</option>{selectedParticipants.filter(p=>p.user_id!==actor.id).map(p=><option key={p.user_id} value={p.user_id}>{labelFor(p.user_id)}</option>)}</select><button className="btn btnGhost">Átadás</button></form></section>}
        <section className="teamChatInfoSection"><details className="teamChatPrivacyInfo"><summary>Adatvédelem és megőrzés</summary><p>A beszélgetést csak az aktív résztvevők olvashatják. Owner/Admin szerepkör önmagában nem ad betekintést a privát chat tartalmába. A chat tartalma 12 hónapos megőrzési szabályt kap; 90 nap inaktivitás után archiválódik. Az audit nem másolja az üzenetek szövegét.</p>{!secureAttachments&&<p><strong>Secure Attachments:</strong> a biztonságos belső fájlcsatolmányok továbbra is külön Team Chat 2.1 release gate mögött maradnak.</p>}</details></section>
      </>:<div className="teamChatNoSelection"><div><strong>Nincs megnyitott beszélgetés.</strong></div></div>}
    </aside>
  </section></TeamChatPresenceProvider>;
}
