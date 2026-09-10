-- Roadmap Block 10 — Business Pulse / Trial Intelligence lifecycle closure.
-- Adds the accepted 5d / 7d / 2d / day-30 lifecycle, platform-account notifications,
-- storefront pause + 30-day retention, and explicit Alap/Pro activation.
-- It never activates Office mailboxes and never releases dormant Pro capabilities.

alter table public.business_pulse_trials add column if not exists initial_instance_status text;
alter table public.business_pulse_trials add column if not exists initial_subscription_plan text;
alter table public.business_pulse_trials add column if not exists paused_at timestamptz;
alter table public.business_pulse_trials add column if not exists activated_at timestamptz;
alter table public.business_pulse_trials add column if not exists activation_plan text;
alter table public.business_pulse_trials add column if not exists retention_until timestamptz;

update public.business_pulse_trials t
set initial_instance_status=w.status,
    initial_subscription_plan=w.subscription_plan
from public.webshop_instances w
where w.id=t.instance_id
  and (t.initial_instance_status is null or t.initial_subscription_plan is null);

alter table public.business_pulse_trials alter column initial_instance_status set not null;
alter table public.business_pulse_trials alter column initial_subscription_plan set not null;

alter table public.business_pulse_trials drop constraint if exists business_pulse_trials_status_check;
alter table public.business_pulse_trials
  add constraint business_pulse_trials_status_check
  check(status in ('active','completed','paused','activated','cancelled'));

alter table public.business_pulse_trials drop constraint if exists business_pulse_trials_terminal_check;
alter table public.business_pulse_trials
  add constraint business_pulse_trials_terminal_check
  check(
    (status='active' and completed_at is null and paused_at is null and activated_at is null and cancelled_at is null)
    or (status='completed' and completed_at is not null and activated_at is null and cancelled_at is null)
    or (status='paused' and completed_at is not null and paused_at is not null and retention_until is not null and activated_at is null and cancelled_at is null)
    or (status='activated' and completed_at is not null and activated_at is not null and activation_plan in ('alap','pro') and cancelled_at is null)
    or (status='cancelled' and cancelled_at is not null and activated_at is null)
  );

alter table public.business_pulse_trials drop constraint if exists business_pulse_trials_activation_plan_check;
alter table public.business_pulse_trials
  add constraint business_pulse_trials_activation_plan_check
  check(activation_plan is null or activation_plan in ('alap','pro'));

alter table public.business_pulse_trials drop constraint if exists business_pulse_trials_retention_check;
alter table public.business_pulse_trials
  add constraint business_pulse_trials_retention_check
  check(status<>'paused' or retention_until=ends_at+interval '30 days');

create table if not exists public.business_pulse_trial_events(
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.business_pulse_trials(id) on delete cascade,
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null,
  event_type text not null check(event_type in(
    'inactivity_reminder_5d','expiry_status_7d','expiry_reminder_2d',
    'evaluation_ready','storefront_paused','activated'
  )),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text,
  template_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in('pending','processing','sent','failed','recorded')),
  attempts integer not null default 0 check(attempts>=0 and attempts<=5),
  next_attempt_at timestamptz,
  claim_token uuid,
  claimed_at timestamptz,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trial_id,event_key),
  constraint business_pulse_trial_events_notification_check check(
    (status='recorded' and recipient_email is null and template_key is null)
    or (status<>'recorded' and recipient_email is not null and template_key is not null)
  )
);

create index if not exists business_pulse_trial_events_due_idx
  on public.business_pulse_trial_events(status,next_attempt_at,created_at)
  where status in('pending','failed','processing');
create index if not exists business_pulse_trial_events_instance_idx
  on public.business_pulse_trial_events(instance_id,created_at desc);
create index if not exists business_pulse_trial_events_org_idx
  on public.business_pulse_trial_events(organization_id,instance_id);

create or replace function public.business_pulse_trial_event_tenant_guard_v1()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_instance uuid;
  v_organization uuid;
begin
  select instance_id,organization_id into v_instance,v_organization
  from public.business_pulse_trials where id=new.trial_id;
  if v_instance is null then raise exception 'BUSINESS_PULSE_TRIAL_NOT_FOUND'; end if;
  if new.instance_id<>v_instance or new.organization_id<>v_organization then
    raise exception 'BUSINESS_PULSE_EVENT_TENANT_MISMATCH';
  end if;
  return new;
