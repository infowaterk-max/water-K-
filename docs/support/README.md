# Shoperation Support Knowledge

Status: **living, versioned knowledge base — production-verified through 2026-09-23**

This directory is the long-term knowledge source for Shoperation Support, Support Intelligence, Template Factory diagnostics and future OpenAI-assisted support.

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
- `HUMAN_REQUIRED` — sensitive/high-impact/ambiguous change, auth/payment/refund/destructive/cross-tenant concern, visual acceptance/golden promotion, or no deterministic verification.
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
- Never weaken RLS, service-role grants, auth, Preview Protection, immutable audit/revision contracts, payment safety guards or Template Factory fail-closed checks just to make acceptance pass.
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

If yes, update Support Knowledge in the same development cycle. Production verification may strengthen an earlier acceptance/code record, but historical evidence must not be silently rewritten as if it had always been production-proven.

## Current knowledge index

### Historical engineering / platform incidents

- `DIGITAL_OFFICE_RESPONSIVE_INCIDENT_2026-09-10.md` — Digital Office / Team Chat responsive failure history, rejected global fixes, nested-height root cause and CSS-owner repair.
- `RECENT_ENGINEERING_INCIDENTS_2026-09-10_11.md` — Product Intake route/selector drift, preview heuristics, Digital Office, Fresh Install gaps, Storefront contract drift and support authority reuse.
- `RECENT_ENGINEERING_BACKFILL_2026-09-12_18.md` — Builder/mobile failures, stale targets, Playroom upgrade paths, Special Commerce, Product Documents and shared Runtime/composition lessons.

### Playroom / Template Factory acceptance and production

- `PLAYROOM_V20_PHASE4_BUILDER_ACCEPTANCE_INCIDENTS_2026-09-18.md` — Phase 4 human Builder acceptance and geometry/viewport lessons.
- `TEMPLATE_FACTORY_QUALITY_GATE_V2_FOUNDATION_CLOSURE_2026-09-21.md` — Quality Gate v2 foundation and exact-head evidence rules.
- `TEMPLATE_FACTORY_CANONICAL_HARDENING_2026-09-22.md` — current-only canonical package, responsive isolation v2, targeted Page Schema mutation and production workflow.
- `PLAYROOM_V20_HOME_RESPONSIVE_AND_NEWSLETTER_2026-09-22.md` — Home responsive polish, Newsletter readiness, shared product projection and Playroom composition rules.
- `PLAYROOM_V20_TEMPLATE_CLOSURE_2026-09-22.md` — historical pre-production Playroom v20 closure evidence.
- `PLAYROOM_V20_POST_RELEASE_UI_POLISH_2026-09-23.md` — final catalog/contact/cart/account/product polish and topic-first support wizard.
- `PLAYROOM_V20_PRODUCTION_RELEASE_AND_GOLDEN_RECOVERY_2026-09-23.md` — production release, release-base gate lesson, six accepted golden diffs, controlled baseline recovery and final green main proof.
- `PRODUCTION_RUNTIME_SCHEMA_PARITY_INCIDENT_2026-09-23.md` — production outage caused by runtime/schema drift, exact Supabase recovery, unchanged business-data snapshot and the new real-database deploy preflight.
- `PRODUCTION_RELEASE_RISK_BUDGET_2026-09-23.md` — production release-size governance, 5-point risk budget, High-risk isolation and stabilization checkpoint.
- `TEMPLATE_FACTORY_SCAFFOLD_V1_2026-09-23.md` — shared Template Factory compiler, category foundation + template recipe + media manifest and Product Owner readiness boundary.
- `../TEMPLATE_FACTORY_SCAFFOLD_HARDENING_V1.md` — automatic foundation brand neutralization, per-role media production plan, recipe registry and Factory workflow path coverage.
- `TEMPLATE_FACTORY_PROCEDURAL_MEMORY_2026-09-23.md` — executable Known Failure Registry, Authority Graph, preflight, failure replay, provenance, maturity and Product Owner handoff proof model.

### Shared storefront system surfaces / routes

