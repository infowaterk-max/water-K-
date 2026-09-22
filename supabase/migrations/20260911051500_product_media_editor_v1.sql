-- Product Media Editor v1
-- Non-destructive crop/zoom/position metadata, reusable presets and tenant-safe variant application.

create unique index if not exists product_media_id_instance_uidx on public.product_media(id,instance_id);

create table if not exists public.product_media_presentations(
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  product_id uuid not null,
  media_id uuid not null,
  context text not null check(context in('card','detail','mobile')),
  zoom numeric(6,3) not null default 1 check(zoom between 1 and 3),
  offset_x numeric(7,3) not null default 0 check(offset_x between -50 and 50),
  offset_y numeric(7,3) not null default 0 check(offset_y between -50 and 50),
  rotation numeric(7,2) not null default 0 check(rotation between -180 and 180),
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(media_id,context),
  foreign key(media_id,instance_id) references public.product_media(id,instance_id) on delete cascade,
  foreign key(product_id,instance_id) references public.products(id,instance_id) on delete cascade
);
create index if not exists product_media_presentations_product_idx on public.product_media_presentations(instance_id,product_id,media_id);

create table if not exists public.product_media_presets(
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.webshop_instances(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 1 and 80),
  presentation jsonb not null check(jsonb_typeof(presentation)='object'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(instance_id,name)
);

alter table public.product_media_presentations enable row level security;
alter table public.product_media_presets enable row level security;
revoke all on public.product_media_presentations,public.product_media_presets from public,anon,authenticated;
grant select on public.product_media_presentations,public.product_media_presets to authenticated;
grant select,insert,update,delete on public.product_media_presentations,public.product_media_presets to service_role;

create policy product_media_presentations_store_read on public.product_media_presentations
  for select to authenticated using(public.can_read_store(instance_id));
create policy product_media_presets_store_read on public.product_media_presets
  for select to authenticated using(public.can_read_store(instance_id));

create or replace function public.normalize_product_media_presentations_v1(p_presentations jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare
  v_context text;v_view jsonb;v_zoom numeric;v_x numeric;v_y numeric;v_rotation numeric;v_result jsonb:='{}'::jsonb;
begin
  if p_presentations is null or jsonb_typeof(p_presentations)<>'object' then raise exception 'CATALOG_MEDIA_PRESENTATION_INVALID';end if;
  foreach v_context in array array['card','detail','mobile'] loop
    v_view:=p_presentations->v_context;
    if v_view is null or jsonb_typeof(v_view)<>'object' then raise exception 'CATALOG_MEDIA_PRESENTATION_CONTEXT_REQUIRED:%',v_context;end if;
    begin
      v_zoom:=coalesce((v_view->>'zoom')::numeric,1);
      v_x:=coalesce((v_view->>'offsetX')::numeric,0);
      v_y:=coalesce((v_view->>'offsetY')::numeric,0);
      v_rotation:=coalesce((v_view->>'rotation')::numeric,0);
    exception when others then raise exception 'CATALOG_MEDIA_PRESENTATION_VALUE_INVALID:%',v_context;end;
    if v_zoom<1 or v_zoom>3 or v_x< -50 or v_x>50 or v_y< -50 or v_y>50 or v_rotation< -180 or v_rotation>180 then
      raise exception 'CATALOG_MEDIA_PRESENTATION_RANGE_INVALID:%',v_context;
    end if;
    v_result:=v_result||jsonb_build_object(v_context,jsonb_build_object('zoom',round(v_zoom,3),'offsetX',round(v_x,3),'offsetY',round(v_y,3),'rotation',round(v_rotation,2)));
  end loop;
  return v_result;
end;$$;
revoke all on function public.normalize_product_media_presentations_v1(jsonb) from public,anon,authenticated;
grant execute on function public.normalize_product_media_presentations_v1(jsonb) to service_role;

create or replace function public.save_product_media_presentations_v1(
  p_instance_id uuid,p_product_id uuid,p_media_id uuid,p_actor uuid,p_presentations jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_context text;v_normalized jsonb;v_view jsonb;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_media_id is null or p_actor is null then raise exception 'CATALOG_MEDIA_PRESENTATION_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  if not exists(select 1 from public.products where id=p_product_id and instance_id=p_instance_id and active=false) then raise exception 'PRODUCT_DRAFT_REQUIRED';end if;
  if not exists(select 1 from public.product_media where id=p_media_id and instance_id=p_instance_id and product_id=p_product_id) then raise exception 'PRODUCT_MEDIA_NOT_FOUND';end if;
  v_normalized:=public.normalize_product_media_presentations_v1(p_presentations);
  foreach v_context in array array['card','detail','mobile'] loop
    v_view:=v_normalized->v_context;
    insert into public.product_media_presentations(instance_id,product_id,media_id,context,zoom,offset_x,offset_y,rotation,updated_by)
    values(p_instance_id,p_product_id,p_media_id,v_context,(v_view->>'zoom')::numeric,(v_view->>'offsetX')::numeric,(v_view->>'offsetY')::numeric,(v_view->>'rotation')::numeric,p_actor)
    on conflict(media_id,context) do update set zoom=excluded.zoom,offset_x=excluded.offset_x,offset_y=excluded.offset_y,rotation=excluded.rotation,updated_by=excluded.updated_by,updated_at=now();
  end loop;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  v_result:=jsonb_build_object('mediaId',p_media_id,'productId',p_product_id,'presentation',v_normalized);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_presentation_saved','product_media',p_media_id::text,v_org,p_instance_id,'Termékmédia megjelenítési beállítások mentve',v_result,jsonb_build_object('audit_source','database_rpc','product_id',p_product_id));
  return v_result;
end;$$;
revoke all on function public.save_product_media_presentations_v1(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_product_media_presentations_v1(uuid,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.create_product_media_preset_v1(
  p_instance_id uuid,p_actor uuid,p_name text,p_presentations jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_id uuid;v_name text;v_normalized jsonb;v_result jsonb;
begin
  if p_instance_id is null or p_actor is null then raise exception 'CATALOG_MEDIA_PRESET_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  v_name:=trim(coalesce(p_name,''));if char_length(v_name)<1 or char_length(v_name)>80 then raise exception 'CATALOG_MEDIA_PRESET_NAME_INVALID';end if;
  v_normalized:=public.normalize_product_media_presentations_v1(p_presentations);
  insert into public.product_media_presets(instance_id,name,presentation,created_by)
  values(p_instance_id,v_name,v_normalized,p_actor)
  on conflict(instance_id,name) do update set presentation=excluded.presentation,updated_at=now()
  returning id,name into v_id,v_name;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  v_result:=jsonb_build_object('presetId',v_id,'name',v_name,'presentation',v_normalized);
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_preset_saved','product_media_preset',v_id::text,v_org,p_instance_id,'Termékmédia preset mentve: '||v_name,v_result,jsonb_build_object('audit_source','database_rpc'));
  return v_result;
end;$$;
revoke all on function public.create_product_media_preset_v1(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_product_media_preset_v1(uuid,uuid,text,jsonb) to service_role;

create or replace function public.delete_product_media_preset_v1(
  p_instance_id uuid,p_actor uuid,p_preset_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_org uuid;v_name text;
begin
  if p_instance_id is null or p_actor is null or p_preset_id is null then raise exception 'CATALOG_MEDIA_PRESET_IDENTITY_REQUIRED';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  delete from public.product_media_presets where id=p_preset_id and instance_id=p_instance_id returning name into v_name;
  if v_name is null then raise exception 'CATALOG_MEDIA_PRESET_NOT_FOUND';end if;
  select organization_id into v_org from public.webshop_instances where id=p_instance_id;
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_preset_deleted','product_media_preset',p_preset_id::text,v_org,p_instance_id,'Termékmédia preset törölve: '||v_name,jsonb_build_object('deleted',true),jsonb_build_object('audit_source','database_rpc'));
  return jsonb_build_object('presetId',p_preset_id,'deleted',true);
end;$$;
revoke all on function public.delete_product_media_preset_v1(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_product_media_preset_v1(uuid,uuid,uuid) to service_role;

create or replace function public.apply_product_media_to_variants_v1(
  p_instance_id uuid,p_product_id uuid,p_source_media_id uuid,p_actor uuid,p_target_variant_ids uuid[],p_mode text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_org uuid;v_requested integer;v_distinct integer;v_actual integer;v_applied jsonb:='[]'::jsonb;v_skipped jsonb:='[]'::jsonb;v_result jsonb;
begin
  if p_instance_id is null or p_product_id is null or p_source_media_id is null or p_actor is null then raise exception 'CATALOG_MEDIA_VARIANT_APPLY_IDENTITY_REQUIRED';end if;
  if p_mode not in('same-media','presentation-only') then raise exception 'CATALOG_MEDIA_VARIANT_APPLY_MODE_INVALID';end if;
  if not public.can_manage_catalog(p_instance_id,p_actor) then raise exception 'CATALOG_PERMISSION_REQUIRED';end if;
  if not exists(select 1 from public.products where id=p_product_id and instance_id=p_instance_id and active=false) then raise exception 'PRODUCT_DRAFT_REQUIRED';end if;
  v_requested:=coalesce(cardinality(p_target_variant_ids),0);if v_requested<1 or v_requested>100 then raise exception 'CATALOG_MEDIA_VARIANT_APPLY_TARGETS_INVALID';end if;
  select count(distinct value) into v_distinct from unnest(p_target_variant_ids) as t(value);if v_distinct<>v_requested then raise exception 'CATALOG_MEDIA_VARIANT_APPLY_DUPLICATE_TARGET';end if;
  if not exists(select 1 from public.product_media where id=p_source_media_id and instance_id=p_instance_id and product_id=p_product_id) then raise exception 'PRODUCT_MEDIA_NOT_FOUND';end if;
  select count(*) into v_actual from public.product_variants where instance_id=p_instance_id and product_id=p_product_id and id=any(p_target_variant_ids);
  if v_actual<>v_requested then raise exception 'CATALOG_MEDIA_VARIANT_SCOPE_INVALID';end if;

  if p_mode='same-media' then
    update public.product_variants set primary_media_id=p_source_media_id,updated_at=now()
    where instance_id=p_instance_id and product_id=p_product_id and id=any(p_target_variant_ids);
    select coalesce(jsonb_agg(id order by id),'[]'::jsonb) into v_applied from public.product_variants where instance_id=p_instance_id and product_id=p_product_id and id=any(p_target_variant_ids);
  else
    with contexts(context) as(values('card'),('detail'),('mobile')),
    source_views as(
      select c.context,coalesce(p.zoom,1::numeric) zoom,coalesce(p.offset_x,0::numeric) offset_x,coalesce(p.offset_y,0::numeric) offset_y,coalesce(p.rotation,0::numeric) rotation
      from contexts c left join public.product_media_presentations p on p.media_id=p_source_media_id and p.instance_id=p_instance_id and p.context=c.context
    ),target_media as(
      select distinct v.primary_media_id media_id from public.product_variants v
      join public.product_media m on m.id=v.primary_media_id and m.instance_id=p_instance_id and m.product_id=p_product_id
      where v.instance_id=p_instance_id and v.product_id=p_product_id and v.id=any(p_target_variant_ids) and v.primary_media_id is not null
    )
    insert into public.product_media_presentations(instance_id,product_id,media_id,context,zoom,offset_x,offset_y,rotation,updated_by)
    select p_instance_id,p_product_id,t.media_id,s.context,s.zoom,s.offset_x,s.offset_y,s.rotation,p_actor from target_media t cross join source_views s
    on conflict(media_id,context) do update set zoom=excluded.zoom,offset_x=excluded.offset_x,offset_y=excluded.offset_y,rotation=excluded.rotation,updated_by=excluded.updated_by,updated_at=now();
    select coalesce(jsonb_agg(id order by id),'[]'::jsonb) into v_applied from public.product_variants where instance_id=p_instance_id and product_id=p_product_id and id=any(p_target_variant_ids) and primary_media_id is not null;
    select coalesce(jsonb_agg(id order by id),'[]'::jsonb) into v_skipped from public.product_variants where instance_id=p_instance_id and product_id=p_product_id and id=any(p_target_variant_ids) and primary_media_id is null;
  end if;

  select organization_id into v_org from public.webshop_instances where id=p_instance_id;if v_org is null then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND';end if;
  v_result:=jsonb_build_object('mode',p_mode,'sourceMediaId',p_source_media_id,'appliedVariantIds',v_applied,'skippedVariantIds',v_skipped,'appliedCount',jsonb_array_length(v_applied),'skippedCount',jsonb_array_length(v_skipped));
  insert into public.admin_audit_log(actor_user_id,action,entity_type,entity_id,organization_id,instance_id,summary,after_state,metadata)
  values(p_actor,'catalog.product_media_applied_to_variants','product',p_product_id::text,v_org,p_instance_id,'Termékmédia variánsokra alkalmazva',v_result,jsonb_build_object('audit_source','database_rpc','source_media_id',p_source_media_id));
  return v_result;
end;$$;
revoke all on function public.apply_product_media_to_variants_v1(uuid,uuid,uuid,uuid,uuid[],text) from public,anon,authenticated;
grant execute on function public.apply_product_media_to_variants_v1(uuid,uuid,uuid,uuid,uuid[],text) to service_role;
