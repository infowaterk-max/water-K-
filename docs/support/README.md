# Shoperation Support Knowledge

Status: **living, versioned knowledge base — current successor**

This directory is the long-term knowledge source for Shoperation Support, Support Intelligence, template-factory diagnostics and future OpenAI-assisted support.

Historical source: Draft PR #156 established the first governance contract. That branch is historical input only; current development must maintain knowledge on the active canonical development line.

## Purpose

Capture reusable operational knowledge as:

**symptom → context → diagnosis → root cause → attempted/failed paths → verified resolution → verification → prevention/safety rule**

Raw chat or acceptance discussion is not the knowledge base. Promote only reusable facts, and preserve negative evidence when it prevents a failed fix from being repeated.

## Record status

- `implemented` — verified in the current code path.
- `historical_verified` — verified previously; version-check before reuse.
- `design_decision` — approved rule, not necessarily implemented.
- `pending_validation` — useful finding/hypothesis; never auto-apply.
- `superseded` — replaced by stronger/newer evidence.
- `deprecated` — intentionally retired.

## Evidence

Prefer the strongest available evidence:

1. `production_verified`
2. `acceptance_verified`
3. `code_and_test_verified`
4. `documented_contract`
5. `design_decision`
6. `hypothesis`

A visually similar historical symptom is a diagnostic shortcut, not permission to replay a fix.

## Automation classes

- `AUTO_FIX` — deterministic, low-risk, reversible action with a known success condition.
- `CONFIRM_FIX` — deterministic diagnosis, but merchant intent is required.
- `HUMAN_REQUIRED` — sensitive/high-impact/ambiguous change, auth/payment/refund/destructive/cross-tenant concern, or no deterministic verification.
- `DIAGNOSE_ONLY` — inspect/explain only.

The language model does not gain arbitrary mutation authority from a knowledge match.

## AI retrieval policy

Future Support AI should retrieve in this order:

1. current ticket and current tenant context;
2. previous verified resolutions for the same webshop;
3. current component/version-compatible Shoperation knowledge;
4. anonymized cross-tenant verified patterns;
5. broader documentation/playbooks.

Before reusing a resolution, validate tenant scope, subsystem/provider, component/template/runtime version, current state, authorization and whether the old resolution has been superseded.

## Tenant and security boundary

- Never store secrets, passwords, card data or private credentials here.
- Tenant-specific business data remains tenant-scoped.
- Cross-tenant learning must be generalized/anonymized.
- Never weaken RLS, service-role grants, auth, Preview Protection, immutable audit/revision contracts or payment safety guards just to make an acceptance proof pass.
- Privileged/support mutations must remain typed, authorized and auditable.

## Resolution Record template

```yaml
id: SKB-XXX
status: implemented | historical_verified | design_decision | pending_validation | superseded | deprecated
evidence: production_verified | acceptance_verified | code_and_test_verified | documented_contract | design_decision | hypothesis
scope: global | tenant-specific
area: builder/storefront/checkout/payment/etc
versions: optional
symptom: "What was observed"
context: "Relevant environment/version/state"
diagnostic:
  - "Targeted check"
root_cause: "Verified cause, or unknown"
attempted_or_failed:
  - "Known ineffective path or negative evidence"
resolution:
  - "Successful change"
verification:
  - "How success was proven"
prevention:
  - "Do-not-repeat / factory rule"
automation: AUTO_FIX | CONFIRM_FIX | HUMAN_REQUIRED | DIAGNOSE_ONLY
risk: low | medium | high | critical
```

## Continuous update rule

Every substantial development, acceptance, release or production task should ask:

> Did this reveal anything that would help Support or the Template Factory diagnose, explain, resolve or prevent the same failure?

If yes, update Support Knowledge in the same development cycle.

## Current incident index

- `DIGITAL_OFFICE_RESPONSIVE_INCIDENT_2026-09-10.md` — preserved Digital Office / Team Chat responsive failure history, rejected global/ratio-based fixes, nested-height root cause and duplicate Desktop-site CSS-owner repair.
- `RECENT_ENGINEERING_INCIDENTS_2026-09-10_11.md` — migrated historical incident set covering Product Intake route/selector drift, device-preview heuristics, Digital Office performance/layout, Fresh Install dependency gaps, Storefront contract drift, preview 302 evidence, concurrent-main reconciliation and Support/Digital Office authority reuse.
- `RECENT_ENGINEERING_BACKFILL_2026-09-12_18.md` — backfill of support-relevant lessons between the original baseline and Phase 4: Builder authority/mobile failures, Email Builder stale target, Playroom template-version upgrade failures, stale Storefront-stack release integration, Special Commerce authority/idempotency/Fresh Install rules, AI Builder/Block 24 boundaries, Product Documents security/guest acceptance and Phase 3 shared runtime/composition lessons.
- `PLAYROOM_V20_PHASE4_BUILDER_ACCEPTANCE_INCIDENTS_2026-09-18.md` — Playroom v20 Phase 4 human acceptance: tenant-entry, Alap entitlement gate, Preview/staging proof constraints, Visual Builder wrapper fidelity, canonical viewport, zoom/fit, absolute media, grid stretch, dense header and CI/harness lessons.