- `TEMPLATE_ROUTE_INTEGRITY_DEMO_CONTENT_2026-09-21.md` — route integrity, deep-link consumers and draft-safe demo fixtures.
- `STOREFRONT_ACCEPTANCE_COMMERCE_FIXTURE_RULE_2026-09-21.md` — acceptance commerce fixture authority.
- `STOREFRONT_SYSTEM_SURFACE_TEMPLATE_INHERITANCE_RULE_2026-09-21.md` — shared system surfaces inherit active template presentation.
- `STOREFRONT_ROUTE_AND_AUTHENTICATED_ACCOUNT_INHERITANCE_2026-09-21.md` — public routes and authenticated account shell inheritance.
- `STOREFRONT_COOKIE_CONSENT_TEMPLATE_COMPOSITION_RULE_2026-09-21.md` — shared consent behavior with template-aware composition.
- `STOREFRONT_SOCIAL_LINKS_TENANT_AUTHORITY_2026-09-21.md` — tenant social-link authority.
- `STOREFRONT_CONTACT_RUNTIME_CONTINUITY_2026-09-22.md` — contact Page Schema continuity, support-form authority, validation and topic-first follow-up.
- `STOREFRONT_HOME_PREVIEW_RUNTIME_CONTINUITY_2026-09-22.md` — Home Preview Runtime continuity.
- `STOREFRONT_HEADER_UTILITY_AND_CART_CROSS_SELL_PRESENTATION_2026-09-22.md` — header utility and cart cross-sell presentation hardening.
- `STOREFRONT_TEMPLATE_DEMO_CATALOG_LIFECYCLE_2026-09-22.md` — Template Demo Catalog lifecycle and provenance.

### Authentication / account / commerce authority

- `STOREFRONT_AUTH_SURFACE_SHARED_TEMPLATE_AWARE_2026-09-21.md` — shared auth surface, template-aware presentation.
- `STOREFRONT_AUTH_TEMPLATE_COMPOSITION_RULE_2026-09-21.md` — auth template composition boundary.
- `STOREFRONT_AUTH_INTENT_AND_CHECKOUT_ACCOUNT_OPPORTUNITY_2026-09-21.md` — auth intent preservation, optional checkout auth and guest-order claim.
- `SHARED_CUSTOMER_BILLING_AND_B2B_IDENTITY_AUTHORITY_2026-09-22.md` — billing defaults, B2B verified identity, cart/checkout/account continuity and post-purchase rules.

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
19. **Accepted templates require committed golden baselines and explicit human visual acceptance.** Normal promotion uses clean exact-head 14×3 evidence. An explicit accepted-golden-drift recovery may promote only golden-only failures from a complete exact-source matrix; all non-golden failures remain blocking, and only drifted cases are updated.
20. **The production release gate is base-aware.** A green feature-parent run is not a substitute for a completed PR/release comparison against current main.
21. **Do not merge while the base-aware production PR gate is still running.** Mergeability plus earlier feature PASS is insufficient release evidence.
22. **Vercel READY is deployment evidence, not quality-gate evidence.** A READY production deployment does not override failed CI, Template Factory or golden comparison.
23. **Page Schema roots must paint the active template canvas.** Transparent section gaps must not expose the application/body fallback background.
24. **Shared support intake is intent-first.** Topic selection precedes irrelevant identity/order fields; desktop and mobile may use different interaction patterns while preserving one semantic flow.
25. **Validation must not punish untouched fields.** Initial render stays quiet; errors appear after an attempted step/submit and clear as the input is corrected.
26. **When a release exposes a new failure class, convert it into Knowledge and a prevention contract before continuing the template production line.**
27. **Production runtime code and production database schema are one release unit.** A Vercel production build must probe the real target database for runtime-required tables/columns and fail before deployment when schema compatibility is missing.
28. **Fresh Install proof and production schema parity are different gates.** Fresh Install validates a new-customer baseline; it does not prove that the existing production database has received every forward migration required by the deployed runtime.
29. **Production smoke means an anonymous real route, not only READY.** After deployment, exercise the public root/critical routes against production and inspect runtime errors before declaring the release healthy.
30. **Published Page Schema does not make a pilot storefront public.** Production Page Schema resolution must pass the canonical storefront lifecycle/access gate; Preview may resolve draft state through its separate acceptance authority.

