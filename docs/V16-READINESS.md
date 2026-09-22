# Water-K V16 readiness

## Scope
V16 adds Continuous Assurance above the V13 Control Tower, V14 Governed Actions and V15 Governed Runbooks. It continuously checks safety invariants, stores immutable evidence, tracks findings and exposes readiness without mutating commerce state.

## Implemented migrations
- 124 assurance control/evidence/finding foundation
- 125 deterministic control check engine
- 126 finding lifecycle and accepted-risk governance
- 127 assurance/readiness read models and evidence bundle hashes
- 128 orchestration, append-only hardening and explicit service-role source grants
- 129 readiness/error/finding integrity hardening
- 130 run/evidence idempotency hardening
- 131 partial-run replay safety

## Control coverage
- aging critical V13 control alerts
- stale approved V14 proposals
- V14 dual-approval integrity
- V15 global pause / circuit-breaker health
- overdue V15 runbooks
- long-waiting human runbook steps
- overdue V13 control tasks
- expired active V14 proposals

## Evidence and governance
- every control result produces immutable evidence with an evidence hash
- every run exposes a deterministic evidence bundle hash
- findings are deduplicated by control + subject
- accepted risk requires actor, rationale and expiry; critical findings cannot be risk-accepted
- accepted risk automatically resolves if a later control check passes
- expired risk acceptance returns the finding to open state
- evidence and event ledgers are append-only
- control definitions are versioned and immutable; new semantics require a new version

## Audit findings resolved
- check-engine errors originally could degrade score without creating a finding/readiness block
- accepted-risk findings could remain open even after a passing control
- direct service-role mutation of control/finding state was too permissive
- reconciliation could double-count an already processed evidence snapshot
- repeated completed run keys could execute wrapper side effects
- partially interrupted assurance runs could duplicate evidence/finding occurrence counts on replay

## Security
- all V16 public-schema tables have RLS enabled
- anon/authenticated direct access is revoked
- V16 privileged functions use SECURITY DEFINER with empty pinned search_path and PUBLIC/anon/authenticated EXECUTE revoked
- service_role access is explicit for current Supabase Data API defaults
- V16 views use security_invoker=true and service-role-only SELECT
- privileged state changes are routed through guarded RPC functions

## Admin experience
`/admin/biztositekok` provides assurance score, readiness status, critical/high/stale KPIs, open findings, accepted risks, control coverage, evidence hashes and recent evidence bundles. Admins can run a manual assurance cycle and acknowledge/resolve/accept eligible risks.

## Safety boundary
V16 modifies assurance/control-plane state only. It does not autonomously change orders, inventory, refunds, payments, loyalty balances, prices, discounts, benefits or customer eligibility.

## Rollout
V16 is isolated on `feature/native-store-v16`; PR #16 targets the audited V15 readiness branch. Production/main, production Supabase and production Vercel remain untouched until explicit approval.
