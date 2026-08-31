# Shoperation fresh-install proof

A paying-customer database must start from the reviewed Shoperation customer baseline, never from the historical migration chain.

## Two mandatory preflight gates

1. Run `supabase/customer-baseline/source-preflight.sql` against the reviewed non-production schema source before generating the baseline snapshot. It verifies the core Shoperation objects, fail-closed Alap defaults, the provider-neutral checkout RPC and the absence of obsolete checkout overloads.
2. Run `supabase/customer-baseline/target-preflight.sql` against the disposable target immediately before applying the baseline. It must return `target-preflight-ok`. The target is rejected if the public schema contains relations, functions, sequences, user-defined types or historical Supabase migration rows.

These checks are read-only. They must not be replaced by replaying `supabase/migrations` on a new customer environment.

## Fresh-install proof sequence

After both preflights pass, apply only the reviewed `0001_shoperation_v1_schema.sql`, then the neutral customer-baseline seed. Verify that the default package is Alap, customer catalog/content remains empty, one webshop instance can be provisioned, owner/admin access works, payment and shipping can be configured without tenant assumptions, Alap cannot access Pro-only functions, and a neutral storefront order can complete end to end.

The baseline manifest stays `snapshot-required` until the reviewed schema snapshot exists and this proof passes on a disposable empty Supabase project. Production databases are never reset or used as the proof target.
