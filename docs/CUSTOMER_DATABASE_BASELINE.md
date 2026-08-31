# Shoperation 1.0 customer database baseline

A fresh paying-customer database must not replay the historical `supabase/migrations` chain. That chain is retained only for provenance and continuity of existing non-customer environments. New customer environments use the isolated `supabase/customer-baseline` path.

## Baseline lifecycle

1. `snapshot-required` — no production-ready schema snapshot exists yet. Fresh customer deployment is blocked.
2. Restore the reviewed non-production schema source and wait until its control-plane status is `ACTIVE_HEALTHY`. Never snapshot a project while it is `COMING_UP`, paused, restoring or otherwise transitional.
3. Run `supabase/customer-baseline/source-preflight.sql` against that source. It must confirm the core Shoperation tables, fail-closed Alap package defaults, the provider-neutral checkout RPC, and the absence of obsolete `public.place_order` overloads.
4. Generate a candidate from that reviewed neutral source database with `SHOPERATION_BASELINE_DB_URL` and `npm run db:customer:snapshot`.
5. Review the generated `0001_shoperation_v1_schema.sql` as code. Remove environment-only grants, stale compatibility objects, test-only data assumptions and anything that is not required by the sellable Shoperation 1.0 product.
6. The candidate must contain schema only. Customer/catalog/content/domain/e-mail/provider credential data belongs to onboarding, never to the baseline.
7. Set `manifest.json` status to `ready` only after review. The baseline guard then requires exactly one SQL snapshot and rechecks the neutral seed and fail-closed package defaults.
8. Prove the snapshot on a completely empty disposable Supabase environment before any paying customer is provisioned.

## Required fresh-install proof

A baseline can be considered release-ready only when an empty database can be created from the single snapshot plus the neutral seed and all of these checks pass: application CI, schema creation without the historical chain, `alap` default package state, empty customer catalog/content, instance creation, owner/admin assignment, provider-neutral commerce configuration, an Alap negative Pro entitlement test, and a neutral storefront order smoke test.

The disposable target must itself be verified empty before applying the baseline: no customer tables, no customer functions and no historical migration chain. A project that is still restoring is not valid proof, even if a temporary connection is already possible.

## Source database rules

The snapshot source must be a non-production, reviewed Shoperation schema source. Production customer data must never be dumped into this path. The source must not be treated as a demo/reference store; only its reviewed schema structure is used. No data dump is allowed by the generator.

A database connection becoming reachable is not sufficient evidence that a restore is complete. The source must first be `ACTIVE_HEALTHY`, then pass the source preflight. This prevents capturing an empty or partially restored interim schema.

## Promotion and rollback

The baseline is immutable once used for a paying customer. Later schema changes are added as new customer-baseline migrations rather than rewriting `0001_shoperation_v1_schema.sql`. If fresh-install verification fails, keep the manifest in `snapshot-required`, fix the candidate, and repeat against a disposable environment. Existing production databases are never reset as part of this workflow.
