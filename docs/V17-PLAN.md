# Water-K V17 – Release & Change Governance

V17 starts from the CI-green V16 readiness head.

## Objective
Create a non-deploying release governance layer that turns V16 assurance evidence and CI/build evidence into explicit, auditable go/no-go release decisions.

## Workstreams
- versioned release policy registry
- immutable release candidates and change summaries
- assurance/CI/rollback-plan gate evaluation
- single/dual approval based on release risk
- freshness/staleness detection when evidence changes
- change-window / freeze-window governance
- append-only gate, approval and release-decision audit
- Admin → Kiadási központ
- no automatic deployment or production mutation

## Safety boundary
V17 can authorize or block a release candidate, but it cannot deploy, merge, change production data, alter commerce state, or mutate V13–V16 source records.
