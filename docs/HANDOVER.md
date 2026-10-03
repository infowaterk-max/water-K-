# Shoperation — Codex Handover

> Purpose: durable orientation for a new Codex/engineering chat. This document is **not runtime truth** and is **not evidence by itself**. Always verify the current branch, exact HEAD, canonical authorities, tests, CI, deployment state and external environments before changing code or claiming completion.

## 1. Verification boundary and snapshot

This handover was prepared from the repository and prior Product Owner decisions on **2026-10-03**.

Verified repository snapshot immediately before the handover commit:

- Repository: `infowaterk-max/water-K-`
- Active PR: **#701 — Template Production: Brabus capability revalidation foundation**
- Branch: `feature/template-production-brabus-revalidation`
- Base: `main`
- Verified source HEAD before this documentation change: `a04d797f49bd8695d101d64ac7694773a984b184`
- Base SHA observed: `0cb93c0e30b6a2a1964395ea5fd85525829cd8a3`
- PR state: open, DRAFT, mergeable
- Distance at that snapshot: **158 ahead / 0 behind**
- GitHub Actions on that HEAD: **CI = success**, **Template Factory Quality Gate v2 = success**
- Vercel commit status on that HEAD: **success**

Important: the documentation commits that add/update this handover move the branch HEAD. Re-read PR metadata and exact HEAD before work.

## 2. Product purpose

Shoperation means **Shop + Operation**. The repository describes it as a reusable webshop and commerce-operations platform.

Current package strategy in the repository:

- **Shoperation Alap**: complete competitive webshop foundation. Normal commerce capabilities should not be artificially hidden behind Pro.
- **Shoperation Pro**: business system above Alap, including advanced CRM, analytics, automation, procurement/cash-flow decision support, management analytics, advanced integrations and the built-in Digital Office.
- Usage-based or customer-specific capabilities should be modular add-ons, not new package tiers.

Brand/instance rule:

- Shoperation is the platform/operator product.
- Every customer webshop is a separately configured instance with its own identity, branding and contact data.
- Customer identity must not leak into platform defaults or another customer instance.

Broader strategic context from Product Owner discussions: Shoperation is one product under the future **VISION** umbrella; VX is intended as a separate general site/visual-builder product. This is strategic context, not a reason to restructure this repository without an explicit task.

## 3. Verified technology stack

From `package.json` on the active branch:

- Next.js `15.5.24`
- React / React DOM `19.1.0`
- TypeScript `5.8.2`
- Supabase JS `2.57.4`
- `@supabase/ssr` `0.6.1`
- Vitest `3.2.4`
- Zod `3.24.2`

Canonical package checks include customer-baseline guard, market-ready gate, tests, typecheck and build.

From `vercel.json`:

- framework: Next.js
- region: `fra1`
- scheduled integration cron: `/api/cron/integrations` at `15 3 * * *`

There is no `supabase/config.toml` at the checked branch path. Supabase behavior is primarily represented by migrations and application code. Do not infer live project settings, secrets, deployed migration state or production data from repository files alone.

## 4. GitHub / Vercel / Supabase operating model

### GitHub

Development is branch/PR based. Serious changes must follow the repository Control Plane and the rules in `AGENTS.md`. Do not bypass the active-plan lifecycle or create a parallel quality system.

### Vercel

The repository is connected to Vercel and branch commits can receive preview/deployment status. A green Vercel status means deployment/build readiness only. It is **not** Product Owner acceptance, production authorization, runtime business proof or permission to merge.

### Supabase

The repository contains a large migration history and customer-baseline migrations. Verified examples show:

- tenant-aware data separation using `instance_id`;
- strict RLS and tenant-aware RBAC helpers;
- audit-chain hardening;
- authenticated customer self-read policies where explicitly allowed;
- B2B/reseller relationships through `customer_instance_roles`;
- application code resolving current webshop instance before commerce operations.

Never weaken tenant, RLS, auth, schema or audit contracts merely to make a test pass.

## 5. Canonical engineering process

`AGENTS.md` is the primary durable agent protocol. Read it before implementation.

The operational sequence is:

`OBSERVE → DEFINE → MODEL → PLAN → CHALLENGE → IMPROVE → PROVE_PLAN → EXECUTE → VERIFY → TRUTH_GATE → CLOSE → LEARN`

Key rules already encoded in the repository:

- Plan Before Code is mandatory before the first implementation edit.
- Use the existing Development Guard and `quality/development/active-plan.json`.
- Extend canonical authorities; do not create parallel engines/controllers/routes for local symptoms.
- Shared root-cause repair beats template-local compensation.
- Edit-Time Guard is the A/B Reference Sync boundary.
- Run knowledge preflight and Incremental Replay after coherent edit batches.
- Known Failures and negative knowledge are active engineering constraints.
- Completion requires exact-head evidence; claim without evidence is not verified.
- Resumable verification may reuse only evidence classified as `REUSABLE`; uncertainty fails closed.
- Final CI/Quality Gate do not replace browser/journey/runtime/schema/PO proof where those are required.

