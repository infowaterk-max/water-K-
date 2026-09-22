-- Block 11 follow-up: keep persistent derived/override sources single-valued without
-- preventing repeated historical trial/manual entitlement windows.

drop index if exists public.feature_entitlements_scope_source_unique;

create unique index if not exists feature_entitlements_persistent_scope_source_unique
on public.feature_entitlements(
  organization_id,
  coalesce(instance_id,'00000000-0000-0000-0000-000000000000'::uuid),
  feature_code,
  source
)
where source in ('plan','addon','platform');

create or replace function private.sync_webshop_addon_entitlements_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_instance_id uuid;
begin
  if tg_op='DELETE' then
    v_instance_id:=old.instance_id;
  else
    v_instance_id:=new.instance_id;
  end if;
  perform private.sync_webshop_addon_entitlements(v_instance_id);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.sync_webshop_addon_entitlements_trigger() from public,anon,authenticated,service_role;

comment on index public.feature_entitlements_persistent_scope_source_unique is
  'Block 11: plan/add-on/platform sources are single-valued per scope; trial/manual history may contain multiple time windows.';
