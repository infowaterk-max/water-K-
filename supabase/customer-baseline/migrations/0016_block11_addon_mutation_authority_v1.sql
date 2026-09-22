-- Block 11: catalog-driven Add-on mutation authority.
-- Enabling requires current plan compatibility. Disabling remains allowed after a
-- downgrade so preserved configuration can be explicitly turned off without data loss.

create or replace function public.platform_set_webshop_addon_v1(
  p_instance_id uuid,
  p_actor_id uuid,
  p_addon_code text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_instance public.webshop_instances%rowtype;
  v_before jsonb;
  v_after public.webshop_instance_addons%rowtype;
begin
  if p_instance_id is null or p_actor_id is null or nullif(trim(p_addon_code),'') is null or p_enabled is null then
    raise exception 'PLATFORM_ADDON_INPUT_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'role','')<>'service_role' then
    raise exception 'PLATFORM_ADDON_SERVICE_ROLE_REQUIRED';
  end if;
  if not private.is_platform_operator_current(p_actor_id) then
    raise exception 'PLATFORM_ADDON_OPERATOR_REQUIRED';
  end if;

  select * into v_instance
  from public.webshop_instances
  where id=p_instance_id
  for update;
  if not found then raise exception 'PLATFORM_ADDON_INSTANCE_NOT_FOUND'; end if;

  if not exists(
    select 1 from public.addon_entitlement_catalog a
    where a.addon_code=p_addon_code and a.active
  ) then raise exception 'PLATFORM_ADDON_UNKNOWN_OR_INACTIVE'; end if;

  if p_enabled and not exists(
    select 1 from public.addon_plan_compatibility c
    where c.addon_code=p_addon_code
      and c.plan_code=v_instance.subscription_plan
  ) then raise exception 'PLATFORM_ADDON_PLAN_INCOMPATIBLE'; end if;

  select to_jsonb(a) into v_before
  from public.webshop_instance_addons a
  where a.instance_id=p_instance_id and a.addon_code=p_addon_code
  for update;

  insert into public.webshop_instance_addons(instance_id,addon_code,enabled,updated_at)
  values(p_instance_id,p_addon_code,p_enabled,now())
  on conflict(instance_id,addon_code) do update
  set enabled=excluded.enabled,updated_at=excluded.updated_at
  returning * into v_after;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_id,
    'platform.webshop_addon_updated',
    'webshop_instance_addon',
    p_instance_id::text||':'||p_addon_code,
    v_instance.organization_id,
    p_instance_id,
    left('Add-on '||p_addon_code||' = '||p_enabled::text,500),
    v_before,
    to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','platform_set_webshop_addon_v1')
  );

  return jsonb_build_object(
    'id',p_instance_id,
    'instanceId',p_instance_id,
    'addon',p_addon_code,
    'enabled',v_after.enabled,
    'plan',v_instance.subscription_plan
  );
end;
$$;

revoke all on function public.platform_set_webshop_addon_v1(uuid,uuid,text,boolean)
from public,anon,authenticated;
grant execute on function public.platform_set_webshop_addon_v1(uuid,uuid,text,boolean)
to service_role;

comment on function public.platform_set_webshop_addon_v1(uuid,uuid,text,boolean) is
  'Block 11 catalog-driven Add-on mutation. Service-role only, platform-operator attributed, plan-compatible on enable, preservation-safe on disable.';
