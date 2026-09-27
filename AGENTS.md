# Shoperation Engineering Agent Protocol

These instructions apply to every coding agent working in this repository.

## BEFORE THE FIRST IMPLEMENTATION EDIT

Do not start coding from memory alone.

1. Identify the task and the concrete files you expect to touch.
2. Record every explicit Product Owner/user instruction accepted for implementation in `quality/development/instruction-ledger.v1.json`. Each item must have acceptance criteria, machine-verifiable evidence checks and regression authority. Do not silently omit or defer a requested subtask.
3. Run:
   `node scripts/shoperation-development-guard.mjs --task "<task>" --files "<file1;file2;...>" --write-plan --check`
4. Read the complete `artifacts/shoperation-development-guard/development-guard.md`.
5. Review every active Known Failure, preventive directive, forbidden approach, negative-knowledge rule and required regression authority.
6. Set `quality/development/active-plan.json` to `status: "ready-for-implementation"` only after that review.
7. Run the central Control Plane through planning:
   `node scripts/shoperation-control-plane.mjs --profile pr --through GUARD-PLAN-BEFORE-CODE --check`
8. **Do not make the first implementation edit until the Control Plane reports PASS through Plan Before Code.**

If scope is unresolved, add or repair subsystem classification first. Do not continue with baseline-only protection for an unclassified product change.

## DURING IMPLEMENTATION

After every coherent edit batch, before continuing to a new area, run one central command:

- `node scripts/shoperation-control-plane.mjs --profile pr --through GUARD-INCREMENTAL-REPLAY --check`.

Do not manually orchestrate Knowledge, Plan, Edit-Time or Replay as independent sibling gates. They are specialist modules owned and ordered by the Control Plane.

If the diff expands into another subsystem, activates additional Known Failures, or changes the guard digest, stop. Regenerate and review the Development Guard and update the plan before continuing.

A `review` edit-time finding requires an explicit exception in `quality/development/active-plan.json` with the rule ID and a concrete reason. A `block` finding must be repaired and is not exceptable by plan metadata.

## AUTHORITY RULES

- Extend canonical authorities; do not create parallel engines, controllers or routes to fix local symptoms.
- Shared root cause beats template or module-local compensation.
- Do not weaken runtime, tenant, schema, auth or security contracts to make tests pass.
- Do not treat CI or deployment readiness as Product Owner or runtime proof.
- Do not wait for final CI to discover a Known Failure that could have been prevented during implementation.

## BEFORE HANDOFF

Before saying a Product Owner/user request is complete, run the Control Plane through Incremental Replay. A changed file, green generic test suite or visually plausible heading is not requirement-level proof. Every ledger item and every active predecessor authority must PASS in the same Control Plane transaction.

Final full CI and Quality Gate are still mandatory. Typecheck, build, database baseline, browser proof and Template Factory remain specialist executors, but their outcomes must be reconciled back into the final Control Plane report. Product Owner handoff requires that final report to be PASS.
