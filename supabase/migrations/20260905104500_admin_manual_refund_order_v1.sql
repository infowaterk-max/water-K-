-- Block 3 production pilot: allow a merchant admin to record a full manual refund
-- directly from an order without forcing the customer to open a return case first.
-- This path is intentionally limited to manual payment methods; online card refunds
-- must continue through their verified provider-specific refund/callback flow.

create or replace function public.admin_refund_order_manual_v1(
  p_instance_id uuid,
  p_order_id uuid,
  p_actor uuid,
  p_expected_updated_at timestamptz,
  p_refund_reference text default '',
  p_admin_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.orders%rowtype;
  v_org uuid;
  v_case public.return_cases%rowtype;
  v_case_id uuid;
  v_existing_refunded integer:=0;
  v_item_count integer:=0;
  v_transition jsonb;
  v_job uuid;
  v_queued boolean:=false;
  v_notify_error text:=null;
  v_now timestamptz:=now();
begin
  if p_instance_id is null or p_order_id is null or p_actor is null then
    raise exception 'MANUAL_REFUND_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then
    raise exception 'ORDER_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org
  from public.webshop_instances
  where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into v_order
  from public.orders
  where id=p_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'MANUAL_REFUND_ORDER_NOT_FOUND'; end if;

  if p_expected_updated_at is not null
     and v_order.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_MANUAL_REFUND_ORDER';
  end if;

  -- Replays are safe only when this exact manual-refund path already completed.
  if v_order.status='refunded' then
    select * into v_case
    from public.return_cases
    where instance_id=p_instance_id
      and order_id=p_order_id
      and reason='admin_manual_refund'
      and status='refunded'
    order by refunded_at desc nulls last,requested_at desc
    limit 1;
    if found then
      return jsonb_build_object(
        'orderId',p_order_id,
        'orderNumber',v_order.order_number,
        'orderStatus','refunded',
        'returnCaseId',v_case.id,
        'refundAmount',v_case.refund_amount_gross_huf,
        'paymentMethod',v_order.payment_method,
        'notificationQueued',false,
        'replayed',true
      );
    end if;
    raise exception 'MANUAL_REFUND_ORDER_ALREADY_REFUNDED';
  end if;

  if v_order.payment_method not in ('cash_on_delivery','bank_transfer') then
    raise exception 'MANUAL_REFUND_PAYMENT_METHOD_REQUIRED';
  end if;
  if v_order.status not in ('paid','processing','shipped','completed') then
    raise exception 'MANUAL_REFUND_ORDER_STATUS_INVALID';
  end if;
  if coalesce(v_order.total_gross_huf,0)<=0 then
    raise exception 'MANUAL_REFUND_AMOUNT_INVALID';
  end if;

  if exists(
    select 1
    from public.return_cases rc
    where rc.instance_id=p_instance_id
      and rc.order_id=p_order_id
      and rc.status in('requested','approved','received','refund_pending')
  ) then
    raise exception 'MANUAL_REFUND_RETURN_CASE_ALREADY_OPEN';
  end if;

  select coalesce(sum(rc.refund_amount_gross_huf),0)::integer
  into v_existing_refunded
  from public.return_cases rc
  where rc.instance_id=p_instance_id
    and rc.order_id=p_order_id
    and rc.status='refunded';
  if v_existing_refunded<>0 then
    raise exception 'MANUAL_REFUND_PARTIAL_REFUND_EXISTS';
  end if;

  insert into public.return_cases(
    instance_id,order_id,user_id,customer_email,reason,customer_note,status,
    refund_amount_gross_huf,refund_reference,admin_note,
    requested_at,approved_at,refunded_at,updated_at
  ) values(
    p_instance_id,p_order_id,v_order.customer_id,v_order.customer_email,
    'admin_manual_refund',null,'refunded',v_order.total_gross_huf,
    nullif(trim(coalesce(p_refund_reference,'')),''),
    coalesce(nullif(trim(coalesce(p_admin_note,'')),''),'Adminisztrátori teljes visszatérítés'),
    v_now,v_now,v_now,v_now
  )
  returning * into v_case;
  v_case_id:=v_case.id;
  if v_case_id is null then raise exception 'MANUAL_REFUND_CASE_WRITE_MISSING'; end if;

  insert into public.return_case_items(instance_id,return_case_id,order_item_id,quantity)
  select p_instance_id,v_case_id,oi.id,oi.quantity
  from public.order_items oi
  where oi.instance_id=p_instance_id
    and oi.order_id=p_order_id
    and oi.quantity>0;
  get diagnostics v_item_count=row_count;
  if v_item_count<=0 then raise exception 'MANUAL_REFUND_ITEMS_MISSING'; end if;

  -- Reuse the canonical order lifecycle transition so the refunded order status and
  -- status_changed evidence are committed in the same database transaction.
  select public.transition_tenant_order_v1(
    p_instance_id,p_order_id,p_actor,'refunded',null
  ) into v_transition;
  if coalesce(v_transition->>'order_id','')<>p_order_id::text
     or coalesce(v_transition->>'status','')<>'refunded' then
    raise exception 'MANUAL_REFUND_ORDER_TRANSITION_MISSING';
  end if;

  -- Customer notification is useful but must not roll back a valid financial record
  -- when the communication provider is unavailable.
  begin
    select public.enqueue_communication_v2(
      p_instance_id,
      v_order.customer_email,
      v_order.customer_id,
      'transactional',
      'return_status',
      jsonb_build_object(
        'orderNumber',v_order.order_number,
        'status','refunded',
        'statusLabel','Visszatérítve'
      ),
      'admin-manual-refund:'||p_instance_id::text||':'||p_order_id::text||':'||v_case_id::text,
      v_now
    ) into v_job;
    v_queued:=v_job is not null;
  exception when others then
    v_notify_error:=sqlerrm;
    v_queued:=false;
  end;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'orders.manual_refund_recorded','order',p_order_id::text,v_org,p_instance_id,
    left(v_order.order_number||' teljes manuális visszatérítés: '||v_order.total_gross_huf::text||' Ft',500),
    jsonb_build_object(
      'status',v_order.status,
      'paymentMethod',v_order.payment_method,
      'totalGrossHuf',v_order.total_gross_huf
    ),
    jsonb_build_object(
      'status','refunded',
      'refundCaseId',v_case_id,
      'refundAmountGrossHuf',v_order.total_gross_huf,
      'refundReference',nullif(trim(coalesce(p_refund_reference,'')),'')
    ),
    jsonb_build_object(
      'audit_source','database_rpc',
      'rpc','admin_refund_order_manual_v1',
      'manualPaymentOnly',true,
      'providerRefundTriggered',false,
      'inventoryPolicy','financial_refund_only; pre-fulfillment inventory reconciliation remains separate',
      'notificationQueued',v_queued,
      'notificationError',v_notify_error,
      'communicationJobId',v_job,
      'returnCaseItems',v_item_count
    )
  );

  return jsonb_build_object(
    'orderId',p_order_id,
    'orderNumber',v_order.order_number,
    'orderStatus','refunded',
    'returnCaseId',v_case_id,
    'refundAmount',v_order.total_gross_huf,
    'paymentMethod',v_order.payment_method,
    'notificationQueued',v_queued,
    'replayed',false
  );
end;
$$;

revoke all on function public.admin_refund_order_manual_v1(uuid,uuid,uuid,timestamptz,text,text)
from public,anon,authenticated;
grant execute on function public.admin_refund_order_manual_v1(uuid,uuid,uuid,timestamptz,text,text)
to service_role;

comment on function public.admin_refund_order_manual_v1(uuid,uuid,uuid,timestamptz,text,text)
is 'Tenant-scoped, audited full admin refund for manual payment methods only. Online card refunds are deliberately excluded.';
