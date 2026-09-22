-- Roadmap Block 12: Migration Assistant 1.0 (Shopware 6 -> Shoporation)
-- Additive, tenant-scoped staging + resumable catalog apply + non-destructive rollback journal.

create table if not exists public.migration_runs(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_platform text not null check(source_platform in ('shopware6')),
  source_base_url text not null,
  source_label text,
  source_fingerprint text,
  status text not null default 'draft' check(status in ('draft','inspected','staging','needs_attention','ready','applying','paused','applied','completed','failed','rolled_back')),
  phase text not null default 'source' check(phase in ('source','inspect','stage','preview','apply','validate','rollback')),
  source_summary jsonb not null default '{}'::jsonb,
  mapping jsonb not null default '{}'::jsonb,
  checkpoint jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  completed_at timestamptz,
  rolled_back_at timestamptz
);

create table if not exists public.migration_records(
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.migration_runs(id) on delete cascade,
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check(entity_type in ('product','variant','category','manufacturer','media','customer','order','promotion')),
  source_id text not null,
  source_parent_id text,
  payload jsonb not null default '{}'::jsonb,
  normalized jsonb not null default '{}'::jsonb,
  checksum text not null,
  status text not null default 'staged' check(status in ('staged','ready','deferred','applied','error','rolled_back')),
  target_table text,
  target_id uuid,
  sequence_no bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id,entity_type,source_id)
);

