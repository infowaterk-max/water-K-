-- Digital Office private attachment quarantine + malware scan gate.
-- Upload alone NEVER makes a file ready. Ready requires verified content identity + clean malware verdict.
-- Scanner transport is configured outside the database; missing/unavailable scanner fails closed.

alter table public.office_message_attachments
  add column if not exists scan_status text not null default 'awaiting_upload',
  add column if not exists scan_nonce uuid,
  add column if not exists scan_attempts integer not null default 0,
  add column if not exists sha256 text,
  add column if not exists detected_content_type text,
  add column if not exists scan_provider text,
  add column if not exists scan_engine_version text,
  add column if not exists malware_signature text,
  add column if not exists quarantine_reason text,
  add column if not exists scan_completed_at timestamptz;

alter table public.office_message_attachments
  drop constraint if exists office_message_attachments_scan_status_check;
alter table public.office_message_attachments
  add constraint office_message_attachments_scan_status_check
  check(scan_status in('awaiting_upload','pending_scan','clean','infected','rejected','scan_error'));

alter table public.office_message_attachments
  drop constraint if exists office_message_attachments_scan_attempts_check;
alter table public.office_message_attachments
  add constraint office_message_attachments_scan_attempts_check
  check(scan_attempts>=0 and scan_attempts<=20);

alter table public.office_message_attachments
  drop constraint if exists office_message_attachments_sha256_check;
alter table public.office_message_attachments
  add constraint office_message_attachments_sha256_check
  check(sha256 is null or sha256~'^[0-9a-f]{64}$');

alter table public.office_message_attachments
  drop constraint if exists office_message_attachments_scan_state_check;
alter table public.office_message_attachments
  add constraint office_message_attachments_scan_state_check
  check(
    (scan_status='pending_scan' and scan_nonce is not null)
    or (scan_status<>'pending_scan' and scan_nonce is null)
  );

create index if not exists office_message_attachments_scan_pending_idx
  on public.office_message_attachments(scan_status,expires_at)
  where status='pending' and scan_status in('awaiting_upload','scan_error');