end
$$;

drop trigger if exists business_pulse_trial_event_tenant_guard_v1 on public.business_pulse_trial_events;
create trigger business_pulse_trial_event_tenant_guard_v1
before insert or update of trial_id,instance_id,organization_id on public.business_pulse_trial_events
for each row execute function public.business_pulse_trial_event_tenant_guard_v1();

alter table public.business_pulse_trial_events enable row level security;
drop policy if exists business_pulse_trial_events_member_read_v1 on public.business_pulse_trial_events;
create policy business_pulse_trial_events_member_read_v1
on public.business_pulse_trial_events
for select
to authenticated
using(
  exists(
    select 1 from public.webshop_instance_members m
    where m.instance_id=business_pulse_trial_events.instance_id
      and m.user_id=(select auth.uid())
  )
);
revoke all on table public.business_pulse_trial_events from public,anon,authenticated;
grant select on table public.business_pulse_trial_events to authenticated;

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
    'advancedAnalytics','crm','advancedCampaigns','officeCommunicationAdvanced',
    'automation','procurement','cashflow','executiveAnalytics','advancedIntegrations'
  ];
begin
  if p_instance_id is null or p_actor_id is null or nullif(trim(p_start_key),'') is null then
    raise exception 'BUSINESS_PULSE_START_INPUT_REQUIRED';
  end if;
  if p_source not in('platform','founding','manual') then raise exception 'BUSINESS_PULSE_SOURCE_INVALID'; end if;
  if not exists(
    select 1 from public.platform_operators
    where user_id=p_actor_id and role in('owner','admin','operator')
  ) then raise exception 'BUSINESS_PULSE_PLATFORM_OPERATOR_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('business-pulse-trial:'||p_instance_id::text,0));
  select * into v_instance from public.webshop_instances where id=p_instance_id for update;
  if not found or v_instance.organization_id is null then raise exception 'BUSINESS_PULSE_INSTANCE_NOT_FOUND'; end if;
  if v_instance.status<>'pilot' then raise exception 'BUSINESS_PULSE_PILOT_REQUIRED'; end if;
  if v_instance.subscription_plan<>'alap' then raise exception 'BUSINESS_PULSE_TRIAL_BASE_PLAN_REQUIRED'; end if;
  if exists(
    select 1 from public.business_pulse_trials
    where instance_id=p_instance_id and status<>'cancelled'
  ) then raise exception 'BUSINESS_PULSE_TRIAL_ALREADY_EXISTS'; end if;

  v_end:=v_start+interval '30 days';
  insert into public.business_pulse_trials(
    instance_id,organization_id,status,starts_at,ends_at,started_by,source,start_key,metadata,
    initial_instance_status,initial_subscription_plan
  ) values(
    p_instance_id,v_instance.organization_id,'active',v_start,v_end,p_actor_id,p_source,trim(p_start_key),
    jsonb_build_object('trialDays',30,'fullPro',true,'planMutation',false,'releasedFeaturesOnly',true),
    v_instance.status,v_instance.subscription_plan
  ) returning * into v_trial;

  foreach v_feature in array v_features loop
    insert into public.feature_entitlements(
      organization_id,instance_id,feature_code,source,enabled,valid_from,valid_until,metadata
    ) values(
      v_instance.organization_id,p_instance_id,v_feature,'trial',true,v_start,v_end,
      jsonb_build_object('businessPulseTrialId',v_trial.id,'startKey',trim(p_start_key))
    );
  end loop;
  return v_trial;
end
$$;

