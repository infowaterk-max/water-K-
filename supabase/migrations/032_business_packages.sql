-- Business package foundation: Alap / Pro
-- Additive and backwards-compatible. Existing profiles remain Pro so no V24 capability is lost during rollout.

alter table public.profiles
  add column if not exists subscription_plan text not null default 'pro';

alter table public.profiles
  drop constraint if exists profiles_subscription_plan_check;

alter table public.profiles
  add constraint profiles_subscription_plan_check
  check (subscription_plan in ('alap', 'pro'));

comment on column public.profiles.subscription_plan is
  'Commercial webshop package entitlement. Allowed values: alap, pro.';

create index if not exists profiles_subscription_plan_idx
  on public.profiles (subscription_plan);
