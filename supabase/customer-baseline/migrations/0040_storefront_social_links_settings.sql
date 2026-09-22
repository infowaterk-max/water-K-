-- Customer baseline mirror for canonical storefront social profile settings.
-- The customer baseline intentionally excludes the e-mail Brand Kit subsystem, so
-- only the tenant storefront mutation authority is required here.

create or replace function public.admin_mutate_storefront_social_links_v1(
  p_instance_id uuid,
  p_actor uuid,
  p_social_links jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_org uuid;
  v_config jsonb;
  v_before jsonb;
  v_key text;
  v_value text;
begin
  if p_instance_id is null or p_actor is null then
    raise exception 'STOREFRONT_SOCIAL_IDENTITY_REQUIRED';
  end if;
  if not public.can_manage_storefront(p_instance_id,p_actor) then
    raise exception 'STOREFRONT_MANAGE_PERMISSION_REQUIRED';
  end if;
  if p_social_links is null or pg_catalog.jsonb_typeof(p_social_links)<>'object' then
    raise exception 'STOREFRONT_SOCIAL_PAYLOAD_INVALID';
  end if;
  if pg_catalog.octet_length(p_social_links::text)>12000 then
    raise exception 'STOREFRONT_SOCIAL_PAYLOAD_TOO_LARGE';
  end if;

  for v_key in select pg_catalog.jsonb_object_keys(p_social_links)
  loop
    if v_key not in ('facebook','instagram','youtube','tiktok','linkedin') then
      raise exception 'STOREFRONT_SOCIAL_PROVIDER_INVALID';
    end if;
    if pg_catalog.jsonb_typeof(p_social_links->v_key)<>'string' then
      raise exception 'STOREFRONT_SOCIAL_URL_INVALID';
    end if;
    v_value:=pg_catalog.btrim(p_social_links->>v_key);
    if pg_catalog.char_length(v_value)<8
       or pg_catalog.char_length(v_value)>500
       or v_value !~* '^https?://[^[:space:]]+$' then
      raise exception 'STOREFRONT_SOCIAL_URL_INVALID';
    end if;
  end loop;

  select organization_id,coalesce(storefront_config,'{}'::jsonb)
    into v_org,v_config
  from public.webshop_instances
  where id=p_instance_id
  for update;
  if not found then raise exception 'WEBSHOP_INSTANCE_NOT_FOUND'; end if;

  v_before:=coalesce(v_config->'socialLinks','{}'::jsonb);
  v_config:=pg_catalog.jsonb_set(v_config,'{socialLinks}',p_social_links,true);

  update public.webshop_instances
  set storefront_config=v_config,updated_at=now()
  where id=p_instance_id;

  insert into public.admin_audit_log(
    actor_user_id,action,entity_type,entity_id,organization_id,instance_id,
    summary,before_state,after_state,metadata
  ) values(
    p_actor,'storefront.social_links_updated','webshop_instance',p_instance_id::text,v_org,p_instance_id,
    'Közösségi média hivatkozások módosítva',
    pg_catalog.jsonb_build_object('socialLinks',v_before),
    pg_catalog.jsonb_build_object('socialLinks',p_social_links),
    pg_catalog.jsonb_build_object('audit_source','database_rpc','rpc','admin_mutate_storefront_social_links_v1')
  );

  return pg_catalog.jsonb_build_object('instanceId',p_instance_id,'socialLinks',p_social_links);
end;
$$;

revoke all on function public.admin_mutate_storefront_social_links_v1(uuid,uuid,jsonb)
from public,anon,authenticated;
grant execute on function public.admin_mutate_storefront_social_links_v1(uuid,uuid,jsonb)
to service_role;
