-- Tenantize merchant CRM/read-model data and replace global commercial planners with store-scoped variants.

alter table public.commercial_opportunities add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.commercial_offers add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
alter table public.sales_tasks add column if not exists instance_id uuid references public.webshop_instances(id) on delete cascade;
update public.commercial_opportunities set instance_id=public.single_runtime_instance_id() where instance_id is null and public.single_runtime_instance_id() is not null;
update public.commercial_offers o set instance_id=x.instance_id from public.commercial_opportunities x where o.opportunity_id=x.id and o.instance_id is null;
update public.sales_tasks t set instance_id=x.instance_id from public.commercial_opportunities x where t.opportunity_id=x.id and t.instance_id is null;
do $$ begin
 if exists(select 1 from public.commercial_opportunities where instance_id is null) or exists(select 1 from public.commercial_offers where instance_id is null) or exists(select 1 from public.sales_tasks where instance_id is null) then raise exception 'CRM tenant hardening blocked by unassigned rows'; end if;
end $$;
alter table public.commercial_opportunities alter column instance_id set not null;
alter table public.commercial_offers alter column instance_id set not null;
alter table public.sales_tasks alter column instance_id set not null;

alter table public.commercial_opportunities drop constraint if exists commercial_opportunities_opportunity_key_key;
drop index if exists public.commercial_opportunities_opportunity_key_key;
drop index if exists public.commercial_opportunities_one_active_b2b_reorder_idx;
drop index if exists public.commercial_opportunities_one_active_b2c_auto_idx;
drop index if exists public.commercial_opportunities_one_active_b2c_guest_auto_idx;
drop index if exists public.sales_tasks_task_key_key;
create unique index if not exists commercial_opportunities_instance_key_uidx on public.commercial_opportunities(instance_id,opportunity_key);
create unique index if not exists commercial_opportunities_active_b2b_uidx on public.commercial_opportunities(instance_id,reseller_id) where channel='b2b' and kind='reorder' and status in('open','in_progress') and reseller_id is not null;
create unique index if not exists commercial_opportunities_active_b2c_uidx on public.commercial_opportunities(instance_id,customer_id) where channel='b2c' and kind in('retention','winback') and status in('open','in_progress') and customer_id is not null;
create unique index if not exists commercial_opportunities_active_guest_uidx on public.commercial_opportunities(instance_id,lower(customer_email)) where channel='b2c' and kind in('retention','winback') and status in('open','in_progress') and customer_id is null and customer_email is not null;
create unique index if not exists sales_tasks_instance_key_uidx on public.sales_tasks(instance_id,task_key);
create index if not exists commercial_opportunities_instance_queue_idx on public.commercial_opportunities(instance_id,status,priority_score desc,due_at);
create index if not exists commercial_offers_instance_status_idx on public.commercial_offers(instance_id,status,created_at desc);
create index if not exists sales_tasks_instance_queue_idx on public.sales_tasks(instance_id,status,priority desc,due_at);

create or replace view public.customer_commercial_metrics with(security_invoker=true) as
with paid_orders as(
 select o.instance_id,o.id,o.customer_id,lower(trim(o.customer_email)) email_key,o.total_gross_huf,o.created_at,coalesce(sum(oi.unit_cost_net_huf_snapshot*oi.quantity),0)::numeric(14,2) cogs_net_huf
 from public.orders o left join public.order_items oi on oi.order_id=o.id and oi.instance_id=o.instance_id
 where o.status in('paid','processing','shipped','completed') group by o.instance_id,o.id,o.customer_id,o.customer_email,o.total_gross_huf,o.created_at
),g as(
 select instance_id,coalesce(customer_id::text,email_key) customer_key,max(customer_id::text)::uuid customer_id,email_key,count(*)::int paid_orders,sum(total_gross_huf) revenue_gross_huf,round(avg(total_gross_huf))::int aov_gross_huf,min(created_at) first_order_at,max(created_at) last_order_at,sum(cogs_net_huf)::numeric(14,2) cogs_net_huf
 from paid_orders group by instance_id,coalesce(customer_id::text,email_key),email_key
)
select instance_id,customer_key,customer_id,email_key,paid_orders,revenue_gross_huf,aov_gross_huf,first_order_at,last_order_at,floor(extract(epoch from now()-last_order_at)/86400)::int days_since_last_order,
 case when paid_orders=1 and now()-last_order_at<interval '30 days' then 'first_time' when paid_orders>=3 and revenue_gross_huf>=100000 and now()-last_order_at<interval '90 days' then 'vip' when paid_orders>=2 and now()-last_order_at<interval '30 days' then 'repeat' when now()-last_order_at>=interval '180 days' then 'dormant' when now()-last_order_at>=interval '90 days' then 'winback' when now()-last_order_at>=interval '30 days' then 'at_risk' else 'active' end segment,cogs_net_huf,
 case when revenue_gross_huf>0 then round(cogs_net_huf/revenue_gross_huf::numeric*100,2) end cogs_to_revenue_pct from g;

