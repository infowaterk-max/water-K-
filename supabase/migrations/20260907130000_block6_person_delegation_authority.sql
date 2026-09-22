-- Roadmap Block 6: person-based delegation authority.
-- Extends the existing role_bindings model; no parallel RBAC model is introduced.
-- The active role binding time window is authoritative for application and RLS access.

create or replace function public.merchant_set_store_role_v2(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role_code text,
  p_valid_until timestamptz
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_actor_role text;
  v_actor_is_platform boolean:=false;
  v_current_role text;
  v_current_valid_until timestamptz;
  v_legacy_role text;
  v_org_role text;
  v_other_owners int;
begin
  if p_instance_id is null or p_actor_user_id is null or p_target_user_id is null then
    raise exception 'STORE_ROLE_IDENTITY_REQUIRED';
  end if;
  if p_role_code not in ('owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer') then
    raise exception 'STORE_ROLE_INVALID';
  end if;
  if p_valid_until is not null and p_valid_until<=now() then
    raise exception 'STORE_ROLE_EXPIRY_REQUIRED_FUTURE';
  end if;
  if p_role_code='owner' and p_valid_until is not null then
    raise exception 'OWNER_ROLE_CANNOT_EXPIRE';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select exists(
    select 1 from public.platform_operators po
    where po.user_id=p_actor_user_id and po.role in ('owner','admin','operator')
  ) into v_actor_is_platform;

  select rb.role_code into v_actor_role
  from public.role_bindings rb
  where rb.organization_id=v_org
    and (rb.instance_id=p_instance_id or rb.instance_id is null)
    and rb.user_id=p_actor_user_id
    and rb.revoked_at is null
    and rb.valid_from<=now()
    and (rb.valid_until is null or rb.valid_until>now())
    and rb.role_code in ('owner','admin')
  order by case rb.role_code when 'owner' then 0 else 1 end
  limit 1;

  if v_actor_role is null and not v_actor_is_platform then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_actor_user_id=p_target_user_id then
    raise exception 'SELF_ROLE_MUTATION_FORBIDDEN';
  end if;
  if not exists(select 1 from auth.users where id=p_target_user_id)
     or not exists(select 1 from public.profiles where id=p_target_user_id) then
    raise exception 'STORE_ROLE_PROFILE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('merchant-store-role:'||p_instance_id::text||':'||p_target_user_id::text,0));

  if exists(
    select 1 from public.role_bindings rb
    where rb.organization_id=v_org and rb.instance_id is null and rb.user_id=p_target_user_id
      and rb.revoked_at is null and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
  ) then raise exception 'ORGANIZATION_ROLE_BINDING_READ_ONLY'; end if;

  select rb.role_code,rb.valid_until into v_current_role,v_current_valid_until
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_target_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by case rb.role_code when 'owner' then 0 when 'admin' then 1 else 2 end
  limit 1;

  if v_current_role='owner' and coalesce(v_actor_role,'')<>'owner' and not v_actor_is_platform then
    raise exception 'OWNER_ROLE_MUTATION_REQUIRES_OWNER';
  end if;
  if p_role_code='owner' and coalesce(v_actor_role,'')<>'owner' and not v_actor_is_platform then
    raise exception 'OWNER_ROLE_ASSIGNMENT_REQUIRES_OWNER';
  end if;

  if v_current_role='owner' and p_role_code<>'owner' then
    select count(*) into v_other_owners
    from public.role_bindings rb
    where rb.organization_id=v_org
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.role_code='owner'
      and rb.revoked_at is null and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
      and (rb.user_id<>p_target_user_id or rb.instance_id is distinct from p_instance_id);
    if v_other_owners=0 then raise exception 'LAST_WEBSHOP_OWNER'; end if;
  end if;

  update public.role_bindings set revoked_at=now()
  where organization_id=v_org and instance_id=p_instance_id and user_id=p_target_user_id and revoked_at is null;

  insert into public.role_bindings(
    organization_id,instance_id,user_id,role_code,delegated_by,valid_from,valid_until
  ) values(
    v_org,p_instance_id,p_target_user_id,p_role_code,p_actor_user_id,now(),p_valid_until
  );

  -- Compatibility rows are synchronized for legacy read models only. They are no longer
  -- authoritative for access once role_bindings history exists for the user/store.
  v_legacy_role:=case when p_role_code='owner' then 'owner' when p_role_code='admin' then 'admin' else 'staff' end;
  insert into public.webshop_instance_members(instance_id,user_id,role)
  values(p_instance_id,p_target_user_id,v_legacy_role)
  on conflict(instance_id,user_id) do update set role=excluded.role;

  select case
    when exists(select 1 from public.role_bindings rb where rb.organization_id=v_org and rb.user_id=p_target_user_id and rb.role_code='owner' and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())) then 'owner'
    when exists(select 1 from public.role_bindings rb where rb.organization_id=v_org and rb.user_id=p_target_user_id and rb.role_code='admin' and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())) then 'admin'
    else 'member'
  end into v_org_role;

  insert into public.organization_members(organization_id,user_id,role)
  values(v_org,p_target_user_id,v_org_role)
  on conflict(organization_id,user_id) do update set role=excluded.role;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.role_binding_updated','role_binding',p_target_user_id::text,v_org,p_instance_id,
    'Személyhez kötött webshop-delegáció módosítva',
    jsonb_build_object('roleCode',v_current_role,'validUntil',v_current_valid_until),
    jsonb_build_object('roleCode',p_role_code,'validUntil',p_valid_until,'legacyRole',v_legacy_role,'delegatedBy',p_actor_user_id),
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_set_store_role_v2','delegationModel','role_bindings')
  );

  return jsonb_build_object(
    'instanceId',p_instance_id,
    'userId',p_target_user_id,
    'roleCode',p_role_code,
    'validUntil',p_valid_until,
    'legacyRole',v_legacy_role
  );
