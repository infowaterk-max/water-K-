-- Customer Authentication UX shared hardening — authenticated guest-order claim authority.
-- A guest order can be attached only with possession of the server-issued confirmation token
-- plus an authenticated account whose email matches the checkout email. Email equality alone
-- never authorizes a claim.

create or replace function public.claim_guest_order_v1(
  p_instance_id uuid,
  p_confirmation_token uuid,
  p_customer_id uuid,
  p_customer_email text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_email text:=lower(trim(coalesce(p_customer_email,'')));
begin
  if p_instance_id is null or p_confirmation_token is null or p_customer_id is null or v_email='' then
    return pg_catalog.jsonb_build_object('status','invalid_request');
  end if;

  select * into v_order
  from public.orders
  where instance_id=p_instance_id
    and confirmation_token=p_confirmation_token
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('status','not_found');
  end if;

  if v_order.customer_id is not null then
    return pg_catalog.jsonb_build_object(
      'status',case when v_order.customer_id=p_customer_id then 'already_claimed' else 'claimed_by_other' end,
      'orderId',v_order.id,
      'orderNumber',v_order.order_number
    );
  end if;

  if lower(trim(coalesce(v_order.customer_email,'')))<>v_email then
    return pg_catalog.jsonb_build_object('status','email_mismatch');
  end if;

  update public.orders
  set customer_id=p_customer_id,updated_at=now()
  where id=v_order.id
    and instance_id=p_instance_id
    and customer_id is null;

  if not found then
    return pg_catalog.jsonb_build_object('status','claim_conflict');
  end if;

  update public.digital_entitlements
  set customer_id=p_customer_id
  where instance_id=p_instance_id
    and order_id=v_order.id
    and customer_id is null
    and lower(trim(coalesce(customer_email,'')))=v_email;

  perform private.sync_order_digital_entitlements_v1(v_order.id);

  update public.digital_guest_access_tokens
  set revoked_at=coalesce(revoked_at,now())
  where instance_id=p_instance_id
    and order_id=v_order.id
    and revoked_at is null;

  return pg_catalog.jsonb_build_object(
    'status','claimed',
    'orderId',v_order.id,
    'orderNumber',v_order.order_number
  );
end;
$$;

revoke all on function public.claim_guest_order_v1(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_guest_order_v1(uuid,uuid,uuid,text) to service_role;

comment on function public.claim_guest_order_v1(uuid,uuid,uuid,text)
is 'Authenticated guest-order claim authority. Requires tenant scope + confirmation token + authenticated matching email; never links orders by email match alone.';
