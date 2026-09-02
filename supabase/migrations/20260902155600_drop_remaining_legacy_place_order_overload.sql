-- Close the final pre-provider checkout RPC left by legacy production upgrades.
-- The current Shoperation checkout contract must not expose any public.place_order overload.

drop function if exists public.place_order(
  text, text, text, text, text, text, text, text,
  text, text, text, jsonb
);

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'place_order'
  ) then
    raise exception 'Legacy public.place_order overloads are still present after cleanup.';
  end if;
end $$;
