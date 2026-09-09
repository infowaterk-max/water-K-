import fs from'node:fs';
import path from'node:path';
import{describe,expect,test}from'vitest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('Digital Office Team Chat retention',()=>{
  test('retention policy is tenant-scoped and matches the approved lifecycle',()=>{
    const migration=read('supabase/migrations/20260909204847_digital_office_team_chat_retention_v1.sql');
    expect(migration).toContain("t.updated_at<=p_now-interval '90 days'");
    expect(migration).toContain("m.created_at<=p_now-interval '12 months'");
    expect(migration).toContain("a.created_at<=p_now-interval '24 months'");
    expect(migration).toContain('m.instance_id=p_instance_id');
    expect(migration).toContain('a.instance_id=p_instance_id');
    expect(migration).toContain("t.conversation_type in ('internal_private','internal_group')");
  });

  test('archived internal threads are mutation guarded and attachment rows fail closed',()=>{
    const migration=read('supabase/migrations/20260909204847_digital_office_team_chat_retention_v1.sql');
    expect(migration).toContain("raise exception 'OFFICE_INTERNAL_THREAD_ARCHIVED'");
    expect(migration).toContain('office_internal_message_archive_guard');
    expect(migration).toContain('office_internal_participant_archive_guard');
    expect(migration).toContain('not exists(select 1 from public.office_message_attachments');
  });

  test('archive state is visible, separately filterable, and read-only in Team Chat UX',()=>{
    const page=read('src/app/admin/kommunikacio/chat/page.tsx');
    expect(page).toContain("archived_at:string|null");
    expect(page).toContain("updated_at,archived_at,conversation_type");
    expect(page).toContain("filter==='archived'?archived");
    expect(page).toContain('<option value="archived">Archivált</option>');
    expect(page).toContain('Az archivált beszélgetés csak olvasható.');
    expect(page).toContain('!archived&&!loadError&&isOwner');
    expect(page).toContain('!archived&&!loadError&&<OfficePrivateMessageForm');
    expect(page).toContain('const activeThreads=threads.filter(thread=>!isArchived(thread));');
  });

  test('only Team Chat audit actions expire and message body is never copied into audit evidence',()=>{
    const migration=read('supabase/migrations/20260909204847_digital_office_team_chat_retention_v1.sql');
    const foundation=read('supabase/migrations/20260909204503_digital_office_team_chat_2_foundation_v1.sql');
    const ownerTransfer=read('supabase/migrations/20260909204547_digital_office_team_chat_owner_transfer_v1.sql');
    for(const action of[
      'office.private_thread_created_v2','office.private_message_added_v2',
      'office.private_participant_added','office.private_participant_removed','office.private_owner_transferred',
    ])expect(migration).toContain(action);
    expect(migration).not.toContain("delete from public.admin_audit_log a\n  where a.created_at");
    expect(foundation).not.toContain("'body',v_body");
    expect(ownerTransfer).not.toContain("'body'");
  });

  test('tenant cron executes retention through evidence-validated worker helper',()=>{
    const helper=read('src/lib/office/team-chat-retention.ts');
    const cron=read('src/app/api/cron/integrations/route.ts');
    expect(helper).toContain("admin_run_office_team_chat_retention_v1");
    expect(helper).toContain('OFFICE_TEAM_CHAT_RETENTION_EVIDENCE_MISSING');
    expect(cron).toContain('runOfficeTeamChatRetention(instance.id)');
    expect(cron).toContain('teamChatRetentionOk');
  });
});
