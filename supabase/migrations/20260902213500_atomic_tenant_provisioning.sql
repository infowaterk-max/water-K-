-- Atomic production tenant provisioning gate.
-- New customer tenants fail closed to Alap/Pilot/B2C and are created as one PostgreSQL transaction.

do $$
begin
  insert into public.organizations(slug,name)
  select 'org-'||w.slug,w.name
  from public.webshop_instances w
  where w.organization_id is null
  on conflict(slug) do nothing;

  update public.webshop_instances w
  set organization_id=o.id
  from public.organizations o
  where w.organization_id is null
    and o.slug='org-'||w.slug;

  if exists(select 1 from public.webshop_instances where organization_id is null) then
    raise exception 'TENANT_PROVISIONING_ORGANIZATION_BACKFILL_FAILED';
  end if;
end $$;

alter table public.webshop_instances
  alter column organization_id set not null;

create or replace function private.sync_webshop_plan_entitlements(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_organization_id uuid;
  v_plan text;
  v_features text[];
begin
  select w.organization_id,w.subscription_plan
    into v_organization_id,v_plan
  from public.webshop_instances w
  where w.id=p_instance_id;

  if not found or v_organization_id is null then
    raise exception 'TENANT_PLAN_SYNC_INSTANCE_NOT_FOUND';
  end if;

  v_features:=case v_plan
    when 'alap' then array[
      'catalog','inventory','orders','returns','customers','coupons','basicAnalytics',
      'marketingBasics','contentMarketing','importExport','bulkOperations','wishlists',
      'stockNotifications','productRecommendations','reviews','searchFiltering',
      'commerceIntegrations','support'
    ]::text[]
    when 'pro' then array[
      'catalog','inventory','orders','returns','customers','coupons','basicAnalytics',
      'marketingBasics','contentMarketing','importExport','bulkOperations','wishlists',
      'stockNotifications','productRecommendations','reviews','searchFiltering',
      'commerceIntegrations','support','advancedAnalytics','crm','advancedCampaigns',
      'officeCommunication','automation','procurement','cashflow','executiveAnalytics',
      'advancedIntegrations'
    ]::text[]
    else raise exception 'TENANT_PLAN_SYNC_UNKNOWN_PLAN: %',v_plan
  end;

  delete from public.feature_entitlements
  where instance_id=p_instance_id and source='plan';

  insert into public.feature_entitlements(
    organization_id,instance_id,feature_code,source,enabled,metadata
  )
  select
    v_organization_id,
    p_instance_id,
    feature_code,
    'plan',
    true,
    jsonb_build_object('plan',v_plan,'managed_by','tenant_plan_sync_v1')
  from unnest(v_features) feature_code;
end;
$$;

revoke all on function private.sync_webshop_plan_entitlements(uuid)
from public,anon,authenticated,service_role;

drop trigger if exists webshop_instance_plan_entitlements_sync on public.webshop_instances;
create trigger webshop_instance_plan_entitlements_sync
after insert or update of subscription_plan,organization_id on public.webshop_instances
for each row execute function private.sync_webshop_plan_entitlements(new.id);

do $$
declare r record;
begin
  for r in select id from public.webshop_instances loop
    perform private.sync_webshop_plan_entitlements(r.id);
  end loop;
end $$;

create or replace function public.provision_webshop_tenant_v1(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_actor_user_id uuid,
  p_storefront_config jsonb default '{}'::jsonb
)
returns table(
  provisioned_organization_id uuid,
  provisioned_instance_id uuid,
  subscription_plan text,
  instance_status text
)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_name text:=trim(coalesce(p_name,''));
  v_slug text:=lower(trim(coalesce(p_slug,'')));
  v_organization_id uuid;
  v_instance_id uuid;
begin
  if not exists(
    select 1 from public.platform_operators po
    where po.user_id=p_actor_user_id
      and po.role in ('owner','admin','operator')
  ) then
    raise exception 'TENANT_PROVISIONING_ACTOR_NOT_PLATFORM_OPERATOR';
  end if;

  if not exists(select 1 from auth.users u where u.id=p_owner_user_id)
     or not exists(select 1 from public.profiles p where p.id=p_owner_user_id) then
    raise exception 'TENANT_PROVISIONING_OWNER_NOT_FOUND';
  end if;

  if length(v_name)<2 or length(v_name)>100 then
    raise exception 'TENANT_PROVISIONING_INVALID_NAME';
  end if;
  if length(v_slug)<2 or length(v_slug)>60
     or v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'TENANT_PROVISIONING_INVALID_SLUG';
  end if;
  if p_storefront_config is null or jsonb_typeof(p_storefront_config)<>'object' then
    raise exception 'TENANT_PROVISIONING_INVALID_STOREFRONT_CONFIG';
  end if;

  if exists(select 1 from public.webshop_instances w where w.slug=v_slug)
     or exists(select 1 from public.organizations o where o.slug='org-'||v_slug) then
    raise exception 'TENANT_PROVISIONING_SLUG_ALREADY_EXISTS';
  end if;

  insert into public.organizations(slug,name,status)
  values('org-'||v_slug,v_name,'active')
  returning id into v_organization_id;

  insert into public.webshop_instances(
    organization_id,slug,name,brand_name,subscription_plan,status,storefront_config
  )
  values(
    v_organization_id,v_slug,v_name,v_name,'alap','pilot',p_storefront_config
  )
  returning id into v_instance_id;

  insert into public.webshop_sales_channels(instance_id,channel_code,enabled)
  values
    (v_instance_id,'b2c',true),
    (v_instance_id,'b2b',false);

  insert into public.organization_members(organization_id,user_id,role)
  values(v_organization_id,p_owner_user_id,'owner');

  insert into public.webshop_instance_members(instance_id,user_id,role)
  values(v_instance_id,p_owner_user_id,'owner');

  insert into public.role_bindings(
    organization_id,instance_id,user_id,role_code,delegated_by
  )
  values(
    v_organization_id,v_instance_id,p_owner_user_id,'owner',p_actor_user_id
  );

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  )
  values(
    p_actor_user_id,
    'platform.tenant_provisioned',
    'webshop_instance',
    v_instance_id::text,
    v_organization_id,
    v_instance_id,
    'Atomic tenant provisioning completed',
    jsonb_build_object(
      'organizationId',v_organization_id,
      'instanceId',v_instance_id,
      'ownerUserId',p_owner_user_id,
      'plan','alap',
      'status','pilot',
      'channels',jsonb_build_object('b2c',true,'b2b',false)
    ),
    jsonb_build_object(
      'audit_source','tenant_provisioning_v1',
      'provisioning_contract','atomic'
    )
  );

  return query
  select v_organization_id,v_instance_id,'alap'::text,'pilot'::text;
end;
$$;

revoke all on function public.provision_webshop_tenant_v1(text,text,uuid,uuid,jsonb)
from public,anon,authenticated;
grant execute on function public.provision_webshop_tenant_v1(text,text,uuid,uuid,jsonb)
to service_role;

comment on function public.provision_webshop_tenant_v1(text,text,uuid,uuid,jsonb) is
  'Atomically provisions an Alap/Pilot tenant with organization, owner access, B2C/B2B defaults, plan entitlements and append-only audit evidence.';
