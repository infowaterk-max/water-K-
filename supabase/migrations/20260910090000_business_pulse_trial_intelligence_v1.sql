-- Roadmap Block 10 — Business Pulse / Trial Intelligence.
-- 30-day full-Pro trial entitlements are temporary, instance-scoped and fail closed.
-- The report persists observed facts, calculations and recommendations separately.

create table if not exists public.business_pulse_trials (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  started_by uuid references auth.users(id) on delete set null,
  source text not null default 'platform' check (source in ('platform','founding','manual')),
  start_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_pulse_trials_window_check check (ends_at = starts_at + interval '30 days'),
  constraint business_pulse_trials_terminal_check check (
    (status='active' and completed_at is null and cancelled_at is null)
    or (status='completed' and completed_at is not null and cancelled_at is null)
    or (status='cancelled' and cancelled_at is not null and completed_at is null)
  ),
  unique(instance_id,start_key)
);

create unique index if not exists business_pulse_trials_one_active_idx
  on public.business_pulse_trials(instance_id) where status='active';
create index if not exists business_pulse_trials_due_idx
  on public.business_pulse_trials(status,ends_at,instance_id);
create index if not exists business_pulse_trials_org_idx
  on public.business_pulse_trials(organization_id,instance_id);

create table if not exists public.business_pulse_reports (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trial_id uuid not null unique references public.business_pulse_trials(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  facts jsonb not null,
  calculations jsonb not null,
  recommendations jsonb not null,
  recommended_plan text not null check (recommended_plan in ('alap','pro')),
  confidence text not null check (confidence in ('low','medium','high')),
  generation_key text not null,
  schema_version integer not null default 1 check (schema_version=1),
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id) on delete set null,
  unique(instance_id,generation_key)
);

create index if not exists business_pulse_reports_instance_generated_idx
  on public.business_pulse_reports(instance_id,generated_at desc);
create index if not exists business_pulse_reports_org_idx
  on public.business_pulse_reports(organization_id,instance_id);

create or replace function public.business_pulse_report_tenant_guard_v1()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_instance uuid;
  v_organization uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  select t.instance_id,t.organization_id,t.starts_at,t.ends_at
    into v_instance,v_organization,v_start,v_end
  from public.business_pulse_trials t
  where t.id=new.trial_id;

  if v_instance is null then
    raise exception 'BUSINESS_PULSE_TRIAL_NOT_FOUND';
  end if;
  if new.instance_id<>v_instance or new.organization_id<>v_organization then
    raise exception 'BUSINESS_PULSE_TENANT_MISMATCH';
  end if;
  if new.period_start<>v_start or new.period_end<>v_end then
    raise exception 'BUSINESS_PULSE_PERIOD_MISMATCH';
  end if;
  return new;
end
$$;

drop trigger if exists business_pulse_reports_tenant_guard_v1 on public.business_pulse_reports;
create trigger business_pulse_reports_tenant_guard_v1
before insert or update on public.business_pulse_reports
for each row execute function public.business_pulse_report_tenant_guard_v1();

alter table public.business_pulse_trials enable row level security;
alter table public.business_pulse_reports enable row level security;

drop policy if exists business_pulse_trials_member_read_v1 on public.business_pulse_trials;
create policy business_pulse_trials_member_read_v1
on public.business_pulse_trials
for select
to authenticated
using (
  exists (
    select 1
    from public.webshop_instance_members m
    where m.instance_id=business_pulse_trials.instance_id
      and m.user_id=(select auth.uid())
  )
);

drop policy if exists business_pulse_reports_member_read_v1 on public.business_pulse_reports;
create policy business_pulse_reports_member_read_v1
on public.business_pulse_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.webshop_instance_members m
    where m.instance_id=business_pulse_reports.instance_id
      and m.user_id=(select auth.uid())
  )
);

revoke all on table public.business_pulse_trials from public,anon,authenticated;
revoke all on table public.business_pulse_reports from public,anon,authenticated;
grant select on table public.business_pulse_trials to authenticated;
grant select on table public.business_pulse_reports to authenticated;

