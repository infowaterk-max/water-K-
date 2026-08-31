# Shoperation 1.0 customer database baseline

A fresh paying-customer database must not replay the historical `supabase/migrations` chain. That chain is retained only for provenance and continuity of existing non-customer environments. New customer environments use the isolated `supabase/customer-baseline` path.

## Baseline lifecycle

1. `snapshot-required` — no production-ready schema snapshot exists yet. Fresh customer deployment is blocked.
2. Generate a candidate from a reviewed neutral source database with `SHOPERATION_BASELINE_DB_URL` and `npm run db:customer:snapshot`.
3. Review the generated `0001_shoperation_v1_schema.sql` as code. Remove environment-only grants, stale compatibility objects, test-only data assumptions and anything that is not required by the sellable Shoperation 1.0 product.
4. The candidate must contain schema only. Customer/catalog/content/domain/e-mail/provider credential data belongs to onboarding, never to the baseline.
5. Set `manifest.json` status to `ready` only after review. The baseline guard then requires exactly one SQL snapshot and rechecks the neutral seed and fail-closed package defaults.
6. Prove the snapshot on a completely empty disposable Supabase environment before any paying customer is provisioned.

## Required fresh-install proof

A baseline can be considered release-ready only when an empty database can be created from the single snapshot plus the neutral seed and all of these checks pass: application CI, schema creation without the historical chain, `alap` default package state, empty customer catalog/content, instance creation, owner/admin assignment, provider-neutral commerce configuration, an Alap negative Pro entitlement test, and a neutral storefront order smoke test.

## Source database rules

The snapshot source must be a non-production, reviewed Shoperation schema source. Production customer data must never be dumped into this path. The source must not be treated as a demo/reference store; only its reviewed schema structure is used. No data dump is allowed by the generator.

## Promotion and rollback

The baseline is immutable once used for a paying customer. Later schema changes are added as new customer-baseline migrations rather than rewriting `0001_shoperation_v1_schema.sql`. If fresh-install verification fails, keep the manifest in `snapshot-required`, fix the candidate, and repeat against a disposable environment. Existing production databases are never reset as part of this workflow.
