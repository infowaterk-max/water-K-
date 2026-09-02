-- Close the remaining tenant gaps across support, communication, digital office and recovery flows.
-- Runtime business operations must always carry an explicit webshop instance.

alter table public.office_threads add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.office_messages add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.office_tasks add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.communication_worker_runs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.communication_job_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.communication_suppression_events add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.stock_notifications add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

update public.office_threads t set instance_id=o.instance_id from public.orders o where t.order_id=o.id and t.instance_id is null;
update public.office_threads set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.office_messages m set instance_id=t.instance_id from public.office_threads t where m.thread_id=t.id and m.instance_id is null;
update public.office_tasks x set instance_id=t.instance_id from public.office_threads t where x.thread_id=t.id and x.instance_id is null;
update public.office_tasks set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.communication_job_events e set instance_id=j.instance_id from public.communication_jobs j where e.job_id=j.id and e.instance_id is null;
update public.communication_suppression_events e set instance_id=s.instance_id from public.communication_suppressions s where e.suppression_id=s.id and e.instance_id is null;
update public.communication_suppression_events set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.communication_worker_runs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.stock_notifications n set instance_id=v.instance_id from public.product_variants v where n.variant_id=v.id and n.instance_id is null;

do $$
declare gap record;
begin
  for gap in
    select * from (values
      ('office_threads',(select count(*)::bigint from public.office_threads where instance_id is null)),
      ('office_messages',(select count(*)::bigint from public.office_messages where instance_id is null)),
      ('office_tasks',(select count(*)::bigint from public.office_tasks where instance_id is null)),
      ('communication_worker_runs',(select count(*)::bigint from public.communication_worker_runs where instance_id is null)),
      ('communication_job_events',(select count(*)::bigint from public.communication_job_events where instance_id is null)),
      ('communication_suppression_events',(select count(*)::bigint from public.communication_suppression_events where instance_id is null)),
      ('stock_notifications',(select count(*)::bigint from public.stock_notifications where instance_id is null))
    ) as gaps(table_name,rows_without_instance)
  loop
    if gap.rows_without_instance>0 then
      raise exception 'Communication tenant hardening blocked: % contains % rows without instance_id',gap.table_name,gap.rows_without_instance;
    end if;
  end loop;
end $$;

alter table public.office_threads alter column instance_id set not null;
alter table public.office_messages alter column instance_id set not null;
alter table public.office_tasks alter column instance_id set not null;
alter table public.communication_worker_runs alter column instance_id set not null;
alter table public.communication_job_events alter column instance_id set not null;
alter table public.communication_suppression_events alter column instance_id set not null;
alter table public.stock_notifications alter column instance_id set not null;

create index if not exists office_threads_instance_updated_idx on public.office_threads(instance_id,updated_at desc);
create index if not exists office_messages_instance_thread_idx on public.office_messages(instance_id,thread_id,created_at);
create index if not exists office_tasks_instance_status_idx on public.office_tasks(instance_id,status,due_at);
create index if not exists communication_worker_runs_instance_started_idx on public.communication_worker_runs(instance_id,started_at desc);
create index if not exists communication_job_events_instance_job_idx on public.communication_job_events(instance_id,job_id,created_at desc);
create index if not exists communication_suppression_events_instance_email_idx on public.communication_suppression_events(instance_id,lower(email),created_at desc);

alter table public.communication_jobs drop constraint if exists communication_jobs_idempotency_key_key;
drop index if exists public.communication_jobs_idempotency_key_key;
create unique index if not exists communication_jobs_instance_idempotency_uidx on public.communication_jobs(instance_id,idempotency_key);

drop index if exists public.communication_suppressions_provider_event_uidx;
create unique index if not exists communication_suppressions_instance_provider_event_uidx
  on public.communication_suppressions(instance_id,provider_event_id) where provider_event_id is not null;

drop index if exists public.office_messages_external_message_uidx;
create unique index if not exists office_messages_instance_external_message_uidx
  on public.office_messages(instance_id,external_message_id) where external_message_id is not null;

drop index if exists public.checkout_recovery_open_user_uq;
create unique index if not exists checkout_recovery_open_instance_user_uq
  on public.checkout_recovery_intents(instance_id,user_id) where status='open';

create or replace function public.initialize_support_ticket_thread()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.message is not null and char_length(trim(new.message))>0 then
    insert into public.support_ticket_messages(instance_id,ticket_id,author_user_id,author_role,message,created_at)
    values(new.instance_id,new.id,new.user_id,'customer',new.message,new.created_at)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.sync_support_ticket_from_message()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.author_role='customer' then
    update public.support_tickets set status='open',updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id and status<>'closed';
  elsif new.author_role='admin' then
    update public.support_tickets set status='waiting_customer',updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id and status<>'closed';
  else
    update public.support_tickets set updated_at=greatest(updated_at,new.created_at)
    where id=new.ticket_id and instance_id=new.instance_id;
  end if;
  return new;
