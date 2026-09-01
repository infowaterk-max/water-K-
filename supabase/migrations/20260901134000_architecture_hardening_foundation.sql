-- Architecture hardening foundation: organization/store tenancy, RBAC, delegated access,
-- feature entitlements, append-only audit scope and B2C/B2B channel preparation.
-- Additive by design: existing runtime remains compatible while tenant-scoped access is adopted.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.webshop_instances add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
create index if not exists webshop_instances_organization_idx on public.webshop_instances(organization_id);

insert into public.organizations(slug,name)
select 'org-'||w.slug, w.name
from public.webshop_instances w
where not exists(select 1 from public.organizations o where o.slug='org-'||w.slug);

update public.webshop_instances w
set organization_id=o.id
from public.organizations o
where w.organization_id is null and o.slug='org-'||w.slug;

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  primary key(organization_id,user_id)
);

insert into public.organization_members(organization_id,user_id,role)
select distinct w.organization_id,m.user_id,case when m.role='owner' then 'owner' else 'admin' end
from public.webshop_instance_members m
join public.webshop_instances w on w.id=m.instance_id
where w.organization_id is not null
on conflict (organization_id,user_id) do nothing;

create table if not exists public.role_bindings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instance_id uuid references public.webshop_instances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null check (role_code in ('owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer')),
  delegated_by uuid references auth.users(id) on delete set null,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);
create index if not exists role_bindings_lookup_idx on public.role_bindings(user_id,instance_id,valid_from,valid_until) where revoked_at is null;
create unique index if not exists role_bindings_active_unique on public.role_bindings(organization_id,coalesce(instance_id,'00000000-0000-0000-0000-000000000000'::uuid),user_id,role_code) where revoked_at is null;

insert into public.role_bindings(organization_id,instance_id,user_id,role_code)
select w.organization_id,m.instance_id,m.user_id,case when m.role='owner' then 'owner' else 'admin' end
from public.webshop_instance_members m
join public.webshop_instances w on w.id=m.instance_id
where w.organization_id is not null
on conflict do nothing;

create table if not exists public.feature_entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  instance_id uuid references public.webshop_instances(id) on delete cascade,
  feature_code text not null,
  source text not null check (source in ('plan','addon','manual','trial','platform')),
  enabled boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);
create index if not exists feature_entitlements_lookup_idx on public.feature_entitlements(organization_id,instance_id,feature_code,enabled);

create table if not exists public.webshop_sales_channels (
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  channel_code text not null check (channel_code in ('b2c','b2b')),
  enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,channel_code)
);
insert into public.webshop_sales_channels(instance_id,channel_code,enabled)
select id,'b2c',true from public.webshop_instances on conflict do nothing;
insert into public.webshop_sales_channels(instance_id,channel_code,enabled)
select id,'b2b',false from public.webshop_instances on conflict do nothing;

create table if not exists public.product_channel_settings (
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  channel_code text not null check (channel_code in ('b2c','b2b')),
  visible boolean not null default true,
  gross_price integer,
  minimum_quantity integer not null default 1 check (minimum_quantity > 0),
  discount_percent numeric(5,2) check (discount_percent is null or (discount_percent between 0 and 100)),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(instance_id,product_id,channel_code)
);

alter table public.admin_audit_log add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.admin_audit_log add column if not exists instance_id uuid references public.webshop_instances(id) on delete set null;
create index if not exists admin_audit_log_scope_idx on public.admin_audit_log(organization_id,instance_id,created_at desc);

create or replace function public.is_platform_operator(p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.platform_operators p where p.user_id=p_user_id);
$$;

create or replace function public.has_store_role(p_instance_id uuid,p_roles text[],p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator(p_user_id) or exists(
    select 1 from public.role_bindings r
    where r.user_id=p_user_id
      and r.role_code=any(p_roles)
      and r.revoked_at is null
      and r.valid_from<=now()
      and (r.valid_until is null or r.valid_until>now())
      and (r.instance_id=p_instance_id or (r.instance_id is null and r.organization_id=(select organization_id from public.webshop_instances where id=p_instance_id)))
  );
$$;

create or replace function public.has_feature_entitlement(p_instance_id uuid,p_feature_code text) returns boolean
language sql stable security definer set search_path=public as $$
  select public.is_platform_operator() or exists(
    select 1 from public.feature_entitlements e
    join public.webshop_instances w on w.id=p_instance_id and w.organization_id=e.organization_id
    where e.feature_code=p_feature_code and e.enabled
      and (e.instance_id is null or e.instance_id=p_instance_id)
      and e.valid_from<=now() and (e.valid_until is null or e.valid_until>now())
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.role_bindings enable row level security;
alter table public.feature_entitlements enable row level security;
alter table public.webshop_sales_channels enable row level security;
alter table public.product_channel_settings enable row level security;

create policy organizations_member_read on public.organizations for select using (
  public.is_platform_operator() or exists(select 1 from public.organization_members m where m.organization_id=id and m.user_id=auth.uid())
);
create policy organization_members_self_read on public.organization_members for select using (
  public.is_platform_operator() or user_id=auth.uid() or exists(select 1 from public.organization_members m where m.organization_id=organization_members.organization_id and m.user_id=auth.uid() and m.role in ('owner','admin'))
);
create policy role_bindings_scope_read on public.role_bindings for select using (
  public.is_platform_operator() or user_id=auth.uid() or exists(select 1 from public.organization_members m where m.organization_id=role_bindings.organization_id and m.user_id=auth.uid() and m.role in ('owner','admin'))
);
create policy feature_entitlements_scope_read on public.feature_entitlements for select using (
  public.is_platform_operator() or exists(select 1 from public.organization_members m where m.organization_id=feature_entitlements.organization_id and m.user_id=auth.uid())
);
create policy sales_channels_scope_read on public.webshop_sales_channels for select using (public.has_store_role(instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']));
create policy product_channel_scope_read on public.product_channel_settings for select using (public.has_store_role(instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer']));

-- Audit rows are append-only from application/service code. No authenticated UPDATE/DELETE policy is created.
