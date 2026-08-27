alter table public.product_variants
  add column if not exists updated_at timestamptz not null default now();

create or replace function private.touch_product_variant_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.touch_product_variant_updated_at() from public, anon, authenticated;

drop trigger if exists product_variants_touch_updated_at on public.product_variants;
create trigger product_variants_touch_updated_at
before update on public.product_variants
for each row execute function private.touch_product_variant_updated_at();
