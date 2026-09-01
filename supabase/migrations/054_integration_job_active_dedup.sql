-- Prevent two workers/admin requests from creating the same active external operation.
-- Failed/blocked/succeeded jobs remain historical and can be retried explicitly.
create unique index if not exists integration_jobs_active_order_kind_provider_uidx
on public.integration_jobs(order_id, kind, provider)
where order_id is not null and status in ('pending','processing');
