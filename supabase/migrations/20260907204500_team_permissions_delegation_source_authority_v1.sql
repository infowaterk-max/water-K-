-- Team + Permissions 2.0 delegation hardening.
-- A delegation may only transfer a capability that the source person already holds directly
-- from the active role preset or a personal allow override. Delegated authority cannot be re-delegated.

create or replace function private.store_source_can_delegate_capability_v1(
  p_instance_id uuid,
  p_binding_id uuid,
  p_user_id uuid,
  p_permission_code text
) returns boolean
language sql
stable
set search_path=''
as $$
  with active_binding as (
    select rb.id,rb.role_code
    from public.role_bindings rb
    where rb.id=p_binding_id
      and rb.instance_id=p_instance_id
      and rb.user_id=p_user_id
      and rb.revoked_at is null
      and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now())
  ),
  matching_deny as (
    select 1
    from public.store_permission_overrides o
    join active_binding b on b.id=o.role_binding_id
    where o.instance_id=p_instance_id
      and o.user_id=p_user_id
      and o.permission_code=p_permission_code
      and o.effect='deny'
      and o.revoked_at is null
      and o.valid_from<=now()
      and (o.valid_until is null or o.valid_until>now())
      and private.store_scope_matches_v1(
        o.scope_type,o.scope_value,p_user_id,p_user_id,p_user_id,null,null
      )
    limit 1
  ),
  matching_allow as (
    select 1
    from public.store_permission_overrides o
    join active_binding b on b.id=o.role_binding_id
    where o.instance_id=p_instance_id
      and o.user_id=p_user_id
      and o.permission_code=p_permission_code
      and o.effect='allow'
      and o.revoked_at is null
      and o.valid_from<=now()
      and (o.valid_until is null or o.valid_until>now())
      and private.store_scope_matches_v1(
        o.scope_type,o.scope_value,p_user_id,p_user_id,p_user_id,null,null
      )
    limit 1
  ),
  matching_role as (
    select 1
    from active_binding b
    join public.store_role_permission_presets rp
      on rp.role_code=b.role_code and rp.permission_code=p_permission_code
    where private.store_scope_matches_v1(
      rp.default_scope,null,p_user_id,p_user_id,p_user_id,null,null
    )
    limit 1
  )
  select
    exists(select 1 from active_binding)
    and not exists(select 1 from matching_deny)
    and (exists(select 1 from matching_allow) or exists(select 1 from matching_role));
$$;

create or replace function public.merchant_create_store_delegation_v1(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_source_user_id uuid,
  p_delegate_user_id uuid,
  p_permission_codes text[],
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_source_binding public.role_bindings%rowtype;
  v_delegate_binding public.role_bindings%rowtype;
  v_delegation_id uuid;
  v_permissions text[];
  v_valid_from timestamptz:=coalesce(p_valid_from,now());
begin
  if p_instance_id is null or p_actor_user_id is null or p_source_user_id is null or p_delegate_user_id is null then
    raise exception 'STORE_DELEGATION_IDENTITY_REQUIRED';
  end if;
  if p_source_user_id=p_delegate_user_id then raise exception 'STORE_DELEGATION_SELF_FORBIDDEN'; end if;
  if not private.store_permission_admin_v1(p_instance_id,p_actor_user_id) then raise exception 'STORE_PERMISSION_OWNER_REQUIRED'; end if;
  if p_valid_until is null or p_valid_until<=v_valid_from then raise exception 'STORE_DELEGATION_EXPIRY_REQUIRED'; end if;
  if p_reason is not null and char_length(p_reason)>500 then raise exception 'STORE_DELEGATION_REASON_TOO_LONG'; end if;

  select array_agg(distinct x order by x) into v_permissions
  from unnest(coalesce(p_permission_codes,array[]::text[])) x;
  if coalesce(array_length(v_permissions,1),0)=0 or array_length(v_permissions,1)>50 then raise exception 'STORE_DELEGATION_PERMISSIONS_REQUIRED'; end if;
  if exists(
    select 1 from unnest(v_permissions) p
    left join public.store_permission_catalog c on c.permission_code=p
    where c.permission_code is null or not c.delegable
  ) then raise exception 'STORE_DELEGATION_PERMISSION_NOT_DELEGABLE'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select rb.* into v_source_binding from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_source_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by rb.created_at desc limit 1;
  select rb.* into v_delegate_binding from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_delegate_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by rb.created_at desc limit 1;
  if v_source_binding.id is null or v_delegate_binding.id is null then raise exception 'STORE_DELEGATION_ACTIVE_BINDINGS_REQUIRED'; end if;

  if exists(
    select 1
    from unnest(v_permissions) p
    where not private.store_source_can_delegate_capability_v1(
      p_instance_id,v_source_binding.id,p_source_user_id,p
    )
  ) then
    raise exception 'STORE_DELEGATION_SOURCE_PERMISSION_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('store-delegation:'||p_instance_id::text||':'||p_source_user_id::text||':'||p_delegate_user_id::text,0));
  if exists(
    select 1 from public.store_delegations d
    where d.instance_id=p_instance_id and d.source_user_id=p_source_user_id and d.delegate_user_id=p_delegate_user_id
      and d.revoked_at is null and tstzrange(d.valid_from,d.valid_until,'[)') && tstzrange(v_valid_from,p_valid_until,'[)')
  ) then raise exception 'STORE_DELEGATION_OVERLAP'; end if;

  insert into public.store_delegations(
    organization_id,instance_id,source_user_id,delegate_user_id,source_role_binding_id,delegate_role_binding_id,
    valid_from,valid_until,reason,delegated_by
  ) values(
    v_org,p_instance_id,p_source_user_id,p_delegate_user_id,v_source_binding.id,v_delegate_binding.id,
    v_valid_from,p_valid_until,nullif(trim(coalesce(p_reason,'')),''),p_actor_user_id
  ) returning id into v_delegation_id;

  insert into public.store_delegation_permissions(delegation_id,permission_code)
  select v_delegation_id,x from unnest(v_permissions) x;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.delegation_created','store_delegation',v_delegation_id::text,v_org,p_instance_id,
    'Időszakos személyes helyettesítés létrehozva',null,
    jsonb_build_object('sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,'validFrom',v_valid_from,'validUntil',p_valid_until,'permissions',to_jsonb(v_permissions),'reason',nullif(trim(coalesce(p_reason,'')),'')),
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_create_store_delegation_v1','sourceAuthorityVerified',true)
  );

  return jsonb_build_object(
    'delegationId',v_delegation_id,'instanceId',p_instance_id,'sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,
    'validFrom',v_valid_from,'validUntil',p_valid_until,'permissionCount',array_length(v_permissions,1)
  );
end;
$$;

revoke all on function private.store_source_can_delegate_capability_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.merchant_create_store_delegation_v1(uuid,uuid,uuid,uuid,text[],timestamptz,timestamptz,text) to service_role;
