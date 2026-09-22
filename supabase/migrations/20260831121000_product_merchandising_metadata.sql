alter table public.products
  add column if not exists audience text not null default 'retail',
  add column if not exists featured boolean not null default false,
  add column if not exists use_cases text[] not null default '{}',
  add column if not exists highlights text[] not null default '{}';

alter table public.products
  drop constraint if exists products_audience_check;

alter table public.products
  add constraint products_audience_check
  check (audience in ('retail', 'professional'));

comment on column public.products.audience is 'Storefront audience used by the Shoperation catalog. Values: retail or professional.';
comment on column public.products.featured is 'Whether the product is highlighted by default in storefront merchandising.';
comment on column public.products.use_cases is 'Tenant-managed merchandising use-case labels for the product.';
comment on column public.products.highlights is 'Tenant-managed merchandising highlight labels for the product.';
