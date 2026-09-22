-- Checkout local evidence closure.
-- Keeps database-local checkout side effects transactional and idempotent around the
-- unavoidable external payment-provider call.

create or replace function public.finalize_checkout_local_v2(
  p_instance_id uuid,
  p_order_id uuid,
  p_user_id uuid,
  p_idempotency_key text,
  p_target_status text,
  p_email_provider text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_key text;
  v_legal_event_id uuid;
  v_status_event_id uuid;
  v_confirmation_job_id uuid;
  v_logistics_job_id uuid;
  v_recovery_converted boolean:=false;
  v_status_changed boolean:=false;
  v_logistics_recipient text;
  v_logistics_label text;
begin
  if p_instance_id is null or p_order_id is null then
    raise exception 'CHECKOUT_FINALIZE_IDENTITY_REQUIRED';
  end if;
  if p_idempotency_key is null
     or length(trim(p_idempotency_key))<16
     or length(p_idempotency_key)>120 then
    raise exception 'CHECKOUT_FINALIZE_IDEMPOTENCY_INVALID';
  end if;
  if p_target_status not in ('pending','pending_payment','pending_transfer') then
    raise exception 'CHECKOUT_FINALIZE_STATUS_INVALID';
  end if;
  if p_email_provider is null
     or p_email_provider!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'CHECKOUT_FINALIZE_EMAIL_PROVIDER_INVALID';
  end if;

  v_key:=md5(p_instance_id::text||':'||trim(p_idempotency_key));
  perform 1
  from public.order_request_keys
  where idempotency_key=v_key
    and response->>'order_id'=p_order_id::text;
  if not found then raise exception 'CHECKOUT_FINALIZE_REQUEST_EVIDENCE_MISSING'; end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'CHECKOUT_FINALIZE_ORDER_NOT_FOUND'; end if;

  if p_user_id is not null and v_order.customer_id is distinct from p_user_id then
    raise exception 'CHECKOUT_FINALIZE_CUSTOMER_MISMATCH';
  end if;

  if v_order.status::text in ('pending_payment','pending_transfer')
     and v_order.status::text<>p_target_status then
    raise exception 'CHECKOUT_FINALIZE_STATUS_CONFLICT';
  end if;

  if v_order.status='pending' and p_target_status<>'pending' then
    update public.orders
    set status=p_target_status::public.order_status,
        updated_at=now()
    where id=p_order_id and instance_id=p_instance_id
    returning * into v_order;
    if not found then raise exception 'CHECKOUT_FINALIZE_STATUS_WRITE_MISSING'; end if;

    insert into public.order_events(
      instance_id,order_id,event_type,from_status,to_status,actor_user_id,metadata
    ) values(
      p_instance_id,p_order_id,'checkout_status_initialized',
      'pending'::public.order_status,p_target_status::public.order_status,p_user_id,
      jsonb_build_object('payment_method',v_order.payment_method,'idempotency_key',p_idempotency_key)
    ) returning id into v_status_event_id;
    if v_status_event_id is null then raise exception 'CHECKOUT_FINALIZE_STATUS_EVENT_MISSING'; end if;
    v_status_changed:=true;
  end if;

  select e.id into v_legal_event_id
  from public.order_events e
  where e.instance_id=p_instance_id
    and e.order_id=p_order_id
    and e.event_type='legal_terms_accepted'
    and coalesce(e.metadata->>'idempotency_key','')=p_idempotency_key
  order by e.created_at,e.id
  limit 1;

  if v_legal_event_id is null then
    insert into public.order_events(
      instance_id,order_id,event_type,actor_user_id,metadata
    ) values(
      p_instance_id,p_order_id,'legal_terms_accepted',p_user_id,
      jsonb_build_object(
        'accepted_at',now(),
        'terms_path','/aszf',
        'privacy_path','/adatvedelem',
        'idempotency_key',p_idempotency_key,
        'payment_provider',v_order.payment_method,
        'shipping_provider',v_order.shipping_method,
        'instance_id',p_instance_id
      )
    ) returning id into v_legal_event_id;
  end if;
  if v_legal_event_id is null then raise exception 'CHECKOUT_FINALIZE_LEGAL_EVENT_MISSING'; end if;

  v_confirmation_job_id:=private.enqueue_order_integration_intent_v1(
    p_instance_id,
    p_order_id,
    'email_send',
    p_email_provider,
    jsonb_build_object('template','order_confirmation','instance_id',p_instance_id)
  );
  if v_confirmation_job_id is null then raise exception 'CHECKOUT_FINALIZE_CONFIRMATION_JOB_MISSING'; end if;

  if p_user_id is not null then
    v_recovery_converted:=public.convert_checkout_recovery_intent_v2(
      p_instance_id,p_user_id,p_order_id
    );
  end if;

  if v_order.payment_method='cash_on_delivery'
     and coalesce(v_order.shipping_method,'')<>''
     and v_order.shipping_method<>'pickup' then
    select
      lower(trim(coalesce(c.configuration->>'logistics_email',''))),
      coalesce(c.display_label,'Külső logisztikai partner')
    into v_logistics_recipient,v_logistics_label
    from public.webshop_instance_provider_connections c
    join public.commerce_provider_catalog p on p.code=c.provider_code
    where c.instance_id=p_instance_id
      and c.provider_code=v_order.shipping_method
      and c.enabled=true
      and c.connection_status='active'
      and p.provider_type='shipping'
      and p.is_available=true
      and p.adapter_key='external_logistics_email'
      and nullif(trim(c.configuration->>'logistics_email'),'') is not null
    limit 1;

    if v_logistics_recipient is not null then
      v_logistics_job_id:=private.enqueue_order_integration_intent_v1(
        p_instance_id,
        p_order_id,
        'logistics_email',
        'external_logistics_email',
        jsonb_build_object(
          'recipient',v_logistics_recipient,
          'shippingCode',v_order.shipping_method,
          'label',v_logistics_label
        )
      );
      if v_logistics_job_id is null then raise exception 'CHECKOUT_FINALIZE_LOGISTICS_JOB_MISSING'; end if;
    end if;
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id;
  if not found then raise exception 'CHECKOUT_FINALIZE_AFTER_EVIDENCE_MISSING'; end if;

  return jsonb_build_object(
    'orderId',v_order.id,
    'status',v_order.status,
    'confirmationToken',v_order.confirmation_token,
    'legalEventId',v_legal_event_id,
    'statusEventId',v_status_event_id,
    'confirmationJobId',v_confirmation_job_id,
    'logisticsJobId',v_logistics_job_id,
    'recoveryConverted',v_recovery_converted,
    'statusChanged',v_status_changed
  );
end;
$$;

revoke all on function public.finalize_checkout_local_v2(uuid,uuid,uuid,text,text,text)
from public,anon,authenticated;
grant execute on function public.finalize_checkout_local_v2(uuid,uuid,uuid,text,text,text)
to service_role;


create or replace function public.reconcile_checkout_payment_session_v2(
  p_instance_id uuid,
  p_order_id uuid,
  p_attempt_id uuid,
  p_provider_code text,
  p_provider_reference text,
  p_checkout_url text,
  p_callback_url text,
  p_replayed boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_event_id uuid;
  v_event_type text:=case when coalesce(p_replayed,false) then 'payment_recovered' else 'payment_started' end;
begin
  if p_instance_id is null or p_order_id is null or p_attempt_id is null then
    raise exception 'PAYMENT_SESSION_IDENTITY_REQUIRED';
  end if;
  if p_provider_code is null or p_provider_code!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'PAYMENT_SESSION_PROVIDER_INVALID';
  end if;
  if p_provider_reference is null
     or length(trim(p_provider_reference))<1
     or length(p_provider_reference)>500 then
    raise exception 'PAYMENT_SESSION_REFERENCE_INVALID';
  end if;
  if p_checkout_url is null
     or length(p_checkout_url)>3000
     or p_checkout_url!~'^https?://' then
    raise exception 'PAYMENT_SESSION_URL_INVALID';
  end if;
  if p_callback_url is null
     or length(p_callback_url)>3000
     or p_callback_url!~'^https?://' then
    raise exception 'PAYMENT_SESSION_CALLBACK_INVALID';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where id=p_attempt_id
    and instance_id=p_instance_id
    and order_id=p_order_id
    and provider_code=p_provider_code
  for update;
  if not found then raise exception 'PAYMENT_SESSION_ATTEMPT_NOT_FOUND'; end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'PAYMENT_SESSION_ORDER_NOT_FOUND'; end if;
  if v_order.payment_method<>p_provider_code then
    raise exception 'PAYMENT_SESSION_ORDER_PROVIDER_MISMATCH';
  end if;

  if v_attempt.provider_reference is not null
     and v_attempt.provider_reference<>p_provider_reference then
    raise exception 'PAYMENT_SESSION_ATTEMPT_REFERENCE_CONFLICT';
  end if;
  if v_order.external_payment_id is not null
     and v_order.external_payment_id<>p_provider_reference then
    raise exception 'PAYMENT_SESSION_ORDER_REFERENCE_CONFLICT';
  end if;
  if v_attempt.status in ('failed','cancelled','expired','refunded') then
    raise exception 'PAYMENT_SESSION_ATTEMPT_TERMINAL';
  end if;

  update public.payment_attempts
  set provider_reference=p_provider_reference,
      status=case when status='succeeded' then status else 'pending' end,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'checkout_url',p_checkout_url,
        'callback_url',p_callback_url,
        'instance_id',p_instance_id
      ),
      updated_at=now(),
      completed_at=case when status='succeeded' then completed_at else null end,
      failure_code=case when status='succeeded' then failure_code else null end,
      failure_message=case when status='succeeded' then failure_message else null end
  where id=p_attempt_id and instance_id=p_instance_id
  returning * into v_attempt;
  if not found then raise exception 'PAYMENT_SESSION_ATTEMPT_WRITE_MISSING'; end if;

  update public.orders
  set external_payment_id=p_provider_reference,
      status=case
        when status='pending' then 'pending_payment'::public.order_status
        else status
      end,
      updated_at=now()
  where id=p_order_id and instance_id=p_instance_id
  returning * into v_order;
  if not found then raise exception 'PAYMENT_SESSION_ORDER_WRITE_MISSING'; end if;

  select e.id into v_event_id
  from public.order_events e
  where e.instance_id=p_instance_id
    and e.order_id=p_order_id
    and e.event_type=v_event_type
    and coalesce(e.metadata->>'payment_attempt_id','')=p_attempt_id::text
  order by e.created_at,e.id
  limit 1;

  if v_event_id is null then
    insert into public.order_events(
      instance_id,order_id,event_type,metadata
    ) values(
      p_instance_id,p_order_id,v_event_type,
      jsonb_build_object(
        'provider',p_provider_code,
        'provider_reference',p_provider_reference,
        'callback_url',p_callback_url,
        'payment_attempt_id',p_attempt_id,
        'instance_id',p_instance_id
      )
    ) returning id into v_event_id;
  end if;
  if v_event_id is null then raise exception 'PAYMENT_SESSION_EVENT_MISSING'; end if;

  return jsonb_build_object(
    'orderId',v_order.id,
    'orderStatus',v_order.status,
    'attemptId',v_attempt.id,
    'attemptStatus',v_attempt.status,
    'providerReference',v_attempt.provider_reference,
    'eventId',v_event_id
  );
end;
$$;

revoke all on function public.reconcile_checkout_payment_session_v2(uuid,uuid,uuid,text,text,text,text,boolean)
from public,anon,authenticated;
grant execute on function public.reconcile_checkout_payment_session_v2(uuid,uuid,uuid,text,text,text,text,boolean)
to service_role;

comment on function public.finalize_checkout_local_v2(uuid,uuid,uuid,text,text,text)
is 'Idempotently commits local checkout status, legal evidence, confirmation outbox, recovery conversion and COD logistics intent.';
comment on function public.reconcile_checkout_payment_session_v2(uuid,uuid,uuid,text,text,text,text,boolean)
is 'Atomically reconciles a successful external payment-session creation into the tenant payment attempt, order reference and lifecycle event.';
