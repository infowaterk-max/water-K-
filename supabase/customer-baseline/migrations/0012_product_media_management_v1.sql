-- Product Intake Center v2 – product media management
-- Adds idempotent media deletion with durable storage-cleanup evidence and primary-image ordering.

create table if not exists public.catalog_media_cleanup_jobs(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  product_id uuid not null,
  media_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  state text not null default 'pending' check(state in('pending','completed')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(instance_id,media_id)
);
create index if not exists catalog_media_cleanup_jobs_pending_idx on public.catalog_media_cleanup_jobs(instance_id,state,created_at);
alter table public.catalog_media_cleanup_jobs enable row level security;
revoke all on public.catalog_media_cleanup_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.catalog_media_cleanup_jobs to service_role;

create or replace function public.delete_product_media_v1(
  p_instance_id uuid,p_product_id uuid,p_media_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_media public.product_media%rowtype;v_job public.catalog_media_cleanup_jobs%rowtype;
  v_affected integer:=0;v_next uuid;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_media_id is null or p_actor is null then raise exception 'CATALOG_MEDIA_DELETE_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;

  select * into v_job from public.catalog_media_cleanup_jobs where instance_id=p_instance_id and product_id=p_product_id and media_id=p_media_id;
  if found then
    select id into v_next from public.product_media where instance_id=p_instance_id and product_id=p_product_id order by sort_order,created_at,id limit 1;
    return jsonb_build_object('deleted',true,'cleanupJobId',v_job.id,'storageBucket',v_job.storage_bucket,'storagePath',v_job.storage_path,'cleanupState',v_job.state,'nextPrimaryMediaId',v_next,'replayed',true);
  end if;

  select * into v_media from public.product_media where id=p_media_id and instance_id=p_instance_id and product_id=p_product_id for update;
  if not found then raise exception 'PRODUCT_MEDIA_NOT_FOUND';end if;

  insert into public.catalog_media_cleanup_jobs(instance_id,product_id,media_id,storage_bucket,storage_path,created_by)
  values(p_instance_id,p_product_id,p_media_id,v_media.storage_bucket,v_media.storage_path,p_actor)
  returning * into v_job;

  update public.product_variants set primary_media_id=null,updated_at=now()
  where instance_id=p_instance_id and product_id=p_product_id and primary_media_id=p_media_id;
  get diagnostics v_affected=row_count;

  delete from public.product_media where id=p_media_id and instance_id=p_instance_id and product_id=p_product_id;

  with ranked as(
    select id,row_number()over(order by sort_order,created_at,id)-1 as new_order
    from public.product_media where instance_id=p_instance_id and product_id=p_product_id
  )
  update public.product_media m set sort_order=ranked.new_order
  from ranked where m.id=ranked.id and m.sort_order is distinct from ranked.new_order;

  select id into v_next from public.product_media where instance_id=p_instance_id and product_id=p_product_id order by sort_order,created_at,id limit 1;
  v_result:=jsonb_build_object('deleted',true,'cleanupJobId',v_job.id,'storageBucket',v_media.storage_bucket,'storagePath',v_media.storage_path,'cleanupState','pending','affectedVariants',v_affected,'nextPrimaryMediaId',v_next,'replayed',false);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_deleted','product_media',p_media_id::text,v_org,p_instance_id,
    v_media.original_name||' termékmédia törölve',v_result,jsonb_build_object('audit_source','database_rpc','product_id',p_product_id,'cleanup_job_id',v_job.id,'storage_path',v_media.storage_path));
  return v_result;
end;$$;
revoke all on function public.delete_product_media_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_product_media_v1(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.complete_product_media_cleanup_v1(
  p_instance_id uuid,p_cleanup_job_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.catalog_media_cleanup_jobs%rowtype;v_org uuid;
begin
  if p_instance_id is null or p_cleanup_job_id is null or p_actor is null then raise exception 'CATALOG_MEDIA_CLEANUP_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  select * into v_job from public.catalog_media_cleanup_jobs where id=p_cleanup_job_id and instance_id=p_instance_id for update;
  if not found then raise exception 'CATALOG_MEDIA_CLEANUP_NOT_FOUND';end if;
  if v_job.state='completed' then return jsonb_build_object('cleanupJobId',v_job.id,'completed',true,'replayed',true);end if;
  update public.catalog_media_cleanup_jobs set state='completed',completed_at=now() where id=v_job.id;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_storage_deleted','catalog_media_cleanup_job',v_job.id::text,v_org,p_instance_id,
    'Termékmédia tárhelyobjektum törlése lezárva',jsonb_build_object('cleanupJobId',v_job.id,'completed',true),jsonb_build_object('audit_source','database_rpc','product_id',v_job.product_id,'media_id',v_job.media_id,'storage_path',v_job.storage_path));
  return jsonb_build_object('cleanupJobId',v_job.id,'completed',true,'replayed',false);
end;$$;
revoke all on function public.complete_product_media_cleanup_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.complete_product_media_cleanup_v1(uuid,uuid,uuid) to service_role;

create or replace function public.set_product_primary_media_v1(
  p_instance_id uuid,p_product_id uuid,p_media_id uuid,p_actor uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_media_id is null or p_actor is null then raise exception 'CATALOG_PRIMARY_MEDIA_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  if not exists(select 1 from public.product_media where id=p_media_id and instance_id=p_instance_id and product_id=p_product_id) then raise exception 'PRODUCT_MEDIA_NOT_FOUND';end if;
  with ranked as(
    select id,row_number()over(order by case when id=p_media_id then 0 else 1 end,sort_order,created_at,id)-1 as new_order
    from public.product_media where instance_id=p_instance_id and product_id=p_product_id
  )
  update public.product_media m set sort_order=ranked.new_order from ranked where m.id=ranked.id and m.sort_order is distinct from ranked.new_order;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  v_result:=jsonb_build_object('primaryMediaId',p_media_id,'productId',p_product_id);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_primary_media_changed','product',p_product_id::text,v_org,p_instance_id,
    'Termék főkép módosítva',v_result,jsonb_build_object('audit_source','database_rpc','media_id',p_media_id));
  return v_result;
end;$$;
revoke all on function public.set_product_primary_media_v1(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_product_primary_media_v1(uuid,uuid,uuid,uuid) to service_role;
