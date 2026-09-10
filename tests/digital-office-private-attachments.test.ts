import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office private attachments',()=>{
  const migration=read('supabase/migrations/20260909204635_digital_office_private_attachments_v1.sql');
  const hardening=read('supabase/migrations/20260909204653_digital_office_private_attachment_failclosed_v1.sql');
  const cleanupMigration=read('supabase/migrations/20260909204709_digital_office_private_attachment_cleanup_v1.sql');
  const cleanupWorker=read('src/lib/office/private-attachment-cleanup.ts');
  const cron=read('src/app/api/cron/integrations/route.ts');
  const prepare=read('src/app/api/admin/office/attachments/prepare/route.ts');
  const finalize=read('src/app/api/admin/office/attachments/finalize/route.ts');
  const download=read('src/app/api/admin/office/attachments/[id]/route.ts');
  const composer=read('src/components/admin/office-private-message-form.tsx');
  const page=read('src/app/admin/kommunikacio/chat/page.tsx');

  it('uses one private bucket with bounded file size and MIME types',()=>{
    expect(migration).toContain("'office-private'");
    expect(migration).toContain('false,\n  10485760');
    expect(migration).toContain('public=false');
    expect(migration).toContain("'application/pdf'");
    expect(migration).toContain("'image/jpeg'");
    expect(migration).toContain("'application/vnd.openxmlformats-officedocument.wordprocessingml.document'");
    expect(migration).not.toContain('public=true');
  });

  it('keeps attachment metadata service-only behind RLS',()=>{
    expect(migration).toContain('create table if not exists public.office_message_attachments');
    expect(migration).toContain('alter table public.office_message_attachments enable row level security');
    expect(migration).toContain('revoke all on table public.office_message_attachments from public,anon,authenticated');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_message_attachments to service_role');
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).toContain("status in('pending','ready','revoked')");
  });

  it('enforces private-thread, tenant path and message scope below RPCs',()=>{
    expect(migration).toContain('office_attachment_integrity_v1');
    expect(migration).toContain("v_thread_type not in('internal_private','internal_group')");
    expect(migration).toContain("v_expected_prefix:=new.instance_id::text||'/'||new.thread_id::text||'/'||new.id::text");
    expect(migration).toContain("v_message_kind is distinct from 'internal'");
    expect(migration).toContain("raise exception 'OFFICE_ATTACHMENT_MESSAGE_SCOPE_INVALID'");
  });

  it('prepares only current participants and fails closed on malformed file metadata',()=>{
    expect(migration).toContain('admin_prepare_office_private_attachments_v1');
    expect(hardening).toContain('if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor)');
    expect(hardening).toContain("if p_files is null or jsonb_typeof(p_files)<>'array'");
    expect(hardening).toContain('if v_count is null or v_count<1 or v_count>5');
    expect(hardening).toContain('if v_size is null or v_size<1 or v_size>10485760');
    expect(hardening).toContain("v_expires timestamptz:=now()+interval '2 hours'");
    expect(hardening).toContain("'office.private_attachment_upload_prepared'");
  });

  it('finalizes message and attachments atomically only after storage evidence and reauthorization',()=>{
    const finalizeFunction=migration.indexOf('create or replace function public.admin_finalize_office_private_message_v1');
    const accessCheck=migration.indexOf('if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor)',finalizeFunction);
    const storageEvidence=migration.indexOf("from storage.objects\n      where bucket_id='office-private'",accessCheck);
    const messageMutation=migration.indexOf("public.admin_mutate_office_team_chat_v2(\n    p_instance_id,p_actor,'add_internal_message'",storageEvidence);
    const readyUpdate=migration.indexOf("set message_id=v_message_id,status='ready'",messageMutation);
    expect(finalizeFunction).toBeGreaterThan(0);
    expect(accessCheck).toBeGreaterThan(finalizeFunction);
    expect(storageEvidence).toBeGreaterThan(accessCheck);
    expect(messageMutation).toBeGreaterThan(storageEvidence);
    expect(readyUpdate).toBeGreaterThan(messageMutation);
    expect(migration).toContain('OFFICE_ATTACHMENT_FINALIZE_EVIDENCE_MISSING');
    expect(migration).toContain("'office.private_attachments_finalized'");
  });

  it('authorizes every download against current thread participation and audits it',()=>{
    expect(migration).toContain('admin_get_office_private_attachment_v1');
    expect(migration).toContain('public.can_read_office_thread_v1(p_instance_id,v_attachment.thread_id,p_actor)');
    expect(migration).toContain("'office.private_attachment_download_authorized'");
    expect(download).toContain("db.rpc('admin_get_office_private_attachment_v1'");
    expect(download).toContain('createSignedUrl(');
    expect(download).toContain('OFFICE_PRIVATE_ATTACHMENT_SIGNED_DOWNLOAD_SECONDS');
    expect(download).toContain("'Cache-Control','no-store, private'");
    expect(download).not.toContain('getPublicUrl');
  });

  it('uses signed direct uploads instead of proxying file bodies through server actions',()=>{
    expect(prepare).toContain("db.rpc('admin_prepare_office_private_attachments_v1'");
    expect(prepare).toContain('createSignedUploadUrl(item.path)');
    expect(composer).toContain("fetch('/api/admin/office/attachments/prepare'");
    expect(composer).toContain('uploadToSignedUrl(');
    expect(composer).toContain("fetch('/api/admin/office/attachments/finalize'");
    expect(composer).not.toContain('getPublicUrl');
    expect(finalize).toContain("db.rpc('admin_finalize_office_private_message_v1'");
  });

  it('keeps tenant gates while selecting the entitlement from the attachment source',()=>{
    for(const route of[prepare,finalize,download]){
      expect(route).toContain('getAdminRequestUser()');
      expect(route).toContain('requireCurrentStoreContext()');
      expect(route).not.toContain("getAdminRequestUser('support.manage')");
      expect(route).not.toContain("requireCurrentStoreContext('support.manage')");
    }
    for(const route of[prepare,finalize])expect(route).toContain("hasCurrentPlanFeature('teamChatSecureAttachments')");
    expect(download).toContain("source==='internal_upload'?'teamChatSecureAttachments'");
    expect(download).toContain("source==='provider_inbound'||source==='customer_outbound'?'officeCommunication':null");
    expect(download).toContain('hasCurrentPlanFeature(feature)');
    expect(finalize).toContain('OFFICE_OBJECT_LINK_PERMISSION_REQUIRED');
  });

  it('loads only ready attachments in the dedicated Team Chat workspace and fails closed on read errors',()=>{
    expect(page).toContain("secureAttachments&&threadIds.length?db.from('office_message_attachments')");
    expect(page).toContain(".eq('status','ready')");
    expect(page).toContain('/api/admin/office/attachments/${a.id}');
    expect(page).toContain('OfficePrivateMessageForm');
    expect(page).not.toContain('storage/v1/object/public');
  });

  it('cleans only expired pending reservations and records system lifecycle evidence',()=>{
    expect(cleanupWorker).toContain(".eq('status','pending')");
    expect(cleanupWorker).toContain(".lte('expires_at',now)");
    const storageRemove=cleanupWorker.indexOf(".remove([row.storage_path])");
    const revoke=cleanupWorker.indexOf("admin.rpc('admin_revoke_expired_office_private_attachment_v1'",storageRemove);
    expect(storageRemove).toBeGreaterThan(0);
    expect(revoke).toBeGreaterThan(storageRemove);
    expect(cleanupMigration).toContain('create table if not exists public.office_attachment_cleanup_events');
    expect(cleanupMigration).toContain("status='pending'");
    expect(cleanupMigration).toContain('expires_at<=now()');
    expect(cleanupMigration).toContain("set status='revoked',expires_at=null");
    expect(cleanupMigration).toContain("'expired_reservation_revoked'");
    expect(cleanupMigration).toContain("'cleanupSource','cron'");
    expect(cleanupMigration).not.toContain('insert into public.admin_audit_log');
    expect(cron).toContain('cleanupExpiredOfficePrivateAttachments(25)');
    expect(cron).toContain('&&officeAttachmentCleanup.ok');
  });

  it('keeps cleanup evidence service-only without pretending a human actor performed CRON maintenance',()=>{
    expect(cleanupMigration).toContain('alter table public.office_attachment_cleanup_events enable row level security');
    expect(cleanupMigration).toContain('revoke all on table public.office_attachment_cleanup_events from public,anon,authenticated');
    expect(cleanupMigration).toContain('grant select,insert on table public.office_attachment_cleanup_events to service_role');
    expect(cleanupMigration).toContain('grant execute on function public.admin_revoke_expired_office_private_attachment_v1(uuid,text) to service_role');
    expect(cleanupMigration).not.toContain('actor_user_id');
  });

  it('does not enable customer-email attachment, mailbox or AI behavior in the original Team Chat foundation',()=>{
    const all=(migration+'\n'+hardening+'\n'+cleanupMigration+'\n'+prepare+'\n'+finalize+'\n'+composer).toLowerCase();
    expect(all).not.toContain('office_mailboxes');
    expect(all).not.toContain('gmail');
    expect(all).not.toContain('microsoft graph');
    expect(all).not.toContain('openai');
    expect(all).not.toContain('anthropic');
    expect(migration).toContain('No customer-email attachment behavior is activated here.');
  });
});