end;
$$;

create or replace function public.guard_closed_support_thread()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_status public.support_ticket_status;v_instance uuid;
begin
  select status,instance_id into v_status,v_instance from public.support_tickets where id=new.ticket_id for update;
  if not found then raise exception 'Az ügy nem található.'; end if;
  if v_instance<>new.instance_id then raise exception 'Cross-store support relation is not allowed.'; end if;
  if v_status='closed' then raise exception 'A lezárt ügyhöz nem küldhető új üzenet.'; end if;
  return new;
end;
$$;

create or replace function public.enforce_office_thread_tenant()
returns trigger language plpgsql set search_path='' as $$
declare v_instance uuid;
begin
  if new.order_id is null then return new; end if;
  select instance_id into v_instance from public.orders where id=new.order_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store office order relation is not allowed.'; end if;
  return new;
end;
$$;

create or replace function public.enforce_office_message_tenant()
returns trigger language plpgsql set search_path='' as $$
declare v_thread_instance uuid;v_job_instance uuid;
begin
  select instance_id into v_thread_instance from public.office_threads where id=new.thread_id;
  if v_thread_instance is null or new.instance_id<>v_thread_instance then raise exception 'Cross-store office message relation is not allowed.'; end if;
  if new.communication_job_id is not null then
    select instance_id into v_job_instance from public.communication_jobs where id=new.communication_job_id;
    if v_job_instance is null or new.instance_id<>v_job_instance then raise exception 'Cross-store office communication relation is not allowed.'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_office_task_tenant()
returns trigger language plpgsql set search_path='' as $$
declare v_instance uuid;
begin
  if new.thread_id is null then return new; end if;
  select instance_id into v_instance from public.office_threads where id=new.thread_id;
  if v_instance is null or new.instance_id<>v_instance then raise exception 'Cross-store office task relation is not allowed.'; end if;
  return new;
end;
$$;

drop trigger if exists tenant_office_thread_order on public.office_threads;
create trigger tenant_office_thread_order before insert or update of order_id,instance_id on public.office_threads
for each row execute function public.enforce_office_thread_tenant();
drop trigger if exists tenant_office_message_parent on public.office_messages;
create trigger tenant_office_message_parent before insert or update of thread_id,communication_job_id,instance_id on public.office_messages
for each row execute function public.enforce_office_message_tenant();
drop trigger if exists tenant_office_task_parent on public.office_tasks;
create trigger tenant_office_task_parent before insert or update of thread_id,instance_id on public.office_tasks
for each row execute function public.enforce_office_task_tenant();

do $$ declare p record; begin
  for p in select tablename,policyname from pg_policies
    where schemaname='public' and tablename=any(array['office_threads','office_messages','office_tasks'])
  loop execute format('drop policy if exists %I on public.%I',p.policyname,p.tablename); end loop;
end $$;
alter table public.office_threads enable row level security;
alter table public.office_messages enable row level security;
alter table public.office_tasks enable row level security;
create policy office_threads_store_all on public.office_threads for all to authenticated
  using(public.can_manage_support(instance_id)) with check(public.can_manage_support(instance_id));
create policy office_messages_store_all on public.office_messages for all to authenticated
  using(public.can_manage_support(instance_id)) with check(public.can_manage_support(instance_id));
create policy office_tasks_store_all on public.office_tasks for all to authenticated
  using(public.can_manage_support(instance_id)) with check(public.can_manage_support(instance_id));

create or replace function public.has_marketing_consent_v2(p_instance_id uuid,p_email text,p_channel text default 'email')
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select mc.status='granted' from public.marketing_consents mc
    where mc.instance_id=p_instance_id and lower(mc.email)=lower(trim(p_email)) and mc.channel=p_channel
    order by mc.occurred_at desc,mc.id desc limit 1),false);
$$;

create or replace function public.is_communication_suppressed_v2(p_instance_id uuid,p_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.communication_suppressions
    where instance_id=p_instance_id and lower(email)=lower(trim(p_email)) and active=true);
$$;

