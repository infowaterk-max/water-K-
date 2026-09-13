# Storefront Runtime Scale-out Wave 49 — Derma Studio Re-acceptance & Builder Hardening

## Canonical scope reconstruction

Wave 49 is not an invented template slot.

Repository history establishes the sequence:

1. historical Wave 29 / PR #152 — Statement Lab;
2. controlled Storefront-through-Wave-29 release checkpoint;
3. historical Wave 30 / PR #175 — Derma Studio re-acceptance and Builder hardening.

The current cycle repeated the Wave 29 position as Wave 48, then completed the controlled Wave 48 release checkpoint through PR #237. That checkpoint established production `main` at `85c08ab5b7d48d6519481158bf69d15d7911c5c7`.

After the checkpoint, the independent platform-only Device Lab PR #242 legitimately advanced `main` to `035d2063d5c410a053244907e1cfc9e3c7d7dfb1`. Wave 49 is therefore anchored to this newer exact production baseline; the Device Lab change does not alter the canonical storefront sequence.

Therefore the canonical next storefront slot remains **Wave 49 — Derma Studio Re-acceptance & Builder Hardening**.

This does not create a second `beauty.derma-studio` template. The canonical v1 originated in historical Wave 12 and was already hardened on an earlier production baseline by Wave 30 / PR #175. Wave 49 re-runs that acceptance contract on the current post-checkpoint production baseline and permits only evidence-driven current-contract corrections.

## Branch and exact baseline

- branch: `feature/storefront-derma-studio-wave49`;
- exact production base after reconciliation: `035d2063d5c410a053244907e1cfc9e3c7d7dfb1`;
- storefront predecessor release: PR #237 — `Release Checkpoint – Storefront through Wave 48`;
- intervening unrelated production change: PR #242 — Platform Device Lab;
- historical counterpart: Wave 30 / PR #175;
- original canonical template implementation: Wave 12;
- template key: `beauty.derma-studio`;
- template version: `1`.

The reconciled Wave 49 branch is a single Wave49 commit directly on the exact current `main`; the old stacked chain is not rewritten.

## Acceptance objective

Re-verify the inherited Derma Studio v1 package against the current Storefront Runtime / Builder contract while preserving its accepted identity:

`concern → routine → active ingredient → product`

The wave must remain structurally distinct from:

- Beauty Lab: `formula → ingredient → texture → guided choice → product`;
- Ritual House: `mood → ritual → format → scent or ingredient → product`.

Visual identity remains clinically clean without becoming a clinic or diagnostic interface:

- warm-white background;
- soft mineral-grey surfaces;
- graphite text;
- muted blue-green primary/accent family;
- soft clay secondary accent;
- clean editorial sans + precise interface sans;
- product macro / ingredient / glass / texture / routine imagery;
- precise, airy, educational spacing.

Merchant accent and fonts remain tokenized and Builder-controlled.

## Shared engine and authority contract

Required shared engines remain:

- E1 Runtime / Page Schema;
- E2 Product Discovery authority;
- E3 Guided Finder v1;
- E7 structured product / ingredient / routine-step facts;
- E13 Checkout.

E3 remains deterministic, explainable merchandising/navigation guidance. It must not become diagnosis, medical triage, treatment advice, disease inference, health-record authority or product-eligibility authority outside E2.

E7 may expose only supplied structured facts. The template must not invent ingredient concentrations, efficacy evidence, clinical proof or other missing product truth.

Price, stock, variants, reviews, product truth and checkout stay under their shared authoritative bindings/engines.

## Builder contract

The accepted Clinical Clarity Hero remains composed from shared primitives:

- `visual.layered-canvas`;
- `visual.layer`;
- shared Guided Finder registry composition.

The eight independently editable layers remain:

1. image;
2. overlay;
3. decoration;
4. badge;
5. title;
6. copy;
7. primary CTA;
8. secondary CTA.

Business copy, prices, clinical evidence and CTA text must never be baked into image assets.

The hierarchy remains:

`Template → Page Presets → Section Presets → Components`

Responsive support remains Desktop / Tablet / Mobile.

Wave 49 must not widen the shared runtime allowlist, component registry or binding namespaces merely to make Derma Studio pass.

## Preset and commerce contract

Exact accepted Home order remains:

1. Clinical Clarity Hero
2. Shop by Concern
3. Routine Finder
4. Active Ingredient Index
5. Routine Steps
6. Targeted Formulas
7. Ingredient Education
8. Reviews
9. Footer

The template must retain all 14 Alap-compatible Page Schema presets and draft-only installation semantics.

PDP remains 7/12 gallery + 5/12 buybox on desktop/tablet and 12/12 + 12/12 on mobile.

Checkout remains shared provider-neutral E13. No K&H/vPOS credential, merchant identifier, payment secret or provider-specific authority is permitted in this wave.

## Current-baseline gate

Wave 49 adds an executable current Vitest acceptance gate (`.test.ts`, not a legacy `.test.tsx`-only proof) covering:

- canonical post-checkpoint sequence;
- Beauty-family distinctness;
- non-medical visual/claim boundary;
- shared visual-layer composition;
- E3/E7 authority boundary;
- current shared binding namespaces;
- exact Home order and PDP grid;
- unique node identity across every preset;
- 14-page Alap capability validation;
- draft-only install mutation boundary;
- claim-neutral demo fixtures;
- provider-neutral checkout;
- no Visual Builder, SQL, payment or deployment scope creep.

The initial Wave 49 implementation intentionally does not modify `src/lib/builder/templates/derma-studio.ts`. If CI exposes genuine current-contract drift, only the smallest evidence-backed canonical-template hardening is permitted.

## Explicit non-scope

Wave 49 does not authorize:

- a duplicate Derma Studio template;
- medical/diagnostic/treatment authority;
- a Derma-specific routine or product engine;
- a Derma-specific pricing, stock, variant or checkout engine;
- Visual Builder drag/drop, live canvas or inline editing;
- SQL/customer-baseline migration;
- Supabase staging/production mutation;
- K&H/vPOS/payment behavior change;
- Water-K status or plan change;
- `main` merge;
- production deployment/promotion;
- Wave 50 implementation.

## Closure rule

Wave 49 closes only when:

1. the exact final Wave 49 HEAD passes full GitHub CI;
2. Security, customer-baseline guard, Quality, TypeScript, production build and release-manifest gates are green;
3. final Quality and Release Manifest artifact evidence is recorded;
4. the exact final Vercel preview is READY and tied to the same Git SHA;
5. the final diff is verified against exact production base `035d2063d5c410a053244907e1cfc9e3c7d7dfb1`;
6. Draft PR #243 targets `main`, remains unmerged and clean/mergeable;
7. production remains unchanged during the wave.

Fresh Install proof is expected to remain skipped because Wave 49 introduces no customer-baseline migration. If any baseline migration appears, that assumption is invalid and the normal Fresh Install release contract applies.
