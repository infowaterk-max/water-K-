import{describe,expect,it}from'vitest';
import{readFileSync}from'node:fs';
import{join}from'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office recipient envelope and attachment metadata contract',()=>{
  const migration=read('supabase/migrations/20260909203604_digital_office_recipient_envelope_v1.sql');
  const attachmentIntegrity=read('supabase/migrations/20260909203629_digital_office_attachment_metadata_integrity_v1.sql');
  const block9Foundation=read('supabase/migrations/20260910070000_communication_hub_2_0_foundation_v1.sql');
  const block9Advanced=read('supabase/migrations/20260910070200_communication_hub_2_0_advanced_guards_and_object_links_v1.sql');
  const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
  const newComposer=read('src/components/admin/office-new-email-composer.tsx');
  const replyComposer=read('src/components/admin/office-customer-email-form.tsx');
  const newPage=read('src/app/admin/kommunikacio/iroda/uj/page.tsx');
  const workspace=read('src/app/admin/kommunikacio/iroda/page.tsx');
  const worker=read('src/lib/communication/worker.ts');
  const provider=read('src/lib/communication/provider.ts');

  it('stores normalized CC/BCC envelopes in drafts and immutable sent-message history',()=>{
    expect(migration).toContain("add column if not exists cc_emails text[] not null default '{}'::text[]");
    expect(migration).toContain("add column if not exists bcc_emails text[] not null default '{}'::text[]");
    expect(migration).toContain('office_drafts_cc_count_check');
    expect(migration).toContain('office_messages_bcc_count_check');
    expect(migration).toContain('private.normalize_office_email_list_v1');
    expect(migration).toContain('v_draft.cc_emails is distinct from v_cc');
    expect(migration).toContain('v_draft.bcc_emails is distinct from v_bcc');
    expect(migration).toContain('recipient_email,subject,cc_emails,bcc_emails');
  });

  it('requires an exact persisted revision snapshot through the current queue wrappers',()=>{
    expect(migration).toContain('create or replace function public.admin_queue_office_email_v4');
    expect(migration).toContain("raise exception 'OFFICE_DRAFT_REQUIRED_FOR_SEND'");
    expect(migration).toContain('and revision=v_draft_revision');
    expect(migration).toContain('for update;');
    expect(migration).toContain("raise exception 'OFFICE_DRAFT_CONFLICT'");
    expect(migration).toContain('delete from public.office_drafts');
    expect(actions).toContain("db.rpc('admin_queue_office_email_v6'");
    expect(actions).toContain('draftRevision:input.draftRevision');
    expect(block9Foundation).toContain('admin_queue_office_email_v5');
    expect(block9Advanced).toContain('v_result:=public.admin_queue_office_email_v5');
    expect(actions).not.toContain(".from('office_drafts')\n    .select('id,draft_type");
  });

  it('keeps mailbox activation fail closed and does not touch stable role presets',()=>{
    expect(migration).toContain("raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'");
    expect(migration).toContain("m.is_active=true");
    expect(migration).not.toContain('store_role_permission_presets');
    expect(migration.toLowerCase()).not.toContain('support_email');
    expect(migration.toLowerCase()).not.toContain('okospolymer');
  });

  it('checks every secondary recipient against suppression and never silently drops one',()=>{
    expect(worker).toContain('officeEnvelopeForJob(job)');
    expect(worker).toContain('for(const secondary of [...envelope.cc,...envelope.bcc])');
    expect(worker).toContain("admin.rpc('is_communication_suppressed_v2',{p_instance_id:instanceId,p_email:secondary})");
    expect(worker).toContain('OFFICE_SECONDARY_RECIPIENT_SUPPRESSED_AT_SEND_TIME');
    expect(worker).toContain("retry=job.attempts<5&&!message.startsWith('OFFICE_')");
    expect(provider).toContain("...(message.cc?.length?{cc:message.cc}:{})");
    expect(provider).toContain("...(message.bcc?.length?{bcc:message.bcc}:{})");
  });

  it('restores CC/BCC through autosave and server-rendered draft reloads',()=>{
    expect(actions).toContain("const ccEmails=emailList(formData,'ccEmails')");
    expect(actions).toContain("const bccEmails=emailList(formData,'bccEmails')");
    expect(actions).toContain("db.rpc('admin_mutate_office_draft_v3'");
    expect(newComposer).toContain('type DraftSnapshot={toEmail:string;ccEmails:string;bccEmails:string;subject:string;body:string}');
    expect(replyComposer).toContain('type ReplySnapshot={ccEmails:string;bccEmails:string;body:string}');
    expect(newPage).toContain("select('id,revision,to_email,cc_emails,bcc_emails,subject,body,updated_at')");
    expect(workspace).toContain("select('id,thread_id,body,cc_emails,bcc_emails,revision,updated_at')");
    expect(workspace).toContain('ccEmails:replyDraft.cc_emails??[]');
    expect(workspace).toContain('bccEmails:replyDraft.bcc_emails??[]');
  });

  it('creates attachment metadata only, with no binary upload or public storage exposure',()=>{
    expect(migration).toContain('create table if not exists public.office_attachments');
    expect(migration).toContain('alter table public.office_attachments enable row level security');
    expect(migration).toContain('revoke all on table public.office_attachments from public,anon,authenticated');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_attachments to service_role');
    expect(migration).not.toContain('storage.buckets');
    expect(migration).not.toContain('storage.objects');
    expect(migration).not.toContain('insert into storage');
    expect(attachmentIntegrity).not.toContain('storage.buckets');
    expect(attachmentIntegrity).not.toContain('storage.objects');
  });

  it('cannot mark attachment metadata ready without a real locator and clears locators when deleted',()=>{
    expect(attachmentIntegrity).toContain('office_attachments_storage_pair_check');
    expect(attachmentIntegrity).toContain('(storage_bucket is null) = (storage_path is null)');
    expect(attachmentIntegrity).toContain('office_attachments_ready_locator_check');
    expect(attachmentIntegrity).toContain("status<>'ready'");
    expect(attachmentIntegrity).toContain("nullif(trim(provider_attachment_id),'') is not null");
    expect(attachmentIntegrity).toContain('office_attachments_deleted_locator_check');
    expect(attachmentIntegrity).toContain("status<>'deleted'");
  });

  it('does not expose actual recipient addresses in audit metadata beyond the primary operational recipient already recorded',()=>{
    expect(migration).toContain("'ccCount',cardinality(v_cc)");
    expect(migration).toContain("'bccCount',cardinality(v_bcc)");
    expect(migration).not.toContain("'ccEmails',to_jsonb(v_cc)");
    expect(migration).not.toContain("'bccEmails',to_jsonb(v_bcc)");
  });
});