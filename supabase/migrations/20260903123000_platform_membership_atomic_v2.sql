-- Keep the legacy instance-membership compatibility table, organization membership
-- and the active fine-grained role binding in one transaction.

create or replace function public.platform_set_webshop_member_v2(
  p_instance_id uuid,
  p_user_id uuid,
  p_role text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_current_role text;
  v_role_code text;
  v_org_role text;
  v_other_owners integer;
begin
  if not exists(
    select 1 from public.platform_operators
    where user_id=p_actor_id and role in ('owner','admin','operator')
  ) then raise exception 'PLATFORM_OPERATOR_REQUIRED'; end if;
  if p_role not in ('owner','admin','staff') then raise exception 'INVALID_MEMBER_ROLE'; end if;
  if not exists(select 1 from auth.users where id=p_user_id)
     or not exists(select 1 from public.profiles where id=p_user_id) then
    raise exception 'MEMBER_PROFILE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('platform-member:'||p_instance_id::text,0));

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id
  for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select role into v_current_role
  from public.webshop_instance_members
  where instance_id=p_instance_id and user_id=p_user_id;

  if v_current_role='owner' and p_role<>'owner' then
    select count(*) into v_other_owners
    from public.webshop_instance_members
    where instance_id=p_instance_id and user_id<>p_user_id and role='owner';
    if v_other_owners=0 then raise exception 'LAST_WEBSHOP_OWNER'; end if;
  end if;

  insert into public.webshop_instance_members(instance_id,user_id,role)
  values(p_instance_id,p_user_id,p_role)
  on conflict(instance_id,user_id) do update set role=excluded.role;

  select case
    when bool_or(m.role='owner') then 'owner'
    when bool_or(m.role='admin') then 'admin'
    else 'member'
  end into v_org_role
  from public.webshop_instance_members m
  join public.webshop_instances w on w.id=m.instance_id
  where w.organization_id=v_org and m.user_id=p_user_id;

  insert into public.organization_members(organization_id,user_id,role)
  values(v_org,p_user_id,coalesce(v_org_role,'member'))
  on conflict(organization_id,user_id) do update set role=excluded.role;

  update public.role_bindings
  set revoked_at=now()
  where organization_id=v_org
    and instance_id=p_instance_id
    and user_id=p_user_id
    and revoked_at is null;

  v_role_code:=case p_role when 'owner' then 'owner' when 'admin' then 'admin' else 'viewer' end;
  insert into public.role_bindings(
    organization_id,instance_id,user_id,role_code,delegated_by
  )
  values(v_org,p_instance_id,p_user_id,v_role_code,p_actor_id);

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  )
  values(
    p_actor_id,'platform.member_set','webshop_instance_member',p_user_id::text,
    v_org,p_instance_id,
    'Webshop membership synchronized',
    jsonb_build_object('userId',p_user_id,'legacyRole',p_role,'roleCode',v_role_code),
    jsonb_build_object('source','platform_membership_v2')
  );

  return jsonb_build_object(
    'instanceId',p_instance_id,'userId',p_user_id,'role',p_role,'roleCode',v_role_code
  );
end;
$$;

revoke all on function public.platform_set_webshop_member_v2(uuid,uuid,text,uuid)
from public,anon,authenticated;
grant execute on function public.platform_set_webshop_member_v2(uuid,uuid,text,uuid) to service_role;

create or replace function public.platform_remove_webshop_member_v2(
  p_instance_id uuid,
  p_user_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_current_role text;
  v_other_owners integer;
  v_remaining integer;
  v_org_role text;
begin
  if not exists(
    select 1 from public.platform_operators
    where user_id=p_actor_id and role in ('owner','admin','operator')
  ) then raise exception 'PLATFORM_OPERATOR_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('platform-member:'||p_instance_id::text,0));

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id
  for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select role into v_current_role
  from public.webshop_instance_members
  where instance_id=p_instance_id and user_id=p_user_id
  for update;
  if v_current_role is null then raise exception 'WEBSHOP_MEMBER_NOT_FOUND'; end if;

  if v_current_role='owner' then
    select count(*) into v_other_owners
    from public.webshop_instance_members
    where instance_id=p_instance_id and user_id<>p_user_id and role='owner';
    if v_other_owners=0 then raise exception 'LAST_WEBSHOP_OWNER'; end if;
  end if;

  delete from public.webshop_instance_members
  where instance_id=p_instance_id and user_id=p_user_id;

  update public.role_bindings
  set revoked_at=now()
  where organization_id=v_org
    and instance_id=p_instance_id
    and user_id=p_user_id
    and revoked_at is null;

  select count(*) into v_remaining
  from public.webshop_instance_members m
  join public.webshop_instances w on w.id=m.instance_id
  where w.organization_id=v_org and m.user_id=p_user_id;

  if v_remaining=0 then
    if not exists(
      select 1 from public.role_bindings
      where organization_id=v_org and instance_id is null
        and user_id=p_user_id and revoked_at is null
        and valid_from<=now() and (valid_until is null or valid_until>now())
    ) then
      delete from public.organization_members
      where organization_id=v_org and user_id=p_user_id;
    end if;
  else
    select case
      when bool_or(m.role='owner') then 'owner'
      when bool_or(m.role='admin') then 'admin'
      else 'member'
    end into v_org_role
    from public.webshop_instance_members m
    join public.webshop_instances w on w.id=m.instance_id
    where w.organization_id=v_org and m.user_id=p_user_id;

    update public.organization_members
    set role=coalesce(v_org_role,'member')
    where organization_id=v_org and user_id=p_user_id;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,metadata
  )
  values(
    p_actor_id,'platform.member_removed','webshop_instance_member',p_user_id::text,
    v_org,p_instance_id,
    'Webshop membership removed',
    jsonb_build_object('userId',p_user_id,'legacyRole',v_current_role),
    jsonb_build_object('source','platform_membership_v2')
  );

  return jsonb_build_object('instanceId',p_instance_id,'userId',p_user_id,'removed',true);
end;
$$;

revoke all on function public.platform_remove_webshop_member_v2(uuid,uuid,uuid)
from public,anon,authenticated;
grant execute on function public.platform_remove_webshop_member_v2(uuid,uuid,uuid) to service_role;

comment on function public.platform_set_webshop_member_v2(uuid,uuid,text,uuid)
is 'Atomically synchronizes instance membership, organization membership and direct store RBAC.';
comment on function public.platform_remove_webshop_member_v2(uuid,uuid,uuid)
is 'Atomically removes direct store access while protecting the last webshop owner.';
