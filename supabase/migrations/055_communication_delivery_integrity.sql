-- V8 communication delivery integrity.
-- Transactional messages (support replies, return status, payment follow-up) must not
-- be stranded behind the optional marketing approval gate. Marketing remains approval-gated.
-- Also pin SECURITY DEFINER search paths to an empty path for the communication functions
-- touched by this migration; all application relations are schema-qualified.

create or replace function public.enqueue_communication(
  p_email text,
  p_user_id uuid,
  p_purpose text,
  p_template_key text,
  p_payload jsonb,
  p_idempotency_key text,
  p_scheduled_at timestamptz default now()
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_requires_approval boolean;
begin
  if p_purpose not in ('transactional','marketing') then
    raise exception 'invalid purpose';
  end if;
  if public.is_communication_suppressed(p_email) then
    raise exception 'recipient suppressed';
  end if;
  if p_purpose='marketing' and not public.has_marketing_consent(p_email,'email') then
    raise exception 'marketing consent required';
  end if;

  v_requires_approval := (p_purpose='marketing');

  insert into public.communication_jobs(
    recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,
    requires_approval,approved_at,approved_by
  ) values(
    lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),
    p_idempotency_key,p_scheduled_at,v_requires_approval,null,null
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_communication(text,uuid,text,text,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.enqueue_communication(text,uuid,text,text,jsonb,text,timestamptz) to service_role;

-- Existing V8 jobs are staging-only at this point, but keep migration semantics safe if the
-- set is applied over pre-created rows: transactional jobs should be immediately claimable.
update public.communication_jobs
set requires_approval=false,
    approved_at=null,
    approved_by=null,
    updated_at=now()
where purpose='transactional'
  and status='pending';

-- SECURITY DEFINER hardening recommended by Supabase: do not search writable application schemas.
alter function public.capture_inventory_snapshot(date) set search_path = '';
alter function public.has_marketing_consent(text,text) set search_path = '';
alter function public.is_communication_suppressed(text) set search_path = '';
alter function public.claim_communication_jobs(integer) set search_path = '';
alter function public.complete_communication_job(uuid,uuid,text) set search_path = '';
alter function public.fail_communication_job(uuid,uuid,text,boolean) set search_path = '';
alter function public.recover_stale_communication_jobs(integer) set search_path = '';
alter function public.admin_manage_communication_job(uuid,uuid,text,timestamptz,text) set search_path = '';
alter function public.admin_approve_communication_job(uuid,uuid,text) set search_path = '';
alter function public.admin_block_communication_email(text,uuid,text) set search_path = '';
alter function public.admin_release_communication_suppression(uuid,uuid,text) set search_path = '';
alter function public.admin_manage_marketing_campaign(uuid,uuid,text,text) set search_path = '';

comment on function public.enqueue_communication(text,uuid,text,text,jsonb,text,timestamptz)
is 'Queues communication idempotently; transactional jobs bypass manual approval, marketing jobs require active consent and manual approval.';
