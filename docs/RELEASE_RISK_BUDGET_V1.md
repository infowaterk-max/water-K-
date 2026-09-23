# Shoperation Production Release Risk Budget v1

Status: canonical release-hardening policy.

## Objective

Keep production changes small enough that failures are isolated, diagnosable and reversible. Development may continue in larger branches, but the production release unit is deliberately smaller.

## Risk budget

Each production-bound PR is evaluated from the complete `main...HEAD` diff.

- Low risk subsystem: **1 point**
- Medium risk subsystem: **2 points**
- High risk subsystem: **5 points**
- Maximum release budget: **5 points**
- Maximum substantive subsystems per release: **3**

Points are counted once per distinct subsystem, not once per changed file.

Tests, documentation, snapshots and generated evidence are neutral. They do not increase the risk score.

## High-risk isolation

A release that touches one High-risk subsystem uses the whole budget.

Therefore a High-risk release:

- may contain its required tests, documentation and evidence;
- may not contain another substantive Low/Medium/High subsystem;
- may not contain a second High-risk subsystem.

High-risk categories include:

- database schema / migrations;
- authentication and access authority;
- storefront launch/runtime authority;
- environment / secret contract;
- payment / checkout / order authority;
- inventory / shipping / fulfillment authority.

This explicitly prevents schema + auth + runtime + environment changes from being shipped as one production batch.

## Medium and low risk

Medium-risk work includes Builder/template engine, admin operations, customer account, shared storefront and release infrastructure.

Low-risk work is primarily local storefront UI/presentation.

Examples that fit the budget:

- one High subsystem = 5;
- two Medium subsystems = 4;
- two Medium + one Low = 5;
- one Medium + up to three Low would exceed the three-subsystem cap and must be split;
- up to three Low subsystems = 3.

## Automatic gate

Canonical policy:

`deploy/release-risk-policy.json`

Gate implementation:

`scripts/release-risk-budget.mjs`

CI evaluates the complete production-bound PR against current main and writes:

`artifacts/release-risk-budget.json`

Any of these is blocking:

- total score > 5;
- more than 3 substantive subsystems;
- more than one High-risk subsystem;
- one High-risk subsystem combined with any other substantive subsystem.

Unclassified production code is treated as Medium risk by default. The safe default is to block oversized work rather than silently treat unknown code as low risk.

## Release manifest binding

`scripts/release-manifest.mjs` includes the risk decision, score, subsystem list and policy version in the release manifest when risk evidence exists.

The release hash therefore binds the deployment identity to the risk-gate result.

## Production sequencing

Large development batches are allowed before release, but they must be split into production slices.

Recommended sequence for a mixed change:

1. database/schema release;
2. prove production schema compatibility and anonymous smoke;
3. shared runtime/access release;
4. prove production route behavior and runtime errors;
5. feature/UI release;
6. prove visual/functional smoke.

Do not combine these merely because staging accepted the whole branch.

## Stabilization checkpoint

After every High-risk production release, the next production slice must wait for the previous exact production HEAD to have:

- Vercel deployment READY;
- target database compatibility PASS when applicable;
- anonymous production smoke PASS;
- runtime error scan with no new release-related error;
- exact deployed SHA recorded.

A green build alone is not a stabilization checkpoint.

## Governance rule

If a release is blocked by the risk budget, split the release. Do not weaken the classifier, raise the budget, relabel a High-risk subsystem, or mark substantive code as neutral merely to get the deployment through.
