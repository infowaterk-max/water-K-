# Water-K V20 – End-to-End Quality Gates

## Objective
Turn the current build-only CI into a deterministic quality gate that detects regressions in core commerce and governance flows before release.

## Scope
- unit/invariant tests for monetary, inventory and lifecycle rules
- integration-oriented contract tests for order/refund/loyalty/fulfillment state machines
- static migration contract tests for dangerous SQL regressions
- CI quality gate: tests -> typecheck -> production build
- machine-readable test summary artifact
- no production deploy or production database mutation
