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
