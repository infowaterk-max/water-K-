# Template Factory Quality Gate v2 — Foundation Closure Hardening — 2026-09-21

```yaml
id: SKB-TEMPLATE-FACTORY-QG-V2-CLOSURE-2026-09-21
status: implemented
evidence: code_and_test_verified
scope: global
area: template-factory/storefront/visual-builder
principle: "One defect -> one shared fix -> regression test -> build/CI gate"
diagnostic:
  - "Classify every visual defect first as local or shared-invariant."
  - "Prefer shared Runtime/renderer, shared primitive, canonical shell/archetype, then preset; page-local patch is last resort."
gaps_found:
  - "The Quality Gate's own v2 regression test existed but was not executed by the Quality Gate workflow."
  - "Shared Runtime changes used only a reduced canary matrix for other strict templates, allowing page-type-specific regressions to escape."
  - "Builder v3 and Storefront Preview source changes were not explicitly classified as shared Runtime geometry changes by the browser scope selector."
  - "Golden screenshots could be compared after promotion, but there was no deterministic exact-head promotion workflow."
resolution:
  - "Quality Gate CI now executes storefront-template-quality-gate-v2, preview-runtime and fidelity-engine authority regressions."
  - "Shared Runtime/Builder/Preview authority changes force the full canonical matrix for every strict manifest selected by the machine catalog."
  - "Added deterministic golden promotion script requiring clean complete 14x3 evidence."
  - "Added manual golden promotion workflow that downloads evidence from a named successful run, verifies evidence.sourceCommit equals checked-out source_ref, promotes exactly 42 canonical screenshots, and emits a baseline artifact for review/commit."
  - "Golden promotion infrastructure itself is inside Quality Gate path/scope authority."
accepted_lifecycle:
  - "candidate: structural/browser matrix is mandatory; golden.required may be false."
  - "accepted: golden.required must be true; missing baseline is a hard browser-gate failure."
  - "Promotion never silently changes candidate to accepted; human acceptance remains explicit."
cross_template_policy:
  - "Direct template source change: full matrix for that strict template."
  - "Quality infrastructure change: full matrix for every strict manifest."
  - "Shared Runtime, Builder geometry authority, or Preview authority change: full matrix for every strict manifest."
  - "Unrelated/default execution: canary matrix."
verification:
  - "Exact-head closure proof completed successfully on branch feature/playroom-v20-functional-acceptance."
  - "Verified source HEAD: 5d142f17193137e8a478db7d8e61f2ebcfe3cd11."
  - "GitHub Actions run 35590861943: Template Factory Quality Gate v2 — completed / success."
  - "The successful run used the same exact HEAD; therefore the Quality Gate v2 foundation closure condition is satisfied."
prevention:
  - "Do not downgrade shared Runtime changes to page-local fixes or canary-only acceptance."
  - "Do not accept a template without committed golden baselines and golden.required=true."
  - "Do not promote screenshots from evidence whose source commit differs from the checked-out acceptance source."
  - "Green Quality Gate is prevention evidence, not human visual acceptance; Playroom visual acceptance remains a separate gate."
automation: DIAGNOSE_ONLY
risk: low
```

## Closure note

**QUALITY GATE v2 FOUNDATION CLOSED.**

Closure authority is the successful exact-head Quality Gate v2 run `35590861943` on commit `5d142f17193137e8a478db7d8e61f2ebcfe3cd11`.

This closes the shared Quality Gate v2 foundation. It does **not** constitute Playroom human visual acceptance, does not authorize production deployment, and does not authorize merge to `main`.

Subsequent Playroom/template visual defects must first be classified as **local defect vs. shared invariant violation**. A shared invariant violation must be repaired at the highest appropriate shared authority and locked with regression coverage rather than patched page-by-page.
