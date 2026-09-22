create or replace function public.platform_owner_claim_available(p_email text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from private.platform_owner_claims
    where email=lower(trim(p_email))
      and claimed_at is null
  );
$$;

revoke all on function public.platform_owner_claim_available(text) from public, anon, authenticated;
grant execute on function public.platform_owner_claim_available(text) to service_role;
