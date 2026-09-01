-- Final loyalty isolation hardening.
-- Runs after 20260901159000_loyalty_tenant_scope.sql.

create or replace function public.can_read_loyalty(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_platform_operator(p_user_id)
    or public.has_store_role(
      p_instance_id,
      array['owner','admin','marketing_manager','analyst'],
      p_user_id
    );
$$;

create or replace function public.can_mutate_loyalty(
  p_instance_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_platform_operator(p_user_id)
    or public.has_store_role(
      p_instance_id,
      array['owner','admin','marketing_manager'],
      p_user_id
    );
$$;

-- Analysts may read but may not mutate loyalty state.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'customer_value_profiles',
    'loyalty_benefit_rules',
    'loyalty_benefit_usage',
    'loyalty_ledger',
    'loyalty_processing_runs',
    'loyalty_program_settings'
  ] loop
    for p in
      select policyname
      from pg_policies
      where schemaname='public' and tablename=t
    loop
      execute format('drop policy if exists %I on public.%I',p.policyname,t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_read_loyalty(instance_id))',
      t||'_store_read',t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_mutate_loyalty(instance_id))',
      t||'_store_insert',t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_mutate_loyalty(instance_id)) with check (public.can_mutate_loyalty(instance_id))',
      t||'_store_update',t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_mutate_loyalty(instance_id))',
      t||'_store_delete',t
    );
  end loop;
end $$;

-- Ensure one settings row exists for every store and for future stores.
insert into public.loyalty_program_settings(instance_id,singleton,tier_bonus_cutover_at,updated_at)
select w.id,true,now(),now()
from public.webshop_instances w
where not exists(
  select 1 from public.loyalty_program_settings s where s.instance_id=w.id
);

create or replace function public.ensure_loyalty_program_settings()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.loyalty_program_settings(instance_id,singleton,tier_bonus_cutover_at,updated_at)
  values(new.id,true,now(),now())
  on conflict(instance_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_webshop_loyalty_settings on public.webshop_instances;
create trigger trg_webshop_loyalty_settings
after insert on public.webshop_instances
for each row execute function public.ensure_loyalty_program_settings();

-- Enforce cross-table store consistency for loyalty writes.
create or replace function public.enforce_loyalty_ledger_scope()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_instance uuid;
  v_customer uuid;
begin
  if new.order_id is not null then
    select instance_id,customer_id into v_instance,v_customer
    from public.orders where id=new.order_id;
    if v_instance is null or v_instance<>new.instance_id then
      raise exception 'Loyalty ledger order tenant mismatch';
    end if;
    if v_customer is not null and v_customer<>new.customer_id then
      raise exception 'Loyalty ledger customer mismatch';
    end if;
  end if;

  if new.reverses_entry_id is not null then
    select instance_id,customer_id into v_instance,v_customer
    from public.loyalty_ledger where id=new.reverses_entry_id;
    if v_instance is null or v_instance<>new.instance_id then
      raise exception 'Loyalty reversal tenant mismatch';
    end if;
    if v_customer<>new.customer_id then
      raise exception 'Loyalty reversal customer mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_loyalty_ledger_scope on public.loyalty_ledger;
create trigger trg_loyalty_ledger_scope
before insert or update of instance_id,customer_id,order_id,reverses_entry_id
on public.loyalty_ledger
for each row execute function public.enforce_loyalty_ledger_scope();

create or replace function public.enforce_loyalty_benefit_usage_scope()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_instance uuid;
  v_customer uuid;
begin
  select instance_id into v_instance
  from public.loyalty_benefit_rules where id=new.rule_id;
  if v_instance is null or v_instance<>new.instance_id then
    raise exception 'Loyalty benefit rule tenant mismatch';
  end if;

  if new.order_id is not null then
    select instance_id,customer_id into v_instance,v_customer
    from public.orders where id=new.order_id;
    if v_instance is null or v_instance<>new.instance_id then
      raise exception 'Loyalty benefit order tenant mismatch';
    end if;
    if v_customer is not null and v_customer<>new.customer_id then
      raise exception 'Loyalty benefit customer mismatch';
    end if;
  end if;

  if not exists(
    select 1 from public.customer_value_profiles p
    where p.instance_id=new.instance_id and p.customer_id=new.customer_id
  ) then
    raise exception 'Loyalty customer profile tenant mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_loyalty_benefit_usage_scope on public.loyalty_benefit_usage;
create trigger trg_loyalty_benefit_usage_scope
before insert or update of instance_id,customer_id,rule_id,order_id
on public.loyalty_benefit_usage
for each row execute function public.enforce_loyalty_benefit_usage_scope();

-- SECURITY DEFINER loyalty entry points are service-layer only until a dedicated
-- customer self-service RPC with ownership checks is introduced.
revoke all on function public.refresh_customer_value_profiles_v2(uuid) from public,anon,authenticated;
revoke all on function public.accrue_loyalty_points_from_paid_orders_v2(uuid) from public,anon,authenticated;
revoke all on function public.get_customer_loyalty_snapshot_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.refresh_customer_value_profiles_v2(uuid) to service_role;
grant execute on function public.accrue_loyalty_points_from_paid_orders_v2(uuid) to service_role;
grant execute on function public.get_customer_loyalty_snapshot_v2(uuid,uuid) to service_role;

-- Legacy global loyalty functions are not safe in a multi-tenant runtime.
-- Preserve them for migration compatibility, but remove API-role execution.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in (
        'accrue_loyalty_points_from_paid_orders',
        'apply_loyalty_tier_bonus_points',
        'get_customer_loyalty_snapshot',
        'plan_loyalty_retention_opportunities',
        'process_loyalty_lifecycle',
        'redeem_loyalty_points',
        'refresh_customer_value_profiles',
        'reverse_loyalty_points_for_ineligible_orders',
        'use_discount_loyalty_benefit',
        'use_loyalty_benefit'
      )
  loop
    execute format('revoke all on function %s from public,anon,authenticated',r.signature);
  end loop;
end $$;

-- Explicitly lock helper functions as well; only authenticated policy evaluation
-- and the trusted service layer need them.
revoke all on function public.can_read_loyalty(uuid,uuid) from public,anon;
revoke all on function public.can_mutate_loyalty(uuid,uuid) from public,anon;
grant execute on function public.can_read_loyalty(uuid,uuid) to authenticated,service_role;
grant execute on function public.can_mutate_loyalty(uuid,uuid) to authenticated,service_role;
