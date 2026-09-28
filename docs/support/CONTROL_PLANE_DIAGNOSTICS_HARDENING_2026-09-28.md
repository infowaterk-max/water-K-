# Shoperation Support Knowledge — Control Plane diagnostics and exact-head evidence hardening, 2026-09-28

Status: **implemented / pending final documentation-head exact proof**

Evidence: **code_and_test_verified + exact-head implementation evidence**

Scope: global

Area: quality infrastructure / release / diagnostics / regression prevention

## Boundary

This record covers only hardening of the existing Shoperation Control Plane. It introduces no storefront, template, Visual Builder, Template Runtime, Page Schema, checkout-frontend, auth redesign, database-schema feature, later roadmap feature, parallel quality authority or parallel release authority.

Canonical authorities remain the existing Knowledge Before Build, Plan Before Code, Atlas 2.0 Change Impact, Failure Intake, Release Risk Budget, Release Manifest, Fresh Install proof, Cloud Smoke and Template Factory Quality Gate mechanisms.

---

## Incident 1 — Plan Before Code partial-diff ping-pong

**SYMPTOM**

A plan-only commit could not satisfy the gate because the plan file was intentionally excluded from the actual implementation diff, leaving an empty actual scope while the gate still required the complete planned domain/authority set. After the first implementation file was added, the gate then required that partial actual diff to equal the complete final planned scope. This produced false scope-drift blocks during safe incremental development.

Observed in CI runs including `36417352471` and `36417640816`.

**ROOT CAUSE**

The gate used one equality rule for two different states: full planned scope and current actual diff.

**WHY EXISTING GATE MISSED IT**

The gate validated declared scope correctness, but its own regression contract did not distinguish a pre-code projection from an in-progress partial implementation diff.

**FIX**

Plan Before Code now:
- projects the complete planned file-pattern envelope against Atlas;
- requires that projected domains, authorities, subsystems and Known Failures exactly match the declared plan;
- treats the current actual diff as a subset of that envelope;
- blocks any actual scope expansion outside the declared envelope.

**NEW PREVENTION**

The gate emits explicit `planned-projection` / `actual-diff-with-plan-envelope` evaluation mode and dedicated expansion errors such as `DEV_PLAN_DOMAIN_SCOPE_EXPANDED`.

**REGRESSION PROOF**

`tests/control-plane-diagnostics-hardening.test.ts` locks the envelope semantics. Exact-head implementation evidence at `3c139674c90a1977050035612582a16900c0e2f1`: CI `36421080740` SUCCESS; Plan Before Code, Edit-Time Guard, Incremental Replay and Release Risk Budget all PASS.

**RELATED FAILURE FINGERPRINT**

Canonical Failure Intake v2 category/location fingerprint for `DEV_PLAN_DOMAIN_SCOPE_DRIFT` + `shoporation.plan-before-code-gate.v1`: `SQ-FP-8AA0EB456131910E`.

---

## Incident 2 — Gate failure details collapsed into generic FAIL codes

**SYMPTOM**

Structured failures were reduced to generic codes such as `KNOWLEDGE_PREFLIGHT_FAILED`, `TEST_FAILED` or `RELEASE_RISK_BUDGET_FAILED`, forcing manual log inspection to identify the actual file, expected/actual state and gate reason.

The issue was directly demonstrated when the Control Plane change at `cdfce447e10cc5aeee2d00996792164d7c2a919e` failed Knowledge Before Build because `scripts/smoke.mjs` had no Atlas domain owner. The raw gate log contained `SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED:scripts/smoke.mjs`, while the first intake version still collapsed it to the generic Knowledge failure.

**ROOT CAUSE**

Failure Intake consumed workflow outcomes and selected artifact error arrays, but did not normalize all existing structured gate schemas, including Knowledge Before Build `integrityIssues`.

**WHY EXISTING GATE MISSED IT**

The blocking gate itself correctly knew the reason. The information loss happened after the gate, in the evidence/intake handoff.

**FIX**

The existing Failure Intake was upgraded in place to v2. It now ingests structured artifacts, including `issues`, `integrityIssues`, `violations`, `errors` and failed Vitest assertions, preserving gate, reason, expected, actual, file/route/endpoint, repository, ref, commit, environment, CI run and evidence.

**NEW PREVENTION**

When structured detail exists, the generic fallback code is suppressed. Failure Intake now generates a source-independent stable `failureFingerprint` from failure class + location, while repository/ref/run/source/commit remain event provenance rather than fingerprint inputs. Unresolved `candidate-new-failure` / `needs-review` records from CI, Cloud Smoke and Fresh Install are persisted through the existing fingerprint-deduplicated GitHub Issue disposition mechanism; a transient artifact is no longer the sole record.

