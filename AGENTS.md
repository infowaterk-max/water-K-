# Shoperation Engineering Agent Protocol

These instructions apply to every coding agent working in this repository.

## BEFORE THE FIRST IMPLEMENTATION EDIT

Do not start coding from memory alone.

1. Identify the task and the concrete files you expect to touch.
2. Run:
   `node scripts/shoperation-development-guard.mjs --task "<task>" --files "<file1;file2;...>" --write-plan --check`
3. Read the complete `artifacts/shoperation-development-guard/development-guard.md`.
4. Review every active Known Failure, preventive directive, forbidden approach, negative-knowledge rule and required regression authority.
5. Set `quality/development/active-plan.json` to `status: "ready-for-implementation"` only after that review.
6. Run:
   `node scripts/shoperation-plan-before-code.mjs --check`
7. **Do not make the first implementation edit until Plan Before Code is PASS.**

If scope is unresolved, add or repair subsystem classification first. Do not continue with baseline-only protection for an unclassified product change.

## DURING IMPLEMENTATION

After every coherent edit batch, before continuing to a new area:

- run `node scripts/shoperation-edit-time-guard.mjs --check`;
- run `node scripts/shoperation-knowledge-preflight.mjs`;
- run `node scripts/shoperation-incremental-replay.mjs --check`.

If the diff expands into another subsystem, activates additional Known Failures, or changes the guard digest, stop. Regenerate and review the Development Guard and update the plan before continuing.

A `review` edit-time finding requires an explicit exception in `quality/development/active-plan.json` with the rule ID and a concrete reason. A `block` finding must be repaired and is not exceptable by plan metadata.

## AUTHORITY RULES

- Extend canonical authorities; do not create parallel engines, controllers or routes to fix local symptoms.
- Shared root cause beats template or module-local compensation.
- Do not weaken runtime, tenant, schema, auth or security contracts to make tests pass.
- Do not treat CI or deployment readiness as Product Owner or runtime proof.
- Do not wait for final CI to discover a Known Failure that could have been prevented during implementation.

## BEFORE HANDOFF

Final full CI and Quality Gate are still mandatory. Development-time guards reduce repeated errors; they do not replace typecheck, build, browser or journey proof, production/schema checks or Product Owner acceptance.
