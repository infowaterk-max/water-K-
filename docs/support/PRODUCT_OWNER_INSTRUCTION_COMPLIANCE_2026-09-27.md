# Product Owner Instruction Compliance — 2026-09-27

## SKB-PO-001 — Product Owner instruction was marked complete without requirement-level proof

- status: `implemented`
- evidence: `human_rejection + root_cause + compliance_guard`
- area: `quality/product-owner/instruction-closure`
- risk: `high`
- automation: `AUTO_FIX`
- known failure: `SQ-KF-025`

### Symptom

During Playroom v20 re-acceptance, the Product Owner explicitly requested a visible product description and a checkout focused on the actual ordering task. The implementation changed the Product page label to “TERMÉKISMERTETŐ” and rearranged Checkout explanatory blocks, and broad CI checks were green, but the Product description was still absent in the rendered preview and Checkout still presented an oversized explanatory card instead of the requested task-focused structure.

### Root cause

Two failures combined:

1. the preview fallback layer treated an authored empty string as stronger than already-populated preview context, so `product.description` and Checkout totals were overwritten with empty values;
2. completion was judged from changed nodes and broad regression status rather than from a durable replay of the Product Owner's original instructions and acceptance criteria.

### Resolution

- empty-string authored fallbacks no longer erase populated preview context;
- Playroom Checkout preview is task-first: compact heading/progress, visible shipping-data structure, shipping choice, collapsed payment/summary steps and compact order summary;
- a canonical instruction ledger records each accepted instruction with acceptance criteria, evidence checks and regression authority;
- the Instruction Compliance specialist blocks its Control Plane evidence when an instruction is pending, lacks evidence, references a missing regression test, or its evidence check no longer matches the repository; it is executed by the Control Plane, not as a sibling workflow authority;
- a “done” claim must not be made until the instruction compliance guard passes.

### Prevention

For every Product Owner/user-directed development batch:

1. record every accepted instruction;
2. split compound requests into independently verifiable instruction items;
3. define concrete acceptance criteria;
4. attach machine-verifiable evidence checks;
5. attach at least one regression test;
6. do not silently defer an accepted item;
7. run the central Control Plane through the required dependency stage so the Instruction Compliance specialist is evaluated in the same transaction;
8. Product Owner visual acceptance remains separate and cannot be replaced by this automated guard.


## Control Plane consolidation

The first compliance implementation was still too local: Instruction Compliance, Knowledge, Plan, Edit-Time, Replay and Release Risk could each produce a correct local answer without one runtime authority owning the whole dependency graph.

The corrected architecture is:

`Instruction Ledger + Knowledge + Authority Graph + prior evidence -> Shoperation Control Plane -> specialist guards -> final reconciliation -> handoff/release`.

Rules:

- specialist guards do not orchestrate sibling guards;
- the Control Plane topologically orders blocking guards from the canonical guard registry;
- every later specialist consumes the same shared context and predecessor evidence;
- process exit status and written evidence must agree;
- task identity and exact-head identity must agree across evidence;
- typecheck, build, database baseline and browser proof may remain separate executors, but their outcomes are reconciled back into the final Control Plane report;
- Product Owner handoff requires `stage=final` and `decision=PASS`;
- `SQ-AUTH-022` is the global authority: specialists report evidence; the Control Plane owns the final quality decision.

This consolidation replaces manual sibling-gate orchestration; it is not an additional independent gate.
