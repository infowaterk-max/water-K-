alter table public.webshop_instances
  add column if not exists brand_name text,
  add column if not exists brand_tagline text,
  add column if not exists logo_url text,
  add column if not exists primary_color text,
  add column if not exists support_email text,
  add column if not exists support_phone text,
  add column if not exists public_site_url text,
  add column if not exists email_from_name text;

alter table public.webshop_instances
  add constraint webshop_instances_primary_color_check
  check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$');

update public.webshop_instances
set brand_name = coalesce(nullif(trim(brand_name),''), name)
where brand_name is null or trim(brand_name)='';