## 6. Control Plane / high-assurance architecture

The existing system must be strengthened in place, not duplicated. The established ecosystem includes:

- Control Plane
- Assurance Ceiling
- Semantic Execution Intelligence / execution-route modeling
- Authority Graph
- PO Instruction authority / Instruction Ledger
- Known Failures / negative knowledge / Failure Intake
- Change Plan / Implementation Sync
- Edit-Time Guard / Reference Sync
- Incremental Replay / resumable verification
- Release Risk
- Claim Scope / evidence semantics
- Completion Truth / Truth Gate
- Sentinel integrity-divergence correlation

A foundational rule from prior stress testing is: **knowledge or confidence is not proof; the system must prove the capability.** A capability is not “done” merely because code, docs or many gates exist.

A durable PO instruction is already machine-readable in `quality/knowledge/po-instructions.v1.json`: shipping and payment must remain separate routes (`/szallitas` and `/fizetes`).

## 7. Storefront / Builder / Template architecture

Canonical direction:

- one shared storefront runtime;
- canonical Page Schema;
- shared component registry and renderer registry;
- component-key + version driven rendering;
- Template → Page Preset → Section Preset → Component hierarchy;
- Desktop / Tablet / Mobile responsive authority;
- Visual Builder edits Page Schema instead of creating template-specific runtime forks;
- template switching may materialize Page Schema drafts but must not mutate unrelated domain authorities.

Historical and current repository evidence repeatedly uses a **canonical 14-page package** for template production.

The Product Owner requires **Visual First → Product Owner Approval → Implementation → Fidelity Proof**. Coding before visual approval is forbidden for template work.

Long-term builder direction is “guarded freedom”, not unrestricted Wix-style freeform editing: grid/snap, controlled drag/drop, design tokens, constrained components/styles and responsive inheritance.

The accepted VX Builder visual direction is the Shoperation admin language: light/ivory work surface, graphite shell/text and warm gold accents; no extra permanent admin sidebar inside the builder layout.

## 8. Current Template Production / Brabus program

PR #701 explicitly exists to revalidate and harden the **existing** shared engines, VX Builder and Template Factory against the Maybach/Brabus target. It is not a Template #3 implementation PR and must not create a second gate.

`docs/TEMPLATE_PRODUCTION_BRABUS_READINESS.md` defines maturity semantics:

- **PROVEN** — canonical executable implementation plus executable proof exists.
- **EVOLVE** — useful capability exists, but Brabus target/current-stack proof is incomplete.
- **RETHINK** — current approach is structurally unsuitable.
- **NOT_IMPLEMENTED** — no canonical executable implementation exists.

Documentation alone can never promote a capability to PROVEN.

Program order currently documented:

1. Engine E1–E11/E13 adversarial capability revalidation.
2. VX Builder intelligence hardening.
3. Template Genome + Template Type System / Constraint Planner.
4. Media Planner / Compiler + lineage.
5. Distinctness / anti-clone proof.
6. Dynamic production compiler hardening.
7. End-to-end adversarial template-production rehearsal.
8. Only then: Template #3 implementation.

### Current branch implementation surface

PR #701 currently contains executable code/tests for, among other things:

- production maturity model;
- Template Genome;
- Template Type System;
- Constraint Planner;
- Media Planner;
- production compiler contracts and compiler;
- deterministic production lineage;
- template distinctness / anti-clone checks;
- storefront visual-diff intelligence;
- responsive-layout-depth hardening;
- storefront page fingerprints;
- Publish Readiness Core;
- generator-readiness hardening;
- Template Factory gate integration.

Do **not** translate file existence or green CI into end-to-end production readiness. Promotion remains governed by the canonical maturity/evidence path.

## 9. Latest verified closed wave inside PR #701

At the checked snapshot, `quality/development/active-plan.json` is closed for:

`DEV-VX-PUBLISH-READINESS-CORE-BRABUS-HARDENING`

The task hardens a canonical, read-only, evidence-backed **VX Publish Readiness Core** with fail-closed `PASS / BLOCK / UNKNOWN` semantics over existing authorities.

Important release split recorded by the plan:

- the Core itself is in scope;
- active `StorefrontVisualBuilderV3` presentation/adoption is explicitly deferred to a later release-budgeted wave;
- no publish action authority is changed;
- no Page Schema mutation/auto-fix is allowed;
- Smart Intent and Smart Auto-Fix are out of scope;
- Template #3 implementation is out of scope.

Therefore the next agent must not assume “Publish Readiness is fully integrated into the active Builder UI” merely because the Core tests pass.

## 10. Product Owner decisions that must survive chat changes

