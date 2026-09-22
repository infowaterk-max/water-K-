-- Email Builder Foundation B follow-up: covering indexes for newly introduced foreign keys.
create index if not exists email_brand_kits_created_by_idx on public.email_brand_kits(created_by);
create index if not exists email_brand_kits_updated_by_idx on public.email_brand_kits(updated_by);

create index if not exists email_templates_created_by_idx on public.email_templates(created_by);
create index if not exists email_templates_updated_by_idx on public.email_templates(updated_by);
create index if not exists email_templates_brand_kit_tenant_fk_idx on public.email_templates(brand_kit_id,instance_id);
create index if not exists email_templates_active_version_fk_idx on public.email_templates(active_version_id,id,instance_id);

create index if not exists email_template_versions_created_by_idx on public.email_template_versions(created_by);
create index if not exists email_template_versions_template_fk_idx on public.email_template_versions(template_id,instance_id);
