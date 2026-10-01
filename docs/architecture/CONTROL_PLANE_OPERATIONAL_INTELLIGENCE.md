# Shoperation Control Plane — Operational Intelligence

Status: implemented as an extension of the existing Control Plane and engineering quality authorities.

## Purpose

This layer does not create a second Control Plane, Atlas, Sentinel, Failure Intake, release authority or Template Factory. It coordinates the existing authorities so serious development is proved twice:

1. **before execution** — the plan is appropriate for the risk and has survived adversarial challenge;
2. **before completion** — every PO-derived completion claim has fresh exact-state evidence.

The canonical lifecycle is:

`OBSERVE → DEFINE → MODEL → PLAN → CHALLENGE → IMPROVE → PROVE_PLAN → EXECUTE → VERIFY → TRUTH_GATE → CLOSE → LEARN`

## Existing authority reuse

- **Atlas / Domain Foundations / Architecture Constitution** — ownership, dependency and truth boundaries.
- **Development Guard + Plan Before Code** — pre-execution scope and plan proof.
- **Known Failures + negative knowledge** — durable prevention knowledge.
- **A/B Reference Sync + Edit-Time Guard** — change synchronization during implementation.
- **Incremental Replay** — relevant regression replay.
- **Sentinel** — observation and trend intelligence only.
- **Release Risk** — release risk authority.
- **Template Factory** — template-specific acceptance authority.
- **existing CI/typecheck/build/browser/journey evidence** — proof producers.
- **Failure Intake** — durable failure and LEARN intake.

No new component may redefine the truth owned by these systems.

## Assurance ceiling

The Development Guard policy defines four risk depths.

### Low

Use explicit specification with minimal ceremony. No mandatory dissent.

### Medium

Add invariants, a state model, boundary/adversarial cases, alternatives and specialist dissent.

### High

Add what-if and pairwise interactions, threat/failure modeling and fault injection.

### Critical

Use the strongest practical deterministic proof for the domain, including finite-state exhaustion where appropriate. Formal verification or model checking is used only when the risk justifies its cost; it is not required by category alone.

The principle is **maximum practical assurance / acceptable development cost**.

## PROVE_PLAN

`scripts/shoperation-plan-before-code.mjs` remains the pre-execution blocking authority. It now also validates:

- assurance depth against risk tier;
- explicit acceptance criteria, invariants and forbidden states;
- canonical phase model;
- multiple implementation alternatives where required;
- adversarial challenge resolution;
- specialist review depth and dissent;
- proof plan;
- execution authorization;
- a PO-derived Completion Contract;
- non-circular references to existing evidence producers.

Execution is denied until this contract is valid.

## Specialist dissent

Specialists are selected by relevance. Supported roles include Architecture, Security, Data Integrity, Runtime, Release, UX / Template, Known Failure and Operations.

Medium, high and critical work requires explicit dissent. Dissent is not a vote or a new authority. Its role is to attempt to invalidate the proposed plan. Any unresolved dissent blocks PROVE_PLAN.

## Completion Contract

The Completion Contract is stored separately from implementation steps in the active development plan and is traced to the original PO request.

Each `REQ-*` has:

- the PO requirement;
- implementation evidence;
- outcome evidence;
- one or more `NEG-*` forbidden regressions;
- evidence for each negative claim.

The Truth Gate may not use its own verdict as evidence. This prevents circular completion proof.

## Completion Truth Gate

`scripts/shoperation-truth-gate.mjs` is read-only with respect to product, repository and release state. It only writes evidence artifacts.

Every evidence item must be bound to:

- exact source commit;
- branch;
- state/version;
- run ID or timestamp.

Evidence from another HEAD, branch or state/version is **STALE**.

The internal states are:

- `VERIFIED_DONE`
- `PARTIALLY_VERIFIED`
- `NOT_DONE`
- `BLOCKED`
- `STALE_EVIDENCE`

The Product Owner projection is deliberately simpler:

- `VERIFIED_DONE → DONE`
- `BLOCKED → BLOCKED`
- every other state → `NOT DONE`

Core invariant:

`CLAIM WITHOUT EVIDENCE = NOT VERIFIED`

The Truth Gate validates four dimensions separately:

1. requirement completeness;
2. implementation completeness;
3. outcome verification;
4. negative verification.

A green implementation plan or green CI fragment cannot substitute for a missing PO requirement or stale outcome proof.

## CI integration

The existing CI workflow supplies the Truth Gate with the outcomes of the already-canonical guards and checks. No parallel workflow is introduced.

The Truth Gate runs after the relevant CI evidence producers. Its artifact is fed into the existing Failure Intake when completion integrity fails.

Release authorization remains owned by Release Risk and existing release governance. The Truth Gate proves completion integrity; it does not deploy, merge, promote golden baselines or authorize production.

## LEARN

Failure Intake records whether a new/unclassified failure requires a missed-thinking review.

If a defect was reasonably foreseeable, the review must identify:

- the earliest phase that should have found it;
- why it was missed;
- the existing authority that should be strengthened.

The preferred remediation is an invariant, Known Failure, regression authority, scope rule, challenge rule or other existing canonical control. A new defect-local gate is not the default answer.

## Current development assurance decision

This Control Plane change is classified **critical** because it changes the engineering decision system itself.

Selected proof depth:

- explicit specification and invariants;
- state/failure model;
- what-if and pairwise interaction cases;
- adversarial scenarios and boundary cases;
- threat/failure modeling;
- fault injection;
- finite-state exhaustion for the deterministic completion evaluator.

