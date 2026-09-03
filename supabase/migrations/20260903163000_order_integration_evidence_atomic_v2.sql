-- Close the remaining order/integration server mutations so durable business state and audit evidence commit together.

create or replace function public.admin_transition_order_v2(
  p_instance_id uuid,p_order_id uuid,p_actor uuid,p_target_status text,p_tracking_number text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_before public.orders%rowtype;v_after public.orders%rowtype;v_org uuid;v_result jsonb;
  v_inventory_restored boolean:=false;v_replayed boolean:=false;
begin
  if p_instance_id is null or p_order_id is null or p_actor is null then raise exception 'ORDER_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_PERMISSION_REQUIRED'; end if;
  select * into v_before from public.orders where id=p_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  select public.transition_tenant_order_v1(p_instance_id,p_order_id,p_actor,p_target_status,p_tracking_number) into v_result;
  select * into v_after from public.orders where id=p_order_id and instance_id=p_instance_id;
  if not found then raise exception 'ORDER_EVIDENCE_NOT_FOUND'; end if;
  v_inventory_restored:=coalesce((v_result->>'inventory_restored')::boolean,false);
  v_replayed:=coalesce((v_result->>'replayed')::boolean,false);
  if v_after.status::text<>p_target_status then raise exception 'ORDER_STATUS_EVIDENCE_MISMATCH'; end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'order.status_changed','order',p_order_id::text,v_org,p_instance_id,
    left(v_before.order_number||': '||v_before.status::text||' → '||v_after.status::text,500),
    jsonb_build_object('status',v_before.status,'trackingNumber',v_before.tracking_number),
    jsonb_build_object('status',v_after.status,'trackingNumber',v_after.tracking_number),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_transition_order_v2','orderNumber',v_before.order_number,'inventoryRestored',v_inventory_restored,'replayed',v_replayed)
  );
  return jsonb_build_object('orderId',p_order_id,'status',v_after.status,'inventoryRestored',v_inventory_restored,'replayed',v_replayed);
