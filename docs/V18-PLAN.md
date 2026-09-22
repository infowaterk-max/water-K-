# Water-K V18 – Post-Release Verification & Rollback Governance

V18 starts from the fully audited, CI-green V17 readiness head.

## Objective
Close the release-control loop after a release has been authorized. V18 records post-release observation windows, verification evidence, regression findings, rollback recommendations and closure decisions without performing deployment or rollback itself.

## Workstreams
- post-release verification sessions bound to V17 release candidate/source SHA
- versioned verification policies and observation windows
- smoke/health/business-signal evidence with trusted/untrusted provenance
- regression findings and severity lifecycle
- rollback recommendation with human approval gate
- post-release readiness/closure score
- idempotent reconciliation and stale evidence handling
- Admin → Utóellenőrzés center

## Safety boundary
V18 does not deploy, rollback, mutate production commerce state, change customer data, or alter inventory/payment/refund/loyalty state. It only manages control-plane evidence and decisions.
