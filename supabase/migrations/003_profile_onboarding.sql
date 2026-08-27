create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_account_type text := coalesce(new.raw_user_meta_data->>'account_type','customer');
begin
  insert into public.profiles(id,email,full_name,company_name,tax_number,role,reseller_approved)
  values(new.id,new.email,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'company_name','')),''),nullif(trim(coalesce(new.raw_user_meta_data->>'tax_number','')),''),case when v_account_type='reseller' then 'reseller'::public.customer_role else 'customer'::public.customer_role end,false)
  on conflict(id) do update set email=excluded.email;
  return new;
end; $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;

revoke update on public.profiles from authenticated;
grant update(full_name,company_name,tax_number) on public.profiles to authenticated;

create or replace function public.request_reseller_status(p_company_name text,p_tax_number text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Bejelentkezés szükséges.'; end if;
  if length(trim(p_company_name))<2 or length(trim(p_tax_number))<5 then raise exception 'Cégnév és adószám szükséges.'; end if;
  update public.profiles set company_name=trim(p_company_name),tax_number=trim(p_tax_number),role='reseller',reseller_approved=false,updated_at=now() where id=auth.uid() and role<>'admin';
end; $$;
revoke all on function public.request_reseller_status(text,text) from public,anon;
grant execute on function public.request_reseller_status(text,text) to authenticated;