create or replace function public.service_plan_business_pulse_notice_v1(
  p_trial_id uuid,
  p_event_type text,
  p_days_remaining integer default null,
  p_recommended_plan text default null
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trial public.business_pulse_trials%rowtype;
  v_instance public.webshop_instances%rowtype;
  v_template text;
  v_member record;
  v_count integer:=0;
begin
  select * into v_trial from public.business_pulse_trials where id=p_trial_id;
  if not found then raise exception 'BUSINESS_PULSE_TRIAL_NOT_FOUND'; end if;
  select * into v_instance from public.webshop_instances where id=v_trial.instance_id;
  if not found then raise exception 'BUSINESS_PULSE_INSTANCE_NOT_FOUND'; end if;

  v_template:=case p_event_type
    when 'inactivity_reminder_5d' then 'trial_inactivity_5d'
    when 'expiry_status_7d' then 'trial_expiry_7d'
    when 'expiry_reminder_2d' then 'trial_expiry_2d'
    when 'evaluation_ready' then 'trial_evaluation_ready'
    else null
  end;
  if v_template is null then raise exception 'BUSINESS_PULSE_NOTICE_TYPE_INVALID'; end if;
  if p_recommended_plan is not null and p_recommended_plan not in('alap','pro') then
    raise exception 'BUSINESS_PULSE_RECOMMENDED_PLAN_INVALID';
  end if;

  for v_member in
    select m.user_id,p.email,p.full_name
    from public.webshop_instance_members m
    join public.profiles p on p.id=m.user_id
    where m.instance_id=v_trial.instance_id
      and m.role='owner'
      and length(trim(coalesce(p.email,'')))>=5
  loop
    insert into public.business_pulse_trial_events(
      trial_id,instance_id,organization_id,event_key,event_type,
      recipient_user_id,recipient_email,template_key,payload,status,next_attempt_at
    ) values(
      v_trial.id,v_trial.instance_id,v_trial.organization_id,
      p_event_type||':'||v_member.user_id::text,p_event_type,
      v_member.user_id,lower(trim(v_member.email)),v_template,
      jsonb_build_object(
        'name',coalesce(nullif(trim(v_member.full_name),''),'Ügyfelünk'),
        'storeName',v_instance.name,
        'trialEndsAt',v_trial.ends_at,
        'daysRemaining',p_days_remaining,
        'recommendedPlan',p_recommended_plan,
        'businessPulseUrl','/admin/business-pulse'
      ),
      'pending',clock_timestamp()
    ) on conflict(trial_id,event_key) do nothing;
    if found then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end
$$;

create or replace function public.service_process_business_pulse_lifecycle_v1(p_run_key text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trial public.business_pulse_trials%rowtype;
  v_report public.business_pulse_reports%rowtype;
  v_last_activity timestamptz;
  v_planned integer:=0;
  v_evaluated integer:=0;
  v_paused integer:=0;
  v_failures jsonb:='[]'::jsonb;
  v_now timestamptz:=clock_timestamp();
begin
  if nullif(trim(p_run_key),'') is null then raise exception 'BUSINESS_PULSE_RUN_KEY_REQUIRED'; end if;

  for v_trial in
    select * from public.business_pulse_trials
    where status='active'
    order by ends_at,id
    for update skip locked
  loop
    begin
      select greatest(
        v_trial.starts_at,
        coalesce((
          select max(a.created_at)
          from public.admin_audit_log a
          where a.instance_id=v_trial.instance_id
            and a.created_at>=v_trial.starts_at
            and a.actor_user_id in(
              select m.user_id from public.webshop_instance_members m
              where m.instance_id=v_trial.instance_id and m.role='owner'
            )
        ),v_trial.starts_at),
        coalesce((
          select max(u.last_sign_in_at)
          from public.webshop_instance_members m
          join auth.users u on u.id=m.user_id
          where m.instance_id=v_trial.instance_id and m.role='owner'
            and u.last_sign_in_at>=v_trial.starts_at
        ),v_trial.starts_at)
      ) into v_last_activity;

      if v_now>=v_last_activity+interval '5 days' and v_now<v_trial.ends_at-interval '7 days' then
        v_planned:=v_planned+public.service_plan_business_pulse_notice_v1(v_trial.id,'inactivity_reminder_5d',null,null);
      end if;
      if v_now>=v_trial.ends_at-interval '7 days' and v_now<v_trial.ends_at-interval '2 days' then
        v_planned:=v_planned+public.service_plan_business_pulse_notice_v1(v_trial.id,'expiry_status_7d',7,null);
      end if;
      if v_now>=v_trial.ends_at-interval '2 days' and v_now<v_trial.ends_at then
        v_planned:=v_planned+public.service_plan_business_pulse_notice_v1(v_trial.id,'expiry_reminder_2d',2,null);
      end if;

      if v_now>=v_trial.ends_at then
        v_report:=public.service_generate_business_pulse_report_v1(
          v_trial.id,null,trim(p_run_key)||':'||v_trial.id::text
        );
        if v_report.id is null then raise exception 'BUSINESS_PULSE_REPORT_EVIDENCE_MISSING'; end if;
        v_evaluated:=v_evaluated+1;
        v_planned:=v_planned+public.service_plan_business_pulse_notice_v1(
          v_trial.id,'evaluation_ready',0,v_report.recommended_plan
        );

        update public.business_pulse_trials
        set status='paused',
            paused_at=coalesce(paused_at,clock_timestamp()),
            retention_until=ends_at+interval '30 days',
            updated_at=clock_timestamp()
        where id=v_trial.id and status='completed';
        if found then
          v_paused:=v_paused+1;
          insert into public.business_pulse_trial_events(
            trial_id,instance_id,organization_id,event_key,event_type,payload,status
          ) values(
            v_trial.id,v_trial.instance_id,v_trial.organization_id,
            'storefront_paused','storefront_paused',
            jsonb_build_object('retentionDays',30,'dataPreserved',true,'instanceStatusMutated',false),
            'recorded'
          ) on conflict(trial_id,event_key) do nothing;
        end if;
      end if;
    exception when others then
      v_failures:=v_failures||jsonb_build_array(jsonb_build_object(
        'trialId',v_trial.id,'error',sqlstate||':'||sqlerrm
      ));
    end;
  end loop;

  return jsonb_build_object(
    'runKey',trim(p_run_key),'planned',v_planned,'evaluated',v_evaluated,'paused',v_paused,
    'failed',jsonb_array_length(v_failures),'failures',v_failures,'checkedAt',clock_timestamp()
  );
end
$$;

create or replace function public.service_activate_business_pulse_trial_v1(
  p_trial_id uuid,
  p_actor_id uuid,
  p_plan text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_trial public.business_pulse_trials%rowtype;
  v_config jsonb;
begin
  if p_trial_id is null or p_actor_id is null or p_plan not in('alap','pro') then
    raise exception 'BUSINESS_PULSE_ACTIVATION_INPUT_INVALID';
  end if;
  if not exists(
    select 1 from public.platform_operators
    where user_id=p_actor_id and role in('owner','admin','operator')
  ) then raise exception 'BUSINESS_PULSE_PLATFORM_OPERATOR_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('business-pulse-activate:'||p_trial_id::text,0));
  select * into v_trial from public.business_pulse_trials where id=p_trial_id for update;
  if not found then raise exception 'BUSINESS_PULSE_TRIAL_NOT_FOUND'; end if;
  if v_trial.status not in('completed','paused') then raise exception 'BUSINESS_PULSE_TRIAL_NOT_ACTIVATABLE'; end if;
  if not exists(select 1 from public.business_pulse_reports where trial_id=v_trial.id) then
    raise exception 'BUSINESS_PULSE_REPORT_REQUIRED';
  end if;
  if v_trial.status='paused' and v_trial.retention_until is not null and clock_timestamp()>v_trial.retention_until then
    raise exception 'BUSINESS_PULSE_RETENTION_EXPIRED';
  end if;

  v_config:=public.platform_mutate_webshop_config_v3(
    v_trial.instance_id,p_actor_id,'plan_status',jsonb_build_object('plan',p_plan,'status','active')
  );
  if v_config->>'id'<>v_trial.instance_id::text or v_config->>'plan'<>p_plan or v_config->>'status'<>'active' then
    raise exception 'BUSINESS_PULSE_ACTIVATION_EVIDENCE_MISSING';
  end if;

  update public.business_pulse_trials
  set status='activated',activated_at=clock_timestamp(),activation_plan=p_plan,
      retention_until=null,updated_at=clock_timestamp()
  where id=v_trial.id
  returning * into v_trial;

  insert into public.business_pulse_trial_events(
    trial_id,instance_id,organization_id,event_key,event_type,payload,status
  ) values(
    v_trial.id,v_trial.instance_id,v_trial.organization_id,'activated','activated',
    jsonb_build_object('plan',p_plan,'dataPreserved',true,'instanceStatus','active'),'recorded'
  ) on conflict(trial_id,event_key) do nothing;

  return jsonb_build_object(
    'trialId',v_trial.id,'instanceId',v_trial.instance_id,'plan',p_plan,
    'status','activated','dataPreserved',true
  );
end
$$;

create or replace function public.service_claim_business_pulse_notifications_v1(p_limit integer default 20)
returns setof public.business_pulse_trial_events
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.business_pulse_trial_events
  set status='failed',
      next_attempt_at=case when attempts<5 then clock_timestamp()+interval '5 minutes' else null end,
      claim_token=null,claimed_at=null,last_error='STALE_BUSINESS_PULSE_NOTIFICATION_CLAIM',updated_at=clock_timestamp()
  where status='processing' and claimed_at<clock_timestamp()-interval '15 minutes';

  return query
  with candidates as(
    select id from public.business_pulse_trial_events
    where template_key is not null
      and attempts<5
      and(
        status='pending'
        or(status='failed' and next_attempt_at is not null and next_attempt_at<=clock_timestamp())
      )
    order by coalesce(next_attempt_at,created_at),created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),50))
  ),claimed as(
    update public.business_pulse_trial_events e
    set status='processing',attempts=e.attempts+1,claim_token=gen_random_uuid(),claimed_at=clock_timestamp(),updated_at=clock_timestamp()
    from candidates c where e.id=c.id
    returning e.*
  ) select * from claimed;
