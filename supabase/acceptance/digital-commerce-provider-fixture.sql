-- Preview/staging-only representative commerce fixture for the Digital Commerce Acceptance tenant.
-- NOT a migration. Execute manually only in the staging acceptance database.
-- Uses only non-live/manual providers and .invalid routing so it cannot create a real shipment.

do $$
declare
  v_instance_id uuid;
begin
  select id into v_instance_id
  from public.webshop_instances
  where status='pilot'
    and storefront_config->>'acceptance'='digital-commerce-guest-matrix'
  order by updated_at desc
  limit 1;

  if v_instance_id is null then
    raise exception 'DIGITAL_COMMERCE_ACCEPTANCE_INSTANCE_NOT_FOUND';
  end if;

  insert into public.webshop_instance_commerce_settings(
    instance_id,enabled_shipping_methods,enabled_payment_methods,free_shipping_threshold_huf,
    foxpost_fee_huf,gls_fee_huf,mpl_fee_huf,pickup_fee_huf,updated_at
  ) values(
    v_instance_id,
    array['pickup']::text[],
    array['bank_transfer','cash_on_delivery']::text[],
    20000,990,1490,1490,0,now()
  )
  on conflict(instance_id) do update set
    enabled_shipping_methods=excluded.enabled_shipping_methods,
    enabled_payment_methods=excluded.enabled_payment_methods,
    free_shipping_threshold_huf=excluded.free_shipping_threshold_huf,
    foxpost_fee_huf=excluded.foxpost_fee_huf,
    gls_fee_huf=excluded.gls_fee_huf,
    mpl_fee_huf=excluded.mpl_fee_huf,
    pickup_fee_huf=excluded.pickup_fee_huf,
    updated_at=now();

  insert into public.webshop_instance_provider_connections(
    instance_id,provider_code,enabled,display_label,fee_huf,configuration,
    connection_status,onboarding_step,last_tested_at,last_test_message,credential_fields_present,updated_at
  ) values
    (v_instance_id,'pickup',true,'Acceptance · személyes átvétel',0,'{}'::jsonb,'active','ready',now(),'Acceptance fixture: manual provider',array[]::text[],now()),
    (v_instance_id,'external_logistics',true,'Acceptance · házhozszállítás',1490,jsonb_build_object('logistics_email','acceptance-logistics@example.invalid'),'active','ready',now(),'Acceptance fixture: .invalid routing only',array['logistics_email']::text[],now()),
    (v_instance_id,'external_mpl_automata',true,'Acceptance · csomagpont',990,jsonb_build_object('logistics_email','acceptance-logistics@example.invalid'),'active','ready',now(),'Acceptance fixture: .invalid routing only',array['logistics_email']::text[],now()),
    (v_instance_id,'bank_transfer',true,'Acceptance · banki átutalás',null,jsonb_build_object(
      'account_holder','Acceptance Tesztkereskedő',
      'bank_name','Tesztbank',
      'bank_account','000000000000000000000000',
      'transfer_note','Acceptance fixture – ne utalj valódi pénzt.'
    ),'active','ready',now(),'Acceptance fixture: non-live bank data',array['account_holder','bank_account']::text[],now()),
    (v_instance_id,'cash_on_delivery',true,'Acceptance · utánvét',null,'{}'::jsonb,'active','ready',now(),'Acceptance fixture: manual payment',array[]::text[],now())
  on conflict(instance_id,provider_code) do update set
    enabled=excluded.enabled,
    display_label=excluded.display_label,
    fee_huf=excluded.fee_huf,
    configuration=excluded.configuration,
    connection_status=excluded.connection_status,
    onboarding_step=excluded.onboarding_step,
    last_tested_at=excluded.last_tested_at,
    last_test_message=excluded.last_test_message,
    credential_fields_present=excluded.credential_fields_present,
    updated_at=now();
end $$;