create or replace function public.service_start_business_pulse_trial_v1(
  p_instance_id uuid,
  p_actor_id uuid,
  p_start_key text,
  p_source text default 'platform'
)
returns public.business_pulse_trials
language plpgsql
security definer
set search_path=''
as $$
declare
  v_instance public.webshop_instances%rowtype;
  v_trial public.business_pulse_trials%rowtype;
  v_start timestamptz:=clock_timestamp();
  v_end timestamptz;
  v_feature text;
  v_features constant text[]:=array[
    'advancedAnalytics',
    'crm',
    'advancedCampaigns',
    'officeCommunicationAdvanced',
    'automation',
    'procurement',
    'cashflow',
    'executiveAnalytics',
    'advancedIntegrations'
  ];
begin
  if p_instance_id is null or nullif(trim(p_start_key),'') is null then
    raise exception 'BUSINESS_PULSE_START_INPUT_REQUIRED';
  end if;
  if p_source not in ('platform','founding','manual') then
    raise exception 'BUSINESS_PULSE_SOURCE_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('business-pulse-trial:'||p_instance_id::text,0));

  select * into v_instance
  from public.webshop_instances
  where id=p_instance_id
  for update;

  if not found or v_instance.organization_id is null then
    raise exception 'BUSINESS_PULSE_INSTANCE_NOT_FOUND';
  end if;
  if v_instance.status not in ('pilot','active') then
    raise exception 'BUSINESS_PULSE_INSTANCE_NOT_ELIGIBLE';
  end if;
  if exists(select 1 from public.business_pulse_trials where instance_id=p_instance_id and status='active') then
    raise exception 'BUSINESS_PULSE_TRIAL_ALREADY_ACTIVE';
  end if;

  v_end:=v_start+interval '30 days';

  insert into public.business_pulse_trials(
    instance_id,organization_id,status,starts_at,ends_at,started_by,source,start_key,metadata
  )
  values(
    p_instance_id,v_instance.organization_id,'active',v_start,v_end,p_actor_id,p_source,trim(p_start_key),
    jsonb_build_object('trialDays',30,'fullPro',true,'planMutation',false,'releasedFeaturesOnly',true)
  )
  returning * into v_trial;

  foreach v_feature in array v_features loop
    insert into public.feature_entitlements(
      organization_id,instance_id,feature_code,source,enabled,valid_from,valid_until,metadata
    )
    values(
      v_instance.organization_id,p_instance_id,v_feature,'trial',true,v_start,v_end,
      jsonb_build_object('businessPulseTrialId',v_trial.id,'startKey',trim(p_start_key))
    );
  end loop;

  return v_trial;
end
$$;

create or replace function public.service_generate_business_pulse_report_v1(
  p_trial_id uuid,
  p_actor_id uuid,
  p_generation_key text
)
returns public.business_pulse_reports
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trial public.business_pulse_trials%rowtype;
  v_existing public.business_pulse_reports%rowtype;
  v_report public.business_pulse_reports%rowtype;
  v_revenue bigint:=0;
  v_orders integer:=0;
  v_customers integer:=0;
  v_aov bigint:=0;
  v_product_performance jsonb:='[]'::jsonb;
  v_stockout_events integer:=0;
  v_stockout_variants jsonb:='[]'::jsonb;
  v_campaign_count integer:=0;
  v_campaign_budget bigint:=0;
  v_campaign_attributed_revenue bigint:=0;
  v_recovery_created integer:=0;
  v_recovery_converted integer:=0;
  v_recovery_open integer:=0;
  v_retention_targets integer:=0;
  v_campaign_usage integer:=0;
  v_crm_usage integer:=0;
  v_automation_usage integer:=0;
  v_procurement_usage integer:=0;
  v_used jsonb:='[]'::jsonb;
  v_opportunities jsonb:='[]'::jsonb;
  v_used_count integer:=0;
  v_opportunity_count integer:=0;
  v_plan text:='alap';
  v_confidence text:='low';
  v_reason_codes jsonb:='[]'::jsonb;
  v_facts jsonb;
  v_calculations jsonb;
  v_recommendations jsonb;
