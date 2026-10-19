-- Forward-only PO correction: support staff compose customer email by default.
-- The original 20260908034000 composer foundation is immutable and remains opt-in at its historical point.
-- This later migration upgrades the support role preset while retaining per-user explicit deny precedence.
-- Digital Office Pro plan entitlement, author-private drafts and configured mailbox send gate are unchanged.

do $$
begin
  if to_regclass('public.store_permission_catalog') is null
    or to_regclass('public.store_role_permission_presets') is null then
    raise exception 'OFFICE_SUPPORT_COMPOSE_PERMISSION_FOUNDATION_MISSING';
  end if;

  if not exists (
    select 1 from public.store_permission_catalog
    where permission_code = 'office.email.compose'
  ) then
    raise exception 'OFFICE_SUPPORT_COMPOSE_CATALOG_ENTRY_MISSING';
  end if;

  insert into public.store_role_permission_presets (role_code,permission_code,default_scope)
  values ('support','office.email.compose','all')
  on conflict (role_code,permission_code)
  do update set default_scope = excluded.default_scope;
end
$$;

-- Never grant in store_permission_overrides: the owner can attach a scoped/unscoped
-- deny override to a specific support account and evaluate_store_capability_v1
-- will reject before consulting the inherited role preset.