These are durable decisions from prior PO discussions. Where a decision is not already represented by machine-readable repository authority, verify the current code before acting and consider promoting it into the existing PO-instruction/authority system rather than relying on this prose forever.

### Template production

- Target library: 42 designed templates plus a minimal **Blank** template.
- Template UI/content language is Hungarian unless explicitly changed.
- Every template must be genuinely distinct; no cross-template image/identity leakage.
- Main template versions are not to become uncontrolled AI-edited blobs.
- Every template must remain Visual Builder compatible.
- Visual-first approval precedes coding.
- Product/hero/article media must be unique per product/content; edition variants may share concept with controlled variation, but unrelated products must not reuse the same composition.
- Desktop/tablet/mobile fidelity is part of acceptance; mobile-only acceptance never proves the other viewports.

### Loot Vault / Playroom historical acceptance context

Mobile audit was the only available viewport during part of the acceptance process. Playroom and Loot Vault received primary mobile acceptance, but desktop/tablet verification was intentionally deferred. Treat this as historical context; re-check current code/evidence before reopening old defects.

Historical Loot Vault PO findings included cart product-image fallback, inconsistent buttons/icons, edition-selection behavior, mobile filtering duplication, account/collections behavior, FAQ accordion requirements, legal-page separation and visual-media quality. These findings may already be fixed; they are **not automatically open bugs**.

### Shipping / payment

Shipping and payment are separate pages. Do not recombine them into one “Szállítás és fizetés” page.

### B2B direction

Repository code already contains B2B/reseller foundations. Additional durable PO requirements discussed for the mature B2B experience include:

- quote request from PDP;
- account-side quote editing/sending/status;
- tax number required for company flow;
- company-data changes trigger re-approval;
- a dedicated “Ügyeim” area;
- “win probability” as a business KPI.

Treat these as requirements to reconcile with current implementation, not as proof they are already complete.

### Multi-location stock / fulfillment

Future commerce requirements discussed include orders exceeding stock at one location while stock may exist in other warehouses or physical shops. The final behavior must be explicitly modeled for allocation, split fulfillment, transfer/backorder and customer promise; do not invent a silent allocation policy.

### K&H vPOS historical design authority

Prior implementation decisions require server-authoritative handling for K&H eAPI v1.0, RSA/SHA-256 signing, the `/init`, `/process`, `/status`, `/echo` flow, 10-digit order numbers and mandatory server-side STATUS verification with fail-closed behavior. Before modifying payments, locate and verify the current implementation and provider documentation; never place secrets in this handover.

## 11. Known current gaps / non-proven areas

The following are not safe to call complete merely from the checked repository snapshot:

- full Brabus end-to-end template-production rehearsal;
- final `template3AuthoringReady: true` authority;
- active Builder V3 adoption of the new Publish Readiness Core;
- Smart Intent;
- Smart Auto-Fix;
- any capability still reported as EVOLVE/RETHINK/NOT_IMPLEMENTED by current Generator Readiness / production maturity evidence;
- live Supabase project configuration/deployed migration state;
- production runtime truth not represented by exact-head evidence;
- Product Owner acceptance for visual/template work not backed by current acceptance evidence.

## 12. What must be verified in code before the next change

Before proposing the next implementation step:

1. Re-read `AGENTS.md`.
2. Fetch the exact current PR #701 HEAD and compare it with `main`.
3. Read `quality/development/active-plan.json` and determine whether a new plan is required.
4. Run/read the current Generator Readiness / production-maturity evidence and identify the earliest remaining non-PROVEN capability.
5. Confirm which Builder route/component is actually active; do not assume legacy or V3 consumption from filenames.
6. Confirm current CI/Template Factory gate status at exact HEAD.
7. If the task touches Supabase, verify migrations/schema/RLS and live environment separately.
8. If the task touches deployment, distinguish preview, staging, production and PO authorization.
9. If the task touches a historical PO decision, check `quality/knowledge/po-instructions.v1.json` and other canonical authority first.
10. Do not restart already-proven stress tests blindly; use Incremental Replay/resumable verification semantics.

## 13. Recommended first Codex task

Use this as the bootstrap instruction in a new Codex chat:

> Read `AGENTS.md` and `docs/HANDOVER.md`. Compare this handover with the repository’s exact current HEAD, `quality/development/active-plan.json`, canonical PO instructions, Generator Readiness / production-maturity evidence and current CI. Report contradictions or stale statements first. Then identify the earliest remaining non-PROVEN requirement in the existing Brabus program and propose the next development step through the existing Control Plane. Do not create a parallel gate or start Template #3 implementation unless the canonical authority explicitly permits it.

## 14. Secret-handling rule

This document intentionally contains no API keys, passwords, private keys, Supabase service-role secrets, K&H signing secrets, Vercel tokens or other credentials. Never add them.