end
$$;

create or replace function public.service_complete_business_pulse_notification_v1(
  p_id uuid,p_claim_token uuid,p_provider_message_id text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.business_pulse_trial_events
  set status='sent',provider_message_id=left(p_provider_message_id,500),sent_at=clock_timestamp(),
      claim_token=null,claimed_at=null,next_attempt_at=null,last_error=null,updated_at=clock_timestamp()
  where id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end
$$;

create or replace function public.service_fail_business_pulse_notification_v1(
  p_id uuid,p_claim_token uuid,p_error text,p_retry boolean default true
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  update public.business_pulse_trial_events
  set status='failed',last_error=left(coalesce(p_error,'UNKNOWN_BUSINESS_PULSE_NOTIFICATION_ERROR'),2000),
      next_attempt_at=case when p_retry and attempts<5 then clock_timestamp()+make_interval(mins=>least(60,attempts*5)) else null end,
      claim_token=null,claimed_at=null,updated_at=clock_timestamp()
  where id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end
$$;

revoke all on function public.business_pulse_trial_event_tenant_guard_v1() from public,anon,authenticated;
revoke all on function public.service_start_business_pulse_trial_v1(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.service_plan_business_pulse_notice_v1(uuid,text,integer,text) from public,anon,authenticated;
revoke all on function public.service_process_business_pulse_lifecycle_v1(text) from public,anon,authenticated;
revoke all on function public.service_activate_business_pulse_trial_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.service_claim_business_pulse_notifications_v1(integer) from public,anon,authenticated;
revoke all on function public.service_complete_business_pulse_notification_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.service_fail_business_pulse_notification_v1(uuid,uuid,text,boolean) from public,anon,authenticated;

grant execute on function public.service_start_business_pulse_trial_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.service_plan_business_pulse_notice_v1(uuid,text,integer,text) to service_role;
grant execute on function public.service_process_business_pulse_lifecycle_v1(text) to service_role;
grant execute on function public.service_activate_business_pulse_trial_v1(uuid,uuid,text) to service_role;
grant execute on function public.service_claim_business_pulse_notifications_v1(integer) to service_role;
grant execute on function public.service_complete_business_pulse_notification_v1(uuid,uuid,text) to service_role;
grant execute on function public.service_fail_business_pulse_notification_v1(uuid,uuid,text,boolean) to service_role;

-- Retention is preservation-only in Block 10. No automatic delete/purge operation is introduced.
-- The persisted webshop plan/status changes only after explicit activation through the existing
-- audited platform_mutate_webshop_config_v3 authority.
