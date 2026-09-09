-- System cleanup evidence for expired private attachment reservations.
-- No user is attributed as actor: this is lifecycle maintenance performed by CRON_SECRET worker.

create table if not exists public.office_attachment_cleanup_events(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  attachment_id uuid not null references public.office_message_attachments(id) on delete cascade,
  storage_path text not null,
  event_type text not null check(event_type in('expired_reservation_revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists office_attachment_cleanup_events_instance_idx
  on public.office_attachment_cleanup_events(instance_id,created_at desc);
create index if not exists office_attachment_cleanup_events_attachment_idx
  on public.office_attachment_cleanup_events(attachment_id,created_at desc);

alter table public.office_attachment_cleanup_events enable row level security;
revoke all on table public.office_attachment_cleanup_events from public,anon,authenticated;
grant select,insert on table public.office_attachment_cleanup_events to service_role;

create or replace function public.admin_revoke_expired_office_private_attachment_v1(
  p_attachment_id uuid,
  p_expected_storage_path text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_attachment public.office_message_attachments%rowtype;
begin
  if p_attachment_id is null or nullif(trim(coalesce(p_expected_storage_path,'')),'') is null then
    raise exception 'OFFICE_ATTACHMENT_CLEANUP_IDENTITY_REQUIRED';
  end if;

  select * into v_attachment
    from public.office_message_attachments
    where id=p_attachment_id
      and status='pending'
      and expires_at is not null
      and expires_at<=now()
    for update;
  if not found then raise exception 'OFFICE_ATTACHMENT_CLEANUP_NOT_DUE'; end if;
  if v_attachment.storage_path is distinct from p_expected_storage_path then
    raise exception 'OFFICE_ATTACHMENT_CLEANUP_PATH_MISMATCH';
  end if;

  update public.office_message_attachments
    set status='revoked',expires_at=null,updated_at=now()
    where id=v_attachment.id
      and status='pending'
      and storage_path=p_expected_storage_path;
  if not found then raise exception 'OFFICE_ATTACHMENT_CLEANUP_UPDATE_MISSING'; end if;

  insert into public.office_attachment_cleanup_events(
    instance_id,attachment_id,storage_path,event_type,metadata
  ) values(
    v_attachment.instance_id,v_attachment.id,v_attachment.storage_path,'expired_reservation_revoked',
    jsonb_build_object(
      'threadId',v_attachment.thread_id,
      'uploaderId',v_attachment.uploader_id,
      'expiredAt',v_attachment.expires_at,
      'cleanupSource','cron'
    )
  );

  return jsonb_build_object(
    'id',v_attachment.id,
    'attachmentId',v_attachment.id,
    'instanceId',v_attachment.instance_id,
    'storagePath',v_attachment.storage_path,
    'revoked',true
  );
end;
$$;

revoke all on function public.admin_revoke_expired_office_private_attachment_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_revoke_expired_office_private_attachment_v1(uuid,text) to service_role;

comment on table public.office_attachment_cleanup_events is 'System lifecycle evidence for expired Digital Office private attachment reservations; no human actor attribution.';
