-- Preserve platform-owner activation while keeping tenant-scoped B2B signup behavior.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account_type text:=coalesce(new.raw_user_meta_data->>'account_type','customer');
  v_requested_instance uuid;
  v_email text:=lower(trim(coalesce(new.email,'')));
  v_claim_name text;
begin
  select full_name
    into v_claim_name
  from private.platform_owner_claims
  where email=v_email
    and claimed_at is null
  limit 1;

  insert into public.profiles(
    id,email,full_name,company_name,tax_number,role,reseller_approved
  )
  values(
    new.id,
    new.email,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),
      v_claim_name
    ),
    nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),
    'customer'::public.customer_role,
    false
  )
  on conflict(id) do update
    set email=excluded.email,
        full_name=coalesce(public.profiles.full_name,excluded.full_name);

  if v_claim_name is not null then
    insert into public.platform_operators(user_id,role)
    values(new.id,'owner')
    on conflict(user_id) do update set role='owner';

    update private.platform_owner_claims
    set claimed_at=now(),
        claimed_by_user_id=new.id
    where email=v_email
      and claimed_at is null;
  end if;

  begin
    v_requested_instance:=nullif(trim(coalesce(new.raw_user_meta_data->>'requested_instance_id','')),'')::uuid;
  exception when others then
    v_requested_instance:=null;
  end;

  if v_requested_instance is not null
     and exists(
       select 1 from public.webshop_instances w
       where w.id=v_requested_instance and w.status in('pilot','active')
     ) then
    insert into public.customer_instance_roles(
      instance_id,user_id,role,reseller_approved,reseller_requested_at
    )
    values(
      v_requested_instance,
      new.id,
      case
        when v_account_type='reseller' then 'reseller'::public.customer_role
        else 'customer'::public.customer_role
      end,
      false,
      case when v_account_type='reseller' then now() else null end
    )
    on conflict(instance_id,user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user()
from public,anon,authenticated;
