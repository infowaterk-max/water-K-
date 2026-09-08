import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('Digital Office autosave and concurrency contract',()=>{
  const revisionMigration=read('supabase/migrations/20260908053000_digital_office_draft_revision_guard_v1.sql');
  const singletonMigration=read('supabase/migrations/20260908053100_digital_office_reply_draft_singleton_v1.sql');
  const actions=read('src/app/admin/kommunikacio/iroda/composer-actions.ts');
  const hook=read('src/components/admin/use-office-draft-autosave.ts');
  const newComposer=read('src/components/admin/office-new-email-composer.tsx');
  const replyComposer=read('src/components/admin/office-customer-email-form.tsx');
  const newPage=read('src/app/admin/kommunikacio/iroda/uj/page.tsx');
  const workspace=read('src/app/admin/kommunikacio/iroda/page.tsx');

  it('uses optimistic revisions and rejects stale save/delete mutations',()=>{
    expect(revisionMigration).toContain('add column if not exists revision bigint not null default 1');
    expect(revisionMigration).toContain('office_drafts_revision_positive_check check (revision>0)');
    expect(revisionMigration).toContain("raise exception 'OFFICE_DRAFT_REVISION_REQUIRED'");
    expect(revisionMigration).toContain('and revision=v_expected_revision');
    expect(revisionMigration).toContain('revision=revision+1');
    expect(revisionMigration).toContain("raise exception 'OFFICE_DRAFT_CONFLICT'");
    expect(revisionMigration).toContain('revoke all on function public.admin_mutate_office_draft_v2');
    expect(revisionMigration).toContain('grant execute on function public.admin_mutate_office_draft_v2');
  });

  it('serializes the first reply draft so two tabs cannot create competing copies',()=>{
    expect(singletonMigration).toContain('pg_advisory_xact_lock');
    expect(singletonMigration).toContain("new.draft_type<>'reply'");
    expect(singletonMigration).toContain("raise exception 'OFFICE_DRAFT_CONFLICT'");
    expect(singletonMigration).toContain('office_drafts_reply_author_thread_uidx');
    expect(singletonMigration).toContain('on public.office_drafts(instance_id,author_user_id,thread_id)');
    expect(singletonMigration).toContain("where draft_type='reply' and thread_id is not null");
  });

  it('separates autosave from manual-save audit noise while still auditing creation and manual saves',()=>{
    expect(revisionMigration).toContain("v_save_mode not in ('manual','autosave')");
    expect(revisionMigration).toContain("if v_was_new or v_save_mode='manual' then");
    expect(revisionMigration).toContain("'office.draft_created'");
    expect(revisionMigration).toContain("'office.draft_saved'");
    expect(revisionMigration).toContain("'saveMode',v_save_mode");
  });

  it('passes expected revision through the current envelope-aware service action and exposes a distinct conflict state',()=>{
    expect(actions).toContain("db.rpc('admin_mutate_office_draft_v3'");
    expect(actions).toContain('draftId,expectedRevision:revision,saveMode');
    expect(actions).toContain('payload:{draftId,expectedRevision:revision}');
    expect(actions).toContain("persistNewEmailDraft(formData,'autosave')");
    expect(actions).toContain("persistReplyDraft(formData,'autosave')");
    expect(actions).toContain("status:'conflict'");
    expect(actions).toContain("reason.includes('office_draft_conflict')");
    expect(actions).toContain('revision:result.revision');
  });

  it('debounces autosave, keeps one save in flight and stops automatic follow-ups after conflict or error',()=>{
    expect(hook).toContain('delayMs=1400');
    expect(hook).toContain('inFlightRef=useRef<Promise<OfficeComposerActionState>|null>(null)');
    expect(hook).toContain('queuedRef.current=true');
    expect(hook).toContain('latestSnapshotRef.current');
    expect(hook).toContain("if(result.status==='conflict')");
    expect(hook).toContain('haltedRef.current=true');
    expect(hook).toContain('let accepted=false');
    expect(hook).toContain('accepted=adoptResult(result,key)');
    expect(hook).toContain('if(accepted&&followUp');
    expect(hook).not.toContain('if(followUp&&!haltedRef.current');
  });

  it('restores revisions and recipient envelopes for new-email and author-private reply drafts',()=>{
    expect(newPage).toContain("select('id,revision,to_email,cc_emails,bcc_emails,subject,body,updated_at')");
    expect(newPage).toContain('revision:draft.revision');
    expect(workspace).toContain(".eq('instance_id',scope.instanceId).eq('author_user_id',actor.id).eq('draft_type','reply')");
    expect(workspace).toContain("select('id,thread_id,body,cc_emails,bcc_emails,revision,updated_at')");
    expect(workspace).toContain('initialDraft={replyDraft?{id:replyDraft.id,revision:replyDraft.revision,ccEmails:replyDraft.cc_emails??[],bccEmails:replyDraft.bcc_emails??[],body:replyDraft.body}:undefined}');
  });

  it('keeps typing responsive during background autosave and blocks sending on conflict or missing mailbox readiness',()=>{
    expect(newComposer).toContain('disabled={actionPending}');
    expect(replyComposer).toContain('disabled={actionPending}');
    expect(newComposer).not.toContain("disabled={actionPending||draft.status==='saving'}");
    expect(replyComposer).not.toContain("disabled={actionPending||draft.status==='saving'}");
    expect(newComposer).toContain("draft.status==='conflict'");
    expect(replyComposer).toContain("draft.status==='conflict'");
    expect(workspace).toContain('thread.mailbox_key&&activeMailboxKeys.has(thread.mailbox_key)&&routedThreadIds.has(thread.id)');
    expect(replyComposer).toContain('!sendingConfigured');
  });

  it('does not introduce a fallback to the existing webshop mail identity',()=>{
    const combined=(revisionMigration+'\n'+singletonMigration+'\n'+actions+'\n'+newComposer+'\n'+replyComposer+'\n'+workspace).toLowerCase();
    expect(combined).not.toContain('support_email');
    expect(combined).not.toContain('okospolymer');
    expect(newComposer).toContain('A működő webshop jelenlegi e-mail címeit a rendszer nem használja.');
    expect(replyComposer).toContain('a működő webshop jelenlegi e-mail címeit nem használjuk');
  });
});
