-- Harden private attachment preparation below the API boundary.
-- Replace only the prepare RPC so null/malformed file metadata cannot become a reservation.

create or replace function public.admin_prepare_office_private_attachments_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid,
  p_files jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread_type text;
  v_file jsonb;
  v_id uuid;
  v_name text;
  v_type text;
  v_size bigint;
  v_path text;
  v_expires timestamptz:=now()+interval '2 hours';
  v_items jsonb:='[]'::jsonb;
  v_count integer;
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null then raise exception 'OFFICE_IDENTITY_REQUIRED'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select conversation_type into v_thread_type from public.office_threads
    where id=p_thread_id and instance_id=p_instance_id;
  if v_thread_type not in('internal_private','internal_group') then raise exception 'OFFICE_ATTACHMENT_PRIVATE_THREAD_REQUIRED'; end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED'; end if;
  if p_files is null or jsonb_typeof(p_files)<>'array' then raise exception 'OFFICE_ATTACHMENT_LIST_INVALID'; end if;
  v_count:=jsonb_array_length(p_files);
  if v_count is null or v_count<1 or v_count>5 then raise exception 'OFFICE_ATTACHMENT_COUNT_INVALID'; end if;

  for v_file in select value from jsonb_array_elements(p_files) loop
    if v_file is null or jsonb_typeof(v_file)<>'object' then raise exception 'OFFICE_ATTACHMENT_FILE_INVALID'; end if;
    v_name:=trim(coalesce(v_file->>'name',''));
    v_type:=lower(trim(coalesce(v_file->>'contentType','')));
    begin
      v_size:=(v_file->>'size')::bigint;
    exception when others then
      raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID';
    end;
    if length(v_name)<1 or length(v_name)>240 or position('/' in v_name)>0 or position(E'\\' in v_name)>0 then
      raise exception 'OFFICE_ATTACHMENT_NAME_INVALID';
    end if;
    if v_type not in(
      'image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) then raise exception 'OFFICE_ATTACHMENT_TYPE_INVALID'; end if;
    if v_size is null or v_size<1 or v_size>10485760 then raise exception 'OFFICE_ATTACHMENT_SIZE_INVALID'; end if;

    v_id:=gen_random_uuid();
    v_path:=p_instance_id::text||'/'||p_thread_id::text||'/'||v_id::text;
    insert into public.office_message_attachments(
      id,instance_id,thread_id,uploader_id,storage_path,original_name,content_type,byte_size,status,expires_at
    ) values(
      v_id,p_instance_id,p_thread_id,p_actor,v_path,v_name,v_type,v_size,'pending',v_expires
    );
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'attachmentId',v_id,'path',v_path,'name',v_name,'contentType',v_type,'size',v_size,'expiresAt',v_expires
    ));
  end loop;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata
  ) values(
    p_actor,'office.private_attachment_upload_prepared','office_thread',p_thread_id::text,v_org,p_instance_id,
    'Privát irodai csatolmány-feltöltés előkészítve',
    jsonb_build_object('threadId',p_thread_id,'attachmentCount',v_count,'expiresAt',v_expires),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_prepare_office_private_attachments_v1')
  );

  return jsonb_build_object('id',p_thread_id,'threadId',p_thread_id,'attachments',v_items,'expiresAt',v_expires);
end;
$$;

revoke all on function public.admin_prepare_office_private_attachments_v1(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_prepare_office_private_attachments_v1(uuid,uuid,uuid,jsonb) to service_role;