begin
  if p_trial_id is null or nullif(trim(p_generation_key),'') is null then
    raise exception 'BUSINESS_PULSE_GENERATION_INPUT_REQUIRED';
  end if;

  select * into v_existing from public.business_pulse_reports where trial_id=p_trial_id;
  if found then return v_existing; end if;

  perform pg_advisory_xact_lock(hashtextextended('business-pulse-report:'||p_trial_id::text,0));

  select * into v_trial
  from public.business_pulse_trials
  where id=p_trial_id
  for update;

  if not found then raise exception 'BUSINESS_PULSE_TRIAL_NOT_FOUND'; end if;
  if v_trial.status<>'active' then raise exception 'BUSINESS_PULSE_TRIAL_NOT_ACTIVE'; end if;
  if clock_timestamp()<v_trial.ends_at then raise exception 'BUSINESS_PULSE_TRIAL_NOT_ENDED'; end if;

  select
    count(*)::integer,
    coalesce(sum(ro.recognized_gross_huf),0)::bigint,
    count(distinct coalesce(ro.customer_id::text,ro.email_key))::integer
  into v_orders,v_revenue,v_customers
  from public.commercial_recognized_orders_v2 ro
  where ro.instance_id=v_trial.instance_id
    and ro.created_at>=v_trial.starts_at
    and ro.created_at<v_trial.ends_at;

  v_aov:=case when v_orders>0 then round(v_revenue::numeric/v_orders)::bigint else 0 end;

  select coalesce(jsonb_agg(to_jsonb(p) order by p.recognized_revenue_gross_huf desc,p.units desc),'[]'::jsonb)
  into v_product_performance
  from (
    select
      oi.product_name,
      sum(oi.quantity)::bigint as units,
      round(sum(oi.line_total_gross_huf::numeric*coalesce(ro.recognition_ratio,0)))::bigint as recognized_revenue_gross_huf
    from public.commercial_recognized_orders_v2 ro
    join public.order_items oi on oi.order_id=ro.id and oi.instance_id=ro.instance_id
    where ro.instance_id=v_trial.instance_id
      and ro.created_at>=v_trial.starts_at
      and ro.created_at<v_trial.ends_at
    group by oi.product_name
    order by recognized_revenue_gross_huf desc,units desc
    limit 10
  ) p;

  select count(*)::integer
  into v_stockout_events
  from public.inventory_events ie
  where ie.instance_id=v_trial.instance_id
    and ie.created_at>=v_trial.starts_at
    and ie.created_at<v_trial.ends_at
    and ie.previous_stock>0
    and ie.new_stock<=0;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.stockout_events desc,s.sku),'[]'::jsonb)
  into v_stockout_variants
  from (
    select pv.sku,pv.label,count(*)::integer as stockout_events
    from public.inventory_events ie
    join public.product_variants pv on pv.id=ie.variant_id and pv.instance_id=ie.instance_id
    where ie.instance_id=v_trial.instance_id
      and ie.created_at>=v_trial.starts_at
      and ie.created_at<v_trial.ends_at
      and ie.previous_stock>0
      and ie.new_stock<=0
    group by pv.sku,pv.label
    order by stockout_events desc,pv.sku
    limit 10
  ) s;

  select count(*)::integer,coalesce(sum(mc.budget_huf),0)::bigint
  into v_campaign_count,v_campaign_budget
  from public.marketing_campaigns mc
  where mc.instance_id=v_trial.instance_id
    and mc.created_at>=v_trial.starts_at
    and mc.created_at<v_trial.ends_at;

  select coalesce(sum(mcc.total_gross_huf),0)::bigint
  into v_campaign_attributed_revenue
  from public.marketing_campaign_conversions mcc
  where mcc.instance_id=v_trial.instance_id
    and mcc.order_created_at>=v_trial.starts_at
    and mcc.order_created_at<v_trial.ends_at;

  select
    count(*)::integer,
    count(*) filter(where cri.status='converted')::integer,
    count(*) filter(where cri.status='open')::integer
  into v_recovery_created,v_recovery_converted,v_recovery_open
  from public.checkout_recovery_intents cri
  where cri.instance_id=v_trial.instance_id
    and cri.created_at>=v_trial.starts_at
    and cri.created_at<v_trial.ends_at;

  select count(*)::integer into v_retention_targets
  from public.customer_commercial_metrics c
  where c.instance_id=v_trial.instance_id
    and c.segment in ('at_risk','winback');

  select count(*)::integer into v_campaign_usage
  from public.marketing_campaigns
  where instance_id=v_trial.instance_id
    and created_at>=v_trial.starts_at and created_at<v_trial.ends_at;

  select
    (select count(*) from public.commercial_opportunities
      where instance_id=v_trial.instance_id and created_at>=v_trial.starts_at and created_at<v_trial.ends_at)
    +(select count(*) from public.sales_tasks
      where instance_id=v_trial.instance_id and created_at>=v_trial.starts_at and created_at<v_trial.ends_at)
  into v_crm_usage;

  select
    (select count(*) from public.customer_journeys
      where instance_id=v_trial.instance_id and created_at>=v_trial.starts_at and created_at<v_trial.ends_at)
    +(select count(*) from public.automation_runbook_instances
      where instance_id=v_trial.instance_id and created_at>=v_trial.starts_at and created_at<v_trial.ends_at)
  into v_automation_usage;

  select count(*)::integer into v_procurement_usage
  from public.purchase_orders
  where instance_id=v_trial.instance_id
    and created_at>=v_trial.starts_at and created_at<v_trial.ends_at;

  if v_campaign_usage>0 then
    v_used:=v_used||jsonb_build_array(jsonb_build_object('featureCode','advancedCampaigns','evidenceCount',v_campaign_usage));
  end if;
  if v_crm_usage>0 then
    v_used:=v_used||jsonb_build_array(jsonb_build_object('featureCode','crm','evidenceCount',v_crm_usage));
  end if;
  if v_automation_usage>0 then
    v_used:=v_used||jsonb_build_array(jsonb_build_object('featureCode','automation','evidenceCount',v_automation_usage));
  end if;
  if v_procurement_usage>0 then
    v_used:=v_used||jsonb_build_array(jsonb_build_object('featureCode','procurement','evidenceCount',v_procurement_usage));
  end if;

  if v_automation_usage=0 and (v_recovery_open>0 or v_retention_targets>0) then
    v_opportunities:=v_opportunities||jsonb_build_array(jsonb_build_object(
      'featureCode','automation',
      'reasonCode','RECOVERY_OR_RETENTION_SIGNAL',
      'evidence',jsonb_build_object('openRecoveries',v_recovery_open,'retentionTargets',v_retention_targets)
    ));
  end if;
  if v_procurement_usage=0 and v_stockout_events>0 then
    v_opportunities:=v_opportunities||jsonb_build_array(jsonb_build_object(
      'featureCode','procurement',
      'reasonCode','STOCKOUT_SIGNAL',
      'evidence',jsonb_build_object('stockoutEvents',v_stockout_events)
    ));
  end if;

  v_used_count:=jsonb_array_length(v_used);
  v_opportunity_count:=jsonb_array_length(v_opportunities);

  if v_used_count>=2 or (v_used_count>=1 and v_opportunity_count>=1) or v_opportunity_count>=2 then
    v_plan:='pro';
  else
    v_plan:='alap';
  end if;

  if v_orders>=10 and (v_used_count+v_opportunity_count)>=2 then
    v_confidence:='high';
  elsif v_orders>=3 or (v_used_count+v_opportunity_count)>=1 then
    v_confidence:='medium';
  else
    v_confidence:='low';
  end if;

  if v_plan='pro' then
    if v_used_count>=2 then v_reason_codes:=v_reason_codes||jsonb_build_array('MULTIPLE_PRO_CAPABILITIES_USED'); end if;
    if v_used_count>=1 and v_opportunity_count>=1 then v_reason_codes:=v_reason_codes||jsonb_build_array('PRO_USAGE_AND_RELEVANT_OPPORTUNITY'); end if;
    if v_opportunity_count>=2 then v_reason_codes:=v_reason_codes||jsonb_build_array('MULTIPLE_RELEVANT_PRO_OPPORTUNITIES'); end if;
  else
    v_reason_codes:=jsonb_build_array('PRO_NEED_NOT_DEMONSTRATED');
  end if;

  v_facts:=jsonb_build_object(
    'revenue',jsonb_build_object('recognizedGrossHuf',v_revenue),
    'orders',jsonb_build_object('recognizedOrders',v_orders),
    'customers',jsonb_build_object('distinctCustomers',v_customers),
    'productPerformance',v_product_performance,
    'categoryPerformance','[]'::jsonb,
    'categoryDataAvailable',false,
    'inventory',jsonb_build_object('stockoutEvents',v_stockout_events,'stockoutVariants',v_stockout_variants),
    'campaigns',jsonb_build_object(
      'campaignCount',v_campaign_count,
      'configuredBudgetHuf',v_campaign_budget,
      'attributedRevenueGrossHuf',v_campaign_attributed_revenue,
      'actualSpendAvailable',false,
      'roasAvailable',false
    ),
    'checkoutRecovery',jsonb_build_object(
      'created',v_recovery_created,
      'converted',v_recovery_converted,
      'open',v_recovery_open
    ),
    'proCapabilityUsage',v_used
  );

  v_calculations:=jsonb_build_object(
    'averageOrderValueGrossHuf',v_aov,
    'checkoutRecoveryConversionRate',
      case when v_recovery_created>0 then round((v_recovery_converted::numeric/v_recovery_created)*100,2) else null end,
    'configuredBudgetRevenueRatio',
      case when v_campaign_budget>0 then round(v_campaign_attributed_revenue::numeric/v_campaign_budget,2) else null end,
    'configuredBudgetRevenueRatioIsRoas',false,
    'relevantUnusedProCapabilities',v_opportunities,
    'proCapabilityUsageCount',v_used_count,
    'relevantUnusedProCapabilityCount',v_opportunity_count,
    'dataQuality',jsonb_build_object(
      'categoryPerformance','unavailable_no_catalog_category_model',
      'campaignActualSpend','unavailable_not_persisted',
      'campaignRoas','unavailable_without_actual_spend',
      'viewOnlyFeatureUsage','not_instrumented'
    )
  );

  v_recommendations:=jsonb_build_object(
    'plan',jsonb_build_object(
      'recommendedPlan',v_plan,
      'confidence',v_confidence,
      'reasonCodes',v_reason_codes,
      'revenueThresholdUsed',false
    ),
    'opportunities',v_opportunities,
    'limitations',jsonb_build_array(
      'CATEGORY_PERFORMANCE_NOT_MEASURABLE',
      'CAMPAIGN_ACTUAL_SPEND_NOT_MEASURABLE',
      'VIEW_ONLY_FEATURE_USAGE_NOT_INSTRUMENTED'
    )
  );

  insert into public.business_pulse_reports(
    instance_id,organization_id,trial_id,period_start,period_end,
    facts,calculations,recommendations,recommended_plan,confidence,generation_key,generated_by
  )
  values(
    v_trial.instance_id,v_trial.organization_id,v_trial.id,v_trial.starts_at,v_trial.ends_at,
    v_facts,v_calculations,v_recommendations,v_plan,v_confidence,trim(p_generation_key),p_actor_id
  )
  returning * into v_report;

  update public.business_pulse_trials
  set status='completed',completed_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_trial.id and status='active';

  if not found then raise exception 'BUSINESS_PULSE_TRIAL_COMPLETION_CONFLICT'; end if;

  return v_report;
