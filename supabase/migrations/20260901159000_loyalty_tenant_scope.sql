-- Tenant scope for customer value and loyalty data. Prepared only; apply after the hardening chain is reviewed.

alter table public.customer_value_profiles add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.loyalty_benefit_rules add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.loyalty_benefit_usage add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.loyalty_ledger add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.loyalty_processing_runs add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.loyalty_program_settings add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;

-- Current production snapshot contains no loyalty rows. Keep a deterministic fallback for safe legacy upgrades.
update public.customer_value_profiles set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.loyalty_benefit_rules set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.loyalty_ledger l set instance_id=o.instance_id from public.orders o where l.order_id=o.id and l.instance_id is null;
update public.loyalty_benefit_usage u set instance_id=o.instance_id from public.orders o where u.order_id=o.id and u.instance_id is null;
update public.loyalty_benefit_usage u set instance_id=r.instance_id from public.loyalty_benefit_rules r where u.rule_id=r.id and u.instance_id is null;
update public.loyalty_processing_runs set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.loyalty_program_settings set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;

do $$ begin
 if exists(select 1 from public.customer_value_profiles where instance_id is null)
 or exists(select 1 from public.loyalty_benefit_rules where instance_id is null)
 or exists(select 1 from public.loyalty_benefit_usage where instance_id is null)
 or exists(select 1 from public.loyalty_ledger where instance_id is null)
 or exists(select 1 from public.loyalty_processing_runs where instance_id is null)
 or exists(select 1 from public.loyalty_program_settings where instance_id is null)
 then raise exception 'Loyalty tenant hardening blocked by unassigned rows'; end if;
end $$;

alter table public.customer_value_profiles alter column instance_id set not null;
alter table public.loyalty_benefit_rules alter column instance_id set not null;
alter table public.loyalty_benefit_usage alter column instance_id set not null;
alter table public.loyalty_ledger alter column instance_id set not null;
alter table public.loyalty_processing_runs alter column instance_id set not null;
alter table public.loyalty_program_settings alter column instance_id set not null;

-- Replace global business keys with store-local keys.
alter table public.customer_value_profiles drop constraint if exists customer_value_profiles_pkey;
alter table public.customer_value_profiles add primary key(instance_id,customer_id);
alter table public.loyalty_benefit_rules drop constraint if exists loyalty_benefit_rules_rule_key_key;
alter table public.loyalty_benefit_usage drop constraint if exists loyalty_benefit_usage_usage_key_key;
alter table public.loyalty_ledger drop constraint if exists loyalty_ledger_event_key_key;
alter table public.loyalty_processing_runs drop constraint if exists loyalty_processing_runs_run_key_key;
alter table public.loyalty_program_settings drop constraint if exists loyalty_program_settings_pkey;
alter table public.loyalty_program_settings add primary key(instance_id);
create unique index if not exists loyalty_benefit_rules_instance_key_uidx on public.loyalty_benefit_rules(instance_id,rule_key);
create unique index if not exists loyalty_benefit_usage_instance_key_uidx on public.loyalty_benefit_usage(instance_id,usage_key);
create unique index if not exists loyalty_ledger_instance_event_uidx on public.loyalty_ledger(instance_id,event_key);
create unique index if not exists loyalty_processing_runs_instance_key_uidx on public.loyalty_processing_runs(instance_id,run_key);
create index if not exists customer_value_profiles_instance_score_idx on public.customer_value_profiles(instance_id,value_score desc);
create index if not exists loyalty_ledger_instance_customer_idx on public.loyalty_ledger(instance_id,customer_id,occurred_at desc);

-- Preserve existing view column order; append instance_id for tenant filtering.
create or replace view public.loyalty_balances with(security_invoker=true) as
select customer_id,greatest(coalesce(sum(points),0),0) points_balance,coalesce(sum(points) filter(where points>0),0) lifetime_earned_points,abs(coalesce(sum(points) filter(where entry_type='redeem'),0)) lifetime_redeemed_points,max(occurred_at) last_activity_at,abs(least(coalesce(sum(points),0),0)) points_debt,instance_id
from public.loyalty_ledger group by instance_id,customer_id;

create or replace view public.active_customer_benefits with(security_invoker=true) as
select p.customer_id,p.value_tier,r.id rule_id,r.rule_key,r.benefit_type,r.benefit_value,r.min_order_gross_huf,r.max_uses_per_customer,r.minimum_margin_percent,r.metadata,coalesce(u.use_count,0) use_count,case when r.max_uses_per_customer is null then true else coalesce(u.use_count,0)<r.max_uses_per_customer end usage_available,p.instance_id
from public.customer_value_profiles p join public.loyalty_benefit_rules r on r.instance_id=p.instance_id and r.value_tier=p.value_tier and r.active=true
left join lateral(select count(*)::int use_count from public.loyalty_benefit_usage x where x.instance_id=p.instance_id and x.customer_id=p.customer_id and x.rule_id=r.id)u on true
where(r.valid_from is null or r.valid_from<=now())and(r.valid_until is null or r.valid_until>now());

