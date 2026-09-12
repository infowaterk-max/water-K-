-- Special Commerce Wave 1: Interactive Scene Commerce is a released Pro capability.
insert into public.entitlement_capabilities(capability_code,release_state,capability_kind,metadata)
values ('interactiveSceneCommerce','released','feature',jsonb_build_object('surface','storefront','family','special-commerce','engine','interactive-scene-v1'))
on conflict(capability_code) do update
set release_state='released',capability_kind='feature',metadata=excluded.metadata,updated_at=now();

insert into public.plan_capability_grants(plan_code,capability_code)
values ('pro','interactiveSceneCommerce')
on conflict do nothing;

-- Existing Pro tenants receive the same deterministic plan-derived entitlement.
do $$
declare r record;
begin
  for r in select id from public.webshop_instances where subscription_plan='pro' loop
    perform private.sync_webshop_plan_entitlements(r.id);
  end loop;
end $$;
