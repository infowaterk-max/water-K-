-- Preserve deterministic server-side Business Pulse reads across staging and future deployments.
-- Production already exposes these tables to service_role; explicit grants avoid environment-specific default privilege drift.

grant select on table public.business_pulse_trials to service_role;
grant select on table public.business_pulse_reports to service_role;
grant select on table public.business_pulse_trial_events to service_role;
