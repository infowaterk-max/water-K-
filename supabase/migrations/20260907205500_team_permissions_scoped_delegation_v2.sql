-- Team + Permissions 2.0 scoped delegation.
-- Temporary substitution can be constrained to a topic or mailbox in addition to the source person's resources.

alter table public.store_delegations
  add column if not exists scope_type text not null default 'all',
  add column if not exists scope_value text;

alter table public.store_delegations
  drop constraint if exists store_delegations_scope_type_check;
alter table public.store_delegations
  add constraint store_delegations_scope_type_check
  check (scope_type in ('all','topic','mailbox'));

alter table public.store_delegations
  drop constraint if exists store_delegations_scope_value_check;
alter table public.store_delegations
  add constraint store_delegations_scope_value_check
  check (
    (scope_type in ('topic','mailbox') and nullif(trim(coalesce(scope_value,'')),'') is not null)
    or (scope_type='all' and scope_value is null)
  );

create index if not exists store_delegations_scoped_lookup_idx
  on public.store_delegations(instance_id,delegate_user_id,scope_type,scope_value,valid_from,valid_until)
  where revoked_at is null;

create or replace function private.store_source_can_delegate_capability_v2(
  p_instance_id uuid,
  p_binding_id uuid,
  p_user_id uuid,
  p_permission_code text,
  p_scope_type text,
  p_scope_value text
) returns boolean
language plpgsql
stable
set search_path=''
as $$
declare
  v_topic text:=case when p_scope_type='topic' then p_scope_value else null end;
  v_mailbox text:=case when p_scope_type='mailbox' then p_scope_value else null end;
  v_binding_role text;
  v_has_deny boolean:=false;
  v_has_allow boolean:=false;
  v_has_role boolean:=false;
begin
  if p_scope_type not in ('all','topic','mailbox') then return false; end if;
  if p_scope_type in ('topic','mailbox') and nullif(trim(coalesce(p_scope_value,'')),'') is null then return false; end if;
  if p_scope_type='all' and p_scope_value is not null then return false; end if;

  select rb.role_code into v_binding_role
  from public.role_bindings rb
  where rb.id=p_binding_id
    and rb.instance_id=p_instance_id
    and rb.user_id=p_user_id
    and rb.revoked_at is null
    and rb.valid_from<=now()
    and (rb.valid_until is null or rb.valid_until>now());
  if v_binding_role is null then return false; end if;

  -- A broad delegation must never widen around any active personal deny for the capability.
  -- Scoped delegation only needs to respect denies that match the requested topic/mailbox context.
  select exists(
    select 1
    from public.store_permission_overrides o
    where o.role_binding_id=p_binding_id
      and o.instance_id=p_instance_id
      and o.user_id=p_user_id
      and o.permission_code=p_permission_code
      and o.effect='deny'
      and o.revoked_at is null
      and o.valid_from<=now()
      and (o.valid_until is null or o.valid_until>now())
      and (
        p_scope_type='all'
        or private.store_scope_matches_v1(
          o.scope_type,o.scope_value,p_user_id,p_user_id,p_user_id,v_topic,v_mailbox
        )
      )
  ) into v_has_deny;
  if v_has_deny then return false; end if;

  select exists(
    select 1
    from public.store_permission_overrides o
    where o.role_binding_id=p_binding_id
      and o.instance_id=p_instance_id
      and o.user_id=p_user_id
      and o.permission_code=p_permission_code
      and o.effect='allow'
      and o.revoked_at is null
      and o.valid_from<=now()
      and (o.valid_until is null or o.valid_until>now())
      and private.store_scope_matches_v1(
        o.scope_type,o.scope_value,p_user_id,p_user_id,p_user_id,v_topic,v_mailbox
      )
  ) into v_has_allow;

  select exists(
    select 1
    from public.store_role_permission_presets rp
    where rp.role_code=v_binding_role
      and rp.permission_code=p_permission_code
      and private.store_scope_matches_v1(
        rp.default_scope,null,p_user_id,p_user_id,p_user_id,v_topic,v_mailbox
      )
  ) into v_has_role;

  return v_has_allow or v_has_role;
end;
$$;

create or replace function public.evaluate_store_capability_v1(
  p_instance_id uuid,
  p_user_id uuid,
  p_permission_code text,
  p_resource_owner_user_id uuid default null,
  p_resource_assigned_user_id uuid default null,
  p_topic_code text default null,
  p_mailbox_key text default null
) returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_roles text[]:=array[]::text[];
  v_has_membership boolean:=false;
  v_denied boolean:=false;
  v_override_allowed boolean:=false;
  v_delegated boolean:=false;
  v_role_allowed boolean:=false;
