-- Payment retry and reconciliation evidence closure.
-- After an external payment session exists, its attempt/reference/order/event evidence is persisted
-- atomically. If full reconciliation cannot complete, durable requires_action evidence can still
-- retain the provider reference for later callback/reconciliation.

create or replace function public.reconcile_retry_payment_session_v2(
  p_instance_id uuid,
  p_order_id uuid,
  p_attempt_id uuid,
  p_actor uuid,
  p_provider_code text,
  p_provider_reference text,
  p_checkout_url text,
  p_callback_url text
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_old_active boolean:=false;
  v_event_id uuid;
begin
  if p_instance_id is null or p_order_id is null or p_attempt_id is null or p_actor is null then
    raise exception 'PAYMENT_RETRY_IDENTITY_REQUIRED';
  end if;
  if p_provider_code is null or p_provider_code!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'PAYMENT_RETRY_PROVIDER_INVALID';
  end if;
  if p_provider_reference is null or length(trim(p_provider_reference))<1 or length(p_provider_reference)>500 then
    raise exception 'PAYMENT_RETRY_REFERENCE_INVALID';
  end if;
  if p_checkout_url is null or length(p_checkout_url)>3000 or p_checkout_url!~'^https?://' then
    raise exception 'PAYMENT_RETRY_URL_INVALID';
  end if;
  if p_callback_url is null or length(p_callback_url)>3000 or p_callback_url!~'^https?://' then
    raise exception 'PAYMENT_RETRY_CALLBACK_INVALID';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id
    and instance_id=p_instance_id
    and customer_id=p_actor
  for update;
  if not found then raise exception 'PAYMENT_RETRY_ORDER_NOT_FOUND'; end if;
  if v_order.status<>'pending_payment' then raise exception 'PAYMENT_RETRY_ORDER_STATE_INVALID'; end if;
  if v_order.payment_method<>p_provider_code then raise exception 'PAYMENT_RETRY_ORDER_PROVIDER_MISMATCH'; end if;

  select * into v_attempt
  from public.payment_attempts
  where id=p_attempt_id
    and instance_id=p_instance_id
    and order_id=p_order_id
    and provider_code=p_provider_code
  for update;
  if not found then raise exception 'PAYMENT_RETRY_ATTEMPT_NOT_FOUND'; end if;

  if v_attempt.provider_reference is not null
     and v_attempt.provider_reference<>p_provider_reference then
    raise exception 'PAYMENT_RETRY_ATTEMPT_REFERENCE_CONFLICT';
  end if;
  if v_attempt.status in ('failed','cancelled','expired','refunded') then
    raise exception 'PAYMENT_RETRY_ATTEMPT_TERMINAL';
  end if;

  if v_order.external_payment_id is not null
     and v_order.external_payment_id<>p_provider_reference then
    select exists(
      select 1
      from public.payment_attempts a
      where a.instance_id=p_instance_id
        and a.order_id=p_order_id
        and a.provider_code=p_provider_code
        and a.provider_reference=v_order.external_payment_id
        and a.status in ('pending','succeeded','refunded')
    ) into v_old_active;
    if v_old_active then
      raise exception 'PAYMENT_RETRY_PREVIOUS_REFERENCE_STILL_ACTIVE';
    end if;
  end if;

  update public.payment_attempts
  set provider_reference=p_provider_reference,
      status=case when status='succeeded' then status else 'pending' end,
      metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
        'checkout_url',p_checkout_url,
        'callback_url',p_callback_url,
        'retry_reconciled',true,
        'instance_id',p_instance_id
      ),
      updated_at=now(),
      completed_at=case when status='succeeded' then completed_at else null end,
      failure_code=case when status='succeeded' then failure_code else null end,
      failure_message=case when status='succeeded' then failure_message else null end
  where id=p_attempt_id and instance_id=p_instance_id
  returning * into v_attempt;
  if not found then raise exception 'PAYMENT_RETRY_ATTEMPT_WRITE_MISSING'; end if;

  update public.orders
  set external_payment_id=p_provider_reference,
      updated_at=now()
  where id=p_order_id
    and instance_id=p_instance_id
    and status='pending_payment'
  returning * into v_order;
  if not found then raise exception 'PAYMENT_RETRY_ORDER_WRITE_MISSING'; end if;

  select e.id into v_event_id
  from public.order_events e
  where e.instance_id=p_instance_id
    and e.order_id=p_order_id
    and e.event_type='payment_retried'
    and coalesce(e.metadata->>'payment_attempt_id','')=p_attempt_id::text
  order by e.created_at,e.id
  limit 1;

  if v_event_id is null then
    insert into public.order_events(
      instance_id,order_id,event_type,actor_user_id,metadata
    ) values(
      p_instance_id,p_order_id,'payment_retried',p_actor,
      jsonb_build_object(
        'provider',p_provider_code,
        'provider_reference',p_provider_reference,
        'payment_attempt_id',p_attempt_id
      )
    ) returning id into v_event_id;
  end if;
  if v_event_id is null then raise exception 'PAYMENT_RETRY_EVENT_EVIDENCE_MISSING'; end if;

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

