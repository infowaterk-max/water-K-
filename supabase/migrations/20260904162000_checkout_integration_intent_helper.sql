-- BUG-011: production pilot checkout local finalization referenced this helper,
-- but no migration defined it. Keep all checkout/order integration intent creation
-- tenant-bound, idempotent and private.

create or replace function private.enqueue_order_integration_intent_v1(
  p_instance_id uuid,
  p_order_id uuid,
  p_kind text,
  p_provider text,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_existing_id uuid;
  v_job_id uuid;
  v_template text;
begin
  if p_instance_id is null or p_order_id is null then
    raise exception 'INTEGRATION_INTENT_IDENTITY_REQUIRED';
  end if;
  if p_kind not in (
    'payment_create','payment_callback','shipment_create',
    'invoice_create','email_send','logistics_email'
  ) then
    raise exception 'INTEGRATION_INTENT_KIND_INVALID';
  end if;
  if p_provider is null
     or p_provider!~'^[a-z0-9_-]{2,120}$' then
    raise exception 'INTEGRATION_INTENT_PROVIDER_INVALID';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'INTEGRATION_INTENT_PAYLOAD_INVALID';
  end if;

  perform 1
  from public.orders
  where id=p_order_id and instance_id=p_instance_id;
  if not found then
    raise exception 'INTEGRATION_INTENT_ORDER_NOT_FOUND';
  end if;

  if p_kind='email_send' then
    v_template:=nullif(trim(p_payload->>'template'),'');
    if v_template is null or length(v_template)>120 then
      raise exception 'INTEGRATION_INTENT_EMAIL_TEMPLATE_INVALID';
    end if;

    select id into v_existing_id
    from public.integration_jobs
    where instance_id=p_instance_id
      and order_id=p_order_id
      and kind=p_kind
      and provider=p_provider
      and coalesce(payload->>'template','')=v_template
      and status in ('pending','processing','succeeded')
    order by created_at desc,id desc
    limit 1;
  else
    select id into v_existing_id
    from public.integration_jobs
    where instance_id=p_instance_id
      and order_id=p_order_id
      and kind=p_kind
      and provider=p_provider
      and status in ('pending','processing','succeeded')
    order by created_at desc,id desc
    limit 1;
  end if;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  begin
    insert into public.integration_jobs(
      instance_id,order_id,kind,provider,status,payload
    ) values(
      p_instance_id,p_order_id,p_kind,p_provider,'pending',p_payload
    ) returning id into v_job_id;
  exception when unique_violation then
    if p_kind='email_send' then
      select id into v_job_id
      from public.integration_jobs
      where instance_id=p_instance_id
        and order_id=p_order_id
        and kind=p_kind
        and provider=p_provider
        and coalesce(payload->>'template','')=v_template
        and status in ('pending','processing','succeeded')
      order by created_at desc,id desc
      limit 1;
    else
      select id into v_job_id
      from public.integration_jobs
      where instance_id=p_instance_id
        and order_id=p_order_id
        and kind=p_kind
        and provider=p_provider
        and status in ('pending','processing','succeeded')
      order by created_at desc,id desc
      limit 1;
    end if;
    if v_job_id is null then
      raise;
    end if;
  end;

  if v_job_id is null then
    raise exception 'INTEGRATION_INTENT_EVIDENCE_MISSING';
  end if;
  return v_job_id;
end;
$$;

revoke all on function private.enqueue_order_integration_intent_v1(uuid,uuid,text,text,jsonb)
from public,anon,authenticated,service_role;

comment on function private.enqueue_order_integration_intent_v1(uuid,uuid,text,text,jsonb)
is 'Private tenant-bound idempotent integration intent enqueue helper used by checkout/payment database workflows.';
