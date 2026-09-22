-- V24 production hardening: remove the remaining Supabase mutable search_path warning.
create or replace function public.block_post_release_immutable_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Append-only V18 rekord nem módosítható.';
end;
$$;
