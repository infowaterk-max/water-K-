-- Payment callback local evidence closure.
-- A verified provider event, payment event, payment attempt, order lifecycle evidence and
-- required integration intents must commit together. Also namespace generic webhook event IDs
-- by tenant once the tenant is known.

drop index if exists public.webhook_events_provider_external_uidx;

create unique index if not exists webhook_events_instance_provider_external_uidx
  on public.webhook_events(instance_id,provider,external_event_id)
  where instance_id is not null and external_event_id is not null;

create unique index if not exists webhook_events_unresolved_provider_external_uidx
  on public.webhook_events(provider,external_event_id)
  where instance_id is null and external_event_id is not null;


create or replace function public.apply_verified_payment_event_v3(
  p_instance_id uuid,
  p_order_id uuid,
  p_provider_code text,
  p_provider_event_id text,
  p_provider_reference text,
  p_event_type text,
  p_payment_status text,
  p_signature_valid boolean,
  p_payload_hash text,
  p_email_provider text,
  p_invoice_provider text default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_payment_event public.payment_events%rowtype;
  v_webhook public.webhook_events%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_attempt_status text;
  v_payment_duplicate boolean:=false;
  v_webhook_duplicate boolean:=false;
  v_order_event_id uuid;
  v_email_job_id uuid;
  v_invoice_job_id uuid;
  v_manual_invoice_event_id uuid;
  v_logistics_job_id uuid;
  v_logistics_recipient text;
  v_logistics_label text;
  v_metadata jsonb;
  v_now timestamptz:=now();
begin
  if p_instance_id is null or p_order_id is null then
    raise exception 'PAYMENT_EVENT_IDENTITY_REQUIRED';
  end if;
  if p_provider_code is null or p_provider_code!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'PAYMENT_EVENT_PROVIDER_INVALID';
  end if;
  if p_provider_event_id is null or length(trim(p_provider_event_id))<1 or length(p_provider_event_id)>500 then
    raise exception 'PAYMENT_EVENT_PROVIDER_EVENT_INVALID';
  end if;
  if p_provider_reference is null or length(trim(p_provider_reference))<1 or length(p_provider_reference)>500 then
    raise exception 'PAYMENT_EVENT_REFERENCE_INVALID';
  end if;
  if p_event_type is null or length(trim(p_event_type))<1 or length(p_event_type)>240 then
    raise exception 'PAYMENT_EVENT_TYPE_INVALID';
  end if;
  if p_payment_status not in ('pending','paid','failed','cancelled','refunded','unknown') then
    raise exception 'PAYMENT_EVENT_STATUS_INVALID';
  end if;
  if p_email_provider is null or p_email_provider!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'PAYMENT_EVENT_EMAIL_PROVIDER_INVALID';
  end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'PAYMENT_EVENT_ORDER_NOT_FOUND'; end if;

  if v_order.payment_method<>p_provider_code then
    raise exception 'PAYMENT_EVENT_ORDER_PROVIDER_MISMATCH';
  end if;
  if v_order.external_payment_id is not null
     and v_order.external_payment_id<>p_provider_reference then
    raise exception 'PAYMENT_EVENT_ORDER_REFERENCE_CONFLICT';
  end if;

  -- Generic webhook evidence is tenant-local once the order has been resolved.
  begin
    insert into public.webhook_events(
      instance_id,provider,external_event_id,signature_valid,payload_hash,status,error_message,processed_at
    ) values(
      p_instance_id,p_provider_code,p_provider_event_id,coalesce(p_signature_valid,false),p_payload_hash,
      case when coalesce(p_signature_valid,false) then 'processed' else 'rejected' end,
      case when coalesce(p_signature_valid,false) then null else 'Payment callback signature invalid.' end,
      v_now
    )
    returning * into v_webhook;
  exception when unique_violation then
    select * into v_webhook
    from public.webhook_events
    where instance_id=p_instance_id
      and provider=p_provider_code
      and external_event_id=p_provider_event_id
    for update;
    if not found then raise; end if;
    v_webhook_duplicate:=true;

    if coalesce(p_signature_valid,false) and not v_webhook.signature_valid then
      update public.webhook_events
      set signature_valid=true,
          payload_hash=coalesce(p_payload_hash,payload_hash),
          status='processed',
          error_message=null,
          processed_at=v_now
      where id=v_webhook.id
      returning * into v_webhook;
    end if;
  end;
  if v_webhook.id is null then raise exception 'PAYMENT_WEBHOOK_EVIDENCE_MISSING'; end if;

  -- Provider payment-event evidence is also replay-safe inside the tenant.
  begin
    insert into public.payment_events(
      instance_id,provider_code,provider_event_id,provider_reference,order_id,
      event_type,payment_status,signature_valid,payload_hash
    ) values(
      p_instance_id,p_provider_code,p_provider_event_id,p_provider_reference,p_order_id,
      p_event_type,p_payment_status,coalesce(p_signature_valid,false),p_payload_hash
    )
    returning * into v_payment_event;
  exception when unique_violation then
    select * into v_payment_event
    from public.payment_events
    where instance_id=p_instance_id
      and provider_code=p_provider_code
      and provider_event_id=p_provider_event_id
    for update;
    if not found then raise; end if;
    v_payment_duplicate:=true;

    if v_payment_event.order_id is distinct from p_order_id
       or coalesce(v_payment_event.provider_reference,'')<>p_provider_reference then
      raise exception 'PAYMENT_EVENT_REPLAY_CONFLICT';
    end if;

    if coalesce(p_signature_valid,false) and not v_payment_event.signature_valid then
      update public.payment_events
      set event_type=p_event_type,
          payment_status=p_payment_status,
          signature_valid=true,
          payload_hash=coalesce(p_payload_hash,payload_hash)
      where id=v_payment_event.id
      returning * into v_payment_event;
    elsif v_payment_event.signature_valid
       and v_payment_event.payment_status<>p_payment_status then
      raise exception 'PAYMENT_EVENT_STATUS_REPLAY_CONFLICT';
    end if;
  end;
  if v_payment_event.id is null then raise exception 'PAYMENT_EVENT_EVIDENCE_MISSING'; end if;

  -- Never apply business state from a currently untrusted invocation.
  if not coalesce(p_signature_valid,false) then
    return jsonb_build_object(
      'ok',false,
      'duplicate',v_payment_duplicate,
      'orderId',p_order_id,
      'orderStatus',v_order.status,
      'webhookEventId',v_webhook.id,
      'paymentEventId',v_payment_event.id,
      'sideEffectsComplete',false
    );
  end if;

  -- Update a matching payment attempt when one exists, without allowing late failure/pending
  -- events to downgrade a succeeded/refunded attempt.
  select * into v_attempt
  from public.payment_attempts
  where instance_id=p_instance_id
    and provider_code=p_provider_code
    and provider_reference=p_provider_reference
  limit 1
  for update;

  if found then
    v_attempt_status:=case
      when p_payment_status='refunded' then 'refunded'
      when p_payment_status='paid' and v_attempt.status<>'refunded' then 'succeeded'
      when p_payment_status in ('failed','cancelled')
           and v_attempt.status not in ('succeeded','refunded') then p_payment_status
      when p_payment_status='pending'
           and v_attempt.status not in ('succeeded','failed','cancelled','expired','refunded') then 'pending'
      else v_attempt.status
    end;

    update public.payment_attempts
    set status=v_attempt_status,
        updated_at=v_now,
        completed_at=case
          when v_attempt_status in ('succeeded','failed','cancelled','expired','refunded')
            then coalesce(completed_at,v_now)
          else null
        end,
        failure_code=case when v_attempt_status in ('succeeded','pending') then null else failure_code end,
        failure_message=case when v_attempt_status in ('succeeded','pending') then null else failure_message end,
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
          'last_event_id',p_provider_event_id,
          'last_event_type',p_event_type
        )
    where id=v_attempt.id and instance_id=p_instance_id
    returning * into v_attempt;
    if not found then raise exception 'PAYMENT_ATTEMPT_WRITE_EVIDENCE_MISSING'; end if;
  end if;

  v_metadata:=jsonb_build_object(
    'provider',p_provider_code,
    'provider_reference',p_provider_reference,
    'event_id',p_provider_event_id,
    'event_type',p_event_type
  );

  if p_payment_status='paid' then
    if v_order.status in ('cancelled','refunded','draft') then
      raise exception 'PAYMENT_PAID_ORDER_STATE_RECONCILIATION_REQUIRED';
    end if;

    if v_order.status in ('pending','pending_payment','pending_transfer') then
      update public.orders
      set status='paid',
          paid_at=coalesce(paid_at,v_now),
          external_payment_id=p_provider_reference,
          updated_at=v_now
      where id=p_order_id and instance_id=p_instance_id
      returning * into v_order;
    else
      update public.orders
      set paid_at=coalesce(paid_at,v_now),
          external_payment_id=coalesce(external_payment_id,p_provider_reference),
          updated_at=v_now
      where id=p_order_id and instance_id=p_instance_id
      returning * into v_order;
    end if;
    if not found then raise exception 'PAYMENT_PAID_ORDER_WRITE_MISSING'; end if;

    select e.id into v_order_event_id
    from public.order_events e
    where e.instance_id=p_instance_id
      and e.order_id=p_order_id
      and e.event_type='payment_confirmed'
      and coalesce(e.metadata->>'event_id','')=p_provider_event_id
    order by e.created_at,e.id
    limit 1;

    if v_order_event_id is null then
      insert into public.order_events(instance_id,order_id,event_type,metadata)
      values(p_instance_id,p_order_id,'payment_confirmed',v_metadata)
      returning id into v_order_event_id;
    end if;
    if v_order_event_id is null then raise exception 'PAYMENT_CONFIRMED_EVENT_EVIDENCE_MISSING'; end if;

    v_email_job_id:=private.enqueue_order_integration_intent_v1(
      p_instance_id,p_order_id,'email_send',p_email_provider,
      jsonb_build_object('template','payment_confirmed')
    );
    if v_email_job_id is null then raise exception 'PAYMENT_CONFIRMATION_EMAIL_JOB_MISSING'; end if;

    if v_order.invoice_number is null then
      if p_invoice_provider is not null then
        if not exists(
          select 1
          from public.webshop_instance_provider_connections c
          join public.commerce_provider_catalog p on p.code=c.provider_code
          where c.instance_id=p_instance_id
            and c.provider_code=p_invoice_provider
            and c.enabled=true
            and c.connection_status='active'
            and p.provider_type='invoice'
            and p.is_available=true
            and p.adapter_key=p_invoice_provider
        ) then
          raise exception 'PAYMENT_INVOICE_PROVIDER_NOT_ACTIVE';
        end if;

        v_invoice_job_id:=private.enqueue_order_integration_intent_v1(
          p_instance_id,p_order_id,'invoice_create',p_invoice_provider,
          jsonb_build_object('source','payment_confirmed')
        );
        if v_invoice_job_id is null then raise exception 'PAYMENT_INVOICE_JOB_MISSING'; end if;
      else
        select e.id into v_manual_invoice_event_id
        from public.order_events e
        where e.instance_id=p_instance_id
          and e.order_id=p_order_id
          and e.event_type='invoice_manual_required'
          and coalesce(e.metadata->>'source','')='payment_confirmed'
        order by e.created_at,e.id
        limit 1;

        if v_manual_invoice_event_id is null then
          insert into public.order_events(
            instance_id,order_id,event_type,from_status,to_status,metadata
          ) values(
            p_instance_id,p_order_id,'invoice_manual_required','paid','paid',
            jsonb_build_object(
              'source','payment_confirmed',
              'event_id',p_provider_event_id,
              'reason','Automatikus számlázó adapter nincs aktiválva vagy ellenőrizve.'
            )
          ) returning id into v_manual_invoice_event_id;
        end if;
        if v_manual_invoice_event_id is null then
          raise exception 'PAYMENT_MANUAL_INVOICE_EVENT_MISSING';
        end if;
      end if;
    end if;

    if coalesce(v_order.shipping_method,'')<>'' and v_order.shipping_method<>'pickup' then
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
          p_instance_id,p_order_id,'logistics_email','external_logistics_email',
          jsonb_build_object(
            'recipient',v_logistics_recipient,
            'shippingCode',v_order.shipping_method,
            'label',v_logistics_label
          )
        );
        if v_logistics_job_id is null then raise exception 'PAYMENT_LOGISTICS_JOB_MISSING'; end if;
      end if;
    end if;

  elsif p_payment_status in ('failed','cancelled') then
    if v_order.status='pending_payment' then
      select e.id into v_order_event_id
      from public.order_events e
      where e.instance_id=p_instance_id
        and e.order_id=p_order_id
        and e.event_type=case when p_payment_status='failed' then 'payment_failed' else 'payment_cancelled' end
        and coalesce(e.metadata->>'event_id','')=p_provider_event_id
      order by e.created_at,e.id
      limit 1;

      if v_order_event_id is null then
        insert into public.order_events(instance_id,order_id,event_type,metadata)
        values(
          p_instance_id,p_order_id,
          case when p_payment_status='failed' then 'payment_failed' else 'payment_cancelled' end,
          v_metadata||jsonb_build_object('order_remains_retryable',true)
        ) returning id into v_order_event_id;
      end if;
      if v_order_event_id is null then raise exception 'PAYMENT_FAILURE_EVENT_EVIDENCE_MISSING'; end if;
    end if;

  elsif p_payment_status='refunded' then
    if v_order.status in ('paid','processing','shipped','completed') then
      update public.orders
      set status='refunded',updated_at=v_now
      where id=p_order_id and instance_id=p_instance_id
      returning * into v_order;
      if not found then raise exception 'PAYMENT_REFUND_ORDER_WRITE_MISSING'; end if;
    elsif v_order.status<>'refunded' then
      raise exception 'PAYMENT_REFUND_ORDER_STATE_RECONCILIATION_REQUIRED';
    end if;

    select e.id into v_order_event_id
    from public.order_events e
    where e.instance_id=p_instance_id
      and e.order_id=p_order_id
      and e.event_type='payment_refunded'
      and coalesce(e.metadata->>'event_id','')=p_provider_event_id
    order by e.created_at,e.id
    limit 1;

    if v_order_event_id is null then
      insert into public.order_events(instance_id,order_id,event_type,metadata)
      values(p_instance_id,p_order_id,'payment_refunded',v_metadata)
      returning id into v_order_event_id;
    end if;
    if v_order_event_id is null then raise exception 'PAYMENT_REFUND_EVENT_EVIDENCE_MISSING'; end if;
  end if;

  return jsonb_build_object(
    'ok',true,
    'duplicate',v_payment_duplicate,
    'orderId',p_order_id,
    'orderStatus',v_order.status,
    'webhookEventId',v_webhook.id,
    'paymentEventId',v_payment_event.id,
    'orderEventId',v_order_event_id,
    'emailJobId',v_email_job_id,
    'invoiceJobId',v_invoice_job_id,
    'manualInvoiceEventId',v_manual_invoice_event_id,
    'logisticsJobId',v_logistics_job_id,
    'paymentAttemptId',v_attempt.id,
    'paymentAttemptStatus',v_attempt.status,
    'sideEffectsComplete',true
  );
end;
$$;

revoke all on function public.apply_verified_payment_event_v3(uuid,uuid,text,text,text,text,text,boolean,text,text,text)
from public,anon,authenticated;
grant execute on function public.apply_verified_payment_event_v3(uuid,uuid,text,text,text,text,text,boolean,text,text,text)
to service_role;

comment on function public.apply_verified_payment_event_v3(uuid,uuid,text,text,text,text,text,boolean,text,text,text)
is 'Atomically persists a tenant-resolved payment callback and applies its local order/payment/outbox evidence without swallowing integration-intent failures.';
comment on index public.webhook_events_instance_provider_external_uidx
is 'Resolved webhook event identifiers are unique inside one webshop tenant.';
comment on index public.webhook_events_unresolved_provider_external_uidx
is 'Unresolved webhook event identifiers remain uniquely auditable without imposing cross-tenant collisions.';
