alter table public.product_variants
  add column if not exists unit_cost_net_huf integer;

alter table public.product_variants
  drop constraint if exists product_variants_unit_cost_net_huf_check;

alter table public.product_variants
  add constraint product_variants_unit_cost_net_huf_check
  check (unit_cost_net_huf is null or unit_cost_net_huf >= 0);

comment on column public.product_variants.unit_cost_net_huf is
  'Nettó beszerzési/előállítási egységköltség HUF-ban. Admin fedezet- és készletbefektetés számítás alapja.';
