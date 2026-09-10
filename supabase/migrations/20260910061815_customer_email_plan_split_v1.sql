-- Customer e-mail launch plan split.
-- Alap + Pro: core webshop <-> customer e-mail under officeCommunication.
-- Pro only: advanced team/workflow e-mail capabilities under officeCommunicationAdvanced.
-- Team Chat Secure Attachments remains intentionally dormant/unreleased.

create or replace function private.sync_webshop_plan_entitlements(p_instance_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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
      'commerceIntegrations','support','teamChat','officeCommunication'
    ]::text[];
  elsif v_plan='pro' then
    v_features:=array[
      'catalog','inventory','orders','returns','customers','coupons','basicAnalytics',
      'marketingBasics','contentMarketing','importExport','bulkOperations','wishlists',
      'stockNotifications','productRecommendations','reviews','searchFiltering',
      'commerceIntegrations','support','teamChat','officeCommunication',
      'advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced',
      'automation','procurement','cashflow','executiveAnalytics','advancedIntegrations'
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
    jsonb_build_object('plan',v_plan,'managed_by','tenant_plan_sync_v4')
  from unnest(v_features) feature_code;
end;
$function$;

revoke all on function private.sync_webshop_plan_entitlements(uuid) from public;
revoke all on function private.sync_webshop_plan_entitlements(uuid) from anon;
revoke all on function private.sync_webshop_plan_entitlements(uuid) from authenticated;
revoke all on function private.sync_webshop_plan_entitlements(uuid) from service_role;

comment on function private.sync_webshop_plan_entitlements(uuid) is
  'Plan entitlement sync v4: core customer email in Alap and Pro; advanced email workflows only in Pro; Team Chat Secure Attachments remains unreleased.';

do $sync$
declare
  v_instance_id uuid;
begin
  for v_instance_id in select id from public.webshop_instances loop
    perform private.sync_webshop_plan_entitlements(v_instance_id);
  end loop;
end;
$sync$;