create table if not exists public.migration_issues(
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.migration_runs(id) on delete cascade,
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  severity text not null check(severity in ('info','warning','error')),
  code text not null,
  entity_type text,
  source_id text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create table if not exists public.migration_external_links(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_platform text not null check(source_platform in ('shopware6')),
  entity_type text not null check(entity_type in ('product','variant')),
  source_id text not null,
  target_table text not null check(target_table in ('products','product_variants')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,source_platform,entity_type,source_id)
);

create table if not exists public.migration_change_journal(
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.migration_runs(id) on delete cascade,
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check(entity_type in ('product','variant')),
  source_id text not null,
  target_table text not null check(target_table in ('products','product_variants')),
  target_id uuid not null,
  operation text not null check(operation in ('insert','update')),
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now(),
  reverted_at timestamptz,
  unique(run_id,entity_type,source_id)
);

create index if not exists migration_runs_instance_created_idx on public.migration_runs(instance_id,created_at desc);
create index if not exists migration_records_run_status_idx on public.migration_records(run_id,status,entity_type,sequence_no);
create index if not exists migration_issues_run_severity_idx on public.migration_issues(run_id,severity,created_at);
create index if not exists migration_external_links_target_idx on public.migration_external_links(instance_id,target_table,target_id);
create index if not exists migration_change_journal_run_revert_idx on public.migration_change_journal(run_id,reverted_at,created_at desc);

create or replace function public.migration_run_tenant_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.webshop_instances where id=new.instance_id;
  if v_org is null or new.organization_id<>v_org then raise exception 'MIGRATION_TENANT_MISMATCH'; end if;
  return new;
end $$;

drop trigger if exists migration_runs_tenant_guard_v1 on public.migration_runs;
create trigger migration_runs_tenant_guard_v1 before insert or update of instance_id,organization_id on public.migration_runs for each row execute function public.migration_run_tenant_guard_v1();

create or replace function public.migration_child_tenant_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_instance uuid;v_org uuid;
begin
  select instance_id,organization_id into v_instance,v_org from public.migration_runs where id=new.run_id;
  if v_instance is null or new.instance_id<>v_instance or new.organization_id<>v_org then raise exception 'MIGRATION_CHILD_TENANT_MISMATCH'; end if;
  return new;
end $$;

create or replace function public.migration_external_link_tenant_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.webshop_instances where id=new.instance_id;
  if v_org is null or new.organization_id<>v_org then raise exception 'MIGRATION_LINK_TENANT_MISMATCH'; end if;
  return new;
end $$;

drop trigger if exists migration_records_tenant_guard_v1 on public.migration_records;
create trigger migration_records_tenant_guard_v1 before insert or update of run_id,instance_id,organization_id on public.migration_records for each row execute function public.migration_child_tenant_guard_v1();
drop trigger if exists migration_issues_tenant_guard_v1 on public.migration_issues;
create trigger migration_issues_tenant_guard_v1 before insert or update of run_id,instance_id,organization_id on public.migration_issues for each row execute function public.migration_child_tenant_guard_v1();
drop trigger if exists migration_change_journal_tenant_guard_v1 on public.migration_change_journal;
create trigger migration_change_journal_tenant_guard_v1 before insert or update of run_id,instance_id,organization_id on public.migration_change_journal for each row execute function public.migration_child_tenant_guard_v1();
drop trigger if exists migration_external_links_tenant_guard_v1 on public.migration_external_links;
create trigger migration_external_links_tenant_guard_v1 before insert or update of instance_id,organization_id on public.migration_external_links for each row execute function public.migration_external_link_tenant_guard_v1();

alter table public.migration_runs enable row level security;
alter table public.migration_records enable row level security;
alter table public.migration_issues enable row level security;
alter table public.migration_external_links enable row level security;
alter table public.migration_change_journal enable row level security;

revoke all on table public.migration_runs,public.migration_records,public.migration_issues,public.migration_external_links,public.migration_change_journal from anon,authenticated;
grant select on table public.migration_runs,public.migration_records,public.migration_issues,public.migration_external_links,public.migration_change_journal to authenticated;

drop policy if exists migration_runs_tenant_read_v1 on public.migration_runs;
create policy migration_runs_tenant_read_v1 on public.migration_runs for select to authenticated using(public.can_read_store(instance_id,(select auth.uid())));
drop policy if exists migration_records_tenant_read_v1 on public.migration_records;
create policy migration_records_tenant_read_v1 on public.migration_records for select to authenticated using(public.can_read_store(instance_id,(select auth.uid())));
drop policy if exists migration_issues_tenant_read_v1 on public.migration_issues;
create policy migration_issues_tenant_read_v1 on public.migration_issues for select to authenticated using(public.can_read_store(instance_id,(select auth.uid())));
drop policy if exists migration_external_links_tenant_read_v1 on public.migration_external_links;
create policy migration_external_links_tenant_read_v1 on public.migration_external_links for select to authenticated using(public.can_read_store(instance_id,(select auth.uid())));
drop policy if exists migration_change_journal_tenant_read_v1 on public.migration_change_journal;
create policy migration_change_journal_tenant_read_v1 on public.migration_change_journal for select to authenticated using(public.can_read_store(instance_id,(select auth.uid())));

create or replace function public.apply_shopware6_catalog_migration_v1(
  p_run_id uuid,p_instance_id uuid,p_actor uuid,p_limit integer default 100
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_run public.migration_runs%rowtype;v_record public.migration_records%rowtype;
  v_target_id uuid;v_parent_id uuid;v_product public.products%rowtype;v_variant public.product_variants%rowtype;
  v_before jsonb;v_after jsonb;v_operation text;v_applied integer:=0;v_remaining integer:=0;
  v_name text;v_slug text;v_sku text;v_label text;v_net integer;v_gross integer;v_stock integer;v_weight integer;v_active boolean;
begin
  if p_run_id is null or p_instance_id is null or p_actor is null then raise exception 'MIGRATION_APPLY_IDENTITY_REQUIRED'; end if;
  if p_limit<1 or p_limit>250 then raise exception 'MIGRATION_APPLY_LIMIT_INVALID'; end if;
  if not coalesce(public.can_manage_catalog(p_instance_id,p_actor),false) and not coalesce(public.is_platform_operator(p_actor),false) then raise exception 'MIGRATION_PERMISSION_REQUIRED'; end if;
  select * into v_run from public.migration_runs where id=p_run_id and instance_id=p_instance_id and source_platform='shopware6' for update;
  if not found then raise exception 'MIGRATION_RUN_NOT_FOUND'; end if;
  v_org:=v_run.organization_id;
  if v_run.status not in ('ready','applying','paused') then raise exception 'MIGRATION_RUN_NOT_APPLYABLE'; end if;
  update public.migration_runs set status='applying',phase='apply',updated_at=now() where id=p_run_id;

  for v_record in
    select * from public.migration_records
     where run_id=p_run_id and instance_id=p_instance_id and status='ready' and entity_type in ('product','variant')
     order by case entity_type when 'product' then 0 else 1 end,sequence_no,id
     for update skip locked limit p_limit
  loop
    v_before:=null;v_target_id:=null;v_operation:=null;
    if v_record.entity_type='product' then
      v_name:=nullif(trim(v_record.normalized->>'name'),'');v_slug:=nullif(trim(v_record.normalized->>'slug'),'');v_active:=coalesce((v_record.normalized->>'active')::boolean,true);
      if v_name is null or v_slug is null then raise exception 'MIGRATION_PRODUCT_INVALID'; end if;
      select target_id into v_target_id from public.migration_external_links where instance_id=p_instance_id and source_platform='shopware6' and entity_type='product' and source_id=v_record.source_id;
      if v_target_id is null then
        if exists(select 1 from public.products where instance_id=p_instance_id and slug=v_slug) then raise exception 'MIGRATION_PRODUCT_SLUG_CONFLICT'; end if;
        insert into public.products(instance_id,slug,name,short_description,description,active,audience,featured,use_cases,highlights)
        values(p_instance_id,v_slug,v_name,nullif(v_record.normalized->>'shortDescription',''),nullif(v_record.normalized->>'description',''),v_active,'retail',false,'{}'::text[],'{}'::text[])
        returning * into v_product;
        v_target_id:=v_product.id;v_operation:='insert';v_after:=to_jsonb(v_product);
        insert into public.migration_external_links(instance_id,organization_id,source_platform,entity_type,source_id,target_table,target_id)
        values(p_instance_id,v_org,'shopware6','product',v_record.source_id,'products',v_target_id)
        on conflict(instance_id,source_platform,entity_type,source_id) do update set target_table='products',target_id=excluded.target_id,updated_at=now();
      else
        select * into v_product from public.products where id=v_target_id and instance_id=p_instance_id for update;
        if not found then raise exception 'MIGRATION_LINK_TARGET_MISSING'; end if;
        v_before:=to_jsonb(v_product);v_operation:='update';
        update public.products set slug=v_slug,name=v_name,short_description=nullif(v_record.normalized->>'shortDescription',''),description=nullif(v_record.normalized->>'description',''),active=v_active,updated_at=now()
         where id=v_target_id and instance_id=p_instance_id returning * into v_product;
        v_after:=to_jsonb(v_product);
      end if;
    else
      v_sku:=nullif(trim(v_record.normalized->>'sku'),'');v_label:=coalesce(nullif(trim(v_record.normalized->>'label'),''),'Alapváltozat');
      v_net:=(v_record.normalized->>'netPriceHuf')::integer;v_gross:=(v_record.normalized->>'grossPriceHuf')::integer;v_stock:=(v_record.normalized->>'stock')::integer;v_active:=coalesce((v_record.normalized->>'active')::boolean,true);v_weight:=(v_record.normalized->>'weightGrams')::integer;
      if v_sku is null or v_net is null or v_gross is null or v_stock is null or v_net<0 or v_gross<0 or v_stock<0 then raise exception 'MIGRATION_VARIANT_INVALID'; end if;
      select target_id into v_parent_id from public.migration_external_links where instance_id=p_instance_id and source_platform='shopware6' and entity_type='product' and source_id=(v_record.normalized->>'productSourceId');
      if v_parent_id is null then raise exception 'MIGRATION_PARENT_NOT_APPLIED'; end if;
      select target_id into v_target_id from public.migration_external_links where instance_id=p_instance_id and source_platform='shopware6' and entity_type='variant' and source_id=v_record.source_id;
      if v_target_id is null then
        if exists(select 1 from public.product_variants where instance_id=p_instance_id and sku=v_sku) then raise exception 'MIGRATION_VARIANT_SKU_CONFLICT'; end if;
        insert into public.product_variants(instance_id,product_id,sku,label,net_price_huf,gross_price_huf,stock_quantity,active,weight_grams)
        values(p_instance_id,v_parent_id,v_sku,v_label,v_net,v_gross,v_stock,v_active,case when v_weight>0 then v_weight else null end)
        returning * into v_variant;
        v_target_id:=v_variant.id;v_operation:='insert';v_after:=to_jsonb(v_variant);
        insert into public.migration_external_links(instance_id,organization_id,source_platform,entity_type,source_id,target_table,target_id)
        values(p_instance_id,v_org,'shopware6','variant',v_record.source_id,'product_variants',v_target_id)
        on conflict(instance_id,source_platform,entity_type,source_id) do update set target_table='product_variants',target_id=excluded.target_id,updated_at=now();
      else
        select * into v_variant from public.product_variants where id=v_target_id and instance_id=p_instance_id for update;
        if not found then raise exception 'MIGRATION_LINK_TARGET_MISSING'; end if;
        v_before:=to_jsonb(v_variant);v_operation:='update';
        update public.product_variants set product_id=v_parent_id,sku=v_sku,label=v_label,net_price_huf=v_net,gross_price_huf=v_gross,stock_quantity=v_stock,active=v_active,weight_grams=case when v_weight>0 then v_weight else null end,updated_at=now()
         where id=v_target_id and instance_id=p_instance_id returning * into v_variant;
        v_after:=to_jsonb(v_variant);
      end if;
    end if;

    insert into public.migration_change_journal(run_id,instance_id,organization_id,entity_type,source_id,target_table,target_id,operation,before_state,after_state)
    values(p_run_id,p_instance_id,v_org,v_record.entity_type,v_record.source_id,case when v_record.entity_type='product' then 'products' else 'product_variants' end,v_target_id,v_operation,v_before,v_after)
    on conflict(run_id,entity_type,source_id) do update set target_id=excluded.target_id,operation=excluded.operation,before_state=coalesce(public.migration_change_journal.before_state,excluded.before_state),after_state=excluded.after_state,reverted_at=null;
    update public.migration_records set status='applied',target_table=case when entity_type='product' then 'products' else 'product_variants' end,target_id=v_target_id,updated_at=now() where id=v_record.id and instance_id=p_instance_id;
    v_applied:=v_applied+1;
  end loop;

  select count(*) into v_remaining from public.migration_records where run_id=p_run_id and instance_id=p_instance_id and status='ready' and entity_type in ('product','variant');
  update public.migration_runs set status=case when v_remaining>0 then 'paused' else 'applied' end,phase=case when v_remaining>0 then 'apply' else 'validate' end,applied_at=case when v_remaining=0 then coalesce(applied_at,now()) else applied_at end,checkpoint=coalesce(checkpoint,'{}'::jsonb)||jsonb_build_object('apply',jsonb_build_object('lastBatch',v_applied,'remaining',v_remaining,'at',now())),updated_at=now() where id=p_run_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'migration.catalog_batch_applied','migration_run',p_run_id::text,v_org,p_instance_id,'Shopware 6 katalógus migrációs batch alkalmazva',jsonb_build_object('applied',v_applied,'remaining',v_remaining),jsonb_build_object('audit_source','database_rpc','source_platform','shopware6'));
  return jsonb_build_object('runId',p_run_id,'applied',v_applied,'remaining',v_remaining,'status',case when v_remaining>0 then 'paused' else 'applied' end);
end;
$$;

revoke all on function public.apply_shopware6_catalog_migration_v1(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.apply_shopware6_catalog_migration_v1(uuid,uuid,uuid,integer) to service_role;

create or replace function public.rollback_shopware6_catalog_migration_v1(
  p_run_id uuid,p_instance_id uuid,p_actor uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_run public.migration_runs%rowtype;v_change public.migration_change_journal%rowtype;
  v_product public.products%rowtype;v_variant public.product_variants%rowtype;v_reverted integer:=0;
begin
  if p_run_id is null or p_instance_id is null or p_actor is null then raise exception 'MIGRATION_ROLLBACK_IDENTITY_REQUIRED'; end if;
  if not coalesce(public.can_manage_catalog(p_instance_id,p_actor),false) and not coalesce(public.is_platform_operator(p_actor),false) then raise exception 'MIGRATION_PERMISSION_REQUIRED'; end if;
  select * into v_run from public.migration_runs where id=p_run_id and instance_id=p_instance_id and source_platform='shopware6' for update;
  if not found then raise exception 'MIGRATION_RUN_NOT_FOUND'; end if;
  if v_run.status not in ('paused','applied','completed','failed') then raise exception 'MIGRATION_RUN_NOT_ROLLBACKABLE'; end if;
  v_org:=v_run.organization_id;
  update public.migration_runs set phase='rollback',updated_at=now() where id=p_run_id;
  for v_change in
    select * from public.migration_change_journal where run_id=p_run_id and instance_id=p_instance_id and reverted_at is null
    order by case entity_type when 'variant' then 0 else 1 end,created_at desc,id desc for update
  loop
    if v_change.entity_type='variant' then
      select * into v_variant from public.product_variants where id=v_change.target_id and instance_id=p_instance_id for update;
      if v_change.operation='insert' then
        if not found or to_jsonb(v_variant) is distinct from v_change.after_state then raise exception 'MIGRATION_ROLLBACK_TARGET_CHANGED'; end if;
        delete from public.product_variants where id=v_change.target_id and instance_id=p_instance_id;
        delete from public.migration_external_links where instance_id=p_instance_id and source_platform='shopware6' and entity_type='variant' and source_id=v_change.source_id and target_id=v_change.target_id;
      else
        if not found or to_jsonb(v_variant) is distinct from v_change.after_state or v_change.before_state is null then raise exception 'MIGRATION_ROLLBACK_TARGET_CHANGED'; end if;
        update public.product_variants set product_id=(v_change.before_state->>'product_id')::uuid,sku=v_change.before_state->>'sku',label=v_change.before_state->>'label',net_price_huf=(v_change.before_state->>'net_price_huf')::integer,gross_price_huf=(v_change.before_state->>'gross_price_huf')::integer,stock_quantity=(v_change.before_state->>'stock_quantity')::integer,active=(v_change.before_state->>'active')::boolean,weight_grams=(v_change.before_state->>'weight_grams')::integer,updated_at=(v_change.before_state->>'updated_at')::timestamptz where id=v_change.target_id and instance_id=p_instance_id;
      end if;
    else
      select * into v_product from public.products where id=v_change.target_id and instance_id=p_instance_id for update;
      if v_change.operation='insert' then
        if not found or to_jsonb(v_product) is distinct from v_change.after_state then raise exception 'MIGRATION_ROLLBACK_TARGET_CHANGED'; end if;
        if exists(select 1 from public.product_variants where product_id=v_change.target_id and instance_id=p_instance_id) then raise exception 'MIGRATION_ROLLBACK_PRODUCT_IN_USE'; end if;
        delete from public.products where id=v_change.target_id and instance_id=p_instance_id;
        delete from public.migration_external_links where instance_id=p_instance_id and source_platform='shopware6' and entity_type='product' and source_id=v_change.source_id and target_id=v_change.target_id;
      else
        if not found or to_jsonb(v_product) is distinct from v_change.after_state or v_change.before_state is null then raise exception 'MIGRATION_ROLLBACK_TARGET_CHANGED'; end if;
        update public.products set slug=v_change.before_state->>'slug',name=v_change.before_state->>'name',short_description=v_change.before_state->>'short_description',description=v_change.before_state->>'description',active=(v_change.before_state->>'active')::boolean,audience=v_change.before_state->>'audience',featured=(v_change.before_state->>'featured')::boolean,use_cases=array(select jsonb_array_elements_text(v_change.before_state->'use_cases')),highlights=array(select jsonb_array_elements_text(v_change.before_state->'highlights')),updated_at=(v_change.before_state->>'updated_at')::timestamptz where id=v_change.target_id and instance_id=p_instance_id;
      end if;
    end if;
    update public.migration_change_journal set reverted_at=now() where id=v_change.id;
    update public.migration_records set status='rolled_back',updated_at=now() where run_id=p_run_id and entity_type=v_change.entity_type and source_id=v_change.source_id;
    v_reverted:=v_reverted+1;
  end loop;
  update public.migration_runs set status='rolled_back',phase='rollback',rolled_back_at=now(),updated_at=now() where id=p_run_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'migration.rolled_back','migration_run',p_run_id::text,v_org,p_instance_id,'Shopware 6 migráció visszaállítva',jsonb_build_object('reverted',v_reverted),jsonb_build_object('audit_source','database_rpc','source_platform','shopware6'));
  return jsonb_build_object('runId',p_run_id,'status','rolled_back','reverted',v_reverted);
end;
$$;

revoke all on function public.rollback_shopware6_catalog_migration_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.rollback_shopware6_catalog_migration_v1(uuid,uuid,uuid) to service_role;

comment on table public.migration_runs is 'Tenant-scoped Migration Assistant run metadata. Source credentials are never persisted.';
comment on table public.migration_records is 'Staged, normalized migration evidence. Unsupported target entities remain deferred rather than being silently discarded.';
comment on function public.apply_shopware6_catalog_migration_v1(uuid,uuid,uuid,integer) is 'Resumable Shopware 6 catalog apply. Each batch and its change journal commit atomically.';
comment on function public.rollback_shopware6_catalog_migration_v1(uuid,uuid,uuid) is 'Rollback only Block 12 catalog changes and fail closed if a target changed after migration.';
