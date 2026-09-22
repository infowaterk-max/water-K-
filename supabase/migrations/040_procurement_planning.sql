-- V8 procurement planning parameters per product variant.
-- These fields turn the existing demand forecast into a lead-time aware reorder recommendation.

alter table public.product_variants
  add column if not exists supplier_lead_time_days integer not null default 7 check (supplier_lead_time_days >= 0 and supplier_lead_time_days <= 365),
  add column if not exists safety_stock_days integer not null default 7 check (safety_stock_days >= 0 and safety_stock_days <= 365),
  add column if not exists minimum_order_quantity integer not null default 1 check (minimum_order_quantity >= 1),
  add column if not exists order_multiple integer not null default 1 check (order_multiple >= 1);

comment on column public.product_variants.supplier_lead_time_days is 'Expected supplier lead time in calendar days used by procurement planning.';
comment on column public.product_variants.safety_stock_days is 'Additional demand coverage kept as safety stock.';
comment on column public.product_variants.minimum_order_quantity is 'Minimum procurement quantity for one replenishment order.';
comment on column public.product_variants.order_multiple is 'Procurement quantity is rounded up to this supplier pack/order multiple.';