Full formal verification is intentionally not required because the new evaluator is bounded, deterministic repository/CI orchestration and does not mutate concurrent business state. Exhaustive finite-state tests provide a better cost/assurance tradeoff here.

## Dependency-aware resumable verification

Resumable verification is an extension of the existing Incremental Replay and Truth Gate path. It is not a second Control Plane or CI authority.

The planner asks one question for every prior PASS:

> Does the current exact HEAD have the same relevant semantic inputs, gate implementation, dependencies, authority, configuration, toolchain, environment and proof context?

The answer is one of:

- **REUSABLE** — equivalence is proven;
- **INVALIDATED** — a known semantic input changed;
- **UNKNOWN** — equivalence cannot be proven.

`UNKNOWN -> RERUN` is mandatory. No prior PASS is inherited by status alone.

### Evidence identity

Each reusable gate proof is bound to a deterministic fingerprint over the gate's declared semantic inputs:

- gate metadata / implementation identity;
- semantic source input hash;
- direct and transitive verification dependency fingerprint;
- authority hash;
- configuration hash;
- toolchain hash;
- environment-relevant hash;
- gate-specific context.

Commit SHA remains part of the provenance model, but no longer acts as the only evidence identity.

### Verification dependency graph

The canonical graph is stored on the existing guard registry. `dependsOn` edges mean that invalidation of an upstream proof invalidates dependent proof evidence as well.

The model is intentionally explicit rather than a whole-repository static call graph. An unmapped changed file is therefore not optimistically ignored: it triggers the fail-closed full-verification path.

### Checkpoints

A checkpoint is data, not authority. It contains a finalized prior exact HEAD, branch identity, evidence fingerprints, original proof revisions and the Known Failure scope.

A checkpoint is reusable only when it is complete, checksum-valid, from the same branch, an ancestor of the current HEAD, and compatible with the current verification schema. Corrupt, interrupted, cross-branch and non-ancestor checkpoints are rejected.

### Change Impact Set and proof units

Before replay, Incremental Replay now derives a Change Impact Set. In addition to gate-level impact it models semantic proof units for canonical Page Schema / 12-column grid, shared storefront renderer/runtime, responsive inheritance and fidelity geometry, presets / Saved Blocks, Template Factory compiler and quality authority, template-local package changes, template-local design tokens / visual DNA, template-owned shared shell, and the 14 canonical page families.

A template-local diff may narrow to one page family only when the diff identifies exactly one supported page family and no template-wide token/shell marker. Ambiguous changes fail wider to the changed-template scope.

Examples:

- FAQ-only template change -> changed template / FAQ / Desktop+Tablet+Mobile;
- template design token or shared shell -> all 14 pages and all three viewports of that template;
- canonical Page Schema or shared renderer -> all relevant templates/pages/viewports;
- unknown/unmapped change -> FULL.

### Replay tiers

The planner emits Tier 0 Evidence Reuse, Tier 1 Local/Page Replay, Tier 2 Dependency Replay, Tier 3 Subsystem Replay and Tier 4 Full Verification. The tier is derived from gate invalidation and semantic proof-unit impact; it is not a manual optimism switch.

### Shadow mode and promotion

Version 1 is branch-scoped shadow mode. The planner calculates which evidence could be reused, but the existing full gates still run as control authority. The reconciliation step compares the predicted reuse set with the full result.

Any predicted REUSE whose full control gate fails is a `SHADOW_FALSE_REUSE` and blocks the replay engine.

Promotion to physical gate skipping is separate and requires at least three green shadow passes, at least two green RESUMED passes, zero false reuse, exact-head Truth Gate PASS, complete evidence manifests and no unresolved dependency mapping. Until promotion, full verification is still the runtime authority.

### Exact-head evidence manifest

The final evidence manifest belongs to the current exact HEAD even when a proof is eventually reused physically. For each proof it records current exact HEAD, current branch and state version, origin source revision, current fingerprint, previous fingerprint, equivalence reason, execution kind and checkpoint source revision.

Truth Gate accepts reused evidence only when the current-head manifest proves fingerprint equivalence. Otherwise it is stale.

### Observability and explainability

The resumable verification artifact exposes verification mode, replay tier and reason, reused / rerun / invalidated / unknown counts, cache hit and invalidation ratio, dependency resolution time, checkpoint source commit, semantic impact units and proof scopes, per-gate REUSE / RERUN explanation, shadow comparison result and final confidence.

The diagnostic question "why did this gate rerun?" and its inverse are both answerable from the same artifact.

### Residual risk

The v1 model deliberately does not claim perfect source-level dependency discovery. Its safety property is the opposite: anything outside the declared semantic map is UNKNOWN and fails closed to FULL.

Cross-branch reuse is intentionally disabled in v1. This avoids introducing identity and cache-poisoning complexity before branch-scoped behavior has accumulated stable shadow evidence.

### Promotion proof invalidation

A promotion proof is valid only for the exact verification-engine identity that produced it. Any change to replay planning, checkpoint reconciliation, Truth Gate semantics, CI orchestration, guard-registry verification metadata, or development-guard verification policy invalidates promotion credit and returns execution to shadow/full control until the configured proof threshold is rebuilt.

Promotion eligibility is recorded only after a successful reconciliation; physical skipping can therefore begin no earlier than the next exact-head verification revision.
