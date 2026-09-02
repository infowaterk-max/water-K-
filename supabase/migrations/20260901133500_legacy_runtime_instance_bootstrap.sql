-- One-time compatibility bridge for legacy single-store databases.
-- Historical upgrades need one deterministic runtime instance before tenant scoping.
-- Fresh customer installs use the customer-baseline snapshot and do not replay this migration.

do $$
declare
  v_instance_id uuid;
begin
  if not exists (select 1 from public.webshop_instances) then
    insert into public.webshop_instances(
      slug,
      name,
      subscription_plan,
      status,
      brand_name
    )
    values(
      'legacy-main',
      'Migrált webshop',
      'pro',
      'active',
      'Migrált webshop'
    )
    returning id into v_instance_id;

    insert into public.webshop_instance_commerce_settings(instance_id)
    values(v_instance_id)
    on conflict(instance_id) do nothing;
  end if;
end
$$;

do $$
begin
  if (select count(*) from public.webshop_instances where status in ('pilot','active')) <> 1 then
    raise exception 'Legacy runtime instance bootstrap requires exactly one pilot/active webshop instance';
  end if;
end
$$;

comment on function public.single_runtime_instance_id() is
  'Returns the sole active/pilot runtime webshop instance for deterministic legacy single-tenant backfills; null when the runtime is ambiguous.';
