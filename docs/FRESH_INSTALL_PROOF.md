# Shoperation fresh-install proof

A paying-customer database must start from the reviewed Shoperation customer baseline, never from the historical migration chain.

## Mandatory proof gates

1. Run `supabase/customer-baseline/source-preflight.sql` against the reviewed non-production schema source before generating the baseline snapshot. It verifies the core Shoperation objects, fail-closed Alap defaults, the provider-neutral checkout RPC and the absence of obsolete checkout overloads.
2. Run `supabase/customer-baseline/target-preflight.sql` against the disposable target immediately before applying the baseline. It must return `target-preflight-ok`. The target is rejected if the public schema contains relations, functions, sequences, user-defined types or historical Supabase migration rows.
3. After applying only the reviewed `0001_shoperation_v1_schema.sql` and the neutral customer-baseline seed, run `supabase/customer-baseline/target-postflight.sql`. It must return `target-postflight-ok`. This proves that the core schema exists, Alap remains the fail-closed default, provider-neutral checkout is present, obsolete checkout overloads are absent, public RLS policies exist and customer-facing seed data is still empty.

All three checks are read-only. They must not be replaced by replaying `supabase/migrations` on a new customer environment.

## Fresh-install proof sequence

After the preflights pass, apply only the reviewed `0001_shoperation_v1_schema.sql`, then the neutral customer-baseline seed. Run the postflight before provisioning any customer-specific data. Only after the postflight passes may the disposable proof instance be provisioned.

The functional proof then verifies that one webshop instance can be created with the Alap package, owner/admin access works, payment and shipping can be configured without tenant assumptions, Alap cannot access Pro-only functions, the storefront remains neutral, and a neutral storefront order can complete end to end.

The baseline manifest stays `snapshot-required` until the reviewed schema snapshot exists and the full proof passes on a disposable empty Supabase project. Production databases are never reset or used as the proof target.
