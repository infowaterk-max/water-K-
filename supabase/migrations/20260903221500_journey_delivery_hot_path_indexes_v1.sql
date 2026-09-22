-- Cover the exact tenant-scoped lookup and lock paths introduced by journey delivery reconciliation.
-- The first index covers communication_job_id FK/reconciler lookups; the second covers tenant journey-state scans.

create index if not exists customer_journey_steps_job_instance_idx
  on public.customer_journey_steps(communication_job_id,instance_id)
  where communication_job_id is not null;

create index if not exists customer_journey_steps_instance_journey_status_idx
  on public.customer_journey_steps(instance_id,journey_id,status);

comment on index public.customer_journey_steps_job_instance_idx
is 'Hot-path index for communication-job to tenant journey-step reconciliation and locking.';

comment on index public.customer_journey_steps_instance_journey_status_idx
is 'Hot-path index for tenant journey-state reconciliation across pending, queued, sent, blocked and cancelled steps.';