end
$$;

create or replace function public.service_generate_due_business_pulse_reports_v1(
  p_run_key text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trial record;
  v_generated integer:=0;
  v_failures jsonb:='[]'::jsonb;
  v_report public.business_pulse_reports%rowtype;
begin
  if nullif(trim(p_run_key),'') is null then
    raise exception 'BUSINESS_PULSE_RUN_KEY_REQUIRED';
  end if;

  for v_trial in
    select id
    from public.business_pulse_trials
    where status='active' and ends_at<=clock_timestamp()
    order by ends_at,id
    limit 25
  loop
    begin
      v_report:=public.service_generate_business_pulse_report_v1(
        v_trial.id,null,trim(p_run_key)||':'||v_trial.id::text
      );
      if v_report.id is null then raise exception 'BUSINESS_PULSE_REPORT_EVIDENCE_MISSING'; end if;
      v_generated:=v_generated+1;
    exception when others then
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'trialId',v_trial.id,
        'error',sqlstate||':'||sqlerrm
      ));
    end;
  end loop;

  return jsonb_build_object(
    'runKey',trim(p_run_key),
    'generated',v_generated,
    'failed',jsonb_array_length(v_failures),
    'failures',v_failures,
    'checkedAt',clock_timestamp()
  );
end
$$;

revoke all on function public.business_pulse_report_tenant_guard_v1() from public,anon,authenticated;
revoke all on function public.service_start_business_pulse_trial_v1(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.service_generate_business_pulse_report_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.service_generate_due_business_pulse_reports_v1(text) from public,anon,authenticated;
grant execute on function public.service_start_business_pulse_trial_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.service_generate_business_pulse_report_v1(uuid,uuid,text) to service_role;
grant execute on function public.service_generate_due_business_pulse_reports_v1(text) to service_role;

-- Explicit launch invariants: this migration never changes webshop status/plan,
-- never configures Office mailboxes, and never enables dormant launch-gated features.
