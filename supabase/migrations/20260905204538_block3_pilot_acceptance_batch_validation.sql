-- Roadmap Block 3 production-pilot acceptance batch.
-- 1) B2C remains single-unit ordering while B2B keeps merchant MOQ/order-multiple rules.
-- 2) Hungarian company/reseller tax numbers are validated server-side.
-- 3) Store owners/admins can manage tenant-scoped fine-grained RBAC roles with audit evidence.

create or replace function private.is_valid_hu_tax_number(p_value text)
returns boolean
language plpgsql
immutable strict
set search_path=''
as $$
declare
  v text:=trim(p_value);
  d int[];
  s int;
  expected int;
begin
  if v!~'^[0-9]{8}-[0-9]-[0-9]{2}$' then return false; end if;
  if substr(v,1,8)='00000000' then return false; end if;
  d:=array[
    substr(v,1,1)::int,substr(v,2,1)::int,substr(v,3,1)::int,substr(v,4,1)::int,
    substr(v,5,1)::int,substr(v,6,1)::int,substr(v,7,1)::int,substr(v,8,1)::int
  ];
  s:=d[1]*9+d[2]*7+d[3]*3+d[4]+d[5]*9+d[6]*7+d[7]*3;
  expected:=(10-(s%10))%10;
  return expected=d[8];
end;
$$;

revoke all on function private.is_valid_hu_tax_number(text) from public,anon,authenticated;

-- Keep the existing hardened checkout functions and patch only the acceptance rules.
do $checkout_acceptance$
declare
  v_def text;
  v_old_moq text:=$old_moq$v_min_qty:=greatest(coalesce(v_variant.minimum_order_quantity,1),case when v_has_channel then coalesce(v_channel_min,1) else 1 end);v_multiple:=greatest(coalesce(v_variant.order_multiple,1),1);v_min_qty:=(ceil(v_min_qty::numeric/v_multiple)::integer)*v_multiple;$old_moq$;
  v_new_moq text:=$new_moq$if v_channel='b2b' then v_min_qty:=greatest(coalesce(v_variant.minimum_order_quantity,1),case when v_has_channel then coalesce(v_channel_min,1) else 1 end);v_multiple:=greatest(coalesce(v_variant.order_multiple,1),1);v_min_qty:=(ceil(v_min_qty::numeric/v_multiple)::integer)*v_multiple;else v_min_qty:=1;v_multiple:=1;end if;$new_moq$;
  v_old_name text:=$old_name$if length(trim(coalesce(p_billing_name,'')))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.';end if;$old_name$;
  v_new_name text:=$new_name$if length(trim(coalesce(p_billing_name,'')))<2 or length(p_billing_name)>150 then raise exception 'A név megadása kötelező.';end if;if trim(coalesce(p_billing_tax_number,''))<>'' and not private.is_valid_hu_tax_number(trim(p_billing_tax_number)) then raise exception 'Érvénytelen magyar adószám.';end if;$new_name$;
begin
  select pg_get_functiondef('public.quote_tenant_checkout_v2(uuid,uuid,text,text,integer,integer,jsonb)'::regprocedure) into v_def;
  if strpos(v_def,v_new_moq)=0 then
    if strpos(v_def,v_old_moq)=0 then raise exception 'BLOCK3_QUOTE_MOQ_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_moq,v_new_moq);
    execute v_def;
  end if;

  select pg_get_functiondef('public.place_order_provider_v5_idempotent(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,integer,integer,text,text,text,uuid,text,jsonb)'::regprocedure) into v_def;
  if strpos(v_def,v_new_moq)=0 then
    if strpos(v_def,v_old_moq)=0 then raise exception 'BLOCK3_ORDER_MOQ_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_moq,v_new_moq);
  end if;
  if strpos(v_def,v_new_name)=0 then
    if strpos(v_def,v_old_name)=0 then raise exception 'BLOCK3_TAX_PATCH_TARGET_MISSING'; end if;
    v_def:=replace(v_def,v_old_name,v_new_name);
  end if;
  execute v_def;
