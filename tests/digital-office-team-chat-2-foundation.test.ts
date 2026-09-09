import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office Team Chat 2 foundation',()=>{
  const migration=read('supabase/migrations/20260908065000_digital_office_team_chat_2_foundation_v1.sql');
  const integrity=read('supabase/migrations/20260908065100_digital_office_team_chat_2_integrity_v1.sql');
  const ownerTransfer=read('supabase/migrations/20260908065200_digital_office_team_chat_owner_transfer_v1.sql');
  const actions=read('src/app/admin/kommunikacio/chat/actions.ts');
  const messageRoute=read('src/app/api/admin/office/chat/message/route.ts');
  const page=read('src/app/admin/kommunikacio/chat/page.tsx');
  const privateComposer=read('src/components/admin/office-private-message-form.tsx');

  it('keeps mention and object-link data service-only behind RLS',()=>{
    expect(migration).toContain('create table if not exists public.office_message_mentions');
    expect(migration).toContain('create table if not exists public.office_message_object_links');
    expect(migration).toContain('alter table public.office_message_mentions enable row level security');
    expect(migration).toContain('alter table public.office_message_object_links enable row level security');
    expect(migration).toContain('revoke all on table public.office_message_mentions from public,anon,authenticated');
    expect(migration).toContain('revoke all on table public.office_message_object_links from public,anon,authenticated');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_message_mentions to service_role');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_message_object_links to service_role');
  });

  it('models exactly one active thread owner and does not let elevated capability replace ownership',()=>{
    expect(migration).toContain("participant_role in ('owner','member')");
    expect(migration).toContain('office_thread_participants_active_owner_uidx');
    expect(migration).toContain("participant_role='owner'");
    const ownerGate=migration.indexOf('private.office_active_thread_owner_v1(p_instance_id,v_thread_id,p_actor)');
    const currentAccess=migration.indexOf('public.can_read_office_thread_v1(p_instance_id,v_thread_id,p_actor)',ownerGate);
    const selfGate=migration.indexOf("raise exception 'OFFICE_THREAD_OWNER_SELF_CHANGE_FORBIDDEN'",currentAccess);
    expect(ownerGate).toBeGreaterThan(0);
    expect(currentAccess).toBeGreaterThan(ownerGate);
    expect(selfGate).toBeGreaterThan(currentAccess);
    expect(migration).toContain("v_operation not in ('add','remove')");
    expect(migration).toContain("participant_role='member'");
    expect(migration).toContain('if v_participant_count<2 or v_participant_count>25');
  });

  it('only mentions active participants and tracks per-user seen state',()=>{
    expect(migration).toContain('primary key(instance_id,message_id,mentioned_user_id)');
    expect(migration).toContain('check (mentioned_user_id<>mentioned_by)');
    expect(migration).toContain("raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED'");
    expect(migration).toContain('not public.can_read_office_thread_v1(p_instance_id,v_thread_id,v_mention)');
    expect(migration).toContain('update public.office_message_mentions');
    expect(migration).toContain('mentioned_user_id=p_actor and seen_at is null');
    expect(page).toContain("filter==='mentions'&&mentionThreads.has(thread.id)");
    expect(page).toContain('@ Megemlítettek');
  });

  it('validates business cards against tenant-owned objects and keeps linking behind support authority',()=>{
    expect(migration).toContain("object_type in ('order','commercial_offer','return_case','support_ticket','task')");
    expect(migration).toContain("o.instance_id=p_instance_id and o.id=p_object_id");
    expect(migration).toContain("r.instance_id=p_instance_id and r.id=p_object_id");
    expect(migration).toContain("s.instance_id=p_instance_id and s.id=p_object_id");
    expect(migration).toContain("t.instance_id=p_instance_id and t.id=p_object_id");
    expect(migration).toContain("raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'");
    expect(migration).toContain("raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'");
    expect(migration).toContain('v_object_type is not null and not public.can_manage_support(p_instance_id,p_actor)');
    expect(page).toContain('if(!canBusinessObjects)return null');
    expect(page).toContain('const objectOptions:ObjectOption[]=canBusinessObjects?[');
  });

  it('creates chat message, mentions and object link in one audited database transaction',()=>{
    const messageInsert=migration.indexOf("insert into public.office_messages(instance_id,thread_id,author_id,kind,body)",migration.indexOf("if p_action='add_internal_message'"));
    const mentionInsert=migration.indexOf('insert into public.office_message_mentions',messageInsert);
    const objectInsert=migration.indexOf('insert into public.office_message_object_links',mentionInsert);
    const auditInsert=migration.indexOf('office.private_message_added_v2',objectInsert);
    expect(messageInsert).toBeGreaterThan(0);
    expect(mentionInsert).toBeGreaterThan(messageInsert);
    expect(objectInsert).toBeGreaterThan(mentionInsert);
    expect(auditInsert).toBeGreaterThan(objectInsert);
    expect(migration).toContain("'mentionCount',cardinality(v_mentions)");
    expect(migration).toContain("'hasObjectLink',v_object_linked");
  });

  it('enforces mention and object integrity even below the RPC boundary',()=>{
    expect(integrity).toContain('office_message_mentions_integrity');
    expect(integrity).toContain('office_message_object_links_integrity');
    expect(integrity).toContain("v_message.kind<>'internal'");
    expect(integrity).toContain('v_message.author_id is distinct from new.mentioned_by');
    expect(integrity).toContain('not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.mentioned_user_id)');
    expect(integrity).toContain('v_message.author_id is distinct from new.created_by');
    expect(integrity).toContain('not private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id)');
    expect(integrity).toContain("v_thread.conversation_type not in ('internal_private','internal_group')");
  });

  it('transfers ownership only from the current authorized owner to an active authorized member',()=>{
    expect(ownerTransfer).toContain('create or replace function public.admin_transfer_office_thread_owner_v1');
    expect(ownerTransfer).toContain('private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_actor)');
    expect(ownerTransfer).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor)');
    expect(ownerTransfer).toContain("participant_role='member'");
    expect(ownerTransfer).toContain('public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_target_user_id)');
    const demote=ownerTransfer.indexOf("set participant_role='member'");
    const promote=ownerTransfer.indexOf("set participant_role='owner'",demote);
    const finalEvidence=ownerTransfer.indexOf('OFFICE_OWNER_TRANSFER_FINAL_EVIDENCE_MISSING',promote);
    expect(demote).toBeGreaterThan(0);
    expect(promote).toBeGreaterThan(demote);
    expect(finalEvidence).toBeGreaterThan(promote);
    expect(ownerTransfer).toContain("'office.private_owner_transferred'");
    expect(ownerTransfer).toContain('revoke all on function public.admin_transfer_office_thread_owner_v1');
    expect(ownerTransfer).toContain('grant execute on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) to service_role');
    expect(actions).toContain("db.rpc('admin_transfer_office_thread_owner_v1'");
    expect(actions).toContain('result.transferred!==true');
    expect(page).toContain('transferPrivateThreadOwnerAction');
    expect(page).toContain('Tulajdonjog átadása');
    expect(page).toContain('threadParticipants.length>2&&members.length>0');
  });

  it('uses a dedicated team-chat action layer with effective office.internal_chat capability',()=>{
    expect(actions).toContain("await requirePlanFeature('teamChat')");
    expect(actions).toContain('async function privateChatAccess()');
    expect(actions).toContain("hasStoreCapability(scope.instanceId,actor.id,'office.internal_chat'");
    expect(actions).toContain('const{db,userId,instanceId}=await privateChatAccess()');
    expect(actions).toContain("action:'create_internal_thread'");
    expect(actions).toContain("action:'manage_participant'");
    expect(messageRoute).toContain("hasCurrentPlanFeature('teamChat')");
    expect(messageRoute).toContain("action:'add_internal_message'");
    expect(page).toContain("}from'./actions';");
    expect(migration).not.toContain("if not public.can_manage_support(p_instance_id,p_actor) then raise exception 'SUPPORT_PERMISSION_REQUIRED'; end if;\n    v_capability:=public.evaluate_store_capability_v1");
    expect(migration).toContain("v_capability:=public.evaluate_store_capability_v1(p_instance_id,p_actor,'office.internal_chat'");
  });

  it('builds chat participant choices from effective capability, not fixed support roles',()=>{
    expect(page).toContain("hasStoreCapability(scope.instanceId,userId,'office.internal_chat'");
    expect(page).toContain('const chatUserIds=new Set');
    expect(page).toContain('const chatUsers=userIds.filter(id=>chatUserIds.has(id))');
    expect(page).toContain('const available=chatUsers.filter');
    expect(page).toContain('chatUserIds.has(p.user_id)');
    expect(privateComposer).toContain('name="mentionUserId" multiple');
  });

  it('fails closed if Team Chat read models are unavailable',()=>{
    expect(page).toContain('if(accessibleIds===null)return');
    expect(page).toContain('const loadError=Boolean(');
    expect(page).toContain('Hiányos adatok mellett a chatműveleteket biztonsági okból letiltjuk.');
    expect(page).toContain('{!loadError?<form action={createPrivateThreadAction}');
    expect(page).toContain('{!loadError&&<OfficePrivateMessageForm');
  });

  it('keeps block-level mention and object cards inside the dedicated Team Chat rendering tree',()=>{
    expect(page).toContain('links.filter(l=>l.message_id===message.id).map(renderObject)');
    expect(page).toContain('mentions.filter(m=>m.message_id===message.id)');
    expect(page).toContain('Munkatárs ↔ munkatárs kommunikáció. Az ügyfelek nem résztvevői ennek a felületnek.');
  });

  it('keeps the original Team Chat foundation independent from mailbox and AI behavior',()=>{
    const lower=(migration+'\n'+integrity+'\n'+ownerTransfer).toLowerCase();
    expect(lower).not.toContain('office_mailboxes');
    expect(lower).not.toContain('email_from');
    expect(lower).not.toContain('storage.buckets');
    expect(lower).not.toContain('storage.objects');
    expect(lower).not.toContain('openai');
    expect(lower).not.toContain('anthropic');
  });
});