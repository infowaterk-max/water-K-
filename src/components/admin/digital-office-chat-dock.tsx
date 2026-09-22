import Link from 'next/link';
import {OfficePrivateMessageForm} from '@/components/admin/office-private-message-form';
import {hasStorePermission} from '@/lib/auth/store-rbac';
import {hasCurrentPlanFeature} from '@/lib/plans/access';
import {createAdminClient} from '@/lib/supabase/admin';

type Props={
  instanceId:string;
  actorId:string;
  baseHref:string;
  selectedChatId?:string;
};

type AccessibleThreadRow={thread_id:string};
type Thread={id:string;subject:string;updated_at:string;conversation_type:'internal_private'|'internal_group'};
type Message={id:string;thread_id:string;author_id:string|null;body:string;created_at:string};
type Participant={thread_id:string;user_id:string;last_read_at:string|null};
type Profile={id:string;email:string|null;full_name:string|null};
type Attachment={id:string;message_id:string;thread_id:string;original_name:string;byte_size:number|string;content_type:string};
type ObjectLink={id:string;message_id:string;thread_id:string;object_type:'order'|'commercial_offer'|'return_case'|'support_ticket'|'task';object_id:string};

const short=(value:string)=>value.length>82?`${value.slice(0,79)}…`:value;
const shortId=(value:string)=>`${value.slice(0,8)}…`;
const initials=(label:string)=>label.split(/[\s@._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'CH';
const fileSize=(value:number|string)=>{const bytes=Number(value);if(bytes>=1024*1024)return`${(bytes/(1024*1024)).toFixed(1)} MB`;if(bytes>=1024)return`${Math.round(bytes/1024)} KB`;return`${bytes} B`};
const objectLabel:Record<ObjectLink['object_type'],string>={order:'Rendelés',commercial_offer:'Árajánlat',return_case:'Visszáru',support_ticket:'Ügyfélszolgálati ügy',task:'Feladat'};

export async function DigitalOfficeChatDock({instanceId,actorId,baseHref,selectedChatId}:Props){
  const db=createAdminClient();
  const{data:accessibleData,error:accessibleError}=await db.rpc('office_accessible_thread_ids_v1',{p_instance_id:instanceId,p_user_id:actorId});
  if(accessibleError)return <details className="digitalOfficeChatDock"><summary>💬 Belső chat</summary><div className="digitalOfficeChatDockBody"><p className="muted">A belső chat jogosultsági listája most nem igazolható.</p><Link className="btn btnGhost" href="/admin/kommunikacio/chat">Team Chat megnyitása</Link></div></details>;

  const accessibleIds=((accessibleData??[])as AccessibleThreadRow[]).map(row=>row.thread_id);
  if(!accessibleIds.length)return <details className="digitalOfficeChatDock"><summary>💬 Belső chat</summary><div className="digitalOfficeChatDockBody"><p className="muted">Még nincs elérhető belső beszélgetés.</p><Link className="btn btnPrimary" href="/admin/kommunikacio/chat">Beszélgetés indítása</Link></div></details>;

  const threadResult=await db.from('office_threads').select('id,subject,updated_at,conversation_type').eq('instance_id',instanceId).in('id',accessibleIds).in('conversation_type',['internal_private','internal_group']).is('archived_at',null).order('updated_at',{ascending:false}).limit(10);
  const threads=(threadResult.data??[])as Thread[];
  const threadIds=threads.map(thread=>thread.id);
  if(threadResult.error||!threadIds.length)return <details className="digitalOfficeChatDock"><summary>💬 Belső chat</summary><div className="digitalOfficeChatDockBody"><p className="muted">A belső beszélgetések most nem tölthetők be.</p><Link className="btn btnGhost" href="/admin/kommunikacio/chat">Team Chat megnyitása</Link></div></details>;

  const[secureAttachments,canBusinessObjects]=await Promise.all([
    hasCurrentPlanFeature('teamChatSecureAttachments'),
    hasStorePermission(instanceId,'support.manage'),
  ]);

  const[messageResult,participantResult,attachmentResult,objectLinkResult]=await Promise.all([
    db.from('office_messages').select('id,thread_id,author_id,body,created_at').eq('instance_id',instanceId).in('thread_id',threadIds).eq('kind','internal').order('created_at',{ascending:false}).limit(120),
    db.from('office_thread_participants').select('thread_id,user_id,last_read_at').eq('instance_id',instanceId).in('thread_id',threadIds).is('left_at',null),
    secureAttachments?db.from('office_message_attachments').select('id,message_id,thread_id,original_name,byte_size,content_type').eq('instance_id',instanceId).in('thread_id',threadIds).eq('status','ready').order('created_at',{ascending:false}).limit(120):Promise.resolve({data:[] as Attachment[],error:null}),
    canBusinessObjects?db.from('office_message_object_links').select('id,message_id,thread_id,object_type,object_id').eq('instance_id',instanceId).in('thread_id',threadIds).order('created_at',{ascending:false}).limit(120):Promise.resolve({data:[] as ObjectLink[],error:null}),
  ]);
  const messages=(messageResult.data??[])as Message[];
  const participants=(participantResult.data??[])as Participant[];
  const attachments=(attachmentResult.data??[])as Attachment[];
  const objectLinks=(objectLinkResult.data??[])as ObjectLink[];
  const userIds=[...new Set(participants.map(row=>row.user_id).concat(messages.map(row=>row.author_id).filter((value):value is string=>Boolean(value))))];
  const profileResult=userIds.length?await db.from('profiles').select('id,email,full_name').in('id',userIds):{data:[] as Profile[],error:null};
  const profiles=new Map(((profileResult.data??[])as Profile[]).map(profile=>[profile.id,profile]));
  const labelFor=(id:string)=>profiles.get(id)?.full_name||profiles.get(id)?.email||`${id.slice(0,8)}…`;
  const lastRead=new Map(participants.filter(row=>row.user_id===actorId).map(row=>[row.thread_id,row.last_read_at]));
  const unread=(threadId:string)=>messages.some(message=>message.thread_id===threadId&&message.author_id!==actorId&&(!lastRead.get(threadId)||new Date(message.created_at)>new Date(lastRead.get(threadId)!)));
  const activeThread=threads.find(thread=>thread.id===selectedChatId)??threads[0];
  const activeMessages=messages.filter(message=>message.thread_id===activeThread.id).slice(0,8).reverse();
  const activeMessageIds=new Set(activeMessages.map(message=>message.id));
  const activeAttachments=attachments.filter(item=>item.thread_id===activeThread.id).slice(0,6);
  const activeLinks=objectLinks.filter(item=>item.thread_id===activeThread.id).slice(0,6);
  const richContent=activeAttachments.length>0||activeLinks.length>0;
  const mentionOptions=participants.filter(row=>row.thread_id===activeThread.id&&row.user_id!==actorId).map(row=>({userId:row.user_id,label:labelFor(row.user_id)}));
  const hrefFor=(chatId:string)=>`${baseHref}${baseHref.includes('?')?'&':'?'}chat=${encodeURIComponent(chatId)}`;
  const attachmentsFor=(messageId:string)=>activeAttachments.filter(item=>item.message_id===messageId);
  const linksFor=(messageId:string)=>activeLinks.filter(item=>item.message_id===messageId);

  return <details className={`digitalOfficeChatDock${richContent?' digitalOfficeChatDockRich':''}`} open={Boolean(selectedChatId)}>
    <summary><span>💬 Belső chat</span><span className="digitalOfficeChatDockCount">{threads.filter(thread=>unread(thread.id)).length}</span></summary>
    <div className="digitalOfficeChatDockBody">
      <div className="digitalOfficeChatDockHeader"><div><strong>{activeThread.subject}</strong><small>Csak belső munkatársak</small></div><Link className="textLink" href="/admin/kommunikacio/chat">Teljes nézet ↗</Link></div>
      <div className="digitalOfficeChatDockLayout">
        <nav className="digitalOfficeChatRooms" aria-label="Belső beszélgetések">
          {threads.map(thread=>{const last=messages.find(message=>message.thread_id===thread.id);return <Link key={thread.id} href={hrefFor(thread.id)} aria-current={thread.id===activeThread.id?'page':undefined}>
            <span className="digitalOfficeChatAvatar">{initials(thread.subject)}</span>
            <span><strong>{thread.subject}</strong><small>{last?short(last.body):'Nincs üzenet'}</small></span>
            {unread(thread.id)&&<i aria-label="Olvasatlan"/>}
          </Link>})}
        </nav>
        <div className="digitalOfficeChatConversation">
          <div className="digitalOfficeChatMessages">{activeMessages.map(message=>{const messageAttachments=attachmentsFor(message.id),messageLinks=linksFor(message.id);return <div key={message.id} className={message.author_id===actorId?'isMine':'isOther'}><small>{message.author_id?labelFor(message.author_id):'Rendszer'}</small><p>{message.body}</p>{messageAttachments.length>0&&<div className="digitalOfficeChatMessageRich">{messageAttachments.map(item=><a key={item.id} href={`/api/admin/office/attachments/${item.id}`} title={item.original_name}>📎 {short(item.original_name)}</a>)}</div>}{messageLinks.length>0&&<div className="digitalOfficeChatMessageRich">{messageLinks.map(item=><span key={item.id}>↗ {objectLabel[item.object_type]}</span>)}</div>}</div>})}{!activeMessages.length&&<p className="muted">Még nincs üzenet ebben a beszélgetésben.</p>}</div>
          <div className="digitalOfficeChatComposer"><OfficePrivateMessageForm compact threadId={activeThread.id} mentionOptions={mentionOptions} objectOptions={[]}/></div>
        </div>
        {richContent&&<aside className="digitalOfficeChatPreviewRail" aria-label="Kapcsolt tartalom">
          <header><strong>Kapcsolt tartalom</strong><small>A chat csak akkor bővül ki, amikor szükség van rá.</small></header>
          {activeAttachments.length>0&&<section><span className="digitalOfficeChatPreviewLabel">Fájlok</span>{activeAttachments.map(item=><a className="digitalOfficeChatPreviewCard" key={item.id} href={`/api/admin/office/attachments/${item.id}`}><span className="digitalOfficeChatPreviewIcon">📄</span><span><strong>{item.original_name}</strong><small>{fileSize(item.byte_size)} · {item.content_type==='application/pdf'?'PDF dokumentum':'Csatolmány'}</small></span><b>↗</b></a>)}</section>}
          {activeLinks.length>0&&<section><span className="digitalOfficeChatPreviewLabel">Üzleti elemek</span>{activeLinks.map(item=><div className="digitalOfficeChatPreviewCard" key={item.id}><span className="digitalOfficeChatPreviewIcon">↗</span><span><strong>{objectLabel[item.object_type]}</strong><small>{shortId(item.object_id)}</small></span></div>)}</section>}
          <Link className="digitalOfficeChatPreviewFooter" href={`/admin/kommunikacio/chat?thread=${encodeURIComponent(activeThread.id)}`}>Részletes nézet megnyitása ↗</Link>
        </aside>}
      </div>
    </div>
  </details>;
}
