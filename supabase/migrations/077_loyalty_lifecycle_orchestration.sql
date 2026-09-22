-- V11: deterministic, idempotent loyalty lifecycle orchestration
create table if not exists public.loyalty_processing_runs(
 id uuid primary key default gen_random_uuid(),
 run_key text not null unique,
 accrued_points_entries integer not null default 0,
 reversed_points_entries integer not null default 0,
 refreshed_profiles integer not null default 0,
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 metadata jsonb not null default '{}'::jsonb
);
alter table public.loyalty_processing_runs enable row level security;
revoke all on public.loyalty_processing_runs from anon,authenticated;
grant all on public.loyalty_processing_runs to service_role;

create or replace function public.process_loyalty_lifecycle(p_run_key text)
returns public.loyalty_processing_runs
language plpgsql security definer set search_path=''
as $$
declare v public.loyalty_processing_runs;v_accrued integer:=0;v_reversed integer:=0;v_profiles integer:=0;begin
 if nullif(trim(p_run_key),'') is null then raise exception 'A futási kulcs kötelező.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('loyalty-lifecycle:'||p_run_key,0));
 select * into v from public.loyalty_processing_runs where run_key=p_run_key;
 if found and v.completed_at is not null then return v; end if;
 if not found then insert into public.loyalty_processing_runs(run_key) values(p_run_key) returning * into v; end if;
 -- Accrue first, then reverse orders that became ineligible, finally recalculate value/tier.
 select public.accrue_loyalty_points_from_paid_orders() into v_accrued;
 select public.reverse_loyalty_points_for_ineligible_orders() into v_reversed;
 select public.refresh_customer_value_profiles() into v_profiles;
 update public.loyalty_processing_runs set accrued_points_entries=v_accrued,reversed_points_entries=v_reversed,refreshed_profiles=v_profiles,completed_at=now(),metadata=jsonb_build_object('sequence',jsonb_build_array('accrue','reverse','refresh_profiles')) where id=v.id returning * into v;
 return v;
end;$$;
revoke all on function public.process_loyalty_lifecycle(text) from public,anon,authenticated;
grant execute on function public.process_loyalty_lifecycle(text) to service_role;

create or replace function public.get_customer_loyalty_snapshot(p_customer_id uuid)
returns jsonb
language sql security definer set search_path=''
as $$
 select jsonb_build_object(
  'summary',coalesce((select to_jsonb(s) from public.customer_loyalty_summary s where s.customer_id=p_customer_id),'{}'::jsonb),
  'benefits',coalesce((select jsonb_agg(to_jsonb(b) order by b.rule_key) from public.active_customer_benefits b where b.customer_id=p_customer_id and b.usage_available=true),'[]'::jsonb),
  'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc) from (select id,entry_type,points,reason,occurred_at,order_id from public.loyalty_ledger where customer_id=p_customer_id order by occurred_at desc limit 30) l),'[]'::jsonb)
 );
$$;
revoke all on function public.get_customer_loyalty_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.get_customer_loyalty_snapshot(uuid) to service_role;
