# Shoperation Engineering Agent Protocol

These instructions apply to every coding agent working in this repository.

## CONTEXT BOOTSTRAP

Before planning serious work, read `docs/HANDOVER.md` when it exists.

Treat the handover as orientation, not as evidence or authority over the current repository. Verify the exact branch/HEAD, current code, `quality/development/active-plan.json`, canonical PO instructions, generated evidence and CI before acting. If the handover conflicts with executable code or canonical machine-readable authority, the current verified authority wins and the stale handover statement must be called out.

Do not copy old chat assumptions into implementation merely because they appear in the handover. Promote durable Product Owner decisions into the existing authority/PO-instruction system when the task requires them to become machine-enforced.

## BEFORE THE FIRST IMPLEMENTATION EDIT

Do not start coding from memory alone.

1. Identify the task and the concrete files you expect to touch.
2. Run:
   `node scripts/shoperation-development-guard.mjs --task "<task>" --files "<file1;file2;...>" --write-plan --check`
3. Read the complete `artifacts/shoperation-development-guard/development-guard.md`.
4. Review every active Known Failure, preventive directive, forbidden approach, negative-knowledge rule and required regression authority.
5. Complete the risk-based assurance ceiling and the PO-derived Completion Contract in `quality/development/active-plan.json`.
6. For medium/high/critical work, record alternative designs, an adversarial CHALLENGE pass and relevant specialist reviews with at least one explicit dissent. Resolve every challenge before execution.
7. Set `executionAuthorized: true` and `status: "ready-for-implementation"` only after DEFINE/MODEL/PLAN/CHALLENGE/IMPROVE are complete.
8. Run:
   `node scripts/shoperation-plan-before-code.mjs --check`
9. **Do not make the first implementation edit until Plan Before Code is PASS.** This is PROVE_PLAN: execution is a privilege, not the default.

If scope is unresolved, add or repair subsystem classification first. Do not continue with baseline-only protection for an unclassified product change.

## DURING IMPLEMENTATION

After every coherent edit batch, before continuing to a new area:

- treat the Edit-Time Guard as the mandatory **A/B Reference Sync** boundary: removed/renamed assets, paths, exports, routes, selectors, data attributes, component keys and high-signal implementation expressions must have zero stale machine consumers before continuing;

- run `node scripts/shoperation-edit-time-guard.mjs --check`;
- run `node scripts/shoperation-knowledge-preflight.mjs`;
- run `node scripts/shoperation-incremental-replay.mjs --check`.

If the diff expands into another subsystem, activates additional Known Failures, or changes the guard digest, stop. Regenerate and review the Development Guard and update the plan before continuing.

A Reference Sync `block` is never exceptable. A Reference Sync `review` requires an explicit plan exception with a concrete reason and must remain visible in the reference-sync artifact.

A `review` edit-time finding requires an explicit exception in `quality/development/active-plan.json` with the rule ID and a concrete reason. A `block` finding must be repaired and is not exceptable by plan metadata.

## AUTHORITY RULES

- Extend canonical authorities; do not create parallel engines, controllers or routes to fix local symptoms.
- Shared root cause beats template or module-local compensation.
- Do not weaken runtime, tenant, schema, auth or security contracts to make tests pass.
- Do not treat CI or deployment readiness as Product Owner or runtime proof.
- Do not wait for final CI to discover a Known Failure that could have been prevented during implementation.

## BEFORE HANDOFF

Use the canonical operational sequence for serious work:

`OBSERVE → DEFINE → MODEL → PLAN → CHALLENGE → IMPROVE → PROVE_PLAN → EXECUTE → VERIFY → TRUTH_GATE → CLOSE → LEARN`

Depth is risk-based. Low-risk edits stay lightweight; higher-risk authority, data, runtime and release work requires proportionally stronger state/failure modeling and proof.

Final full CI and Quality Gate are still mandatory. Development-time guards reduce repeated errors; they do not replace typecheck, build, browser or journey proof, production/schema checks or Product Owner acceptance.

Before declaring completion, run the read-only Completion Truth Gate against evidence bound to the current exact SHA, branch, state/version and run/timestamp. `CLAIM WITHOUT EVIDENCE = NOT VERIFIED`. Only `VERIFIED_DONE` may be reported to the Product Owner as `DONE`; `PARTIALLY_VERIFIED`, `NOT_DONE` and `STALE_EVIDENCE` map to `NOT DONE`, while `BLOCKED` maps to `BLOCKED`.

If a later defect was reasonably foreseeable, do not stop at the patch. Use the existing Failure Intake / Known Failure / authority system to record why OBSERVE, MODEL, CHALLENGE, PROVE_PLAN or TRUTH_GATE missed it and strengthen the earliest existing control that should have prevented it. Do not create a defect-local gate by default.

### RESUMABLE VERIFICATION

After a failed proof is fixed, do not restart verification blindly and do not resume from the last green gate blindly.

- run the existing Incremental Replay planner first;
- treat prior evidence only as `REUSABLE`, `INVALIDATED` or `UNKNOWN`;
- `UNKNOWN` always means rerun / fail closed;
- if the verification graph, checkpoint, branch ancestry or semantic mapping is uncertain, force FULL verification;
- Known Failure scope may widen the replay plan;
- keep shadow/full comparison authoritative until the configured promotion proof enables physical skipping;
- use the generated resumable-verification summary to explain why each gate reran or was reusable.

`SHOPERATION_FORCE_FULL_VERIFICATION=true` is the explicit safe fallback.
