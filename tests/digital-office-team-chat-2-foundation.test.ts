import fs from'node:fs';
import path from'node:path';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const migration=read('supabase/migrations/20260908065000_digital_office_team_chat_2_foundation_v1.sql');
const ownerTransfer=read('supabase/migrations/20260908065200_digital_office_team_chat_owner_transfer_v1.sql');
const actions=read('src/app/admin/kommunikacio/chat/actions.ts');
const page=read('src/app/admin/kommunikacio/chat/page.tsx');
const privateComposer=read('src/components/admin/office-private-message-form.tsx');

describe('Digital Office Team Chat 2 foundation',()=>{
  it('keeps mention and object-link data service-only behind RLS',()=>{
    expect(migration).toContain('alter table public.office_message_mentions enable row level security');
    expect(migration).toContain('alter table public.office_message_object_links enable row level security');
    expect(migration).toContain('create policy office_message_mentions_service_all');
    expect(migration).toContain('create policy office_message_object_links_service_all');
    expect(migration).toContain("to service_role using(true) with check(true)");
  });

  it('models exactly one active thread owner and does not let elevated capability replace ownership',()=>{
    expect(migration).toContain("participant_role text not null default 'member' check(participant_role in ('owner','member'))");
    expect(migration).toContain('office_thread_participants_one_owner_idx');
    expect(migration).toContain("where left_at is null and participant_role='owner'");
    expect(migration).toContain('if v_participant.participant_role<>\'owner\' then raise exception \'OFFICE_THREAD_OWNER_REQUIRED\'; end if;');
  });

  it('only mentions active participants and tracks per-user seen state',()=>{
    expect(migration).toContain('office_message_mentions_active_participant_guard');
    expect(migration).toContain("raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED'");
    expect(migration).toContain('seen_at timestamptz');
    expect(migration).toContain('office_message_mentions_user_unseen_idx');
  });

  it('validates business cards against tenant-owned objects and keeps linking behind support authority',()=>{
    expect(migration).toContain("v_object_type not in ('order','commercial_offer','return_case','support_ticket','task')");
    expect(migration).toContain("raise exception 'OFFICE_OBJECT_NOT_FOUND'");
    expect(migration).toContain("if not public.has_store_permission(p_instance_id,'support.manage')");
  });

  it('creates chat message, mentions and object link in one audited database transaction',()=>{
    expect(migration).toContain("elsif p_action='create_internal_thread' then");
    expect(migration).toContain("elsif p_action='send_internal_message' then");
    expect(migration).toContain('insert into public.office_message_mentions');
    expect(migration).toContain('insert into public.office_message_object_links');
    expect(migration).toContain("'office.private_thread_created_v2'");
    expect(migration).toContain("'office.private_message_added_v2'");
  });

  it('enforces mention and object integrity even below the RPC boundary',()=>{
    expect(migration).toContain('office_message_mentions_integrity_guard');
    expect(migration).toContain('office_message_object_links_integrity_guard');
    expect(migration).toContain("raise exception 'OFFICE_MENTION_MESSAGE_MISMATCH'");
    expect(migration).toContain("raise exception 'OFFICE_OBJECT_MESSAGE_MISMATCH'");
  });

  it('transfers ownership only from the current authorized owner to an active authorized member',()=>{
    expect(ownerTransfer).toContain('admin_transfer_office_thread_owner_v1');
    expect(ownerTransfer).toContain("participant_role<>'owner'");
    expect(ownerTransfer).toContain("participant_role<>'member'");
    expect(ownerTransfer).toContain("'office.private_owner_transferred'");
    expect(actions).toContain('admin_transfer_office_thread_owner_v1');
    expect(actions).toContain('transferPrivateThreadOwnerAction');
  });

  it('uses a dedicated team-chat action layer with effective office.internal_chat capability',()=>{
    expect(actions).toContain("requirePlanFeature('teamChat')");
    expect(actions).toContain("'office.internal_chat'");
    expect(actions).toContain("admin_mutate_office_team_chat_v2");
    expect(actions).toContain('createPrivateThreadAction');
    expect(actions).toContain('managePrivateParticipantAction');
    expect(actions).toContain('markThreadReadAction');
  });

  it('builds chat participant choices from effective capability, not fixed support roles',()=>{
    expect(page).toContain("hasStoreCapability(scope.instanceId,userId,'office.internal_chat'");
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
    expect(page).toContain('{!archived&&!loadError&&<OfficePrivateMessageForm');
  });

  it('keeps block-level mention and object cards inside the dedicated Team Chat rendering tree',()=>{
    expect(page).toContain('links.filter(l=>l.message_id===message.id).map(renderObject)');
    expect(page).toContain('mentions.filter(m=>m.message_id===message.id)');
    expect(page).toContain('Munkatárs ↔ munkatárs kommunikáció. Az ügyfelek nem résztvevői ennek a felületnek.');
  });

  it('keeps the original Team Chat foundation independent from mailbox and AI behavior',()=>{
    expect(page).not.toContain('OfficeCustomerEmailForm');
    expect(page).not.toContain('customer_email');
    expect(actions).not.toContain('office_mailboxes');
    expect(actions.toLowerCase()).not.toContain('openai');
  });
});