**REGRESSION PROOF**

`tests/control-plane-diagnostics-hardening.test.ts` executes the intake against synthetic structured Plan and Knowledge artifacts and proves stable fingerprinting across different failure sources/commits. The exact-head green intake artifact for CI `36421080740` is `shoporation.failure-intake-batch.v2`, bound to `3c139674...`, with no unresolved records.

**RELATED FAILURE FINGERPRINT**

Historical generic pre-hardening Knowledge fingerprint: `SQ-FP-0570CE13B3124EF9`.

Canonical localized post-hardening fingerprint for `SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED` + `scripts/smoke.mjs`: `SQ-FP-F7F72A9B7F1DB1AB`.

---

## Incident 3 — Release Manifest could consume stale Risk/Atlas evidence

**SYMPTOM**

A present `artifacts/release-risk-budget.json` could be embedded into a release manifest without first proving that its `head` and Atlas `sourceCommit` matched the manifest SHA.

**ROOT CAUSE**

The manifest hashed available risk evidence but did not validate cross-artifact provenance before promotion into release evidence.

**WHY EXISTING GATE MISSED IT**

Release Risk Budget itself was exact-head aware, but the downstream Release Manifest trusted the artifact presence rather than re-verifying provenance at the consumption boundary.

**FIX**

Release Manifest now fails closed when:
- risk head is missing;
- risk head differs from release SHA;
- risk decision is not PASS;
- Atlas source commit differs from release SHA.

It also binds repository, exact SHA, ref, environment, CI run/workflow and a hash of the consumed Risk Budget evidence.

A failed manifest generation now writes `artifacts/release-manifest-diagnostic.json` with structured code/reason/expected/actual evidence, CI routes the release-manifest step outcome into Failure Intake v2, and the original diagnostic is retained with the failure-intake artifact.

**NEW PREVENTION**

Stale Risk/Atlas evidence can no longer become current release proof merely because an artifact file exists. Release-manifest failure is no longer log-only.

**REGRESSION PROOF**

`tests/control-plane-diagnostics-hardening.test.ts` proves stale risk evidence fails and matching exact-head evidence succeeds. Implementation-head manifest evidence at `3c139674...` showed Release Manifest SHA, Risk Budget head and Atlas sourceCommit all identical, with CI run `36421080740`.

The structured release-manifest failure artifact/wiring added after that implementation proof is revalidated by the final documentation-head CI required below.

**RELATED FAILURE FINGERPRINT**

Canonical Failure Intake v2 fingerprint for `RELEASE_MANIFEST_STALE_RISK_EVIDENCE` + `shoporation.release-manifest-diagnostic.v1`: `SQ-FP-1AE5AD5A902E0CBE`.

---

## Incident 4 — Atlas / Risk classifier authority mismatch for Cloud Smoke

**SYMPTOM**

Knowledge Before Build blocked `scripts/smoke.mjs` as unresolved architecture scope even though Release Risk Budget already classified the same file as release infrastructure.

Observed failure: `SQ_ATLAS_DOMAIN_SCOPE_UNRESOLVED:scripts/smoke.mjs`.

**ROOT CAUSE**

The Release Risk Policy and canonical Domain Foundations had diverged: `scripts/smoke.mjs` was in the release risk classifier but missing from `DOMAIN-RELEASE.canonicalPaths`.

**WHY EXISTING GATE MISSED IT**

No earlier regression asserted cross-authority path consistency for this file. The contradiction appeared only when the smoke script itself changed.

**FIX**

`scripts/smoke.mjs` is now explicitly owned by canonical `DOMAIN-RELEASE`. Control Plane scripts are also explicitly classified as `quality-infrastructure` in the existing Risk Budget rather than falling back to `unclassified-change`.

**NEW PREVENTION**

Risk classification is more diagnostic without being looser: `quality-infrastructure` remains Medium = 2 points, maximum score remains 5, maximum substantive subsystem count remains 3.

**REGRESSION PROOF**

At exact head `3c139674...`, Risk Budget evidence reported:
- `release-infrastructure`: Medium / 2;
- `quality-infrastructure`: Medium / 2;
- total 4/5;
- no `unclassified-change`;
- direct Atlas domains `DOMAIN-QUALITY` + `DOMAIN-RELEASE`;
- decision PASS.

**RELATED FAILURE FINGERPRINT**

`SQ-FP-F7F72A9B7F1DB1AB`.

---

## Incident 5 — Cloud Smoke was exact-SHA aware but log-centric on failure

