-- Customer reseller request concurrency closure.
-- A customer request must never downgrade an approval that commits concurrently.

create or replace function public.request_reseller_status_v2(
  p_instance_id uuid,
  p_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_row public.customer_instance_roles%rowtype;
  v_now timestamptz:=now();
begin
  if p_instance_id is null or p_user_id is null then raise exception 'RESELLER_REQUEST_IDENTITY_REQUIRED'; end if;
  if not exists(
    select 1 from public.webshop_instances
    where id=p_instance_id and status in ('pilot','active')
  ) then raise exception 'RESELLER_REQUEST_STORE_INACTIVE'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'RESELLER_REQUEST_PROFILE_NOT_FOUND'; end if;

  -- Create the relation if absent. ON CONFLICT serializes concurrent first requests safely.
  insert into public.customer_instance_roles(
    instance_id,user_id,role,reseller_approved,reseller_requested_at,approved_at,approved_by,updated_at
  ) values(
    p_instance_id,p_user_id,'reseller',false,v_now,null,null,v_now
  )
  on conflict(instance_id,user_id) do nothing;

  select * into v_row
  from public.customer_instance_roles
  where instance_id=p_instance_id and user_id=p_user_id
  for update;
  if not found then raise exception 'RESELLER_REQUEST_RELATION_MISSING'; end if;

  -- Never downgrade an approval, including one that committed while this request was waiting.
  if v_row.role='reseller' and v_row.reseller_approved=true then
    return jsonb_build_object(
      'userId',p_user_id,
      'role','reseller',
      'approved',true,
      'requestedAt',v_row.reseller_requested_at,
      'replayed',true
    );
  end if;

  update public.customer_instance_roles
  set
    role='reseller',
    reseller_approved=false,
    reseller_requested_at=coalesce(reseller_requested_at,v_now),
    approved_at=null,
    approved_by=null,
    updated_at=v_now
  where instance_id=p_instance_id and user_id=p_user_id
  returning * into v_row;

  if not found then raise exception 'RESELLER_REQUEST_WRITE_MISSING'; end if;
  if v_row.role<>'reseller' or v_row.reseller_approved<>false or v_row.reseller_requested_at is null then
    raise exception 'RESELLER_REQUEST_EVIDENCE_MISMATCH';
  end if;

  return jsonb_build_object(
    'userId',p_user_id,
    'role',v_row.role,
    'approved',v_row.reseller_approved,
    'requestedAt',v_row.reseller_requested_at,
    'replayed',false
  );
end;
$$;

revoke all on function public.request_reseller_status_v2(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.request_reseller_status_v2(uuid,uuid)
to service_role;

comment on function public.request_reseller_status_v2(uuid,uuid)
is 'Creates or refreshes a tenant reseller request under row lock and never downgrades an already approved reseller.';
