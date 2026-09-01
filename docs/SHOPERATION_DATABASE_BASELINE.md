# Shoperation 1.0 — fresh customer database baseline

## Purpose

A new paying customer must never be bootstrapped by replaying the historical `supabase/migrations` chain. That chain is retained because existing development/staging databases depend on its migration history, but it contains six pinned customer-era SQL files. It is therefore provenance, not a customer template.

The approved fresh-customer path lives under `supabase/customer-baseline/` and is fail-closed. Until a reviewed schema snapshot exists, its manifest remains `snapshot-required` and provisioning must stop rather than fall back to the historical migration chain.

## Baseline generation

The baseline must be generated from a neutral Shoperation database schema, not from customer data. The supported Supabase workflow is a schema-only pull/dump from the reviewed neutral source into a single baseline migration, followed by manual review. The snapshot must include the required public schema objects, functions, policies, triggers, grants and extensions, but no products, customer rows, credentials, domains, branding, pricing or provider secrets.

Target layout:

```text
supabase/customer-baseline/
  manifest.json
  seed.sql
  migrations/
    <timestamp>_shoperation_v1_baseline.sql
```

After the schema snapshot has been reviewed, set `manifest.json` status to `ready`. The CI guard then requires exactly one baseline migration and rejects customer-specific identity, SKU/order-prefix assumptions and non-neutral seed data.

## Mandatory verification before first paid pilot

1. Run `npm run db:customer:guard`.
2. Create a brand-new disposable Supabase project or development branch from the reviewed baseline only.
3. Apply the baseline and the neutral seed; do not replay `supabase/migrations`.
4. Verify that the database starts without products or customer identity and defaults package entitlements to `alap`.
5. Provision a neutral pilot instance explicitly, then run order E2E, Alap direct-URL/API negative tests and tenant-isolation checks.
6. Only after those checks pass may the baseline status be considered release-ready.

## Existing environments

Existing staging/legacy environments keep their already-applied migration history. Do not rewrite or delete historical migrations merely to make them look neutral; corrective forward migrations and the separate fresh-customer baseline are the safe path.

Production promotion is a separate release decision and is not part of baseline generation.