create or replace view public.customer_loyalty_summary with(security_invoker=true) as
select p.customer_id,p.value_score,p.value_tier,p.lifecycle_segment,p.paid_orders,p.revenue_gross_huf,p.last_order_at,coalesce(b.points_balance,0) points_balance,coalesce(b.lifetime_earned_points,0) lifetime_earned_points,coalesce(b.lifetime_redeemed_points,0) lifetime_redeemed_points,(select count(*) from public.active_customer_benefits a where a.instance_id=p.instance_id and a.customer_id=p.customer_id and a.usage_available=true) available_benefits,coalesce(b.points_debt,0) points_debt,p.instance_id
from public.customer_value_profiles p left join public.loyalty_balances b on b.instance_id=p.instance_id and b.customer_id=p.customer_id;

create or replace function public.can_manage_loyalty(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager','analyst'],p_user_id);$$;

do $$ declare p record;t text;begin foreach t in array array['customer_value_profiles','loyalty_benefit_rules','loyalty_benefit_usage','loyalty_ledger','loyalty_processing_runs','loyalty_program_settings'] loop execute format('alter table public.%I enable row level security',t);for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t);end loop;execute format('create policy %I on public.%I for all to authenticated using(public.can_manage_loyalty(instance_id)) with check(public.can_manage_loyalty(instance_id))',t||'_store_all',t);end loop;end $$;

-- Tenant-safe refresh/accrual entry points. Legacy zero-argument functions remain untouched until callers migrate.
create or replace function public.refresh_customer_value_profiles_v2(p_instance_id uuid) returns integer language plpgsql security definer set search_path=public as $$declare v_count int:=0;begin
 insert into public.customer_value_profiles(instance_id,customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,days_since_last_order,lifecycle_segment,value_score,value_tier,first_order_at,last_order_at,recalculated_at)
 select p_instance_id,m.customer_id,m.email_key,m.paid_orders,m.revenue_gross_huf,m.aov_gross_huf,m.days_since_last_order,m.segment,least(100,greatest(0,least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)),case when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=85 then 'platinum' when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=65 then 'gold' when(least(40,m.paid_orders*8)+least(40,(m.revenue_gross_huf/25000)::int)+case when m.days_since_last_order<=30 then 20 when m.days_since_last_order<=90 then 10 else 0 end)>=40 then 'silver' else 'standard' end,m.first_order_at,m.last_order_at,now()
 from public.customer_commercial_metrics m where m.instance_id=p_instance_id and m.customer_id is not null
 on conflict(instance_id,customer_id) do update set email_key=excluded.email_key,paid_orders=excluded.paid_orders,revenue_gross_huf=excluded.revenue_gross_huf,aov_gross_huf=excluded.aov_gross_huf,days_since_last_order=excluded.days_since_last_order,lifecycle_segment=excluded.lifecycle_segment,value_score=excluded.value_score,value_tier=excluded.value_tier,first_order_at=excluded.first_order_at,last_order_at=excluded.last_order_at,recalculated_at=now();get diagnostics v_count=row_count;return v_count;end$$;

create or replace function public.accrue_loyalty_points_from_paid_orders_v2(p_instance_id uuid) returns integer language plpgsql security definer set search_path=public as $$declare v_count int:=0;begin
 insert into public.loyalty_ledger(instance_id,customer_id,event_key,entry_type,points,order_id,reason,metadata,occurred_at)
 select p_instance_id,o.customer_id,'order-earn:'||o.id::text,'earn',least(1000,greatest(1,floor(o.total_gross_huf/1000.0)::int)),o.id,'Fizetett rendelés után jóváírt hűségpont',jsonb_build_object('order_total_gross_huf',o.total_gross_huf,'rule','1_point_per_1000_huf_gross','cap',1000),o.created_at from public.orders o
 where o.instance_id=p_instance_id and o.customer_id is not null and o.status in('paid','processing','shipped','completed') and o.total_gross_huf>0 on conflict(instance_id,event_key) do nothing;get diagnostics v_count=row_count;return v_count;end$$;

create or replace function public.get_customer_loyalty_snapshot_v2(p_instance_id uuid,p_customer_id uuid) returns jsonb language sql security definer set search_path=public as $$select jsonb_build_object('summary',coalesce((select to_jsonb(s) from public.customer_loyalty_summary s where s.instance_id=p_instance_id and s.customer_id=p_customer_id),'{}'::jsonb),'benefits',coalesce((select jsonb_agg(to_jsonb(b) order by b.rule_key) from public.active_customer_benefits b where b.instance_id=p_instance_id and b.customer_id=p_customer_id and b.usage_available=true),'[]'::jsonb),'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc) from(select id,entry_type,points,reason,occurred_at,order_id from public.loyalty_ledger where instance_id=p_instance_id and customer_id=p_customer_id order by occurred_at desc limit 30)l),'[]'::jsonb));$$;