31. **Production release size is a gate, not a preference.** Maximum risk budget is 5 points and maximum substantive subsystem count is 3.
32. **One High-risk subsystem consumes the whole production release budget.** Database/schema, auth/access, shared launch/runtime, environment/secret, payment/checkout/order and inventory/fulfillment changes must not be mixed with another substantive subsystem in the same release.
33. **Large development branches are allowed; large production batches are not.** Split production by authority boundary and prove each High-risk exact production HEAD stable before the next slice.
34. **A release-risk block is resolved by splitting the release, not by weakening classification.** Unknown substantive production code defaults to Medium risk.
35. **Template Factory technical validity and Product Owner readiness are separate gates.** New templates compile from an accepted category foundation plus a template recipe and media manifest; reference-critical pages, representative media, foundation-leak checks and internal screenshot review must pass before Product Owner preview.
36. **The Template Factory gate must watch Template Factory sources themselves.** Changes under `src/lib/builder/template-factory/**`, Factory recipes/registries and `tests/**template-factory**` must trigger the exact-head Template Factory quality workflow; path filters may never exclude the authority they are intended to validate.
37. **Foundation reuse must end at the authority boundary.** Factory-compiled templates may inherit proven page bodies, but the compiler must automatically neutralize Foundation brand/media and apply one target-template canonical shell. Reference-critical pages remain template-owned overrides, and the exact Factory output—not a parallel hand-built preview—is the artifact that advances through internal QA and Product Owner acceptance.
38. **Internal reference media must never become a shipping dependency.** Keep the final package-owned path in `src`, put temporary internal-QA imagery only in `referenceSrc`, and allow it to satisfy browser/composition proof only. Product Owner readiness requires every representative asset to be `ready` and physically present in the package.
39. **A repeated defect becomes executable procedural memory.** Record the failure class, root cause and authority invariant, then replay it against every registered Factory candidate. A second occurrence requires a shared-root-cause repair; a template-local patch alone is not closure.
40. **Internal QA and Product Owner preview must resolve the same compiled Factory identity.** Template key, template version, recipe identity and Factory-candidate state must survive preview navigation and auth boundaries; legacy-catalog fallback is release-blocking.
41. **Product Owner handoff is a separate post-deployment gate.** Green CI, browser matrix and Vercel READY are necessary but insufficient. The exact handed-off URL must prove template-aware auth, preserved return target, authenticated return and final provenance before it may be marked handoff-ready.
42. **Factory Product Owner preview authorization is tenant-independent.** Authentication and authorization remain fail-closed, but the preview route must never require an active webshop, current-store resolver or merchant subscription-plan gate. Platform-operator authority or an active owner/admin RBAC binding authorizes access; the compiled Factory candidate provides preview capabilities.


## Global Quality Knowledge / Procedural Memory v1

The Support Knowledge corpus is the historical evidence layer of a wider Shoperation quality system. The shared machine-readable layer lives under `quality/knowledge/` and is consumed by `src/lib/quality-system/**`.

Canonical execution rule: **global knowledge, scoped execution**.

The system may know every verified Shoperation failure without replaying every domain-specific guard for every change. The Knowledge Scope Resolver derives the active guard set from changed files, subsystem ownership and bounded cross-subsystem dependencies. Every selection records why a failure class ran or why it was skipped. A green result is invalid when the relevant guard was omitted.

Knowledge-infrastructure changes force a full Known Failure selection. A scheduled full-system replay provides a backstop against scope-resolver blind spots without turning every ordinary feature commit into a complete platform replay.

Unknown and review-required failure intake is written as machine-readable evidence and persisted as a deduplicated engineering intake until explicit disposition. Candidate intake never promotes itself into a Known Failure class.

Negative knowledge is first-class: disproven workarounds and unsafe repair paths remain recorded so a later engineer or agent cannot silently repeat them.


## Historical Support Knowledge backfill

The historical corpus is not treated as passive documentation.

Every Markdown document under `docs/support/` must be registered in `quality/knowledge/support-history-policy.v1.json`. Every explicit historical `SKB-*` or `INC-*` incident must resolve to one explicit disposition:

- `matched-known-failure`;
- `new-global-failure`;
- `subsystem-specific`;
- `duplicate`;
- or `rejected`.

There is no silent fallback for a new explicit incident. An unmatched record becomes `needs-review` and blocks Knowledge Before Build until it receives a deliberate disposition.

`scripts/shoperation-support-history-backfill.mjs --check` produces the machine-readable historical report at:

`artifacts/shoperation-quality/support-history-backfill.json`

Historical human-readable IDs are preserved for retrieval, but the canonical machine identity is `source-file + source-id + occurrence`. This is required because older Playroom records contain reused IDs. No incident is discarded because of that collision.

The backfill may promote a historical pattern into the global Known Failure registry only when the full learned chain exists: symptom → root cause → invariant → regression authority → applicability/replay.


## Development-Time Known Failure Guard

Known Failure knowledge is an implementation input, not only a final validation input.

Before the first implementation edit, the engineering agent must generate and read the scoped Development Guard. The manifest contains the applicable Known Failures, authority invariants, preventive directives, forbidden approaches, negative knowledge and regression authority.

A tracked `quality/development/active-plan.json` binds the task to the expected subsystem and Known Failure scope. CI recalculates the actual scope from the current development batch. If the diff activates another subsystem or additional Known Failures, Plan Before Code blocks until the plan is regenerated and reviewed.

The Edit-Time Known Failure Guard scans added code for strong signatures of already-rejected implementation approaches. Blocking signatures must be removed. Review signatures require an explicit, reasoned plan exception.

Incremental Replay executes the regression authority of the active Known Failure set after coherent edit batches. The final full Quality Gate remains mandatory.

Canonical rule: **Known failure prevention must happen before and during implementation, not only after implementation.**