begin
  if p_instance_id is null or p_user_id is null or nullif(trim(coalesce(p_permission_code,'')),'') is null then
    return jsonb_build_object('allowed',false,'source','invalid_request');
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if v_org is null then return jsonb_build_object('allowed',false,'source','instance_not_found'); end if;

  if exists(select 1 from public.platform_operators po where po.user_id=p_user_id) then
    return jsonb_build_object('allowed',true,'source','platform','roleCodes',jsonb_build_array('platform'));
  end if;

  select coalesce(array_agg(distinct rb.role_code),array[]::text[]),count(*)>0
  into v_roles,v_has_membership
  from public.role_bindings rb
  where rb.organization_id=v_org
    and rb.user_id=p_user_id
    and (rb.instance_id=p_instance_id or rb.instance_id is null)
    and rb.revoked_at is null
    and rb.valid_from<=now()
    and (rb.valid_until is null or rb.valid_until>now());

  if not v_has_membership then
    return jsonb_build_object('allowed',false,'source','no_active_role','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_permission_overrides o
    join public.role_bindings rb on rb.id=o.role_binding_id
    where o.instance_id=p_instance_id and o.user_id=p_user_id and o.permission_code=p_permission_code
      and o.effect='deny' and o.revoked_at is null and o.valid_from<=now() and (o.valid_until is null or o.valid_until>now())
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(o.scope_type,o.scope_value,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_denied;
  if v_denied then
    return jsonb_build_object('allowed',false,'source','explicit_deny','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_permission_overrides o
    join public.role_bindings rb on rb.id=o.role_binding_id
    where o.instance_id=p_instance_id and o.user_id=p_user_id and o.permission_code=p_permission_code
      and o.effect='allow' and o.revoked_at is null and o.valid_from<=now() and (o.valid_until is null or o.valid_until>now())
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(o.scope_type,o.scope_value,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_override_allowed;
  if v_override_allowed then
    return jsonb_build_object('allowed',true,'source','override','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.store_delegations d
    join public.store_delegation_permissions dp on dp.delegation_id=d.id and dp.permission_code=p_permission_code
    join public.role_bindings source_rb on source_rb.id=d.source_role_binding_id
    join public.role_bindings delegate_rb on delegate_rb.id=d.delegate_role_binding_id
    where d.instance_id=p_instance_id and d.delegate_user_id=p_user_id
      and d.revoked_at is null and d.valid_from<=now() and d.valid_until>now()
      and source_rb.revoked_at is null and source_rb.valid_from<=now() and (source_rb.valid_until is null or source_rb.valid_until>now())
      and delegate_rb.revoked_at is null and delegate_rb.valid_from<=now() and (delegate_rb.valid_until is null or delegate_rb.valid_until>now())
      and (
        (p_resource_owner_user_id is not null and p_resource_owner_user_id=d.source_user_id)
        or (p_resource_assigned_user_id is not null and p_resource_assigned_user_id=d.source_user_id)
      )
      and (
        d.scope_type='all'
        or (d.scope_type='topic' and p_topic_code is not null and p_topic_code=d.scope_value)
        or (d.scope_type='mailbox' and p_mailbox_key is not null and p_mailbox_key=d.scope_value)
      )
  ) into v_delegated;
  if v_delegated then
    return jsonb_build_object('allowed',true,'source','delegation','roleCodes',to_jsonb(v_roles));
  end if;

  select exists(
    select 1
    from public.role_bindings rb
    join public.store_role_permission_presets rp on rp.role_code=rb.role_code and rp.permission_code=p_permission_code
    where rb.organization_id=v_org and rb.user_id=p_user_id
      and (rb.instance_id=p_instance_id or rb.instance_id is null)
      and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
      and private.store_scope_matches_v1(rp.default_scope,null,p_user_id,p_resource_owner_user_id,p_resource_assigned_user_id,p_topic_code,p_mailbox_key)
  ) into v_role_allowed;

  return jsonb_build_object(
    'allowed',v_role_allowed,
    'source',case when v_role_allowed then 'role' else 'none' end,
    'roleCodes',to_jsonb(v_roles)
  );
end;
$$;

create or replace function public.merchant_create_store_delegation_v2(
  p_instance_id uuid,
  p_actor_user_id uuid,
  p_source_user_id uuid,
  p_delegate_user_id uuid,
  p_permission_codes text[],
  p_scope_type text,
  p_scope_value text,
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
  v_scope_type text:=coalesce(nullif(trim(coalesce(p_scope_type,'')),''),'all');
  v_scope_value text:=nullif(trim(coalesce(p_scope_value,'')),'');
  v_valid_from timestamptz:=coalesce(p_valid_from,now());
begin
  if p_instance_id is null or p_actor_user_id is null or p_source_user_id is null or p_delegate_user_id is null then
    raise exception 'STORE_DELEGATION_IDENTITY_REQUIRED';
  end if;
  if p_source_user_id=p_delegate_user_id then raise exception 'STORE_DELEGATION_SELF_FORBIDDEN'; end if;
  if not private.store_permission_admin_v1(p_instance_id,p_actor_user_id) then raise exception 'STORE_PERMISSION_OWNER_REQUIRED'; end if;
  if p_valid_until is null or p_valid_until<=v_valid_from then raise exception 'STORE_DELEGATION_EXPIRY_REQUIRED'; end if;
  if p_reason is not null and char_length(p_reason)>500 then raise exception 'STORE_DELEGATION_REASON_TOO_LONG'; end if;
  if v_scope_type not in ('all','topic','mailbox') then raise exception 'STORE_DELEGATION_SCOPE_INVALID'; end if;
  if v_scope_type in ('topic','mailbox') and v_scope_value is null then raise exception 'STORE_DELEGATION_SCOPE_VALUE_REQUIRED'; end if;
  if v_scope_type='all' then v_scope_value:=null; end if;

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
    where not private.store_source_can_delegate_capability_v2(
      p_instance_id,v_source_binding.id,p_source_user_id,p,v_scope_type,v_scope_value
    )
  ) then raise exception 'STORE_DELEGATION_SOURCE_PERMISSION_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('store-delegation:'||p_instance_id::text||':'||p_source_user_id::text||':'||p_delegate_user_id::text,0));
  if exists(
    select 1 from public.store_delegations d
    where d.instance_id=p_instance_id and d.source_user_id=p_source_user_id and d.delegate_user_id=p_delegate_user_id
      and d.revoked_at is null
      and d.scope_type=v_scope_type
      and d.scope_value is not distinct from v_scope_value
      and tstzrange(d.valid_from,d.valid_until,'[)') && tstzrange(v_valid_from,p_valid_until,'[)')
  ) then raise exception 'STORE_DELEGATION_OVERLAP'; end if;

  insert into public.store_delegations(
    organization_id,instance_id,source_user_id,delegate_user_id,source_role_binding_id,delegate_role_binding_id,
    scope_type,scope_value,valid_from,valid_until,reason,delegated_by
  ) values(
    v_org,p_instance_id,p_source_user_id,p_delegate_user_id,v_source_binding.id,v_delegate_binding.id,
    v_scope_type,v_scope_value,v_valid_from,p_valid_until,nullif(trim(coalesce(p_reason,'')),''),p_actor_user_id
  ) returning id into v_delegation_id;

  insert into public.store_delegation_permissions(delegation_id,permission_code)
  select v_delegation_id,x from unnest(v_permissions) x;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata
  ) values(
    p_actor_user_id,'store.delegation_created','store_delegation',v_delegation_id::text,v_org,p_instance_id,
    'Időszakos, scope-olt személyes helyettesítés létrehozva',null,
    jsonb_build_object(
      'sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,
      'scopeType',v_scope_type,'scopeValue',v_scope_value,
      'validFrom',v_valid_from,'validUntil',p_valid_until,
      'permissions',to_jsonb(v_permissions),'reason',nullif(trim(coalesce(p_reason,'')),'')
    ),
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_create_store_delegation_v2','sourceAuthorityVerified',true)
  );

  return jsonb_build_object(
    'delegationId',v_delegation_id,'instanceId',p_instance_id,'sourceUserId',p_source_user_id,'delegateUserId',p_delegate_user_id,
    'scopeType',v_scope_type,'scopeValue',v_scope_value,
    'validFrom',v_valid_from,'validUntil',p_valid_until,'permissionCount',array_length(v_permissions,1)
  );
end;
$$;

revoke all on function private.store_source_can_delegate_capability_v2(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.merchant_create_store_delegation_v2(uuid,uuid,uuid,uuid,text[],text,text,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.merchant_create_store_delegation_v2(uuid,uuid,uuid,uuid,text[],text,text,timestamptz,timestamptz,text) to service_role;