end;
$checkout_acceptance$;

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
declare
  v_org uuid;
  v_actor_role text;
  v_current_role text;
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

  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select rb.role_code into v_actor_role
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_actor_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
    and rb.role_code in ('owner','admin')
  order by case rb.role_code when 'owner' then 0 else 1 end
  limit 1;

  if v_actor_role is null and not exists(
    select 1 from public.platform_operators po where po.user_id=p_actor_user_id and po.role in ('owner','admin','operator')
  ) then raise exception 'STORE_MANAGE_PERMISSION_REQUIRED'; end if;

  if p_role_code='owner' and coalesce(v_actor_role,'platform')<>'owner'
     and not exists(select 1 from public.platform_operators po where po.user_id=p_actor_user_id) then
    raise exception 'OWNER_ROLE_ASSIGNMENT_REQUIRES_OWNER';
  end if;

  if not exists(select 1 from auth.users where id=p_target_user_id)
     or not exists(select 1 from public.profiles where id=p_target_user_id) then
    raise exception 'STORE_ROLE_PROFILE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('merchant-store-role:'||p_instance_id::text||':'||p_target_user_id::text,0));

  select rb.role_code into v_current_role
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_target_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by case rb.role_code when 'owner' then 0 when 'admin' then 1 else 2 end
  limit 1;

  if v_current_role='owner' and p_role_code<>'owner' then
    select count(*) into v_other_owners from public.role_bindings rb
    where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id<>p_target_user_id
      and rb.role_code='owner' and rb.revoked_at is null and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now());
    if v_other_owners=0 then raise exception 'LAST_WEBSHOP_OWNER'; end if;
  end if;

  update public.role_bindings set revoked_at=now()
  where organization_id=v_org and instance_id=p_instance_id and user_id=p_target_user_id and revoked_at is null;

  insert into public.role_bindings(organization_id,instance_id,user_id,role_code,delegated_by)
  values(v_org,p_instance_id,p_target_user_id,p_role_code,p_actor_user_id);

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
    'Csapattag webshop-jogosultsága módosítva',
    jsonb_build_object('roleCode',v_current_role),
    jsonb_build_object('roleCode',p_role_code,'legacyRole',v_legacy_role),
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_set_store_role_v1')
  );

  return jsonb_build_object('instanceId',p_instance_id,'userId',p_target_user_id,'roleCode',p_role_code,'legacyRole',v_legacy_role);
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
declare
  v_org uuid;
  v_actor_role text;
  v_current_role text;
  v_other_owners int;
  v_remaining int;
  v_org_role text;
begin
  select organization_id into v_org from public.webshop_instances where id=p_instance_id for update;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select rb.role_code into v_actor_role
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_actor_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
    and rb.role_code in ('owner','admin')
  order by case rb.role_code when 'owner' then 0 else 1 end limit 1;

  if v_actor_role is null and not exists(
    select 1 from public.platform_operators po where po.user_id=p_actor_user_id and po.role in ('owner','admin','operator')
  ) then raise exception 'STORE_MANAGE_PERMISSION_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('merchant-store-role:'||p_instance_id::text||':'||p_target_user_id::text,0));

  select rb.role_code into v_current_role
  from public.role_bindings rb
  where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id=p_target_user_id
    and rb.revoked_at is null and rb.valid_from<=now() and (rb.valid_until is null or rb.valid_until>now())
  order by case rb.role_code when 'owner' then 0 when 'admin' then 1 else 2 end limit 1;
  if v_current_role is null then raise exception 'STORE_ROLE_NOT_FOUND'; end if;

  if v_current_role='owner' then
    select count(*) into v_other_owners from public.role_bindings rb
    where rb.organization_id=v_org and rb.instance_id=p_instance_id and rb.user_id<>p_target_user_id
      and rb.role_code='owner' and rb.revoked_at is null and rb.valid_from<=now()
      and (rb.valid_until is null or rb.valid_until>now());
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
    'Csapattag webshop-hozzáférése eltávolítva',
    jsonb_build_object('roleCode',v_current_role),null,
    jsonb_build_object('audit_source','database_rpc','rpc','merchant_remove_store_role_v1')
  );

  return jsonb_build_object('instanceId',p_instance_id,'userId',p_target_user_id,'removed',true);
end;
$$;

revoke all on function public.merchant_set_store_role_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.merchant_remove_store_role_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.merchant_set_store_role_v1(uuid,uuid,uuid,text) to service_role;
grant execute on function public.merchant_remove_store_role_v1(uuid,uuid,uuid) to service_role;
