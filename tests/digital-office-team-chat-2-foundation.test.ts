import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office Team Chat 2 foundation',()=>{
  const migration=read('supabase/migrations/20260908065000_digital_office_team_chat_2_foundation_v1.sql');
  const integrity=read('supabase/migrations/20260908065100_digital_office_team_chat_2_integrity_v1.sql');
  const actions=read('src/app/admin/kommunikacio/iroda/actions.ts');
  const page=read('src/app/admin/kommunikacio/iroda/page.tsx');

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
    const selfGate=migration.indexOf("raise exception 'OFFICE_THREAD_OWNER_SELF_CHANGE_FORBIDDEN'",ownerGate);
    expect(ownerGate).toBeGreaterThan(0);
    expect(selfGate).toBeGreaterThan(ownerGate);
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
    expect(page).toContain("filter==='mentions'&&mentionThreadIds.has(thread.id)");
    expect(page).toContain('@ Megemlítettek');
  });

  it('validates business cards against authoritative tenant-owned objects',()=>{
    expect(migration).toContain("object_type in ('order','commercial_offer','return_case','support_ticket','task')");
    expect(migration).toContain("o.instance_id=p_instance_id and o.id=p_object_id");
    expect(migration).toContain("r.instance_id=p_instance_id and r.id=p_object_id");
    expect(migration).toContain("s.instance_id=p_instance_id and s.id=p_object_id");
    expect(migration).toContain("t.instance_id=p_instance_id and t.id=p_object_id");
    expect(migration).toContain("raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'");
    expect(page).toContain('Aktuális DB-állapot:');
    expect(page).toContain("value:`commercial_offer:${offer.id}`");
    expect(page).toContain("value:`return_case:${item.id}`");
    expect(page).toContain("value:`support_ticket:${ticket.id}`");
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

  it('uses the Team Chat v2 RPC for private messages, membership and read/mention acknowledgement',()=>{
    expect(actions).toContain("db.rpc('admin_mutate_office_team_chat_v2'");
    expect(actions).toContain("action:'create_internal_thread'");
    expect(actions).toContain("action:'add_internal_message'");
    expect(actions).toContain("action:'manage_participant'");
    expect(actions).toContain("action:'mark_read'");
    expect(actions).toContain("const mentionUserIds=selectedUserIds(form,'mentionUserId').slice(0,10)");
    expect(actions).toContain('const object=chatObjectFrom(form)');
    expect(page).toContain('managePrivateParticipantAction');
    expect(page).toContain('name="mentionUserId" multiple');
    expect(page).toContain('name="objectRef"');
  });

  it('fails closed if Team Chat read models are unavailable',()=>{
    expect(page).toContain('mentionError||objectLinkError');
    expect(page).toContain('const canAct=!loadError&&!privacyFallback');
    expect(page).toContain('Team Chat foundation adatainak egy része most nem tölthető be.');
    expect(page).toContain('Hiányos adatok mellett a nulla és üres állapotokat ne tekintsd véglegesnek.');
    expect(page).toContain('privát chat módosításait biztonsági okból letiltjuk');
  });

  it('keeps block-level mention and object cards out of inline spans',()=>{
    expect(page).toContain('return <div key={message.id}>\n                  <div>');
    expect(page).not.toContain('return <div key={message.id}>\n                  <span>\n                    <strong>{kindLabel');
  });

  it('does not activate unrelated email, mailbox, storage or AI behavior',()=>{
    const lower=(migration+'\n'+integrity).toLowerCase();
    expect(lower).not.toContain('office_mailboxes');
    expect(lower).not.toContain('email_from');
    expect(lower).not.toContain('storage.buckets');
    expect(lower).not.toContain('storage.objects');
    expect(lower).not.toContain('openai');
    expect(lower).not.toContain('anthropic');
  });
});