end;
$$;

create or replace function public.merchant_remove_store_role_v2(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_actor_role text;
  v_actor_is_platform boolean:=false;
  v_current_role text;
  v_current_valid_until timestamptz;
  v_other_owners int;
  v_remaining int;
  v_org_role text;
begin
  if p_instance_id is null or p_actor_user_id is null or p_target_user_id is null then
    raise exception 'STORE_ROLE_IDENTITY_REQUIRED';
  end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select exists(
    select 1 from public.platform_operators po
    where po.user_id=p_actor_user_id and po.role in ('owner','admin','operator')
  ) into v_actor_is_platform;

  select rb.role_code into v_actor_role
  from public.role_bindings rb
  where rb.organization_id=v_org
    and (rb.instance_id=p_instance_id or rb.instance_id is null)
    and rb.user_id=p_actor_user_id
    and rb.revoked_at is null and rb.valid_from<=now()
    and (rb.valid_until is null or rb.valid_until>now())
    and rb.role_code in ('owner','admin')
  order by case rb.role_code when 'owner' then 0 else 1 end limit 1;

  if v_actor_role is null and not v_actor_is_platform then
    raise exception 'STORE_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_actor_user_id=p_target_user_id then
    raise exception 'SELF_ROLE_MUTATION_FORBIDDEN';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('merchant-store-role:'||p_instance_id::text||':'||p_target_user_id::text,0));

  select rb.role_code,rb.valid_until into v_current_role,v_current_valid_until
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_target_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by case rb.role_code when 'owner' then 0 when 'admin' then 1 else 2 end limit 1;
  if v_current_role is null then raise exception 'STORE_ROLE_NOT_FOUND'; end if;

  if v_current_role='owner' and coalesce(v_actor_role,'')<>'owner' and not v_actor_is_platform then
    raise exception 'OWNER_ROLE_MUTATION_REQUIRES_OWNER';
  end if;
  if v_current_role='owner' then
    select count(*) into v_other_owners
    from public.role_bindings rb
    where rb.organization_id=v_org
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.role_code='owner'
      and rb.revoked_at is null and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
      and (rb.user_id<>p_target_user_id or rb.instance_id is distinct from p_instance_id);
    if v_other_owners=0 then raise exception 'LAST_WEBSHOP_OWNER'; end if;
  end if;

  update public.role_bindings set revoked_at=now()
  where organization_id=v_org and instance_id=p_instance_id and user_id=p_target_user_id and revoked_at is null;
  delete from public.webshop_instance_members where instance_id=p_instance_id and user_id=p_target_user_id;

  select count(*) into v_remaining from public.role_bindings rb
  where rb.organization_id=v_org and rb.user_id=p_target_user_id and rb.revoked_at is null
    and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now());

  if v_remaining=0 then
    delete from public.organization_members where organization_id=v_org and user_id=p_target_user_id;
  else
    select case
      when exists(select 1 from public.role_bindings rb where rb.organization_id=v_org and rb.user_id=p_target_user_id and rb.role_code='owner' and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())) then 'owner'
      when exists(select 1 from public.role_bindings rb where rb.organization_id=v_org and rb.user_id=p_target_user_id and rb.role_code='admin' and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())) then 'admin'
      else 'member'
    end into v_org_role;
    update public.organization_members set role=v_org_role where organization_id=v_org and user_id=p_target_user_id;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.role_binding_removed','role_binding',p_target_user_id::text,v_org,p_instance_id,
    'Személyhez kötött webshop-delegáció visszavonva',
    jsonb_build_object('roleCode',v_current_role,'validUntil',v_current_valid_until),null,
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_remove_store_role_v2','delegationModel','role_bindings')
  );

  return jsonb_build_object('instanceId',p_instance_id,'userId',p_target_user_id,'removed',true);
