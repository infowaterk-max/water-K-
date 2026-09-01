-- Shoperation no longer exposes the pre-provider checkout RPC overloads.
-- Current checkout uses the provider-neutral, idempotent v2 entrypoint.

drop function if exists public.place_order(
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text,
  uuid, jsonb
);

drop function if exists public.place_order(
  text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text,
  uuid, text, jsonb
);