revoke all on function public.reconcile_retry_payment_session_v2(uuid,uuid,uuid,uuid,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.reconcile_retry_payment_session_v2(uuid,uuid,uuid,uuid,text,text,text,text)
to service_role;


create or replace function public.mark_payment_attempt_reconciliation_required_v2(
  p_instance_id uuid,
  p_order_id uuid,
  p_attempt_id uuid,
  p_provider_code text,
  p_provider_reference text default null,
  p_checkout_url text default null,
  p_failure_code text default 'PAYMENT_OUTCOME_UNKNOWN',
  p_failure_message text default null,
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_order public.orders%rowtype;
  v_message text;
begin
  if p_instance_id is null or p_order_id is null or p_attempt_id is null then
    raise exception 'PAYMENT_RECONCILIATION_IDENTITY_REQUIRED';
  end if;
  if p_provider_code is null or p_provider_code!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'PAYMENT_RECONCILIATION_PROVIDER_INVALID';
  end if;
  if p_provider_reference is not null
     and (length(trim(p_provider_reference))<1 or length(p_provider_reference)>500) then
    raise exception 'PAYMENT_RECONCILIATION_REFERENCE_INVALID';
  end if;
  if p_checkout_url is not null
     and (length(p_checkout_url)>3000 or p_checkout_url!~'^https?://') then
    raise exception 'PAYMENT_RECONCILIATION_URL_INVALID';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata)<>'object' then
    raise exception 'PAYMENT_RECONCILIATION_METADATA_INVALID';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'PAYMENT_RECONCILIATION_ORDER_NOT_FOUND'; end if;
  if v_order.payment_method<>p_provider_code then
    raise exception 'PAYMENT_RECONCILIATION_ORDER_PROVIDER_MISMATCH';
  end if;

  select * into v_attempt
  from public.payment_attempts
  where id=p_attempt_id
    and instance_id=p_instance_id
    and order_id=p_order_id
    and provider_code=p_provider_code
  for update;
  if not found then raise exception 'PAYMENT_RECONCILIATION_ATTEMPT_NOT_FOUND'; end if;

  if v_attempt.provider_reference is not null
     and p_provider_reference is not null
     and v_attempt.provider_reference<>p_provider_reference then
    raise exception 'PAYMENT_RECONCILIATION_REFERENCE_CONFLICT';
  end if;

  if v_attempt.status in ('succeeded','failed','cancelled','expired','refunded') then
    return jsonb_build_object(
      'attemptId',v_attempt.id,
      'status',v_attempt.status,
      'providerReference',v_attempt.provider_reference,
      'evidenceSaved',true,
      'terminal',true
    );
  end if;

  v_message:=left(
    regexp_replace(
      coalesce(p_failure_message,'Payment provider outcome unknown'),
      '(?i)(sk|pk|secret|token|password|key)[=:][[:space:]]*[^[:space:],;]+',
      '[redacted]',
      'g'
    ),
    500
  );

  update public.payment_attempts
  set provider_reference=coalesce(provider_reference,p_provider_reference),
      status='requires_action',
      failure_code=left(coalesce(nullif(trim(p_failure_code),''),'PAYMENT_OUTCOME_UNKNOWN'),120),
      failure_message=v_message,
      metadata=coalesce(metadata,'{}'::jsonb)
        ||coalesce(p_metadata,'{}'::jsonb)
        ||jsonb_strip_nulls(jsonb_build_object(
          'provider_reference',p_provider_reference,
          'checkout_url',p_checkout_url,
          'reconciliation_required',true,
          'instance_id',p_instance_id
        )),
      updated_at=now(),
      completed_at=null
  where id=p_attempt_id and instance_id=p_instance_id
  returning * into v_attempt;
  if not found then raise exception 'PAYMENT_RECONCILIATION_WRITE_MISSING'; end if;

  return jsonb_build_object(
    'attemptId',v_attempt.id,
    'status',v_attempt.status,
    'providerReference',v_attempt.provider_reference,
    'evidenceSaved',true,
    'terminal',false
  );
end;
$$;

revoke all on function public.mark_payment_attempt_reconciliation_required_v2(uuid,uuid,uuid,text,text,text,text,text,jsonb)
from public,anon,authenticated;
grant execute on function public.mark_payment_attempt_reconciliation_required_v2(uuid,uuid,uuid,text,text,text,text,text,jsonb)
to service_role;

comment on function public.reconcile_retry_payment_session_v2(uuid,uuid,uuid,uuid,text,text,text,text)
is 'Atomically attaches a retry payment session to its tenant attempt/order and writes payment_retried evidence without replacing an active previous payment reference.';
comment on function public.mark_payment_attempt_reconciliation_required_v2(uuid,uuid,uuid,text,text,text,text,text,jsonb)
is 'Durably records unresolved external payment-session evidence, including provider reference, without downgrading terminal payment attempts.';