create or replace function public.enqueue_communication_v2(
  p_instance_id uuid,p_email text,p_user_id uuid,p_purpose text,p_template_key text,p_payload jsonb,p_idempotency_key text,p_scheduled_at timestamptz default now()
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_requires_approval boolean;
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'invalid tenant'; end if;
  if p_purpose not in('transactional','marketing') then raise exception 'invalid purpose'; end if;
  if public.is_communication_suppressed_v2(p_instance_id,p_email) then raise exception 'recipient suppressed'; end if;
  if p_purpose='marketing' and not public.has_marketing_consent_v2(p_instance_id,p_email,'email') then raise exception 'marketing consent required'; end if;
  v_requires_approval:=(p_purpose='marketing');
  insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,scheduled_at,requires_approval,approved_at,approved_by)
  values(p_instance_id,lower(trim(p_email)),p_user_id,p_purpose,p_template_key,coalesce(p_payload,'{}'::jsonb),p_idempotency_key,p_scheduled_at,v_requires_approval,null,null)
  on conflict(instance_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.recover_stale_communication_jobs_v2(p_instance_id uuid,p_stale_minutes integer default 15)
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  update public.communication_jobs set
    status=case when attempts<5 then 'pending' else 'failed' end,
    scheduled_at=case when attempts<5 then now()+interval '5 minutes' else scheduled_at end,
    last_error=case when attempts<5 then 'STALE_WORKER_CLAIM_RECOVERED' else 'STALE_WORKER_CLAIM_MAX_ATTEMPTS' end,
    claim_token=null,claimed_at=null,updated_at=now()
  where instance_id=p_instance_id and status='processing' and claimed_at is not null
    and claimed_at<now()-make_interval(mins=>greatest(5,p_stale_minutes));
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

create or replace function public.claim_communication_jobs_v2(p_instance_id uuid,p_limit integer default 10)
returns setof public.communication_jobs language plpgsql security definer set search_path='' as $$
begin
  return query with candidates as(
    select id from public.communication_jobs
    where instance_id=p_instance_id and status='pending' and scheduled_at<=now()
      and (requires_approval=false or approved_at is not null)
    order by scheduled_at,created_at for update skip locked limit greatest(1,least(p_limit,50))
  ),claimed as(
    update public.communication_jobs j set status='processing',claim_token=gen_random_uuid(),claimed_at=now(),attempts=j.attempts+1,updated_at=now()
    from candidates c where j.id=c.id and j.instance_id=p_instance_id returning j.*
  ) select * from claimed;
end;
$$;

create or replace function public.complete_communication_job_v2(p_instance_id uuid,p_id uuid,p_claim_token uuid,p_provider_message_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.communication_jobs set status='sent',provider_message_id=p_provider_message_id,sent_at=now(),claim_token=null,claimed_at=null,last_error=null,updated_at=now()
  where instance_id=p_instance_id and id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end;
$$;

create or replace function public.fail_communication_job_v2(p_instance_id uuid,p_id uuid,p_claim_token uuid,p_error text,p_retry boolean default true)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.communication_jobs set
    status=case when p_retry and attempts<5 then 'pending' else 'failed' end,
    last_error=left(p_error,2000),
    scheduled_at=case when p_retry and attempts<5 then now()+make_interval(mins=>least(60,attempts*5)) else scheduled_at end,
    claim_token=null,claimed_at=null,updated_at=now()
  where instance_id=p_instance_id and id=p_id and status='processing' and claim_token=p_claim_token;
  return found;
end;
$$;

create or replace function public.queue_available_stock_notifications_v2(p_instance_id uuid,p_limit integer default 50)
returns integer language plpgsql security definer set search_path='' as $$
declare r record;v_job_id uuid;v_count integer:=0;
begin
  for r in
    select sn.id,sn.variant_id,sn.user_id,sn.email,p.name product_name,p.slug,pv.label
    from public.stock_notifications sn
    join public.product_variants pv on pv.id=sn.variant_id and pv.instance_id=p_instance_id
    join public.products p on p.id=pv.product_id and p.instance_id=p_instance_id
    where sn.instance_id=p_instance_id and sn.status='waiting' and pv.active=true and pv.stock_quantity>0 and p.active=true
    order by sn.created_at for update of sn skip locked limit greatest(1,least(coalesce(p_limit,50),200))
  loop
    insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(p_instance_id,lower(r.email),r.user_id,'transactional','stock_available',
      jsonb_build_object('productName',r.product_name,'variantLabel',r.label,'productUrl','/termek/'||r.slug,'stockNotificationId',r.id),
      'stock-notification:'||r.id::text,false,now())
    on conflict(instance_id,idempotency_key) do update set updated_at=now()
    returning id into v_job_id;
    update public.stock_notifications set status='queued',communication_job_id=v_job_id where id=r.id and instance_id=p_instance_id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.queue_abandoned_checkout_recoveries_v2(p_instance_id uuid,p_limit integer default 50,p_min_age_minutes integer default 60)
returns integer language plpgsql security definer set search_path='' as $$
declare r record;j uuid;n integer:=0;
begin
  for r in select i.id,i.user_id,i.email,i.recovery_token,i.cart from public.checkout_recovery_intents i
    where i.instance_id=p_instance_id and i.status='open' and i.expires_at>now() and i.communication_job_id is null
      and i.last_seen_at<=now()-make_interval(mins=>greatest(p_min_age_minutes,15))
    order by i.last_seen_at asc for update of i skip locked limit greatest(1,least(p_limit,200))
  loop
    if public.has_marketing_consent_v2(p_instance_id,r.email,'email') is not true then continue; end if;
    insert into public.communication_jobs(instance_id,recipient_email,user_id,purpose,template_key,payload,idempotency_key,requires_approval,approved_at)
    values(p_instance_id,lower(trim(r.email)),r.user_id,'marketing','abandoned_checkout',
      jsonb_build_object('recoveryUrl','/kosar/visszaallitas?token='||r.recovery_token::text,'itemCount',jsonb_array_length(r.cart),'recoveryIntentId',r.id),
      'checkout-recovery:'||r.id::text,true,null)
    on conflict(instance_id,idempotency_key) do update set updated_at=now()
    returning id into j;
    update public.checkout_recovery_intents set communication_job_id=j,updated_at=now() where id=r.id and instance_id=p_instance_id;
    n:=n+1;
  end loop;
  return n;
end;
$$;

create or replace function public.upsert_checkout_recovery_intent_v2(p_instance_id uuid,p_user_id uuid,p_email text,p_cart jsonb,p_checkout jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.checkout_recovery_intents%rowtype;
begin
  if not exists(select 1 from public.webshop_instances where id=p_instance_id) then raise exception 'invalid tenant'; end if;
  if p_user_id is null or length(trim(p_email))<5 then raise exception 'invalid recovery identity'; end if;
  if p_cart is null or jsonb_typeof(p_cart)<>'array' or jsonb_array_length(p_cart)=0 then raise exception 'empty cart'; end if;
  select * into r from public.checkout_recovery_intents
    where instance_id=p_instance_id and user_id=p_user_id and status='open' for update;
  if found then
    update public.checkout_recovery_intents set email=lower(trim(p_email)),cart=p_cart,checkout=coalesce(p_checkout,'{}'::jsonb),
      expires_at=now()+interval '7 days',last_seen_at=now(),updated_at=now()
    where id=r.id and instance_id=p_instance_id returning * into r;
  else
    insert into public.checkout_recovery_intents(instance_id,user_id,email,cart,checkout)
    values(p_instance_id,p_user_id,lower(trim(p_email)),p_cart,coalesce(p_checkout,'{}'::jsonb)) returning * into r;
  end if;
  return jsonb_build_object('id',r.id,'token',r.recovery_token,'expiresAt',r.expires_at);
end;
$$;

create or replace function public.convert_checkout_recovery_intent_v2(p_instance_id uuid,p_user_id uuid,p_order_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.orders where id=p_order_id and instance_id=p_instance_id and customer_id=p_user_id;
  if not found then return false; end if;
  update public.checkout_recovery_intents set status='converted',converted_order_id=p_order_id,updated_at=now()
    where instance_id=p_instance_id and user_id=p_user_id and status='open';
  return found;
end;
$$;

create or replace function public.admin_manage_communication_job_v2(p_instance_id uuid,p_job_id uuid,p_actor uuid,p_action text,p_scheduled_at timestamptz default null,p_note text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.communication_jobs%rowtype;v_status text;v_schedule timestamptz;
begin
  if not (public.can_manage_marketing(p_instance_id,p_actor) or public.can_manage_orders(p_instance_id,p_actor) or public.can_manage_support(p_instance_id,p_actor)) then raise exception 'store permission required'; end if;
  select * into j from public.communication_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if p_action='cancel' then if j.status not in('pending','failed','blocked') then raise exception 'job cannot be cancelled';end if;v_status='cancelled';v_schedule=j.scheduled_at;
  elsif p_action='reschedule' then if j.status not in('pending','failed','blocked') or p_scheduled_at is null then raise exception 'job cannot be rescheduled';end if;v_status='pending';v_schedule=p_scheduled_at;
  elsif p_action='retry' then if j.status not in('failed','blocked') then raise exception 'job cannot be retried';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,now());
  elsif p_action='approve' then if j.status<>'pending' then raise exception 'job cannot be approved';end if;v_status='pending';v_schedule=coalesce(p_scheduled_at,j.scheduled_at);
  else raise exception 'invalid action';end if;
  update public.communication_jobs set status=v_status,scheduled_at=v_schedule,last_error=case when p_action in('retry','reschedule') then null else last_error end,
    claim_token=null,claimed_at=null,updated_at=now() where id=j.id and instance_id=p_instance_id;
  insert into public.communication_job_events(instance_id,job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note)
    values(p_instance_id,j.id,p_actor,p_action,j.status,v_status,j.scheduled_at,v_schedule,left(p_note,1000));
  return true;
end;
$$;

create or replace function public.admin_approve_communication_job_v2(p_instance_id uuid,p_job_id uuid,p_actor uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.communication_jobs%rowtype;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  select * into j from public.communication_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if j.status<>'pending' then raise exception 'job cannot be approved'; end if;
  if j.purpose='marketing' and not public.has_marketing_consent_v2(p_instance_id,j.recipient_email,'email') then raise exception 'marketing consent required'; end if;
  update public.communication_jobs set approved_at=now(),approved_by=p_actor,updated_at=now() where id=j.id and instance_id=p_instance_id;
  insert into public.communication_job_events(instance_id,job_id,actor_user_id,action,previous_status,new_status,previous_scheduled_at,new_scheduled_at,note)
    values(p_instance_id,j.id,p_actor,'approve',j.status,j.status,j.scheduled_at,j.scheduled_at,left(p_note,1000));
  return true;
end;
$$;

create or replace function public.admin_block_communication_email_v2(p_instance_id uuid,p_email text,p_actor uuid,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_email text:=lower(trim(p_email));
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  if v_email='' then raise exception 'email required'; end if;
  select id into v_id from public.communication_suppressions where instance_id=p_instance_id and lower(email)=v_email and active=true
    order by created_at desc limit 1 for update;
  if v_id is null then
    insert into public.communication_suppressions(instance_id,email,reason,source,note,active)
    values(p_instance_id,v_email,'manual','admin',left(p_note,1000),true) returning id into v_id;
  end if;
  insert into public.communication_suppression_events(instance_id,suppression_id,email,actor_user_id,action,reason,note)
    values(p_instance_id,v_id,v_email,p_actor,'block','manual',left(p_note,1000));
  return v_id;
end;
$$;

create or replace function public.admin_release_communication_suppression_v2(p_instance_id uuid,p_suppression_id uuid,p_actor uuid,p_note text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare s public.communication_suppressions%rowtype;
begin
  if not public.can_manage_marketing(p_instance_id,p_actor) then raise exception 'marketing permission required'; end if;
  select * into s from public.communication_suppressions where id=p_suppression_id and instance_id=p_instance_id for update;
  if not found then return false; end if;
  if not s.active then return true; end if;
  update public.communication_suppressions set active=false,released_at=now(),released_by=p_actor where id=s.id and instance_id=p_instance_id;
  insert into public.communication_suppression_events(instance_id,suppression_id,email,actor_user_id,action,reason,note)
    values(p_instance_id,s.id,s.email,p_actor,'release',s.reason,left(p_note,1000));
  return true;
end;
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'has_marketing_consent_v2','is_communication_suppressed_v2','enqueue_communication_v2',
      'recover_stale_communication_jobs_v2','claim_communication_jobs_v2','complete_communication_job_v2','fail_communication_job_v2',
      'queue_available_stock_notifications_v2','queue_abandoned_checkout_recoveries_v2',
      'upsert_checkout_recovery_intent_v2','convert_checkout_recovery_intent_v2',
      'admin_manage_communication_job_v2','admin_approve_communication_job_v2',
      'admin_block_communication_email_v2','admin_release_communication_suppression_v2'
    ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'initialize_support_ticket_thread','sync_support_ticket_from_message','guard_closed_support_thread',
      'enforce_office_thread_tenant','enforce_office_message_tenant','enforce_office_task_tenant'
    ])
  loop execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;


-- The application no longer uses the global communication RPCs. Remove even trusted
-- service-role execution so future server code cannot accidentally cross tenant boundaries.
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'has_marketing_consent','is_communication_suppressed','enqueue_communication',
      'recover_stale_communication_jobs','claim_communication_jobs','complete_communication_job','fail_communication_job',
      'queue_available_stock_notifications','queue_abandoned_checkout_recoveries',
      'upsert_checkout_recovery_intent','convert_checkout_recovery_intent',
      'admin_manage_communication_job','admin_approve_communication_job',
      'admin_block_communication_email','admin_release_communication_suppression'
    ])
  loop execute format('revoke execute on function %s from public, anon, authenticated, service_role',f.signature); end loop;
end $$;
