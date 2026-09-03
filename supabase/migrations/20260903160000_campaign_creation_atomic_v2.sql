-- Campaign creation, audience snapshot and audit evidence must commit atomically.
create or replace function public.admin_create_marketing_campaign_v2(
  p_instance_id uuid,
  p_actor uuid,
  p_campaign jsonb,
  p_recipients jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_campaign_id uuid;
  v_org uuid;
  v_total integer:=0;
  v_eligible integer:=0;
  v_status text;
begin
  if p_instance_id is null or p_actor is null then raise exception 'CAMPAIGN_IDENTITY_REQUIRED'; end if;
  if p_campaign is null or jsonb_typeof(p_campaign)<>'object' then raise exception 'CAMPAIGN_PAYLOAD_REQUIRED'; end if;
  if p_recipients is null or jsonb_typeof(p_recipients)<>'array' then raise exception 'CAMPAIGN_RECIPIENTS_ARRAY_REQUIRED'; end if;
  if jsonb_array_length(p_recipients)>20000 then raise exception 'CAMPAIGN_RECIPIENT_LIMIT'; end if;
  if not public.can_manage_marketing(p_instance_id,p_actor) and not public.is_platform_operator(p_actor) then
    raise exception 'MARKETING_PERMISSION_REQUIRED';
  end if;

  select w.organization_id into v_org from public.webshop_instances w where w.id=p_instance_id;
  if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  v_status:=p_campaign->>'status';
  if v_status not in ('review','approved') then raise exception 'CAMPAIGN_CREATE_STATUS_INVALID'; end if;

  insert into public.marketing_campaigns(
    instance_id,name,segment,template_key,status,scheduled_at,channel,budget_huf,
    utm_campaign,external_impressions,external_clicks,created_by,approved_by,approved_at
  ) values(
    p_instance_id,
    p_campaign->>'name',
    p_campaign->>'segment',
    p_campaign->>'template_key',
    v_status,
    nullif(p_campaign->>'scheduled_at','')::timestamptz,
    coalesce(nullif(p_campaign->>'channel',''),'email'),
    coalesce((p_campaign->>'budget_huf')::integer,0),
    nullif(p_campaign->>'utm_campaign',''),
    coalesce((p_campaign->>'external_impressions')::integer,0),
    coalesce((p_campaign->>'external_clicks')::integer,0),
    p_actor,
    case when v_status='approved' then p_actor else null end,
    case when v_status='approved' then now() else null end
  ) returning id into v_campaign_id;

  if jsonb_array_length(p_recipients)>0 then
    insert into public.marketing_campaign_recipients(
      instance_id,campaign_id,customer_key,user_id,email,customer_name,orders_count,
      revenue_gross_huf,last_order_at,consent_ok,suppressed,eligible,exclusion_reason
    )
    select
      p_instance_id,v_campaign_id,r.customer_key,r.user_id,lower(trim(r.email)),r.customer_name,
      coalesce(r.orders_count,0),coalesce(r.revenue_gross_huf,0),r.last_order_at,
      coalesce(r.consent_ok,false),coalesce(r.suppressed,false),coalesce(r.eligible,false),r.exclusion_reason
    from jsonb_to_recordset(p_recipients) as r(
      customer_key text,user_id uuid,email text,customer_name text,orders_count integer,
      revenue_gross_huf integer,last_order_at timestamptz,consent_ok boolean,
      suppressed boolean,eligible boolean,exclusion_reason text
    );
    get diagnostics v_total=row_count;
    if v_total<>jsonb_array_length(p_recipients) then raise exception 'CAMPAIGN_RECIPIENT_EVIDENCE_MISMATCH'; end if;
    select count(*)::integer into v_eligible
    from public.marketing_campaign_recipients
    where instance_id=p_instance_id and campaign_id=v_campaign_id and eligible=true;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,after_state,metadata
  ) values(
    p_actor,'campaign.created','marketing_campaign',v_campaign_id::text,v_org,p_instance_id,
    left(coalesce(p_campaign->>'name','Kampány')||' kampány létrehozva',500),
    p_campaign||jsonb_build_object('recipient_count',v_total,'eligible_count',v_eligible),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_create_marketing_campaign_v2')
  );

  return jsonb_build_object('id',v_campaign_id,'total',v_total,'eligible',v_eligible);
end;
$$;

revoke all on function public.admin_create_marketing_campaign_v2(uuid,uuid,jsonb,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_create_marketing_campaign_v2(uuid,uuid,jsonb,jsonb)
to service_role;

comment on function public.admin_create_marketing_campaign_v2(uuid,uuid,jsonb,jsonb)
is 'Atomically creates a tenant campaign, immutable recipient snapshot and admin audit evidence.';
