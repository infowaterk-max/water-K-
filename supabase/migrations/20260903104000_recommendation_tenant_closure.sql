-- Final tenant closure for product recommendation rules.

update public.product_recommendation_rules r
set instance_id=v.instance_id
from public.product_variants v
where r.recommended_variant_id=v.id
  and r.instance_id is null
  and v.instance_id is not null;

do $$
declare v_gap bigint; v_cross bigint;
begin
  select count(*) into v_gap
  from public.product_recommendation_rules
  where instance_id is null;

  select count(*) into v_cross
  from public.product_recommendation_rules r
  join public.product_variants rv on rv.id=r.recommended_variant_id
  left join public.product_variants sv on sv.id=r.source_variant_id
  where rv.instance_id is distinct from r.instance_id
     or (r.source_variant_id is not null and sv.instance_id is distinct from r.instance_id);

  if v_gap>0 then
    raise exception 'Recommendation tenant closure blocked: % rules without instance_id',v_gap;
  end if;
  if v_cross>0 then
    raise exception 'Recommendation tenant closure blocked: % cross-store rules',v_cross;
  end if;
end $$;

alter table public.product_recommendation_rules alter column instance_id set not null;

create or replace function public.sync_product_recommendation_instance()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_recommended_instance uuid; v_source_instance uuid;
begin
  select v.instance_id into v_recommended_instance
  from public.product_variants v
  where v.id=new.recommended_variant_id;

  if v_recommended_instance is null then
    raise exception 'Recommended variant has no webshop instance.';
  end if;

  if new.source_variant_id is not null then
    select v.instance_id into v_source_instance
    from public.product_variants v
    where v.id=new.source_variant_id;
    if v_source_instance is null or v_source_instance<>v_recommended_instance then
      raise exception 'Cross-store recommendation is not allowed.';
    end if;
  end if;

  if new.instance_id is not null and new.instance_id<>v_recommended_instance then
    raise exception 'Recommendation webshop scope mismatch.';
  end if;

  new.instance_id:=v_recommended_instance;
  return new;
end;
$$;

drop trigger if exists product_recommendation_rules_sync_instance on public.product_recommendation_rules;
create trigger product_recommendation_rules_sync_instance
before insert or update of source_variant_id,recommended_variant_id,instance_id on public.product_recommendation_rules
for each row execute function public.sync_product_recommendation_instance();

revoke all on function public.sync_product_recommendation_instance() from public,anon;

drop policy if exists "admins manage recommendation rules" on public.product_recommendation_rules;
drop policy if exists recommendation_rules_store_all on public.product_recommendation_rules;
create policy recommendation_rules_store_all on public.product_recommendation_rules
for all to authenticated
using (public.can_manage_catalog(instance_id,(select auth.uid())))
with check (public.can_manage_catalog(instance_id,(select auth.uid())));