**SYMPTOM**

Cloud Smoke already verified the deployed health version against `SMOKE_EXPECTED_SHA`, but failed routes, content-type mismatches or SHA mismatches were only visible in workflow logs.

**ROOT CAUSE**

The existing smoke gate had no structured proof artifact or Failure Intake handoff.

**WHY EXISTING GATE MISSED IT**

The runtime check itself was correct; evidence persistence and diagnostic normalization were incomplete.

**FIX**

The existing smoke script now writes `shoporation.cloud-smoke-proof.v2` with route-level status, HTTP/content type, latency, expected/actual version, exact source commit, environment, run/workflow and structured errors. The existing manual Cloud Smoke workflow uploads the proof, routes final failures into Failure Intake v2, and persists unresolved fingerprints through the existing Issue disposition path.

**NEW PREVENTION**

Codes include `CLOUD_SMOKE_HTTP_FAILURE`, `CLOUD_SMOKE_CONTENT_TYPE_MISMATCH`, `CLOUD_SMOKE_SHA_MISMATCH` and `CLOUD_SMOKE_REQUEST_FAILED`.

**REGRESSION PROOF**

Static and executable regressions in `tests/control-plane-diagnostics-hardening.test.ts`; normal exact-head CI and Template Factory remain green. The manual Cloud Smoke workflow remains manual by design and is not represented here as executed production/staging proof.

**RELATED FAILURE FINGERPRINT**

No historical runtime failure event was emitted for this evidence gap. Future smoke failures receive deterministic Failure Intake v2 fingerprints from their structured code + route.

---

## Incident 6 — Fresh Install proof entrypoints could drift

**SYMPTOM**

Shoperation already had two legitimate Fresh Install entrypoints: a conditional CI job and a standalone manual workflow. Structured exact-head success proof was initially hardened in only one path, leaving the other path with summary/log evidence only.

**ROOT CAUSE**

The same proof procedure was maintained in two workflow entrypoints without a regression contract enforcing evidence parity.

**WHY EXISTING GATE MISSED IT**

Existing baseline tests proved that both workflows applied the ordered migrations/auth bootstrap, but did not require identical structured success/failure evidence contracts.

**FIX**

Both existing entrypoints now use the same step identities, `shoporation.fresh-install-proof.v2` success evidence, `shoporation.fresh-install-failure.v1` failure diagnostic, exact repository/ref/SHA/run/workflow provenance, Failure Intake v2 handoff and persistent unresolved-fingerprint disposition.

No SQL migration, customer baseline or database authority was changed.

**NEW PREVENTION**

`tests/customer-baseline-proof-contract.test.ts` now locks parity across both entrypoints, including all Fresh Install failure categories.

**REGRESSION PROOF**

The normal Control Plane PR correctly leaves the real Fresh Install database job SKIPPED because this transaction contains no customer-baseline/schema change and no `[fresh-install-proof]` trigger. The proof-contract parity is covered by the full quality suite; no skipped Fresh Install run is claimed as PASS.

**RELATED FAILURE FINGERPRINT**

No runtime failure fingerprint existed because this was a structural evidence-drift defect discovered by audit. Any future Fresh Install failure is normalized by its explicit `FRESH_INSTALL_*` code through Failure Intake v2.

---

## Security proof audit result

Existing security proof layers were reviewed rather than redesigned. Current regression coverage includes tenant-scoped admin mutation contracts, order/payment tenant contracts, operational tenant isolation/RLS contracts, trigger-only privilege lockdown, RLS helper exposure closure, Fresh Install postflight privilege checks, server-only table boundaries, secret exposure/deploy gates and cross-origin admin mutation protection.

A full live two-tenant authentication/RLS acceptance harness would require new runtime fixtures and disposable-environment acceptance behavior. That is not pulled forward in this Control Plane thread without a proven current defect.

**ROADMAP-FUTURE / NOT-IN-CURRENT-SCOPE:** broader live multi-tenant security acceptance infrastructure if later required by the canonical roadmap.

---

## Final closure rule

This support record is the final knowledge/documentation change for this Control Plane hardening transaction.

Closure requires a fresh exact-head run of:
- Knowledge Before Build;
- Plan Before Code;
- Edit-Time Known Failure Guard;
- Incremental Known Failure Replay;
- Release Risk Budget;
- full Quality tests;
- TypeScript;
- production build;
- Release Manifest generation;
- Template Factory Quality Gate v2 including 14×3 browser proof.

The final Release Manifest SHA, Risk Budget head and Atlas sourceCommit must all equal that final documentation HEAD. No production deployment, schema mutation or later roadmap work is authorized by this record.
