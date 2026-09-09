-- Team Chat plan split.
-- Alap includes internal Team Chat. Secure file attachments remain Pro-only.
-- Customer e-mail / Digital Office remains Pro-only under officeCommunication.

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

  if v_plan='alap' then
    v_features:=array[
      'catalog','inventory','orders','returns','customers','coupons','basicAnalytics',
      'marketingBasics','contentMarketing','importExport','bulkOperations','wishlists',
      'stockNotifications','productRecommendations','reviews','searchFiltering',
      'commerceIntegrations','support','teamChat'
    ]::text[];
  elsif v_plan='pro' then
    v_features:=array[
      'catalog','inventory','orders','returns','customers','coupons','basicAnalytics',
      'marketingBasics','contentMarketing','importExport','bulkOperations','wishlists',
      'stockNotifications','productRecommendations','reviews','searchFiltering',
      'commerceIntegrations','support','teamChat','advancedAnalytics','crm','advancedCampaigns',
      'officeCommunication','teamChatSecureAttachments','automation','procurement','cashflow',
      'executiveAnalytics','advancedIntegrations'
    ]::text[];
  else
    raise exception 'TENANT_PLAN_SYNC_UNKNOWN_PLAN: %',v_plan;
  end if;

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
    jsonb_build_object('plan',v_plan,'managed_by','tenant_plan_sync_v2')
  from unnest(v_features) feature_code;
end;
$$;

revoke all on function private.sync_webshop_plan_entitlements(uuid)
from public,anon,authenticated,service_role;

-- Existing tenants receive the same deterministic plan matrix when this migration is eventually applied.
do $$
declare r record;
begin
  for r in select id from public.webshop_instances loop
    perform private.sync_webshop_plan_entitlements(r.id);
  end loop;
end $$;

comment on function private.sync_webshop_plan_entitlements(uuid) is
  'Synchronizes plan-managed entitlements. Alap includes Team Chat; secure Team Chat attachments and customer e-mail/Digital Office remain Pro-only.';
