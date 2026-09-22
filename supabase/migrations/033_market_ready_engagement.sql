create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, variant_id)
);
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references public.product_variants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, email text not null,
  status text not null default 'waiting' check (status in ('waiting','sent','cancelled')), created_at timestamptz not null default now(), sent_at timestamptz,
  unique(variant_id, email)
);
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, rating smallint not null check (rating between 1 and 5), title text, body text, reviewer_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')), verified_purchase boolean not null default false,
  created_at timestamptz not null default now(), moderated_at timestamptz
);
alter table public.wishlists enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.product_reviews enable row level security;
create policy "users manage own wishlist" on public.wishlists for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users read own stock notifications" on public.stock_notifications for select to authenticated using ((select auth.uid()) = user_id or private.is_admin());
create policy "users create own stock notifications" on public.stock_notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "admins manage stock notifications" on public.stock_notifications for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "public reads approved reviews" on public.product_reviews for select to anon using (status = 'approved');
create policy "authenticated reads approved or own reviews" on public.product_reviews for select to authenticated using (status = 'approved' or (select auth.uid()) = user_id or private.is_admin());
create policy "users create own reviews" on public.product_reviews for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
create policy "admins moderate reviews" on public.product_reviews for update to authenticated using (private.is_admin()) with check (private.is_admin());
create index if not exists wishlists_user_idx on public.wishlists(user_id, created_at desc);
create index if not exists stock_notifications_waiting_idx on public.stock_notifications(status, variant_id);
create index if not exists product_reviews_product_idx on public.product_reviews(product_id, status, created_at desc);
