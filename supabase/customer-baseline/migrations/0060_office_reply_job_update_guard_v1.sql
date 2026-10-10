-- Core #1186 U10A2-F13: fail-closed Office reply job UPDATE-path closure.
-- Forward-only SECURITY HARDENING after canonical 0058 reply queue and 0059 drafts FK.
-- Does NOT rewrite canonical production source or customer baseline history.
-- Source finding: canonical 20260908034500 only installs BEFORE INSERT; an UPDATE
-- can otherwise add a tag, change tenant/thread, or strip an Office reply route.
-- A disposable PostgreSQL trigger/role/legacy-row proof is still required before deployment.

create or replace function private.enforce_office_reply_job_context_immutable_v1()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if old.template_key='support_reply'
     and (coalesce(old.payload,'{}'::jsonb) ? 'officeThreadId')
     and (
       new.instance_id is distinct from old.instance_id
       or new.template_key is distinct from old.template_key
       or not (coalesce(new.payload,'{}'::jsonb) ? 'officeThreadId')
       or (new.payload->>'officeThreadId') is distinct from (old.payload->>'officeThreadId')
     )
  then
    raise exception 'OFFICE_REPLY_ROUTING_CONTEXT_IMMUTABLE';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_office_reply_job_context_immutable_v1()
  from public,anon,authenticated;

drop trigger if exists communication_jobs_office_reply_context_immutable on public.communication_jobs;
create trigger communication_jobs_office_reply_context_immutable
before update on public.communication_jobs
for each row execute function private.enforce_office_reply_job_context_immutable_v1();

-- Replace, do not duplicate, the canonical INSERT-only trigger. PostgreSQL fires
-- BEFORE triggers alphabetically: context_immutable before mailbox_guard on UPDATE.
-- Run the canonical mailbox/route validation again on *every* UPDATE to detect
-- deactivated mailboxes and routes, including changes made by older queue paths.
drop trigger if exists communication_jobs_office_reply_mailbox_guard on public.communication_jobs;
create trigger communication_jobs_office_reply_mailbox_guard
before insert or update on public.communication_jobs
for each row execute function private.enforce_office_reply_queue_mailbox_v1();
