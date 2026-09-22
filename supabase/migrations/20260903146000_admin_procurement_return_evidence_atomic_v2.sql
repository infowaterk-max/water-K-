-- Atomic evidence closure for procurement and return/refund administration.
-- Existing domain RPCs remain the source of business invariants; these wrappers add permission, tenant and audit atomicity.

create or replace function public.admin_manage_purchase_order_v3(
  p_instance_id uuid,
  p_purchase_order_id uuid,
  p_actor uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.purchase_orders%rowtype;
  v_org uuid;
  v_result jsonb;
  v_id uuid;
  v_order_number text;
begin
  if p_instance_id is null or p_actor is null then raise exception 'PROCUREMENT_IDENTITY_REQUIRED'; end if;
  if p_action not in ('create','approved','ordered','cancelled','partial_receipt','received') then
    raise exception 'PROCUREMENT_ACTION_INVALID';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'PROCUREMENT_PAYLOAD_INVALID'; end if;
  if not public.can_manage_procurement(p_instance_id,p_actor) then raise exception 'PROCUREMENT_PERMISSION_REQUIRED'; end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_action='create' then
    if p_purchase_order_id is not null then raise exception 'PROCUREMENT_CREATE_ID_INVALID'; end if;
    if p_payload->>'orderNumber' is null or p_payload->>'supplierName' is null then
      raise exception 'PROCUREMENT_CREATE_PAYLOAD_INVALID';
    end if;

    select public.create_purchase_order_v2(
      p_instance_id,
      p_payload->>'orderNumber',
      p_payload->>'supplierName',
      coalesce((p_payload->>'paymentTermsDays')::integer,8),
      case when p_payload->>'expectedAt' is null or p_payload->>'expectedAt'='' then null else (p_payload->>'expectedAt')::date end,
      case when p_payload->>'paymentDueAt' is null or p_payload->>'paymentDueAt'='' then null else (p_payload->>'paymentDueAt')::date end,
      p_payload->>'notes',
      p_actor,
      coalesce(p_payload->'items','[]'::jsonb)
    ) into v_result;

    v_id:=(v_result->>'id')::uuid;
    if v_id is null then raise exception 'PROCUREMENT_CREATE_UNVERIFIED'; end if;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,after_state,metadata
    ) values(
      p_actor,'procurement.purchase_order_created','purchase_order',v_id::text,v_org,p_instance_id,
      (p_payload->>'orderNumber')||' beszerzési rendelés létrehozva',
      jsonb_build_object(
        'supplier',v_result->>'supplierName',
        'netTotal',coalesce((v_result->>'netTotal')::numeric,0),
        'items',jsonb_array_length(coalesce(p_payload->'items','[]'::jsonb)),
        'expectedAt',p_payload->>'expectedAt'
      ),
      jsonb_build_object(
        'audit_source','database_rpc',
        'orderNumber',p_payload->>'orderNumber',
        'supplierId',v_result->>'supplierId'
      )
    );
    return v_result;
  end if;

  if p_purchase_order_id is null then raise exception 'PROCUREMENT_ID_REQUIRED'; end if;
  select * into current_row
  from public.purchase_orders
  where id=p_purchase_order_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'PROCUREMENT_NOT_FOUND'; end if;
  v_order_number:=current_row.order_number;

  if p_action='partial_receipt' then
    select public.receive_purchase_order_items_v2(
      p_instance_id,p_purchase_order_id,p_actor,coalesce(p_payload->'items','[]'::jsonb)
    ) into v_result;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'procurement.partial_receipt','purchase_order',p_purchase_order_id::text,v_org,p_instance_id,
      v_order_number||': részleges bevételezés',
      jsonb_build_object('status',current_row.status),v_result,
      jsonb_build_object('audit_source','database_rpc')
    );
    return v_result;
  end if;

  if p_action='received' then
    select public.receive_purchase_order_v2(
      p_instance_id,p_purchase_order_id,p_actor
    ) into v_result;

    insert into public.admin_audit_log(
      actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
      summary,before_state,after_state,metadata
    ) values(
      p_actor,'procurement.received','purchase_order',p_purchase_order_id::text,v_org,p_instance_id,
      v_order_number||' → received',
      jsonb_build_object('status',current_row.status),
      jsonb_build_object('status','received','receipt',v_result),
      jsonb_build_object('audit_source','database_rpc')
    );
    return v_result;
  end if;

  select public.transition_purchase_order_v2(
    p_instance_id,p_purchase_order_id,p_action,p_actor
  ) into v_result;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'procurement.'||p_action,'purchase_order',p_purchase_order_id::text,v_org,p_instance_id,
    v_order_number||' → '||p_action,
    jsonb_build_object('status',current_row.status),
    jsonb_build_object('status',p_action,'transition',v_result),
    jsonb_build_object('audit_source','database_rpc')
  );
  return v_result;