create or replace view public.reseller_reorder_signals with(security_invoker=true) as
with paid as(
 select o.instance_id,o.customer_id,lower(trim(o.customer_email)) email_key,o.id order_id,o.created_at,o.total_gross_huf,lag(o.created_at) over(partition by o.instance_id,coalesce(o.customer_id::text,lower(trim(o.customer_email))) order by o.created_at) previous_order_at
 from public.orders o where o.status in('paid','processing','shipped','completed')
),g as(
 select instance_id,coalesce(customer_id::text,email_key) customer_key,max(customer_id::text)::uuid customer_id,email_key,count(*)::int paid_orders,sum(total_gross_huf) revenue_gross_huf,max(created_at) last_order_at,avg(extract(epoch from created_at-previous_order_at)/86400) filter(where previous_order_at is not null) avg_reorder_days
 from paid group by instance_id,coalesce(customer_id::text,email_key),email_key
)
select g.instance_id,g.customer_key,g.customer_id,p.email,p.full_name,p.company_name,g.paid_orders,g.revenue_gross_huf,g.last_order_at,round(g.avg_reorder_days)::int avg_reorder_days,floor(extract(epoch from now()-g.last_order_at)/86400)::int days_since_last_order,
 case when g.paid_orders<2 or g.avg_reorder_days is null then 'learning' when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::int+14)) then 'overdue' when now()-g.last_order_at>=make_interval(days=>greatest(1,round(g.avg_reorder_days)::int-7)) then 'due_soon' else 'healthy' end reorder_signal
from g join public.profiles p on p.id=g.customer_id where p.role='reseller' and p.reseller_approved=true;

create or replace view public.reseller_growth_priorities with(security_invoker=true) as
select r.*,case when r.paid_orders>0 then round(r.revenue_gross_huf::numeric/r.paid_orders)::bigint else 0 end avg_order_value_gross_huf,
 case when r.reorder_signal='overdue' and r.revenue_gross_huf>=250000 then 100 when r.reorder_signal='overdue' then 80 when r.reorder_signal='due_soon' and r.revenue_gross_huf>=250000 then 70 when r.reorder_signal='due_soon' then 55 when r.reorder_signal='learning' and r.revenue_gross_huf>=250000 then 45 else 20 end priority_score,
 greatest(0,case when r.paid_orders>0 then round(r.revenue_gross_huf::numeric/r.paid_orders)::bigint else 0 end) estimated_reorder_value_gross_huf,
 case when (case when r.reorder_signal='overdue' and r.revenue_gross_huf>=250000 then 100 when r.reorder_signal='overdue' then 80 when r.reorder_signal='due_soon' and r.revenue_gross_huf>=250000 then 70 when r.reorder_signal='due_soon' then 55 when r.reorder_signal='learning' and r.revenue_gross_huf>=250000 then 45 else 20 end)>=90 then 'critical' when (case when r.reorder_signal='overdue' then 80 when r.reorder_signal='due_soon' then 55 else 20 end)>=70 then 'high' when (case when r.reorder_signal='due_soon' then 55 else 20 end)>=50 then 'medium' else 'low' end priority_band,
 case when r.reorder_signal='overdue' then 'Kapcsolatfelvétel és újrarendelési egyeztetés' when r.reorder_signal='due_soon' then 'Proaktív utánrendelési emlékeztető' when r.reorder_signal='learning' then 'Partnerciklus megfigyelése' else 'Nincs azonnali teendő' end recommended_action,
 case when r.days_since_last_order>=180 then 'dormant' when r.days_since_last_order>=90 then 'inactive' when r.reorder_signal='overdue' then 'late' else 'active' end inactivity_risk
from public.reseller_reorder_signals r;

create or replace view public.commercial_pipeline_summary with(security_invoker=true) as
select instance_id,channel,count(*) filter(where status in('open','in_progress')) open_count,coalesce(sum(expected_value_net_huf) filter(where status in('open','in_progress')),0) pipeline_net_huf,coalesce(sum(expected_value_net_huf*probability_percent/100) filter(where status in('open','in_progress')),0) weighted_pipeline_net_huf,coalesce(sum(expected_value_net_huf) filter(where status in('open','in_progress') and due_at<now()),0) overdue_pipeline_net_huf,count(*) filter(where status='won') won_count,count(*) filter(where status='lost') lost_count from public.commercial_opportunities group by instance_id,channel;

