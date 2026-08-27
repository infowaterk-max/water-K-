-- V8: campaign planning with immutable audience snapshots and approval gating.
create table if not exists public.marketing_campaigns(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 segment text not null check(segment in('repeat_30_89','winback_90_plus')),
 template_key text not null check(template_key in('repeat_30d','winback_90d')),
 status text not null default 'draft' check(status in('draft','review','approved','queued','cancelled','completed')),
 scheduled_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaign_recipients(
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
 customer_key text not null,
 user_id uuid references auth.users(id) on delete set null,
 email text not null,
 customer_name text,
 orders_count integer not null default 0,
 revenue_gross_huf integer not null default 0,
 last_order_at timestamptz,
 consent_ok boolean not null,
 suppressed boolean not null,
 eligible boolean not null,
 exclusion_reason text,
 communication_job_id uuid references public.communication_jobs(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(campaign_id,email)
);
create index if not exists marketing_campaigns_status_idx on public.marketing_campaigns(status,created_at desc);
create index if not exists marketing_campaign_recipients_campaign_idx on public.marketing_campaign_recipients(campaign_id,eligible);
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_campaign_recipients enable row level security;
revoke all on public.marketing_campaigns,public.marketing_campaign_recipients from anon,authenticated;
grant select,insert,update,delete on public.marketing_campaigns,public.marketing_campaign_recipients to service_role;
