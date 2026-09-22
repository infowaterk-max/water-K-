-- Roadmap Block 12 performance hardening: cover remaining foreign keys used by migration staging.
-- Additive indexes only; no data or application semantics change.

create index if not exists migration_runs_organization_idx on public.migration_runs(organization_id);
create index if not exists migration_runs_created_by_idx on public.migration_runs(created_by);

create index if not exists migration_records_instance_idx on public.migration_records(instance_id);
create index if not exists migration_records_organization_idx on public.migration_records(organization_id);

create index if not exists migration_issues_instance_idx on public.migration_issues(instance_id);
create index if not exists migration_issues_organization_idx on public.migration_issues(organization_id);
create index if not exists migration_issues_resolved_by_idx on public.migration_issues(resolved_by);

create index if not exists migration_external_links_organization_idx on public.migration_external_links(organization_id);

create index if not exists migration_change_journal_instance_idx on public.migration_change_journal(instance_id);
create index if not exists migration_change_journal_organization_idx on public.migration_change_journal(organization_id);
