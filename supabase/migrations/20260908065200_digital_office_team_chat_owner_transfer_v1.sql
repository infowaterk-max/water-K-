-- Explicit ownership transfer for participant-protected Digital Office internal threads.
-- No elevated role may seize ownership; only the current active owner with current chat access can transfer it to an active member.

create or replace function public.admin_transfer_office_thread_owner_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_thread_id uuid,
  p_target_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_thread public.office_threads%rowtype;
  v_target public.office_thread_participants%rowtype;
  v_actor_updated integer;
  v_target_updated integer;
begin
  if p_instance_id is null or p_actor is null or p_thread_id is null or p_target_user_id is null then
    raise exception 'OFFICE_OWNER_TRANSFER_IDENTITY_REQUIRED';
  end if;
  if p_actor=p_target_user_id then raise exception 'OFFICE_OWNER_TRANSFER_SELF_FORBIDDEN'; end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_thread
  from public.office_threads
  where id=p_thread_id
    and instance_id=p_instance_id
    and conversation_type in ('internal_private','internal_group')
  for update;
  if not found then raise exception 'OFFICE_INTERNAL_THREAD_NOT_FOUND'; end if;

  if not private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_actor) then
    raise exception 'OFFICE_THREAD_OWNER_REQUIRED';
  end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_actor) then
    raise exception 'OFFICE_PRIVATE_THREAD_ACCESS_DENIED';
  end if;

  select * into v_target
  from public.office_thread_participants
  where instance_id=p_instance_id
    and thread_id=p_thread_id
    and user_id=p_target_user_id
    and left_at is null
    and participant_role='member'
  for update;
  if not found then raise exception 'OFFICE_OWNER_TRANSFER_TARGET_MEMBER_REQUIRED'; end if;
  if not public.can_read_office_thread_v1(p_instance_id,p_thread_id,p_target_user_id) then
    raise exception 'OFFICE_OWNER_TRANSFER_TARGET_ACCESS_REQUIRED';
  end if;

  -- Demote first, then promote. Both statements are in this transaction, so any failure restores the old owner.
  update public.office_thread_participants
  set participant_role='member',updated_at=now()
  where instance_id=p_instance_id
    and thread_id=p_thread_id
    and user_id=p_actor
    and left_at is null
    and participant_role='owner';
  get diagnostics v_actor_updated=row_count;
  if v_actor_updated<>1 then raise exception 'OFFICE_OWNER_TRANSFER_SOURCE_EVIDENCE_MISSING'; end if;

  update public.office_thread_participants
  set participant_role='owner',updated_at=now()
  where instance_id=p_instance_id
    and thread_id=p_thread_id
    and user_id=p_target_user_id
    and left_at is null
    and participant_role='member';
  get diagnostics v_target_updated=row_count;
  if v_target_updated<>1 then raise exception 'OFFICE_OWNER_TRANSFER_TARGET_EVIDENCE_MISSING'; end if;

  if not private.office_active_thread_owner_v1(p_instance_id,p_thread_id,p_target_user_id) then
    raise exception 'OFFICE_OWNER_TRANSFER_FINAL_EVIDENCE_MISSING';
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor,'office.private_owner_transferred','office_thread',p_thread_id::text,v_org,p_instance_id,
    'Privát irodai beszélgetés tulajdonjoga átadva',
    jsonb_build_object('ownerUserId',p_actor),
    jsonb_build_object('ownerUserId',p_target_user_id),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_transfer_office_thread_owner_v1')
  );

  return jsonb_build_object(
    'id',p_thread_id,
    'threadId',p_thread_id,
    'previousOwnerUserId',p_actor,
    'ownerUserId',p_target_user_id,
    'transferred',true
  );
end;
$$;

revoke all on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid) to service_role;

comment on function public.admin_transfer_office_thread_owner_v1(uuid,uuid,uuid,uuid)
is 'Explicitly transfers one private Team Chat thread from its current active owner with current chat access to an active member. Elevated roles cannot seize ownership.';
