# Production Runtime / Supabase Schema Parity Incident — 2026-09-23

Status: **implemented recovery / production verified / prevention implemented**

## Symptom

Immediately after the Playroom v20 production release, the public production root displayed the generic transient-error page:

`ÁTMENETI HIBA — Valami nem a tervek szerint alakult.`

Vercel production runtime evidence identified the exact exception:

`INTERACTIVE_SCENE_PRODUCTS_FAILED:column products.template_demo_image_url does not exist`

The failing runtime was `src/lib/builder/storefront-interactive-scene-server.ts`, which legitimately reads `products.template_demo_image_url`.

## Root cause

The production Vercel runtime had been advanced to current `main`, but the production Supabase project `waterk-platform` had not received the corresponding forward schema migrations.

At incident discovery:

- production Supabase migration history stopped around the 2026-09-13 Special Commerce closure;
- current runtime expected schema through 2026-09-22;
- staging already contained the newer storefront/demo/billing/document schema;
- `products.template_demo_image_url` existed in staging and in the repository migration/customer baseline, but did not exist in production.

This was a release-process defect. Code deployment and database migration were incorrectly treated as separable completion evidence even though the runtime depended on the newer schema.

## Why existing gates did not catch it

- GitHub `npm run build` proved compilation, not production database compatibility.
- Template Factory browser evidence used the QA/preview authority, not the real production Supabase schema.
- Vercel `READY` meant the deployment artifact was built and served; it did not prove runtime queries against production data.
- The customer baseline guard validates the fresh-customer baseline files, not the live production migration state.
- Fresh Install was correctly `SKIPPED` for the final code/doc diff, but that does **not** mean production schema parity was proven.

Therefore:

**FRESH INSTALL ≠ PRODUCTION SCHEMA PARITY.**
**VERCEL READY ≠ END-TO-END PRODUCTION HEALTH.**

## Recovery

The missing canonical forward migrations from current `main` were audited and then applied to the production Supabase project in dependency order.

The immediate missing-column migration was:

`20260922140000_storefront_template_demo_catalog_lifecycle_v1.sql`

After full reconciliation, the canonical repository migration audit from the current post-Special-Commerce period reported:

`missing: []`

The original `INTERACTIVE_SCENE_PRODUCTS_FAILED` runtime exception has no post-recovery occurrence; the only runtime-log entries are the historical 06:04:55 incident events.

## Business-data integrity proof

Before the full production migration reconciliation:

- webshop instances: 1
- products: 1
- variants: 3
- orders: 8
- auth users: 2
- storefront pages: 14
- order status distribution: pending 3, refunded 2, cancelled 1, completed 1, processing 1

After reconciliation the same snapshot was re-read and was identical.

The recovery did not activate the Water-K pilot and did not publish merchant Page Schema drafts.

## Separate pilot/publication boundary

After the schema crash was removed, anonymous production `/` no longer throws the missing-column error. It redirects to `/hamarosan`.

That is a separate, intentional state boundary:

- Water-K remains `pilot / pro`;
- only `active` storefronts are anonymously browsable in production;
- most Playroom Page Schema pages remain draft-only in the production tenant.

Do not solve that redirect by bypassing access control. Activation/publication is a merchant-visible state transition and needs explicit authorization.

## Prevention — real database deploy preflight

The Vercel deploy environment validator now contains a runtime-schema compatibility phase.

For real Vercel Preview/Production builds it uses the correctly scoped credential against the configured Supabase target and performs zero-row PostgREST schema probes for current runtime authorities. Public content-schema probing uses the publishable/anon role because that surface is intentionally public; private/admin authorities use the server credential. Probes include:

- template demo product columns, including `template_demo_image_url`;
- template demo content provenance columns;
- customer billing profile authority;
- B2B identity re-verification authority;
- digital assets;
- order documents;
- product documents;
- B2B RFQ authority.

A missing table/column or inaccessible runtime schema fails the build with:

`DATABASE_SCHEMA_COMPATIBILITY_FAILED`

Transient 5xx/network failures receive bounded retry; schema/client failures remain fail-closed.

This check runs before `next build` because `npm run build` already invokes `scripts/validate-vercel-deploy-env.mjs`.

## Canonical release rule

For any runtime that depends on forward SQL:

1. prove migration on non-production;
2. apply the approved production migration set in dependency order;
3. verify production schema compatibility;
4. only then allow the production runtime build/deploy;
5. after deploy, request real public production routes anonymously and inspect runtime errors;
6. verify critical business-data invariants;
7. only then declare production healthy.

Production code and its required production schema are **one release unit**.

## Advisors

Supabase advisors were reviewed after recovery. They contain existing informational/warning items (including service-role/internal RLS-without-policy patterns, unused indexes, two multiple-permissive return policies and duplicate catalog indexes). This incident record does not reclassify those broad pre-existing findings as caused by the migration recovery, and it does not claim a zero-advisory state.
