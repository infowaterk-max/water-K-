grant usage on schema private to authenticated,service_role;

create or replace function private.is_platform_operator_current(p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path=''
as $$
  select case
    when p_user_id is null then false
    when coalesce(auth.jwt()->>'role','')='service_role' then
      exists(select 1 from public.platform_operators p where p.user_id=p_user_id)
    when auth.uid() is null or p_user_id is distinct from auth.uid() then false
    else exists(select 1 from public.platform_operators p where p.user_id=p_user_id)
  end;
$$;

create or replace function private.has_store_role_current(
  p_instance_id uuid,p_roles text[],p_user_id uuid default auth.uid()
)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select case
    when p_instance_id is null or p_user_id is null then false
    when coalesce(auth.jwt()->>'role','')<>'service_role'
      and (auth.uid() is null or p_user_id is distinct from auth.uid()) then false
    else private.is_platform_operator_current(p_user_id) or exists(
      select 1
      from public.role_bindings r
      where r.user_id=p_user_id
        and r.role_code=any(p_roles)
        and r.revoked_at is null
        and r.valid_from<=now()
        and (r.valid_until is null or r.valid_until>now())
        and (
          r.instance_id=p_instance_id
          or (
            r.instance_id is null
            and r.organization_id=(
              select w.organization_id from public.webshop_instances w where w.id=p_instance_id
            )
          )
        )
    )
  end;
$$;

create or replace function private.has_feature_entitlement_current(
  p_instance_id uuid,p_feature_code text
)
returns boolean
language sql stable security definer
set search_path=''
as $$
  select case
    when p_instance_id is null or nullif(trim(p_feature_code),'') is null then false
    when coalesce(auth.jwt()->>'role','')<>'service_role'
      and not private.is_platform_operator_current(auth.uid())
      and not private.has_store_role_current(
        p_instance_id,
        array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],
        auth.uid()
      )
    then false
    else exists(
      select 1
      from public.feature_entitlements e
      join public.webshop_instances w
        on w.id=p_instance_id and w.organization_id=e.organization_id
      where e.feature_code=p_feature_code
        and e.enabled
        and (e.instance_id is null or e.instance_id=p_instance_id)
        and e.valid_from<=now()
        and (e.valid_until is null or e.valid_until>now())
    )
  end;
$$;

revoke all on function private.is_platform_operator_current(uuid) from public,anon;
revoke all on function private.has_store_role_current(uuid,text[],uuid) from public,anon;
revoke all on function private.has_feature_entitlement_current(uuid,text) from public,anon;
grant execute on function private.is_platform_operator_current(uuid) to authenticated,service_role;
grant execute on function private.has_store_role_current(uuid,text[],uuid) to authenticated,service_role;
grant execute on function private.has_feature_entitlement_current(uuid,text) to authenticated,service_role;

create or replace function public.is_platform_operator(p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select private.is_platform_operator_current(p_user_id);$$;

create or replace function public.has_store_role(
  p_instance_id uuid,p_roles text[],p_user_id uuid default auth.uid()
)
returns boolean language sql stable security invoker set search_path=''
as $$select private.has_store_role_current(p_instance_id,p_roles,p_user_id);$$;

create or replace function public.has_feature_entitlement(p_instance_id uuid,p_feature_code text)
returns boolean language sql stable security invoker set search_path=''
as $$select private.has_feature_entitlement_current(p_instance_id,p_feature_code);$$;

create or replace function public.can_read_store(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager','order_manager','marketing_manager','support','analyst','viewer'],p_user_id);$$;

create or replace function public.can_manage_catalog(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);$$;

create or replace function public.can_manage_orders(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager'],p_user_id);$$;

create or replace function public.can_manage_marketing(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;

create or replace function public.can_manage_support(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','order_manager','support'],p_user_id);$$;

create or replace function public.can_manage_procurement(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','catalog_manager'],p_user_id);$$;

create or replace function public.can_manage_sales(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;

create or replace function public.can_read_loyalty(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager','analyst'],p_user_id);$$;

create or replace function public.can_manage_loyalty(p_instance_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security invoker set search_path=''
as $$select public.is_platform_operator(p_user_id) or public.has_store_role(p_instance_id,array['owner','admin','marketing_manager'],p_user_id);$$;

do $$
declare p record;
begin
  for p in
    select schemaname,tablename,policyname
    from pg_policies
    where schemaname='public'
      and roles='{public}'
      and (
        coalesce(qual,'') ~ '(has_store_role|is_platform_operator|can_read_store|can_manage_)'
        or coalesce(with_check,'') ~ '(has_store_role|is_platform_operator|can_read_store|can_manage_)'
      )
  loop
    execute format('alter policy %I on %I.%I to authenticated',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

do $$
declare f regprocedure;
begin
  foreach f in array array[
    'public.is_platform_operator(uuid)'::regprocedure,
    'public.has_store_role(uuid,text[],uuid)'::regprocedure,
    'public.has_feature_entitlement(uuid,text)'::regprocedure,
    'public.can_read_store(uuid,uuid)'::regprocedure,
    'public.can_manage_catalog(uuid,uuid)'::regprocedure,
    'public.can_manage_orders(uuid,uuid)'::regprocedure,
    'public.can_manage_marketing(uuid,uuid)'::regprocedure,
    'public.can_manage_support(uuid,uuid)'::regprocedure,
    'public.can_manage_procurement(uuid,uuid)'::regprocedure,
    'public.can_manage_sales(uuid,uuid)'::regprocedure,
    'public.can_read_loyalty(uuid,uuid)'::regprocedure,
    'public.can_manage_loyalty(uuid,uuid)'::regprocedure
  ]
  loop
    execute format('revoke execute on function %s from public,anon',f);
    execute format('grant execute on function %s to authenticated,service_role',f);
  end loop;
end $$;
