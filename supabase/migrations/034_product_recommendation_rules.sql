create table if not exists public.product_recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  source_variant_id uuid references public.product_variants(id) on delete cascade,
  recommended_variant_id uuid not null references public.product_variants(id) on delete cascade,
  placement text not null check (placement in ('cart','post_purchase')),
  priority integer not null default 100 check (priority between 0 and 10000),
  active boolean not null default true,
  headline text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_variant_id is null or source_variant_id <> recommended_variant_id),
  unique(source_variant_id, recommended_variant_id, placement)
);
alter table public.product_recommendation_rules enable row level security;
create policy "admins manage recommendation rules" on public.product_recommendation_rules for all to authenticated using (private.is_admin()) with check (private.is_admin());
create index if not exists product_recommendation_rules_lookup_idx on public.product_recommendation_rules(placement, source_variant_id, active, priority);
