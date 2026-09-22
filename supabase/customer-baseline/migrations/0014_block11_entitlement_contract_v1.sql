-- Roadmap Block 11: Basic / Pro / Add-on entitlement contract v1.
-- Billing-independent, billing-ready entitlement authority with deterministic precedence.
-- Reserved capabilities are absolute fail-closed and downgrade is preservation-only.

create table if not exists public.entitlement_capabilities(
  capability_code text primary key,
  release_state text not null check(release_state in ('released','reserved')),
  capability_kind text not null check(capability_kind in ('feature','addon')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plan_catalog(
  plan_code text primary key,
  display_name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_capability_grants(
  plan_code text not null references public.subscription_plan_catalog(plan_code) on delete restrict,
  capability_code text not null references public.entitlement_capabilities(capability_code) on delete restrict,
  created_at timestamptz not null default now(),
  primary key(plan_code,capability_code)
);

create table if not exists public.addon_entitlement_catalog(
  addon_code text primary key,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addon_plan_compatibility(
  addon_code text not null references public.addon_entitlement_catalog(addon_code) on delete restrict,
  plan_code text not null references public.subscription_plan_catalog(plan_code) on delete restrict,
  primary key(addon_code,plan_code)
);

create table if not exists public.addon_capability_grants(
  addon_code text not null references public.addon_entitlement_catalog(addon_code) on delete restrict,
  capability_code text not null references public.entitlement_capabilities(capability_code) on delete restrict,
  primary key(addon_code,capability_code)
);

create table if not exists public.entitlement_source_precedence(
  source text primary key,
  priority integer not null unique,
  created_at timestamptz not null default now()
);

insert into public.subscription_plan_catalog(plan_code,display_name,active,sort_order)
values ('alap','Alap',true,10),('pro','Pro',true,20)
on conflict(plan_code) do update
set display_name=excluded.display_name,active=excluded.active,sort_order=excluded.sort_order,updated_at=now();

insert into public.entitlement_source_precedence(source,priority)
values ('plan',100),('addon',200),('trial',300),('manual',400),('platform',500)
on conflict(source) do update set priority=excluded.priority;

insert into public.entitlement_capabilities(capability_code,release_state,capability_kind)
values
  ('catalog','released','feature'),
  ('inventory','released','feature'),
  ('orders','released','feature'),
  ('returns','released','feature'),
  ('customers','released','feature'),
  ('coupons','released','feature'),
  ('basicAnalytics','released','feature'),
  ('marketingBasics','released','feature'),
  ('contentMarketing','released','feature'),
  ('importExport','released','feature'),
  ('bulkOperations','released','feature'),
  ('wishlists','released','feature'),
  ('stockNotifications','released','feature'),
  ('productRecommendations','released','feature'),
  ('reviews','released','feature'),
  ('searchFiltering','released','feature'),
  ('commerceIntegrations','released','feature'),
  ('support','released','feature'),
  ('teamChat','released','feature'),
  ('officeCommunication','released','feature'),
  ('advancedAnalytics','released','feature'),
  ('crm','released','feature'),
  ('advancedCampaigns','released','feature'),
  ('officeCommunicationAdvanced','released','feature'),
  ('automation','released','feature'),
  ('procurement','released','feature'),
  ('cashflow','released','feature'),
  ('executiveAnalytics','released','feature'),
  ('advancedIntegrations','released','feature'),
  ('teamChatSecureAttachments','reserved','feature'),
  ('apiAccess','reserved','feature'),
  ('addon:ai-assistant','released','addon'),
  ('addon:advanced-export','released','addon'),
  ('addon:priority-support','released','addon'),
  ('addon:custom-integration','released','addon')
on conflict(capability_code) do update
set release_state=excluded.release_state,capability_kind=excluded.capability_kind,updated_at=now();

insert into public.plan_capability_grants(plan_code,capability_code)
values
  ('alap','catalog'),('alap','inventory'),('alap','orders'),('alap','returns'),('alap','customers'),
  ('alap','coupons'),('alap','basicAnalytics'),('alap','marketingBasics'),('alap','contentMarketing'),
  ('alap','importExport'),('alap','bulkOperations'),('alap','wishlists'),('alap','stockNotifications'),
  ('alap','productRecommendations'),('alap','reviews'),('alap','searchFiltering'),
  ('alap','commerceIntegrations'),('alap','support'),('alap','teamChat'),('alap','officeCommunication'),
  ('pro','catalog'),('pro','inventory'),('pro','orders'),('pro','returns'),('pro','customers'),
  ('pro','coupons'),('pro','basicAnalytics'),('pro','marketingBasics'),('pro','contentMarketing'),
  ('pro','importExport'),('pro','bulkOperations'),('pro','wishlists'),('pro','stockNotifications'),
  ('pro','productRecommendations'),('pro','reviews'),('pro','searchFiltering'),
  ('pro','commerceIntegrations'),('pro','support'),('pro','teamChat'),('pro','officeCommunication'),
  ('pro','advancedAnalytics'),('pro','crm'),('pro','advancedCampaigns'),
  ('pro','officeCommunicationAdvanced'),('pro','automation'),('pro','procurement'),('pro','cashflow'),
  ('pro','executiveAnalytics'),('pro','advancedIntegrations')
on conflict do nothing;

insert into public.addon_entitlement_catalog(addon_code,active)
values ('ai-assistant',true),('advanced-export',true),('priority-support',true),('custom-integration',true)
on conflict(addon_code) do update set active=excluded.active,updated_at=now();

insert into public.addon_plan_compatibility(addon_code,plan_code)
values
  ('ai-assistant','alap'),('ai-assistant','pro'),
  ('advanced-export','alap'),('advanced-export','pro'),
  ('priority-support','alap'),('priority-support','pro'),
  ('custom-integration','pro')
on conflict do nothing;

insert into public.addon_capability_grants(addon_code,capability_code)
values
  ('ai-assistant','addon:ai-assistant'),
  ('advanced-export','addon:advanced-export'),
  ('priority-support','addon:priority-support'),
  ('custom-integration','addon:custom-integration')
on conflict do nothing;

-- Every persisted capability/source/add-on/plan key must now resolve through a catalog.
do $$
begin
  if exists(
    select 1 from public.feature_entitlements e
    left join public.entitlement_capabilities c on c.capability_code=e.feature_code
    where c.capability_code is null
  ) then raise exception 'BLOCK11_UNKNOWN_EXISTING_CAPABILITY'; end if;
  if exists(
    select 1 from public.webshop_instance_addons a
    left join public.addon_entitlement_catalog c on c.addon_code=a.addon_code
    where c.addon_code is null
  ) then raise exception 'BLOCK11_UNKNOWN_EXISTING_ADDON'; end if;
  if exists(
    select 1 from public.webshop_instances w
    left join public.subscription_plan_catalog p on p.plan_code=w.subscription_plan
    where p.plan_code is null
  ) then raise exception 'BLOCK11_UNKNOWN_EXISTING_PLAN'; end if;
end $$;

alter table public.webshop_instances drop constraint if exists webshop_instances_subscription_plan_check;
alter table public.webshop_instances drop constraint if exists webshop_instances_subscription_plan_fkey;
alter table public.webshop_instances
  add constraint webshop_instances_subscription_plan_fkey
  foreign key(subscription_plan) references public.subscription_plan_catalog(plan_code) on delete restrict;

alter table public.feature_entitlements drop constraint if exists feature_entitlements_feature_code_fkey;
alter table public.feature_entitlements
  add constraint feature_entitlements_feature_code_fkey
  foreign key(feature_code) references public.entitlement_capabilities(capability_code) on delete restrict;

alter table public.feature_entitlements drop constraint if exists feature_entitlements_source_fkey;
alter table public.feature_entitlements
  add constraint feature_entitlements_source_fkey
  foreign key(source) references public.entitlement_source_precedence(source) on delete restrict;

alter table public.webshop_instance_addons drop constraint if exists webshop_instance_addons_addon_code_fkey;
alter table public.webshop_instance_addons
  add constraint webshop_instance_addons_addon_code_fkey
  foreign key(addon_code) references public.addon_entitlement_catalog(addon_code) on delete restrict;

create unique index if not exists feature_entitlements_scope_source_unique
on public.feature_entitlements(
  organization_id,
  coalesce(instance_id,'00000000-0000-0000-0000-000000000000'::uuid),
  feature_code,
  source
);

alter table public.entitlement_capabilities enable row level security;
alter table public.subscription_plan_catalog enable row level security;
alter table public.plan_capability_grants enable row level security;
alter table public.addon_entitlement_catalog enable row level security;
alter table public.addon_plan_compatibility enable row level security;
alter table public.addon_capability_grants enable row level security;
alter table public.entitlement_source_precedence enable row level security;

revoke all on public.entitlement_capabilities from public,anon,authenticated;
revoke all on public.subscription_plan_catalog from public,anon,authenticated;
revoke all on public.plan_capability_grants from public,anon,authenticated;
revoke all on public.addon_entitlement_catalog from public,anon,authenticated;
revoke all on public.addon_plan_compatibility from public,anon,authenticated;
revoke all on public.addon_capability_grants from public,anon,authenticated;
revoke all on public.entitlement_source_precedence from public,anon,authenticated;
grant select on public.entitlement_capabilities to service_role;
grant select on public.subscription_plan_catalog to service_role;
grant select on public.plan_capability_grants to service_role;
grant select on public.addon_entitlement_catalog to service_role;
grant select on public.addon_plan_compatibility to service_role;
grant select on public.addon_capability_grants to service_role;
grant select on public.entitlement_source_precedence to service_role;

create or replace function private.sync_webshop_plan_entitlements(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_organization_id uuid;
  v_plan text;
begin
  select w.organization_id,w.subscription_plan
    into v_organization_id,v_plan
  from public.webshop_instances w
  where w.id=p_instance_id;
  if not found or v_organization_id is null then raise exception 'TENANT_PLAN_SYNC_INSTANCE_NOT_FOUND'; end if;
  if not exists(select 1 from public.subscription_plan_catalog p where p.plan_code=v_plan and p.active) then
    raise exception 'TENANT_PLAN_SYNC_UNKNOWN_OR_INACTIVE_PLAN: %',v_plan;
  end if;

  delete from public.feature_entitlements
  where instance_id=p_instance_id and source='plan';

  insert into public.feature_entitlements(
    organization_id,instance_id,feature_code,source,enabled,metadata
  )
  select
    v_organization_id,p_instance_id,g.capability_code,'plan',true,
    jsonb_build_object('plan',v_plan,'managed_by','tenant_plan_sync_block11_v1')
  from public.plan_capability_grants g
  join public.entitlement_capabilities c on c.capability_code=g.capability_code and c.release_state='released'
  where g.plan_code=v_plan;
end;
$$;

revoke all on function private.sync_webshop_plan_entitlements(uuid) from public,anon,authenticated,service_role;

create or replace function private.sync_webshop_addon_entitlements(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_organization_id uuid;
  v_plan text;
begin
  select w.organization_id,w.subscription_plan
    into v_organization_id,v_plan
  from public.webshop_instances w
  where w.id=p_instance_id;
  if not found or v_organization_id is null then raise exception 'TENANT_ADDON_SYNC_INSTANCE_NOT_FOUND'; end if;

  delete from public.feature_entitlements
  where instance_id=p_instance_id and source='addon';

  insert into public.feature_entitlements(
    organization_id,instance_id,feature_code,source,enabled,metadata
  )
  select
    v_organization_id,p_instance_id,g.capability_code,'addon',true,
    jsonb_build_object('addon_code',a.addon_code,'managed_by','tenant_addon_sync_block11_v1')
  from public.webshop_instance_addons a
  join public.addon_entitlement_catalog ac on ac.addon_code=a.addon_code and ac.active
  join public.addon_plan_compatibility pc on pc.addon_code=a.addon_code and pc.plan_code=v_plan
  join public.addon_capability_grants g on g.addon_code=a.addon_code
  join public.entitlement_capabilities c on c.capability_code=g.capability_code and c.release_state='released'
  where a.instance_id=p_instance_id and a.enabled;
end;
$$;

revoke all on function private.sync_webshop_addon_entitlements(uuid) from public,anon,authenticated,service_role;

create or replace function private.sync_webshop_plan_entitlements_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.sync_webshop_plan_entitlements(new.id);
  perform private.sync_webshop_addon_entitlements(new.id);
  return new;
end;
$$;
revoke all on function private.sync_webshop_plan_entitlements_trigger() from public,anon,authenticated,service_role;

create or replace function private.sync_webshop_addon_entitlements_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_instance_id uuid;
begin
  v_instance_id:=coalesce(new.instance_id,old.instance_id);
  perform private.sync_webshop_addon_entitlements(v_instance_id);
  return coalesce(new,old);
end;
$$;
revoke all on function private.sync_webshop_addon_entitlements_trigger() from public,anon,authenticated,service_role;

drop trigger if exists webshop_instance_addon_entitlements_sync on public.webshop_instance_addons;
create trigger webshop_instance_addon_entitlements_sync
after insert or update of addon_code,enabled or delete on public.webshop_instance_addons
for each row execute function private.sync_webshop_addon_entitlements_trigger();

create or replace function private.resolve_feature_entitlement_current(
  p_instance_id uuid,p_feature_code text
)
returns table(
  enabled boolean,
  source text,
  reason text,
  entitlement_id uuid,
  valid_until timestamptz
)
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_organization_id uuid;
  v_release_state text;
  v_entitlement public.feature_entitlements%rowtype;
begin
  if p_instance_id is null or nullif(trim(p_feature_code),'') is null then
    return query select false,null::text,'invalid-request'::text,null::uuid,null::timestamptz;
    return;
  end if;

  select w.organization_id into v_organization_id
  from public.webshop_instances w where w.id=p_instance_id;
  if not found or v_organization_id is null then
    return query select false,null::text,'tenant-not-found'::text,null::uuid,null::timestamptz;
    return;
  end if;

  if coalesce(auth.jwt()->>'role','')<>'service_role'
    and not private.has_store_role_current(
      p_instance_id,
      array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],
      auth.uid()
    )
  then
    return query select false,null::text,'unauthorized'::text,null::uuid,null::timestamptz;
    return;
  end if;

  select c.release_state into v_release_state
  from public.entitlement_capabilities c
  where c.capability_code=p_feature_code;
  if not found then
    return query select false,'unknown'::text,'unknown-capability'::text,null::uuid,null::timestamptz;
    return;
  end if;
  if v_release_state<>'released' then
    return query select false,'reserved'::text,'not-released'::text,null::uuid,null::timestamptz;
    return;
  end if;

  select e.* into v_entitlement
  from public.feature_entitlements e
  join public.entitlement_source_precedence p on p.source=e.source
  where e.organization_id=v_organization_id
    and e.feature_code=p_feature_code
    and (e.instance_id is null or e.instance_id=p_instance_id)
    and e.valid_from<=now()
    and (e.valid_until is null or e.valid_until>now())
  order by p.priority desc,
    (e.instance_id=p_instance_id) desc,
    e.updated_at desc,
    e.id desc
  limit 1;

  if not found then
    return query select false,null::text,'not-entitled'::text,null::uuid,null::timestamptz;
    return;
  end if;

  return query select
    v_entitlement.enabled,
    v_entitlement.source,
    case when v_entitlement.enabled then 'granted' else 'revoked' end,
    v_entitlement.id,
    v_entitlement.valid_until;
end;
$$;

revoke all on function private.resolve_feature_entitlement_current(uuid,text) from public,anon;
grant execute on function private.resolve_feature_entitlement_current(uuid,text) to authenticated,service_role;

create or replace function private.has_feature_entitlement_current(
  p_instance_id uuid,p_feature_code text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce((select r.enabled from private.resolve_feature_entitlement_current(p_instance_id,p_feature_code) r limit 1),false);
$$;
revoke all on function private.has_feature_entitlement_current(uuid,text) from public,anon;
grant execute on function private.has_feature_entitlement_current(uuid,text) to authenticated,service_role;

create or replace function public.resolve_feature_entitlement_v1(
  p_instance_id uuid,p_feature_code text
)
returns table(
  enabled boolean,
  source text,
  reason text,
  entitlement_id uuid,
  valid_until timestamptz
)
language sql
stable
security invoker
set search_path=''
as $$
  select * from private.resolve_feature_entitlement_current(p_instance_id,p_feature_code);
$$;
revoke all on function public.resolve_feature_entitlement_v1(uuid,text) from public,anon;
grant execute on function public.resolve_feature_entitlement_v1(uuid,text) to authenticated,service_role;

create or replace function public.has_feature_entitlement(p_instance_id uuid,p_feature_code text)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$select private.has_feature_entitlement_current(p_instance_id,p_feature_code);$$;
revoke all on function public.has_feature_entitlement(uuid,text) from public,anon;
grant execute on function public.has_feature_entitlement(uuid,text) to authenticated,service_role;

create or replace function public.service_set_feature_override_v1(
  p_instance_id uuid,
  p_actor_id uuid,
  p_feature_code text,
  p_enabled boolean,
  p_valid_until timestamptz default null,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_organization_id uuid;
  v_release_state text;
  v_before jsonb;
  v_after public.feature_entitlements%rowtype;
  v_existing_id uuid;
begin
  if p_instance_id is null or p_actor_id is null or nullif(trim(p_feature_code),'') is null or p_enabled is null then
    raise exception 'FEATURE_OVERRIDE_INVALID_INPUT';
  end if;
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FEATURE_OVERRIDE_SERVICE_ROLE_REQUIRED'; end if;
  if not private.is_platform_operator_current(p_actor_id) then raise exception 'FEATURE_OVERRIDE_PLATFORM_OPERATOR_REQUIRED'; end if;
  if p_valid_until is not null and p_valid_until<=now() then raise exception 'FEATURE_OVERRIDE_INVALID_EXPIRY'; end if;

  select w.organization_id into v_organization_id
  from public.webshop_instances w where w.id=p_instance_id;
  if not found or v_organization_id is null then raise exception 'FEATURE_OVERRIDE_INSTANCE_NOT_FOUND'; end if;

  select c.release_state into v_release_state
  from public.entitlement_capabilities c where c.capability_code=p_feature_code;
  if not found then raise exception 'FEATURE_OVERRIDE_UNKNOWN_CAPABILITY'; end if;
  if v_release_state<>'released' then raise exception 'FEATURE_OVERRIDE_CAPABILITY_NOT_RELEASED'; end if;

  select e.id,to_jsonb(e) into v_existing_id,v_before
  from public.feature_entitlements e
  where e.organization_id=v_organization_id
    and e.instance_id=p_instance_id
    and e.feature_code=p_feature_code
    and e.source='platform'
  for update;

  if v_existing_id is null then
    insert into public.feature_entitlements(
      organization_id,instance_id,feature_code,source,enabled,valid_from,valid_until,metadata
    ) values(
      v_organization_id,p_instance_id,p_feature_code,'platform',p_enabled,now(),p_valid_until,
      jsonb_build_object('managed_by','platform_override_block11_v1','reference',nullif(trim(coalesce(p_reference,'')),''))
    ) returning * into v_after;
  else
    update public.feature_entitlements
    set enabled=p_enabled,
        valid_from=now(),
        valid_until=p_valid_until,
        metadata=jsonb_build_object('managed_by','platform_override_block11_v1','reference',nullif(trim(coalesce(p_reference,'')),'')),
        updated_at=now()
    where id=v_existing_id
    returning * into v_after;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor_id,
    'platform.feature_entitlement_override_set',
    'feature_entitlement',
    v_after.id::text,
    v_organization_id,
    p_instance_id,
    left('Feature override: '||p_feature_code||' = '||p_enabled::text,500),
    v_before,
    to_jsonb(v_after),
    jsonb_build_object('audit_source','database_rpc','rpc','service_set_feature_override_v1','reference',nullif(trim(coalesce(p_reference,'')),''))
  );

  return jsonb_build_object(
    'id',v_after.id,
    'instanceId',p_instance_id,
    'featureCode',p_feature_code,
    'enabled',v_after.enabled,
    'source',v_after.source,
    'validUntil',v_after.valid_until
  );
end;
$$;
revoke all on function public.service_set_feature_override_v1(uuid,uuid,text,boolean,timestamptz,text) from public,anon,authenticated;
grant execute on function public.service_set_feature_override_v1(uuid,uuid,text,boolean,timestamptz,text) to service_role;

-- Rebuild only derived plan/add-on entitlement rows. Trial/manual/platform rows are intentionally untouched.
do $$
declare r record;
begin
  for r in select id from public.webshop_instances loop
    perform private.sync_webshop_plan_entitlements(r.id);
    perform private.sync_webshop_addon_entitlements(r.id);
  end loop;
end $$;

comment on table public.entitlement_capabilities is
  'Block 11 capability release registry. Unknown and reserved capabilities resolve fail-closed.';
comment on table public.entitlement_source_precedence is
  'Effective entitlement precedence: platform > manual > trial > addon > plan.';
comment on function private.resolve_feature_entitlement_current(uuid,text) is
  'Authoritative tenant-safe entitlement resolver with release gate, expiry, explicit revoke and deterministic source precedence.';
comment on function private.sync_webshop_addon_entitlements(uuid) is
  'Derives active add-on entitlements from preserved add-on configuration and current plan compatibility; downgrade never deletes add-on configuration.';
