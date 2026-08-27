# Water-K V19 readiness

## Scope
V19 adds resilience and recovery governance on top of the V18 release/post-release control plane.

## Delivered
- versioned recovery objectives per service/domain
- explicit RTO/RPO, backup freshness and drill interval targets
- append-only trusted/untrusted recovery evidence
- recovery drill planning, start and completion with measured RTO/RPO
- restore validation outcome
- deduplicated recovery findings for stale/failed backup, failed restore, overdue/failed drill and RTO/RPO breach
- replay-safe reconciliation and idempotent governance cycles
- immutable recovery decisions
- service-level readiness/KPI views
- Admin → Helyreállítási központ and guarded admin API

## Audit hardening
- repeated reconciliation no longer increments occurrence count for the same still-open incident
- reopened findings clear prior acknowledgement/resolution metadata
- evidence keys are bound to exact objective/kind/status/source/timestamp/hash identity
- drill keys are bound to exact objective/scenario/planned timestamp
- drill start/completion event keys cannot be reused across operations
- completion replay validates measured RTO/RPO and restore-validation parameters
- decision keys are bound to finding/actor/decision/note identity
- evidence/event/decision records are append-only
- recovery objective definitions are immutable within a version
- terminal drills/runs are protected
- runtime service_role direct writes are revoked; lifecycle changes go through guarded security-definer RPCs

## Safety boundary
V19 does not restore data, execute rollback, deploy, move Git refs, apply production migrations or mutate commerce/customer/inventory/payment/refund/loyalty state. `prepare_recovery` is a governance decision only.

## Verification
Static migration dependency, RLS/grant, lifecycle, idempotency, read-model and UI/API review completed. Final readiness requires the latest feature/native-store-v19 head to pass dependency install, TypeScript check and production build CI.