end $$;
revoke all on function public.admin_transition_order_v2(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_transition_order_v2(uuid,uuid,uuid,text,text) to service_role;


create or replace function public.admin_finalize_manual_integration_job_v2(
  p_instance_id uuid,p_job_id uuid,p_actor uuid,p_processing_token uuid,p_status text,
  p_result jsonb,p_error text,p_next_attempt_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.integration_jobs%rowtype;v_org uuid;v_action text;v_summary text;
begin
  if p_instance_id is null or p_job_id is null or p_actor is null or p_processing_token is null then raise exception 'INTEGRATION_IDENTITY_REQUIRED'; end if;
  if p_status not in ('succeeded','failed','blocked') then raise exception 'INTEGRATION_FINAL_STATUS_INVALID'; end if;
  if not public.is_platform_operator(p_actor) and not public.has_store_role(p_instance_id,array['owner','admin'],p_actor) then raise exception 'INTEGRATION_PERMISSION_REQUIRED'; end if;
  select * into v_job from public.integration_jobs
  where id=p_job_id and instance_id=p_instance_id and status='processing' and processing_token=p_processing_token for update;
  if not found then raise exception 'INTEGRATION_CLAIM_LOST'; end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  if p_status='succeeded' then
    update public.integration_jobs set status='succeeded',result=coalesce(p_result,'{}'::jsonb),processing_token=null,last_error=null,next_attempt_at=null,updated_at=now()
    where id=p_job_id and instance_id=p_instance_id and processing_token=p_processing_token;
    v_action:='integration.retry_succeeded';v_summary:='Integrációs feladat kézi újrafuttatása sikeres';
  else
    update public.integration_jobs set status=p_status,processing_token=null,last_error=left(coalesce(p_error,'Ismeretlen integrációs hiba'),4000),
      next_attempt_at=case when p_status='blocked' then null else p_next_attempt_at end,updated_at=now()
    where id=p_job_id and instance_id=p_instance_id and processing_token=p_processing_token;
    v_action:='integration.retry_failed';v_summary:='Integrációs feladat kézi újrafuttatása sikertelen';
  end if;
  if not found then raise exception 'INTEGRATION_FINALIZE_EVIDENCE_MISSING'; end if;

  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,v_action,'integration_job',p_job_id::text,v_org,p_instance_id,v_summary,
    jsonb_build_object('status',v_job.status,'attemptCount',v_job.attempt_count,'lastError',v_job.last_error),
    case when p_status='succeeded' then jsonb_build_object('status',p_status,'result',coalesce(p_result,'{}'::jsonb))
      else jsonb_build_object('status',p_status,'error',p_error,'nextAttemptAt',p_next_attempt_at) end,
    jsonb_build_object('audit_source','database_rpc','rpc','admin_finalize_manual_integration_job_v2','kind',v_job.kind,'provider',v_job.provider,'orderId',v_job.order_id)
  );
  return jsonb_build_object('id',p_job_id,'status',p_status);
end $$;
revoke all on function public.admin_finalize_manual_integration_job_v2(uuid,uuid,uuid,uuid,text,jsonb,text,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_finalize_manual_integration_job_v2(uuid,uuid,uuid,uuid,text,jsonb,text,timestamptz) to service_role;


create or replace function public.admin_reconcile_invoice_retry_v2(
  p_instance_id uuid,p_job_id uuid,p_order_id uuid,p_actor uuid,p_invoice_number text,
  p_invoice_url text,p_provider text,p_adapter_key text,p_provider_reference text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.integration_jobs%rowtype;v_order public.orders%rowtype;v_org uuid;v_replayed boolean:=false;
begin
  if p_instance_id is null or p_job_id is null or p_order_id is null or p_actor is null then raise exception 'INVOICE_RECONCILE_IDENTITY_REQUIRED'; end if;
  if nullif(trim(p_invoice_number),'') is null then raise exception 'INVOICE_NUMBER_REQUIRED'; end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_PERMISSION_REQUIRED'; end if;
  select * into v_job from public.integration_jobs
  where id=p_job_id and instance_id=p_instance_id and order_id=p_order_id and kind='invoice_create' and status in ('failed','blocked') for update;
  if not found then raise exception 'INTEGRATION_JOB_NOT_FOUND'; end if;
  if v_job.provider is distinct from p_provider then raise exception 'INVOICE_PROVIDER_MISMATCH'; end if;
  select * into v_order from public.orders where id=p_order_id and instance_id=p_instance_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.invoice_number is not null and v_order.invoice_number<>p_invoice_number then raise exception 'INVOICE_ALREADY_DIFFERENT'; end if;
  v_replayed:=v_order.invoice_number=p_invoice_number;

  if not v_replayed then
    update public.orders set invoice_number=p_invoice_number,invoice_url=nullif(trim(coalesce(p_invoice_url,'')),''),
      invoiced_at=coalesce(invoiced_at,now()),updated_at=now()
    where id=p_order_id and instance_id=p_instance_id;
    if not found then raise exception 'INVOICE_ORDER_WRITE_MISSING'; end if;
  end if;

  update public.integration_jobs set status='succeeded',
    result=coalesce(result,'{}'::jsonb)||jsonb_build_object('invoiceNumber',p_invoice_number,'documentUrl',nullif(trim(coalesce(p_invoice_url,'')),''),
      'providerReference',p_provider_reference,'reconciled',true),
    last_error=null,next_attempt_at=null,processing_token=null,updated_at=now()
  where id=p_job_id and instance_id=p_instance_id;
  if not found then raise exception 'INTEGRATION_JOB_RESOLUTION_MISSING'; end if;

  insert into public.order_events(instance_id,order_id,event_type,actor_user_id,metadata)
  values(p_instance_id,p_order_id,'invoice_reconciled',p_actor,
    jsonb_build_object('provider',p_provider,'adapter_key',p_adapter_key,'invoice_number',p_invoice_number,'provider_reference',p_provider_reference,'source_job_id',p_job_id,'replayed',v_replayed));

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'invoice.reconciled','order',p_order_id::text,v_org,p_instance_id,left(v_order.order_number||': meglévő számla visszaírva',500),
    jsonb_build_object('invoiceNumber',v_order.invoice_number),jsonb_build_object('invoiceNumber',p_invoice_number),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_reconcile_invoice_retry_v2','provider',p_provider,'adapterKey',p_adapter_key,'sourceJobId',p_job_id,'replayed',v_replayed)
  );
  return jsonb_build_object('orderId',p_order_id,'invoiceNumber',p_invoice_number,'jobId',p_job_id,'replayed',v_replayed);
end $$;
revoke all on function public.admin_reconcile_invoice_retry_v2(uuid,uuid,uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_reconcile_invoice_retry_v2(uuid,uuid,uuid,uuid,text,text,text,text,text) to service_role;


create or replace function public.admin_retry_integration_job_v2(
  p_instance_id uuid,p_job_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.integration_jobs%rowtype;v_active record;v_new_id uuid;v_org uuid;
begin
  if p_instance_id is null or p_job_id is null or p_actor is null then raise exception 'INTEGRATION_RETRY_IDENTITY_REQUIRED'; end if;
  if not public.can_manage_orders(p_instance_id,p_actor) then raise exception 'ORDER_PERMISSION_REQUIRED'; end if;
  select * into v_job from public.integration_jobs where id=p_job_id and instance_id=p_instance_id for update;
  if not found then raise exception 'INTEGRATION_JOB_NOT_FOUND'; end if;
  if v_job.status not in ('failed','blocked') then raise exception 'INTEGRATION_JOB_NOT_RETRYABLE'; end if;
  if v_job.kind not in ('shipment_create','email_send','invoice_create','logistics_email') then raise exception 'INTEGRATION_KIND_NOT_RETRYABLE'; end if;
  if v_job.order_id is null then raise exception 'INTEGRATION_ORDER_REQUIRED'; end if;
  perform 1 from public.orders where id=v_job.order_id and instance_id=p_instance_id;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select id,status into v_active from public.integration_jobs
  where instance_id=p_instance_id and order_id=v_job.order_id and kind=v_job.kind and provider=v_job.provider and status in ('pending','processing')
  order by created_at desc limit 1;
  if found then return jsonb_build_object('jobId',v_active.id,'status',v_active.status,'alreadyActive',true); end if;

  begin
    insert into public.integration_jobs(instance_id,order_id,kind,provider,status,payload,last_error,next_attempt_at)
    values(p_instance_id,v_job.order_id,v_job.kind,v_job.provider,'pending',
      coalesce(v_job.payload,'{}'::jsonb)||jsonb_build_object('retryOfJobId',v_job.id,'retriedBy',p_actor),null,null)
    returning id into v_new_id;
  exception when unique_violation then
    select id,status into v_active from public.integration_jobs
    where instance_id=p_instance_id and order_id=v_job.order_id and kind=v_job.kind and provider=v_job.provider and status in ('pending','processing')
    order by created_at desc limit 1;
    if not found then raise; end if;
    return jsonb_build_object('jobId',v_active.id,'status',v_active.status,'alreadyActive',true);
  end;

  insert into public.order_events(instance_id,order_id,event_type,actor_user_id,metadata)
  values(p_instance_id,v_job.order_id,'integration_retried',p_actor,
    jsonb_build_object('previous_job_id',v_job.id,'new_job_id',v_new_id,'kind',v_job.kind,'provider',v_job.provider,'previous_error',v_job.last_error));

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,before_state,after_state,metadata)
  values(
    p_actor,'integration_job.retried','integration_job',v_job.id::text,v_org,p_instance_id,left(v_job.kind||' újraindítva',500),
    jsonb_build_object('status',v_job.status,'attemptCount',v_job.attempt_count,'lastError',v_job.last_error),
    jsonb_build_object('newJobId',v_new_id,'status','pending'),
    jsonb_build_object('audit_source','database_rpc','rpc','admin_retry_integration_job_v2','orderId',v_job.order_id,'provider',v_job.provider)
  );
  return jsonb_build_object('jobId',v_new_id,'status','pending','alreadyActive',false);
end $$;
revoke all on function public.admin_retry_integration_job_v2(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_retry_integration_job_v2(uuid,uuid,uuid) to service_role;

comment on function public.admin_transition_order_v2(uuid,uuid,uuid,text,text) is 'Tenant-scoped order lifecycle mutation with atomic admin audit evidence.';
comment on function public.admin_finalize_manual_integration_job_v2(uuid,uuid,uuid,uuid,text,jsonb,text,timestamptz) is 'Finalizes a manually claimed integration job and its admin audit in one transaction.';
comment on function public.admin_reconcile_invoice_retry_v2(uuid,uuid,uuid,uuid,text,text,text,text,text) is 'Persists a provider-confirmed existing invoice, resolves the source job and writes operational/admin evidence atomically.';
comment on function public.admin_retry_integration_job_v2(uuid,uuid,uuid) is 'Creates an idempotent tenant integration retry together with order-event and admin-audit evidence.';
