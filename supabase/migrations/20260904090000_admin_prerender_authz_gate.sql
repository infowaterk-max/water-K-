-- Pre-render admin authorization gate for Next.js middleware.
-- The public wrapper is SECURITY INVOKER; only the private predicate owns the
-- minimum SECURITY DEFINER read authority needed to resolve the current tenant.

create or replace function private.can_access_admin_context_current(
  p_instance_slug text default null,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
with actor as (
  select p_user_id as user_id
  where p_user_id is not null
    and auth.uid() is not null
    and p_user_id is not distinct from auth.uid()
),
active_bindings as (
  select r.organization_id,r.instance_id,r.role_code
  from public.role_bindings r
  join actor a on a.user_id=r.user_id
  where r.revoked_at is null
    and r.valid_from<=now()
    and (r.valid_until is null or r.valid_until>now())
),
rbac_candidates as (
  select distinct w.id,w.organization_id
  from public.webshop_instances w
  join active_bindings r
    on r.instance_id=w.id
    or (r.instance_id is null and r.organization_id=w.organization_id)
  where w.status in ('pilot','active')
),
legacy_candidates as (
  select distinct w.id,w.organization_id
  from public.webshop_instances w
  join public.webshop_instance_members m
    on m.instance_id=w.id
   and m.user_id=p_user_id
  where w.status in ('pilot','active')
),
resolved as (
  select w.id,w.organization_id
  from public.webshop_instances w
  where w.status in ('pilot','active')
    and exists(select 1 from actor)
    and (
      (
        nullif(trim(coalesce(p_instance_slug,'')),'') is not null
        and lower(w.slug)=lower(trim(p_instance_slug))
      )
      or (
        nullif(trim(coalesce(p_instance_slug,'')),'') is null
        and (
          (
            exists(select 1 from rbac_candidates)
            and exists(select 1 from rbac_candidates c where c.id=w.id)
          )
          or (
            not exists(select 1 from rbac_candidates)
            and exists(select 1 from legacy_candidates c where c.id=w.id)
          )
        )
      )
    )
),
resolved_one as (
  select r.id,r.organization_id
  from resolved r
  where (select count(*) from resolved)=1
)
select case
  when not exists(select 1 from actor) then false
  when private.is_platform_operator_current(p_user_id) then true
  when not exists(select 1 from resolved_one) then false
  when exists(
    select 1
    from resolved_one x
    join active_bindings r
      on r.instance_id=x.id
      or (r.instance_id is null and r.organization_id=x.organization_id)
    where r.role_code=any(array[
      'owner','admin','catalog_manager','order_manager',
      'marketing_manager','support','analyst','viewer'
    ]::text[])
  ) then true
  else exists(
    select 1
    from resolved_one x
    join public.webshop_instance_members m
      on m.instance_id=x.id
     and m.user_id=p_user_id
     and m.role in ('owner','admin')
    join public.profiles p
      on p.id=p_user_id
     and p.role='admin'
  )
end;
$function$;

revoke all on function private.can_access_admin_context_current(text,uuid) from public, anon, service_role;
grant execute on function private.can_access_admin_context_current(text,uuid) to authenticated;

create or replace function public.can_access_admin_context(p_instance_slug text default null)
returns boolean
language sql
stable
set search_path=''
as $function$
  select private.can_access_admin_context_current(p_instance_slug,auth.uid());
$function$;

revoke all on function public.can_access_admin_context(text) from public, anon, service_role;
grant execute on function public.can_access_admin_context(text) to authenticated;