- `TEMPLATE_ROUTE_INTEGRITY_DEMO_CONTENT_2026-09-21.md` — canonical Template Factory route-integrity + demo-content lifecycle: no dead links, real catalog deep-link consumers, dynamic content fixtures, draft-only CMS materialization, fixture/adopted/retired provenance and staging acceptance proof.
- `TEMPLATE_FACTORY_QUALITY_GATE_V2_FOUNDATION_CLOSURE_2026-09-21.md` — Quality Gate v2 closure hardening: exact-head golden promotion, full cross-template shared-Runtime policy, Builder/Preview geometry authority and CI self-regression coverage.
- `STOREFRONT_AUTH_INTENT_AND_CHECKOUT_ACCOUNT_OPPORTUNITY_2026-09-21.md` — shared customer-auth modal, safe return target authority, one account capability rail, optional checkout auth, capability-driven benefits and authenticated token-bound guest-order claiming.
- `SHARED_CUSTOMER_BILLING_AND_B2B_IDENTITY_AUTHORITY_2026-09-22.md` — platform-wide saved billing defaults, template-native cart/checkout continuity, shared add-to-cart acknowledgement, one account navigation authority and audited B2B legal-identity re-verification.

## Core engineering rules

1. **Runtime and Builder must preserve the same Page Schema authority.** A Builder selection wrapper must never silently change CSS Grid, absolute positioning, row stretch or responsive layout semantics.
2. **Canonical viewport width and visual zoom are separate concerns.** Do not make Desktop responsive rules render inside a physically narrowed pseudo-desktop canvas.
3. **A shared capability fix is preferred over template-local compensation** when the same wrapper/runtime problem can affect all templates.
4. **Do not widen shared authority because a legacy/template fixture fails.** First prove the shared contract is actually wrong.
5. **A protected Preview 302 is not application-health PASS.**
6. **A CI/test harness defect is not evidence that runtime safety should be weakened.**
7. **Product Owner/live human visual acceptance is independent evidence.** Green CI does not imply visual fidelity.
8. **Preserve failed attempts.** Repeating a disproven workaround is an avoidable support/engineering regression.
9. **One concern gets one canonical controller/authority.** Do not add parallel responsive controllers, Builder shells, renderers, commerce engines or document authorities to patch UX.
10. **Template source changes require explicit version/upgrade semantics** when persisted merchant Page Schema must change.
11. **Never release a stale stacked branch over newer main.** Reconcile the actual runtime delta into current main and rerun exact-head integration gates.
12. **Fresh Install SKIPPED is not PASS**, especially when customer-baseline/schema changes exist.
13. **Special Commerce cannot fabricate commerce truth.** Server catalog/pricing/inventory/checkout/order/payment authorities remain canonical; client clock/claims are presentation only.
14. **Private document/digital delivery needs negative authorization tests plus real-byte proof.** DB/storage metadata alone is insufficient.
15. **Digital assets, Product Documents and Order Documents remain separate backend authorities** even if one UI aggregates them.
16. **Shared launch capabilities belong in shared package/install/runtime contracts**, not manual edits repeated across every template.
17. **Every template link needs a real destination authority.** Known routes must exist, catalog query parameters must be consumed, and static dynamic-content links must have draft-safe demo fixtures; generated business/service content is never auto-published as truth.
18. **Shared Storefront/Builder authority changes require cross-template full-matrix proof.** Canary-only coverage is not sufficient when the shared Runtime renderer, Builder geometry authority, Preview authority or Quality Gate infrastructure changes.
19. **Accepted templates require committed golden baselines.** Promotion must come from clean exact-head 14x3 evidence; candidate-to-accepted remains an explicit human decision.

- [Storefront header utility + cart cross-sell presentation hardening (2026-09-22)](./STOREFRONT_HEADER_UTILITY_AND_CART_CROSS_SELL_PRESENTATION_2026-09-22.md)