create table if not exists public.office_attachment_security_events(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  attachment_id uuid not null references public.office_message_attachments(id) on delete cascade,
  event_type text not null check(event_type in('scan_started','scan_clean','scan_infected','signature_rejected','scan_error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists office_attachment_security_events_attachment_idx
  on public.office_attachment_security_events(attachment_id,created_at desc);
create index if not exists office_attachment_security_events_instance_idx
  on public.office_attachment_security_events(instance_id,created_at desc);

alter table public.office_attachment_security_events enable row level security;
revoke all on table public.office_attachment_security_events from public,anon,authenticated;
revoke all on table public.office_attachment_security_events from service_role;
grant select,insert on table public.office_attachment_security_events to service_role;

create or replace function private.enforce_office_attachment_scan_gate_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='ready' then
    if new.scan_status<>'clean'
      or new.sha256 is null
      or new.detected_content_type is distinct from new.content_type
      or new.scan_completed_at is null
      or new.scan_provider is null then
      raise exception 'OFFICE_ATTACHMENT_SCAN_REQUIRED';
    end if;
  end if;

  if new.scan_status='clean' then
    if new.status<>'pending' and new.status<>'ready' then raise exception 'OFFICE_ATTACHMENT_CLEAN_STATE_INVALID'; end if;
    if new.sha256 is null or new.detected_content_type is distinct from new.content_type or new.scan_completed_at is null or new.scan_provider is null then
      raise exception 'OFFICE_ATTACHMENT_CLEAN_EVIDENCE_REQUIRED';
    end if;
  end if;

  if new.scan_status in('infected','rejected') and new.status<>'revoked' then
    raise exception 'OFFICE_ATTACHMENT_QUARANTINE_REVOKE_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_office_attachment_scan_gate_v1() from public,anon,authenticated;

drop trigger if exists office_attachment_scan_gate_v1 on public.office_message_attachments;
create trigger office_attachment_scan_gate_v1
before insert or update on public.office_message_attachments
for each row execute function private.enforce_office_attachment_scan_gate_v1();

create or replace function public.admin_begin_office_attachment_scan_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid,
  p_attachment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_attachment public.office_message_attachments%rowtype;
  v_storage_count integer;
  v_nonce uuid:=gen_random_uuid();
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null or p_attachment_id is null then
    raise exception 'OFFICE_ATTACHMENT_SCAN_IDENTITY_REQUIRED';
  end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then
    raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED';
  end if;

  select * into v_attachment
  from public.office_message_attachments
  where id=p_attachment_id
    and instance_id=p_instance_id
    and thread_id=p_thread_id
    and uploader_id=p_actor
    and status='pending'
    and expires_at>now()
    and scan_status in('awaiting_upload','scan_error')
  for update;
  if not found then raise exception 'OFFICE_ATTACHMENT_SCAN_RESERVATION_INVALID'; end if;

  select count(*) into v_storage_count
  from storage.objects
  where bucket_id=v_attachment.storage_bucket and name=v_attachment.storage_path;
  if v_storage_count<>1 then raise exception 'OFFICE_ATTACHMENT_STORAGE_OBJECT_MISSING'; end if;

  update public.office_message_attachments
  set scan_status='pending_scan',scan_nonce=v_nonce,scan_attempts=scan_attempts+1,
      quarantine_reason=null,scan_provider=null,scan_engine_version=null,malware_signature=null,
      scan_completed_at=null,updated_at=now()
  where id=v_attachment.id
    and status='pending'
    and scan_status in('awaiting_upload','scan_error');
  if not found then raise exception 'OFFICE_ATTACHMENT_SCAN_BEGIN_RACE'; end if;

  insert into public.office_attachment_security_events(instance_id,attachment_id,event_type,metadata)
  values(
    p_instance_id,v_attachment.id,'scan_started',
    jsonb_build_object('threadId',p_thread_id,'uploaderId',p_actor,'scanAttempt',v_attachment.scan_attempts+1)
  );

  return jsonb_build_object(
    'id',v_attachment.id,
    'attachmentId',v_attachment.id,
    'threadId',v_attachment.thread_id,
    'storageBucket',v_attachment.storage_bucket,
    'storagePath',v_attachment.storage_path,
    'originalName',v_attachment.original_name,
    'declaredContentType',v_attachment.content_type,
    'byteSize',v_attachment.byte_size,
    'scanNonce',v_nonce
  );
end;
$$;

create or replace function public.admin_complete_office_attachment_scan_v1(
  p_attachment_id uuid,
  p_scan_nonce uuid,
  p_result text,
  p_sha256 text,
  p_detected_content_type text,
  p_provider text,
  p_engine_version text,
  p_malware_signature text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_attachment public.office_message_attachments%rowtype;
  v_result text:=lower(trim(coalesce(p_result,'')));
  v_provider text:=nullif(trim(coalesce(p_provider,'')),'');
  v_reason text:=nullif(left(trim(coalesce(p_reason,'')),500),'');
  v_event text;
begin
  if p_attachment_id is null or p_scan_nonce is null then raise exception 'OFFICE_ATTACHMENT_SCAN_COMPLETION_IDENTITY_REQUIRED'; end if;
  if v_result not in('clean','infected','rejected','scan_error') then raise exception 'OFFICE_ATTACHMENT_SCAN_RESULT_INVALID'; end if;

  select * into v_attachment
  from public.office_message_attachments
  where id=p_attachment_id
    and status='pending'
    and scan_status='pending_scan'
    and scan_nonce=p_scan_nonce
  for update;
  if not found then raise exception 'OFFICE_ATTACHMENT_SCAN_NONCE_INVALID'; end if;

  if v_result in('clean','infected','rejected') then
    if p_sha256 is null or p_sha256!~'^[0-9a-f]{64}$' then raise exception 'OFFICE_ATTACHMENT_SCAN_HASH_REQUIRED'; end if;
    if nullif(trim(coalesce(p_detected_content_type,'')),'') is null then raise exception 'OFFICE_ATTACHMENT_SCAN_TYPE_REQUIRED'; end if;
    if v_provider is null then raise exception 'OFFICE_ATTACHMENT_SCAN_PROVIDER_REQUIRED'; end if;
  end if;

  if v_result='clean' and p_detected_content_type is distinct from v_attachment.content_type then
    raise exception 'OFFICE_ATTACHMENT_SCAN_TYPE_MISMATCH';
  end if;

  if v_result='clean' then
    update public.office_message_attachments
    set scan_status='clean',scan_nonce=null,sha256=p_sha256,detected_content_type=p_detected_content_type,
        scan_provider=v_provider,scan_engine_version=nullif(trim(coalesce(p_engine_version,'')),''),
        malware_signature=null,quarantine_reason=null,scan_completed_at=now(),updated_at=now()
    where id=v_attachment.id and scan_status='pending_scan' and scan_nonce=p_scan_nonce;
    v_event:='scan_clean';
  elsif v_result='infected' then
    update public.office_message_attachments
    set status='revoked',expires_at=null,scan_status='infected',scan_nonce=null,sha256=p_sha256,
        detected_content_type=p_detected_content_type,scan_provider=v_provider,
        scan_engine_version=nullif(trim(coalesce(p_engine_version,'')),''),
        malware_signature=nullif(left(trim(coalesce(p_malware_signature,'')),240),''),
        quarantine_reason=coalesce(v_reason,'malware_detected'),scan_completed_at=now(),updated_at=now()
    where id=v_attachment.id and scan_status='pending_scan' and scan_nonce=p_scan_nonce;
    v_event:='scan_infected';
  elsif v_result='rejected' then
    update public.office_message_attachments
    set status='revoked',expires_at=null,scan_status='rejected',scan_nonce=null,sha256=p_sha256,
        detected_content_type=p_detected_content_type,scan_provider=v_provider,
        scan_engine_version=nullif(trim(coalesce(p_engine_version,'')),''),malware_signature=null,
        quarantine_reason=coalesce(v_reason,'content_signature_rejected'),scan_completed_at=now(),updated_at=now()
    where id=v_attachment.id and scan_status='pending_scan' and scan_nonce=p_scan_nonce;
    v_event:='signature_rejected';
  else
    update public.office_message_attachments
    set scan_status='scan_error',scan_nonce=null,scan_provider=v_provider,
        scan_engine_version=nullif(trim(coalesce(p_engine_version,'')),''),malware_signature=null,
        quarantine_reason=coalesce(v_reason,'scanner_unavailable'),scan_completed_at=now(),updated_at=now()
    where id=v_attachment.id and scan_status='pending_scan' and scan_nonce=p_scan_nonce;
    v_event:='scan_error';
  end if;
  if not found then raise exception 'OFFICE_ATTACHMENT_SCAN_COMPLETION_RACE'; end if;

  insert into public.office_attachment_security_events(instance_id,attachment_id,event_type,metadata)
  values(
    v_attachment.instance_id,v_attachment.id,v_event,
    jsonb_strip_nulls(jsonb_build_object(
      'threadId',v_attachment.thread_id,
      'sha256',p_sha256,
      'declaredContentType',v_attachment.content_type,
      'detectedContentType',p_detected_content_type,
      'provider',v_provider,
      'engineVersion',nullif(trim(coalesce(p_engine_version,'')),''),
      'malwareSignature',nullif(left(trim(coalesce(p_malware_signature,'')),240),''),
      'reason',v_reason
    ))
  );

  return jsonb_build_object(
    'id',v_attachment.id,
    'attachmentId',v_attachment.id,
    'result',v_result,
    'readyForFinalize',v_result='clean'
  );
end;
$$;

revoke all on function public.admin_begin_office_attachment_scan_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_complete_office_attachment_scan_v1(uuid,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_begin_office_attachment_scan_v1(uuid,uuid,uuid,uuid) to service_role;
grant execute on function public.admin_complete_office_attachment_scan_v1(uuid,uuid,text,text,text,text,text,text,text) to service_role;

comment on table public.office_attachment_security_events is 'System security evidence for private attachment signature validation and malware scanning. No file body is stored in evidence.';
comment on function public.admin_begin_office_attachment_scan_v1(uuid,uuid,uuid,uuid) is 'Locks one uploaded private attachment into a nonce-bound quarantine scan attempt after participant authorization.';
comment on function public.admin_complete_office_attachment_scan_v1(uuid,uuid,text,text,text,text,text,text,text) is 'Completes a nonce-bound private attachment scan. Only clean files can ever satisfy the ready-state scan gate.';
