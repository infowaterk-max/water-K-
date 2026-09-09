-- Keep expired attachment cleanup consistent with the quarantine/scan state machine.
-- Expiry invalidates any in-flight scan nonce so a stale clean verdict can never resurrect the file.

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
    set status='revoked',expires_at=null,scan_status='rejected',scan_nonce=null,
        quarantine_reason='reservation_expired',updated_at=now()
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
      'scanStatusBefore',v_attachment.scan_status,
      'scanNonceInvalidated',v_attachment.scan_nonce is not null,
      'cleanupSource','cron'
    )
  );

  return jsonb_build_object(
    'id',v_attachment.id,
    'attachmentId',v_attachment.id,
    'instanceId',v_attachment.instance_id,
    'storagePath',v_attachment.storage_path,
    'revoked',true,
    'scanNonceInvalidated',v_attachment.scan_nonce is not null
  );
end;
$$;

revoke all on function public.admin_revoke_expired_office_private_attachment_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_revoke_expired_office_private_attachment_v1(uuid,text) to service_role;
