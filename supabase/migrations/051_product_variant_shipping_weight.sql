alter table public.product_variants
  add column if not exists weight_grams integer;

alter table public.product_variants
  drop constraint if exists product_variants_weight_grams_check;

alter table public.product_variants
  add constraint product_variants_weight_grams_check
  check (weight_grams is null or weight_grams > 0);

-- Reference-shop backfill only. New Shoperation shops manage this as product data.
update public.product_variants
set weight_grams = case sku
  when 'WK-040' then 40
  when 'WK-750' then 750
  when 'WK-25K' then 25000
  else weight_grams
end
where weight_grams is null
  and sku in ('WK-040','WK-750','WK-25K');
