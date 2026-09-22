-- V10: governed offers + human-in-the-loop sales tasks
create table if not exists public.commercial_offers (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','approved','sent','accepted','expired','cancelled')),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  minimum_margin_percent numeric(5,2) not null default 20 check (minimum_margin_percent between 0 and 100),
  net_price_before_huf numeric(14,2),
  net_price_after_huf numeric(14,2),
  unit_cost_net_huf numeric(14,2),
  margin_net_huf numeric(14,2),
  margin_percent numeric(8,2),
  total_net_huf numeric(14,2),
  approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commercial_offers_opportunity_idx on public.commercial_offers(opportunity_id,status);
alter table public.commercial_offers enable row level security;
revoke all on public.commercial_offers from anon, authenticated;
grant all on public.commercial_offers to service_role;

create table if not exists public.sales_tasks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.commercial_opportunities(id) on delete set null,
  offer_id uuid references public.commercial_offers(id) on delete set null,
  task_key text unique,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  priority integer not null default 50 check (priority between 0 and 100),
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  outcome text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_tasks_queue_idx on public.sales_tasks(status,priority desc,due_at asc);
alter table public.sales_tasks enable row level security;
revoke all on public.sales_tasks from anon, authenticated;
grant all on public.sales_tasks to service_role;

create or replace function public.approve_commercial_offer(p_offer_id uuid)
returns public.commercial_offers
language plpgsql
security definer
set search_path=''
as $$
declare
  v_offer public.commercial_offers;
  v_preview jsonb;
begin
  select * into v_offer from public.commercial_offers where id=p_offer_id for update;
  if not found then raise exception 'offer_not_found'; end if;
  if v_offer.status <> 'draft' then raise exception 'offer_not_draft'; end if;
  select public.preview_promotion_margin(v_offer.variant_id,v_offer.discount_percent,v_offer.minimum_margin_percent) into v_preview;
  if coalesce((v_preview->>'safe')::boolean,false) is not true then raise exception 'margin_guard_failed'; end if;
  update public.commercial_offers set
    status='approved',
    net_price_before_huf=(v_preview->>'netPriceBefore')::numeric,
    net_price_after_huf=(v_preview->>'netPriceAfter')::numeric,
    unit_cost_net_huf=(v_preview->>'unitCostNet')::numeric,
    margin_net_huf=(v_preview->>'marginNet')::numeric,
    margin_percent=(v_preview->>'marginPercent')::numeric,
    total_net_huf=((v_preview->>'netPriceAfter')::numeric * quantity),
    approved_at=now(),updated_at=now()
  where id=p_offer_id returning * into v_offer;
  return v_offer;
end;
$$;
revoke all on function public.approve_commercial_offer(uuid) from public,anon,authenticated;
grant execute on function public.approve_commercial_offer(uuid) to service_role;

create or replace function public.plan_high_value_sales_tasks()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare v_count integer:=0;
begin
  insert into public.sales_tasks(opportunity_id,task_key,title,description,priority,due_at)
  select o.id,'opportunity:'||o.id::text,
         case when o.channel='b2b' then 'Viszonteladói lehetőség kezelése' else 'Nagy értékű ügyféllehetőség kezelése' end,
         o.reason||coalesce(' · '||o.recommended_action,''),o.priority_score,coalesce(o.due_at,now())
  from public.commercial_opportunities o
  where o.status in ('open','in_progress') and (o.priority_score>=80 or o.expected_value_net_huf>=100000)
  on conflict(task_key) do update set priority=excluded.priority,due_at=excluded.due_at,description=excluded.description,updated_at=now()
  where public.sales_tasks.status in ('open','in_progress');
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;
revoke all on function public.plan_high_value_sales_tasks() from public,anon,authenticated;
grant execute on function public.plan_high_value_sales_tasks() to service_role;
