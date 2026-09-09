import fs from'node:fs';
import path from'node:path';
import{describe,expect,it}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const privacy=read('supabase/migrations/20260908022500_digital_office_privacy_foundation_v1.sql');
const foundation=read('supabase/migrations/20260909204503_digital_office_team_chat_2_foundation_v1.sql');
const integrity=read('supabase/migrations/20260909204524_digital_office_team_chat_2_integrity_v1.sql');
const ownerTransfer=read('supabase/migrations/20260909204547_digital_office_team_chat_owner_transfer_v1.sql');
const actions=read('src/app/admin/kommunikacio/chat/actions.ts');
const page=read('src/app/admin/kommunikacio/chat/page.tsx');
const privateComposer=read('src/components/admin/office-private-message-form.tsx');

describe('Digital Office Team Chat 2 foundation',()=>{
  it('keeps mention and object-link tables service-only behind RLS',()=>{
    expect(foundation).toContain('alter table public.office_message_mentions enable row level security');
    expect(foundation).toContain('alter table public.office_message_object_links enable row level security');
    expect(foundation).toContain('revoke all on table public.office_message_mentions from public,anon,authenticated');
    expect(foundation).toContain('revoke all on table public.office_message_object_links from public,anon,authenticated');
    expect(foundation).toContain('grant select,insert,update,delete on table public.office_message_mentions to service_role');
    expect(foundation).toContain('grant select,insert,update,delete on table public.office_message_object_links to service_role');
  });

  it('models exactly one active thread owner without allowing elevated capability to replace membership',()=>{
    expect(privacy).toContain("participant_role text not null default 'member' check (participant_role in ('member'))");
    expect(foundation).toContain("check (participant_role in ('owner','member'))");
    expect(foundation).toContain('office_thread_participants_active_owner_uidx');
    expect(foundation).toContain("where left_at is null and participant_role='owner'");
    expect(privacy).toContain('if not private.office_active_participant_v1(p_instance_id,p_thread_id,p_user_id) then return false; end if;');
    expect(foundation).toContain("and p.participant_role='owner'");
  });

  it('only mentions active readable participants and tracks per-user seen state',()=>{
    expect(foundation).toContain('seen_at timestamptz');
    expect(foundation).toContain('office_message_mentions_user_unseen_idx');
    expect(integrity).toContain('not public.can_read_office_thread_v1(new.instance_id,new.thread_id,new.mentioned_user_id)');
    expect(integrity).toContain("raise exception 'OFFICE_MENTION_PARTICIPANT_REQUIRED'");
    expect(foundation).toContain('set seen_at=coalesce(seen_at,now())');
  });

  it('validates business cards against tenant-owned objects and keeps linking behind support authority',()=>{
    expect(foundation).toContain("object_type text not null check (object_type in ('order','commercial_offer','return_case','support_ticket','task'))");
    expect(foundation).toContain('private.office_chat_object_exists_v1');
    expect(foundation).toContain("if v_object_type is not null and not public.can_manage_support(p_instance_id,p_actor) then raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'; end if;");
    expect(foundation).toContain("raise exception 'OFFICE_OBJECT_LINK_NOT_FOUND'");
    expect(integrity).toContain('not public.can_manage_support(new.instance_id,new.created_by)');
    expect(integrity).toContain('not private.office_chat_object_exists_v1(new.instance_id,new.object_type,new.object_id)');
  });

  it('creates thread/message, mentions and object links in the same audited RPC transaction',()=>{
    expect(foundation).toContain("if p_action='create_internal_thread' then");
    expect(foundation).toContain("if p_action='add_internal_message' then");
    expect(foundation).toContain('insert into public.office_message_mentions');
    expect(foundation).toContain('insert into public.office_message_object_links');
    expect(foundation).toContain("'office.private_thread_created_v2'");
    expect(foundation).toContain("'office.private_message_added_v2'");
  });

  it('enforces mention and object integrity below the RPC boundary with table triggers',()=>{
    expect(integrity).toContain('create trigger office_message_mentions_integrity');
    expect(integrity).toContain('create trigger office_message_object_links_integrity');
    expect(integrity).toContain("raise exception 'OFFICE_MENTION_MESSAGE_INTEGRITY_INVALID'");
    expect(integrity).toContain("raise exception 'OFFICE_OBJECT_MESSAGE_INTEGRITY_INVALID'");
    expect(integrity).toContain("raise exception 'OFFICE_OBJECT_LINK_PERMISSION_REQUIRED'");
  });

  it('transfers ownership only from the current authorized owner to an active authorized member',()=>{
    expect(ownerTransfer).toContain('admin_transfer_office_thread_owner_v1');
    expect(ownerTransfer).toContain('private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_actor)');
    expect(ownerTransfer).toContain("and participant_role='member'");
    expect(ownerTransfer).toContain("set participant_role='member',updated_at=now()");
    expect(ownerTransfer).toContain("set participant_role='owner',updated_at=now()");
    expect(ownerTransfer).toContain("if v_actor_updated<>1 then raise exception 'OFFICE_OWNER_TRANSFER_SOURCE_EVIDENCE_MISSING'; end if;");
    expect(ownerTransfer).toContain("if v_target_updated<>1 then raise exception 'OFFICE_OWNER_TRANSFER_TARGET_EVIDENCE_MISSING'; end if;");
    expect(ownerTransfer).toContain("'office.private_owner_transferred'");
    expect(actions).toContain('admin_transfer_office_thread_owner_v1');
    expect(actions).toContain('transferPrivateThreadOwnerAction');
  });

  it('uses a dedicated team-chat action layer with effective office.internal_chat capability',()=>{
    expect(actions).toContain("requirePlanFeature('teamChat')");
    expect(actions).toContain("'office.internal_chat'");
    expect(actions).toContain('admin_mutate_office_team_chat_v2');
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
