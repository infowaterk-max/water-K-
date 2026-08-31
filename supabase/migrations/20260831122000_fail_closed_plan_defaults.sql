-- Shoperation fresh-install safety: a newly created profile or webshop instance
-- must never inherit Pro without an explicit package assignment.

alter table public.profiles
  alter column subscription_plan set default 'alap';

alter table public.webshop_instances
  alter column subscription_plan set default 'alap';

comment on column public.profiles.subscription_plan is
  'Commercial webshop package entitlement. Fresh records default to alap; Pro requires explicit assignment.';

comment on column public.webshop_instances.subscription_plan is
  'Commercial webshop package entitlement. Fresh instances default to alap; Pro requires explicit assignment.';