end;
$$;

revoke all on function public.admin_manage_purchase_order_v3(uuid,uuid,uuid,text,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_manage_purchase_order_v3(uuid,uuid,uuid,text,jsonb)
to service_role;


create or replace function public.admin_transition_return_case_v2(
  p_instance_id uuid,
  p_case_id uuid,
  p_actor uuid,
  p_expected_updated_at timestamptz,
  p_target_status text,
  p_refund_amount integer,
  p_refund_reference text,
  p_admin_note text,
  p_restock boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  current_row public.return_cases%rowtype;
  updated_row public.return_cases%rowtype;
  v_org uuid;
  v_transition jsonb;
  v_order_number text:='';
  v_status_label text;
  v_job uuid;
  v_queued boolean:=false;
  v_notify_error text:=null;
begin
  if p_instance_id is null or p_case_id is null or p_actor is null then
    raise exception 'RETURN_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then
    raise exception 'ORDER_PERMISSION_REQUIRED';
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  select * into current_row
  from public.return_cases
  where id=p_case_id and instance_id=p_instance_id
  for update;
  if not found then raise exception 'RETURN_CASE_NOT_FOUND'; end if;
  if p_expected_updated_at is not null and current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'STALE_RETURN_CASE';
  end if;
  if not exists(
    select 1 from public.orders
    where id=current_row.order_id and instance_id=p_instance_id
  ) then
    raise exception 'RETURN_ORDER_TENANT_MISMATCH';
  end if;

  select public.transition_return_case(
    p_case_id,p_actor,p_target_status,p_refund_amount,
    coalesce(p_refund_reference,''),coalesce(p_admin_note,''),coalesce(p_restock,false)
  ) into v_transition;

  select * into updated_row
  from public.return_cases
  where id=p_case_id and instance_id=p_instance_id;
  if not found then raise exception 'RETURN_CASE_POST_STATE_MISSING'; end if;

  if p_target_status is distinct from current_row.status::text then
    select coalesce(order_number,'') into v_order_number
    from public.orders
    where id=current_row.order_id and instance_id=p_instance_id;

    v_status_label:=case p_target_status
      when 'requested' then 'Beérkezett'
      when 'approved' then 'Jóváhagyva'
      when 'rejected' then 'Elutasítva'
      when 'received' then 'Visszaérkezett'
      when 'refund_pending' then 'Visszatérítés folyamatban'
      when 'refunded' then 'Visszatérítve'
      when 'closed' then 'Lezárva'
      else p_target_status
    end;

    begin
      select public.enqueue_communication_v2(
        p_instance_id,
        current_row.customer_email,
        current_row.user_id,
        'transactional',
        'return_status',
        jsonb_build_object(
          'orderNumber',v_order_number,
          'status',p_target_status,
          'statusLabel',v_status_label
        ),
        'return-status:'||p_instance_id::text||':'||p_case_id::text||':'||p_target_status||':'||updated_row.updated_at::text,
        now()
      ) into v_job;
      v_queued:=v_job is not null;
    exception when others then
      v_notify_error:=sqlerrm;
      v_queued:=false;
    end;
  end if;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'returns.case_updated','return_case',p_case_id::text,v_org,p_instance_id,
    'Visszáru ügy: '||p_target_status||case when p_restock then ' · készlet visszaállítva' else '' end,
    to_jsonb(current_row),to_jsonb(updated_row),
    jsonb_build_object(
      'audit_source','database_rpc',
      'notificationQueued',v_queued,
      'notificationError',v_notify_error,
      'communicationJobId',v_job,
      'restockPolicy','item-ledger'
    )
  );

  return jsonb_build_object(
    'transition',v_transition,
    'notificationQueued',v_queued,
    'notificationError',v_notify_error
  );
end;
$$;

revoke all on function public.admin_transition_return_case_v2(uuid,uuid,uuid,timestamptz,text,integer,text,text,boolean)
from public,anon,authenticated;
grant execute on function public.admin_transition_return_case_v2(uuid,uuid,uuid,timestamptz,text,integer,text,text,boolean)
to service_role;
