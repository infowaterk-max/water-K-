# Control Plane Unit 2 — Release Decomposition + Manifest-driven Split / Transplant — 2026-10-06

Status: implementation knowledge for the canonical Control Plane ecosystem.

## Purpose

Unit 2 extends the existing chain rather than creating another quality system:

intent → Atlas / repository graph → gate obligations → implementation skeleton → projected Release Risk → release decomposition → release-unit manifests → materialization / transplant → exact proof → Completion Truth → Lifecycle.

The canonical Release Risk Budget remains unchanged. A blocked projected scope is decomposed only when Atlas and proof/authority relationships permit legal atomic release components. If one atomic component is itself illegal, if unit prerequisites cycle, or if protected scope would be transplanted, decomposition fails closed.

## Canonical release-unit semantics

Each release unit records transaction and parent-transaction identity, unit ID/order, target-base lease, create/modify/rename/delete operations, required dependency files, authorities, subsystems, projected risk, required gates/evidence, forbidden/read-only paths, generated-artifact semantics, predecessor units, expected post-unit state and successor reconciliation policy.

The first unit receives an exact target-base SHA. A successor is intentionally unmaterializable until the predecessor is merged and the successor is reconciled against the new main state. Reconciliation recomputes Atlas, projected risk, gate applicability and required dependencies; it does not copy stale predecessor facts.

## Batch materialization

`scripts/shoperation-release-unit-materializer.mjs` preflights the whole manifest before touching the target branch. It rejects stale leases, scope expansion, protected/read-only paths, unresolved rename/delete state and unsealed generated artifacts. Application is prepared in a detached temporary worktree and the target branch ref moves only after the complete batch has committed successfully. A preflight conflict therefore cannot leave the target branch partially applied.

Generated artifacts require either explicit regeneration command semantics or sealed source identity/hash semantics. Already-applied content is recognized idempotently.

## Evolution / learning retained from Unit 1

- A SHA alone is not sufficient proof identity; execution context remains part of evidence provenance.
- Proof transaction identity and deployed runtime identity are distinct.
- Proof-engine inputs and deployed runtime inputs are distinct and must not be recombined downstream.
- A downstream consumer must use an upstream canonical fact when it already exists rather than independently recomputing it.
- Plan Before Code consumes the exact-head Atlas + Change Impact snapshot produced by Knowledge Before Build when available; stale upstream evidence is a blocking orchestration defect.
- A classifier or scope resolver may not narrow itself in a way that hides runtime dependencies.
- Failure Intake → reconciliation → Known Failure / Negative Knowledge / graph learning remains the only promotion path for newly observed recurring defects; this unit does not create a parallel learning registry.
- Reference Sync must not infer a repository-wide required edit from lexical coincidence of a local executable implementation expression; only a real machine reference/semantic identity or source assertion may make that expression blocking.