end;
$$;

-- Existing callers inherit the stricter Block 6 rules. V1 remains as a compatibility facade.
create or replace function public.merchant_set_store_role_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role_code text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  return public.merchant_set_store_role_v2(p_instance_id,p_actor_user_id,p_target_user_id,p_role_code,null);
end;
$$;

create or replace function public.merchant_remove_store_role_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  return public.merchant_remove_store_role_v2(p_instance_id,p_actor_user_id,p_target_user_id);
end;
$$;

revoke all on function public.merchant_set_store_role_v2(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
revoke all on function public.merchant_remove_store_role_v2(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.merchant_set_store_role_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.merchant_remove_store_role_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.merchant_set_store_role_v2(uuid,uuid,uuid,text,timestamptz) to service_role;
grant execute on function public.merchant_remove_store_role_v2(uuid,uuid,uuid) to service_role;
grant execute on function public.merchant_set_store_role_v1(uuid,uuid,uuid,text) to service_role;
grant execute on function public.merchant_remove_store_role_v1(uuid,uuid,uuid) to service_role;

-- Middleware must not resurrect a revoked/expired person through legacy membership.
create or replace function private.can_access_admin_context_current(
  p_instance_slug text default null,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
with actor as (
  select p_user_id as user_id
  where p_user_id is not null
    and auth.uid() is not null
    and p_user_id is not distinct from auth.uid()
),
active_bindings as (
  select r.organization_id,r.instance_id,r.role_code
  from public.role_bindings r
  join actor a on a.user_id=r.user_id
  where r.revoked_at is null
    and r.valid_from<=now()
    and (r.valid_until is null or r.valid_until>now())
),
rbac_candidates as (
  select distinct w.id,w.organization_id
  from public.webshop_instances w
  join active_bindings r
    on r.instance_id=w.id
    or (r.instance_id is null and r.organization_id=w.organization_id)
  where w.status in ('pilot','active')
),
resolved as (
  select w.id,w.organization_id
  from public.webshop_instances w
  where w.status in ('pilot','active')
    and exists(select 1 from actor)
    and (
      (
        nullif(trim(coalesce(p_instance_slug,'')),'') is not null
        and lower(w.slug)=lower(trim(p_instance_slug))
      )
      or (
        nullif(trim(coalesce(p_instance_slug,'')),'') is null
        and exists(select 1 from rbac_candidates c where c.id=w.id)
      )
    )
),
resolved_one as (
  select r.id,r.organization_id
  from resolved r
  where (select count(*) from resolved)=1
)
select case
  when not exists(select 1 from actor) then false
  when private.is_platform_operator_current(p_user_id) then true
  when not exists(select 1 from resolved_one) then false
  else exists(
    select 1
    from resolved_one x
    join active_bindings r
      on r.instance_id=x.id
      or (r.instance_id is null and r.organization_id=x.organization_id)
    where r.role_code=any(array[
      'owner','admin','catalog_manager','order_manager',
      'marketing_manager','support','analyst','viewer'
    ]::text[])
  )
end;
$function$;

revoke all on function private.can_access_admin_context_current(text,uuid) from public,anon,service_role;
grant execute on function private.can_access_admin_context_current(text,uuid) to authenticated;

-- Organization-level reads use active role_bindings, not the compatibility summary table.
create or replace function private.has_organization_role_current(
  p_organization_id uuid,
  p_roles text[],
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select case
    when p_organization_id is null or p_user_id is null then false
    when coalesce(auth.jwt()->>'role','')<>'service_role'
      and (auth.uid() is null or p_user_id is distinct from auth.uid()) then false
    else private.is_platform_operator_current(p_user_id) or exists(
      select 1 from public.role_bindings r
      where r.organization_id=p_organization_id
        and r.user_id=p_user_id
        and r.role_code=any(p_roles)
        and r.revoked_at is null
        and r.valid_from<=now()
        and (r.valid_until is null or r.valid_until>now())
    )
  end;
$function$;

create or replace function public.has_organization_role(
  p_organization_id uuid,
  p_roles text[],
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
set search_path=''
as $function$
  select private.has_organization_role_current(p_organization_id,p_roles,p_user_id);
$function$;

revoke all on function private.has_organization_role_current(uuid,text[],uuid) from public,anon;
revoke all on function public.has_organization_role(uuid,text[],uuid) from public,anon;
grant execute on function private.has_organization_role_current(uuid,text[],uuid) to authenticated,service_role;
grant execute on function public.has_organization_role(uuid,text[],uuid) to authenticated,service_role;

-- Revocation and expiry become immediate for organization-scoped browser reads as well.
drop policy if exists organizations_member_read on public.organizations;
create policy organizations_member_read on public.organizations
for select to authenticated
using(
  public.is_platform_operator((select auth.uid()))
  or public.has_organization_role(id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']::text[],(select auth.uid()))
);

drop policy if exists feature_entitlements_scope_read on public.feature_entitlements;
create policy feature_entitlements_scope_read on public.feature_entitlements
for select to authenticated
using(
  public.is_platform_operator((select auth.uid()))
  or public.has_organization_role(organization_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']::text[],(select auth.uid()))
);

drop policy if exists organization_members_self_read on public.organization_members;
create policy organization_members_self_read on public.organization_members
for select to authenticated
using(
  public.is_platform_operator((select auth.uid()))
  or (
    user_id=(select auth.uid())
    and public.has_organization_role(organization_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']::text[],(select auth.uid()))
  )
  or public.has_organization_role(organization_id,array['owner','admin']::text[],(select auth.uid()))
);

drop policy if exists role_bindings_scope_read on public.role_bindings;
create policy role_bindings_scope_read on public.role_bindings
for select to authenticated
using(
  public.is_platform_operator((select auth.uid()))
  or (
    user_id=(select auth.uid())
    and revoked_at is null
    and valid_from<=now()
    and (valid_until is null or valid_until>now())
  )
  or public.has_organization_role(organization_id,array['owner','admin']::text[],(select auth.uid()))
);

drop policy if exists admin_audit_tenant_read on public.admin_audit_log;
create policy admin_audit_tenant_read on public.admin_audit_log
for select to authenticated
using(
  public.is_platform_operator((select auth.uid()))
  or (instance_id is not null and public.can_read_store(instance_id,(select auth.uid())))
  or (
    instance_id is null and organization_id is not null
    and public.has_organization_role(organization_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']::text[],(select auth.uid()))
  )
);
