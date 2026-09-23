# Shoperation Support Knowledge — Production release risk-budget governance, 2026-09-23

Status: **design_decision / implementation in release-hardening branch**

Evidence: **documented_contract + code_and_test target**

Scope: global

Area: release / production / incident prevention

## Symptom

Large production batches could pass several independent gates and still require a long post-deploy repair phase because unrelated failure classes were bundled into one release unit.

## Root cause

The existing gates tested specific contracts, but they did not constrain the amount or diversity of change entering production at once. A green CI result therefore did not guarantee that schema, runtime, access, environment and storefront changes were isolated from one another.

## Resolution

Introduce an automatic production release risk budget:

- Low = 1 point;
- Medium = 2 points;
- High = 5 points;
- maximum release score = 5;
- maximum substantive subsystem count = 3;
- a High-risk subsystem must be the only substantive subsystem in its production release.

The gate evaluates the complete `main...HEAD` PR diff, not only the latest push.

## Prevention

- Development branches may remain broad; production releases may not.
- Database schema, auth/access, shared launch/runtime, environment/secret, payment/checkout/order and inventory/fulfillment are High-risk authorities.
- High-risk releases can carry tests/docs/evidence but no unrelated substantive feature.
- Unknown production code defaults to Medium risk.
- Never weaken the risk classifier to make a blocked release pass; split the release instead.
- After a High-risk release, require exact-production stabilization evidence before the next slice.

## Verification contract

The CI gate must produce `artifacts/release-risk-budget.json`.

The release manifest must bind the risk decision and subsystem list into release evidence.

Automation: **HUMAN_REQUIRED**

Risk: **high**

## Preview revalidation

A fresh exact-head Preview deployment is required after Preview environment credential repair. This release-evidence commit intentionally retriggers Vercel so the environment fix is proven by a new deployment rather than inferred from configuration alone.