create or replace function public.can_manage_sales(p_instance_id uuid,p_user_id uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;

do $$ declare p record;t text;begin foreach t in array array['commercial_opportunities','commercial_offers','sales_tasks'] loop execute format('alter table public.%I enable row level security',t);for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t);end loop;end loop;end $$;
create policy commercial_opportunities_store_all on public.commercial_opportunities for all to authenticated using(public.can_manage_sales(instance_id)) with check(public.can_manage_sales(instance_id));
create policy commercial_offers_store_all on public.commercial_offers for all to authenticated using(public.can_manage_sales(instance_id)) with check(public.can_manage_sales(instance_id));
create policy sales_tasks_store_all on public.sales_tasks for all to authenticated using(public.can_manage_sales(instance_id)) with check(public.can_manage_sales(instance_id));

create or replace function public.plan_commercial_opportunities_v2(p_instance_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$declare v_b2c int:=0;v_b2b int:=0;begin
 insert into public.commercial_opportunities(instance_id,opportunity_key,channel,customer_id,customer_email,kind,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
 select p_instance_id,'b2c:'||c.customer_key||':active','b2c',c.customer_id,c.email_key,case when c.segment in('winback','dormant') then 'winback' else 'retention' end,case when c.segment='at_risk' then 80 when c.segment='winback' then 90 else 70 end,round(greatest(coalesce(c.aov_gross_huf,0),0)::numeric/1.27,2),case when c.segment='at_risk' then 45 when c.segment='winback' then 30 else 20 end,now(),'Customer segment: '||c.segment,case when c.segment='at_risk' then 'Személyre szabott megtartási ajánlat' else 'Visszanyerési ajánlat előkészítése' end,jsonb_build_object('segment',c.segment)
 from public.customer_commercial_metrics c where c.instance_id=p_instance_id and c.segment in('at_risk','winback','dormant') on conflict(instance_id,opportunity_key) do nothing;get diagnostics v_b2c=row_count;
 insert into public.commercial_opportunities(instance_id,opportunity_key,channel,reseller_id,kind,priority_score,expected_value_net_huf,probability_percent,due_at,reason,recommended_action,source)
 select p_instance_id,'b2b:'||r.customer_id::text||':reorder','b2b',r.customer_id,'reorder',r.priority_score,round(greatest(coalesce(r.estimated_reorder_value_gross_huf,0),0)::numeric/1.27,2),case when r.priority_band='critical' then 70 when r.priority_band='high' then 55 else 35 end,coalesce(r.last_order_at,now()),'Reseller priority: '||r.priority_band,r.recommended_action,jsonb_build_object('priority_band',r.priority_band)
 from public.reseller_growth_priorities r where r.instance_id=p_instance_id and r.customer_id is not null and r.priority_band in('critical','high','medium') on conflict(instance_id,opportunity_key) do update set priority_score=excluded.priority_score,expected_value_net_huf=excluded.expected_value_net_huf,probability_percent=excluded.probability_percent,due_at=excluded.due_at,reason=excluded.reason,recommended_action=excluded.recommended_action,source=excluded.source,updated_at=now() where public.commercial_opportunities.status in('open','in_progress');get diagnostics v_b2b=row_count;
 return jsonb_build_object('b2c_inserts',v_b2c,'b2b_upserts',v_b2b);end$$;

create or replace function public.plan_high_value_sales_tasks_v2(p_instance_id uuid) returns int language plpgsql security definer set search_path=public as $$declare v_count int:=0;begin insert into public.sales_tasks(instance_id,opportunity_id,task_key,title,description,priority,due_at) select p_instance_id,o.id,'opportunity:'||o.id::text,case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,o.reason||coalesce(' · '||o.recommended_action,''),o.priority_score,coalesce(o.due_at,now()) from public.commercial_opportunities o where o.instance_id=p_instance_id and o.status in('open','in_progress') and(o.priority_score>=80 or o.expected_value_net_huf>=100000) on conflict(instance_id,task_key) do update set priority=excluded.priority,due_at=excluded.due_at,description=excluded.description,updated_at=now() where public.sales_tasks.status in('open','in_progress');get diagnostics v_count=row_count;return v_count;end$$;

create or replace function public.create_commercial_offer_v2(p_instance_id uuid,p_opportunity_id uuid,p_variant_id uuid,p_quantity int,p_discount_percent numeric,p_minimum_margin_percent numeric,p_created_by uuid) returns public.commercial_offers language plpgsql security definer set search_path=public as $$declare v public.commercial_offers;begin perform 1 from public.commercial_opportunities where id=p_opportunity_id and instance_id=p_instance_id and status in('open','in_progress');if not found then raise exception 'opportunity_not_found';end if;perform 1 from public.product_variants where id=p_variant_id and instance_id=p_instance_id;if not found then raise exception 'variant_not_found';end if;insert into public.commercial_offers(instance_id,opportunity_id,variant_id,quantity,discount_percent,minimum_margin_percent,created_by) values(p_instance_id,p_opportunity_id,p_variant_id,p_quantity,p_discount_percent,p_minimum_margin_percent,p_created_by) returning * into v;update public.commercial_opportunities set status='in_progress',updated_at=now() where id=p_opportunity_id and instance_id=p_instance_id and status='open';return v;end$$;
