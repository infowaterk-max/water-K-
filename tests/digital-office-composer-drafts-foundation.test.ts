import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('Digital Office composer and drafts foundation',()=>{
  const migration=read('supabase/migrations/20260908034000_digital_office_composer_drafts_foundation_v1.sql');
  const queueGuard=read('supabase/migrations/20260908034500_digital_office_reply_queue_guard_v1.sql');
  const tenantIntegrity=read('supabase/migrations/20260908034600_digital_office_drafts_tenant_integrity_v1.sql');
  const capabilities=read('src/lib/auth/store-capabilities.ts');
  const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
  const newComposer=read('src/components/admin/office-new-email-composer.tsx');
  const replyComposer=read('src/components/admin/office-customer-email-form.tsx');
  const newPage=read('src/app/admin/kommunikacio/iroda/uj/page.tsx');
  const worker=read('src/lib/communication/worker.ts');

  it('adds arbitrary email compose as an opt-in capability without changing stable role presets',()=>{
    expect(capabilities).toContain("'office.email.compose'");
    expect(migration).toContain("'office.email.compose','office','Új ügyfél-e-mail írása'");
    expect(migration).toContain('Intentionally NO write to store_role_permission_presets here');
    expect(migration).not.toContain('insert into public.store_role_permission_presets');
    expect(migration).toContain("rb.role_code='owner'");
  });

  it('keeps drafts author-private, tenant-bound and unavailable to browser roles',()=>{
    expect(migration).toContain('create table if not exists public.office_drafts');
    expect(migration).toContain('alter table public.office_drafts enable row level security');
    expect(migration).toContain('revoke all on table public.office_drafts from public,anon,authenticated');
    expect(migration).toContain('grant select,insert,update,delete on table public.office_drafts to service_role');
    expect(migration).toContain('where id=v_draft_id and instance_id=p_instance_id and author_user_id=p_actor');
    expect(tenantIntegrity).toContain('foreign key(instance_id) references public.webshop_instances(id) on delete cascade');
    expect(tenantIntegrity).toContain('office_drafts_author_instance_idx');
    expect(newPage).toContain(".eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','new_email')");
  });

  it('requires a dedicated active Office mailbox before any Office queue insert',()=>{
    const mailboxCheck=migration.indexOf("if v_mailbox_key is null then raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'");
    const enqueue=migration.indexOf('v_job:=public.enqueue_communication_v2');
    expect(mailboxCheck).toBeGreaterThan(0);
    expect(enqueue).toBeGreaterThan(mailboxCheck);
    expect(migration).toContain('m.is_active=true');
    expect(migration).toContain("if not v_route_exists then raise exception 'OFFICE_EMAIL_ROUTE_MISSING'");
    expect(queueGuard).toContain('before insert on public.communication_jobs');
    expect(queueGuard).toContain("new.template_key<>'support_reply'");
    expect(queueGuard).toContain("raise exception 'OFFICE_MAILBOX_NOT_CONFIGURED'");
    expect(queueGuard).toContain("raise exception 'OFFICE_EMAIL_ROUTE_MISSING'");
  });

  it('does not seed or fall back to an existing webshop email address',()=>{
    const combined=(migration+'\n'+queueGuard+'\n'+actions+'\n'+newComposer+'\n'+newPage).toLowerCase();
    expect(combined).not.toContain('insert into public.office_mailboxes');
    expect(combined).not.toContain('support_email');
    expect(combined).not.toContain('okospolymer');
    expect(combined).not.toContain('waterk.hu');
    expect(newComposer).toContain('A működő webshop jelenlegi e-mail címeit a rendszer nem használja.');
    expect(newPage).toContain('Jelenlegi webshopos e-mail cím nem használható.');
  });

  it('allows revision-safe drafts while keeping send disabled by default without a mailbox',()=>{
    expect(newComposer).toContain('const sendingConfigured=mailboxes.length>0');
    expect(newComposer).toContain('Piszkozat mentése');
    expect(newComposer).toContain('const sendReady=sendingConfigured');
    expect(newComposer).toContain("disabled={actionPending||draft.status==='conflict'||!sendReady}");
    expect(replyComposer).toContain('sendingConfigured=false');
    expect(replyComposer).toContain('Piszkozat mentése');
    expect(replyComposer).toContain("disabled={actionPending||draft.status==='conflict'||!meaningful||!sendingConfigured}");
    expect(newComposer).toContain('initialRevision:initialDraft?.revision??null');
    expect(replyComposer).toContain('initialRevision:initialDraft?.revision??null');
  });

  it('only lets a queue operation consume the exact persisted draft snapshot',()=>{
    expect(actions).toContain('async function validatedQueueDraftId');
    expect(actions).toContain("draft.draft_type==='reply'&&draft.thread_id===input.threadId&&draft.body===input.body");
    expect(actions).toContain("draft.draft_type==='new_email'");
    expect(actions).toContain('draft.to_email===normalizedRecipient');
    expect(actions).toContain("draft.subject===(input.subject??'')");
    expect(actions).toContain('p_draft_id:safeDraftId');
  });

  it('only reports draft deletion after database evidence confirms it',()=>{
    expect(actions).toContain('if(result.deleted!==true)');
    expect(actions).toContain("return{status:'success',message:'Piszkozat törölve.'}");
    expect(newComposer).toContain('const result=await deleteOfficeDraftAction(data)');
    expect(newComposer).toContain("if(result.status==='success')");
    expect(newComposer).toContain("data.set('revision',String(deletingRevision))");
  });

  it('preserves the explicit Office email subject in the worker',()=>{
    expect(migration).toContain("'emailSubject',v_subject");
    expect(worker).toContain('function subjectForJob');
    expect(worker).toContain("job.payload?.emailSubject");
    expect(worker).toContain('subject:subjectForJob(job,template.subject,identity.brandName)');
  });
});
