# Water-K V14 – Governed Action & Policy Engine

V14 starts from the fully audited V13 readiness head `54e9d82c185a8335bef27c3fbdefea3cfa863d43` and turns the Business Control Tower into a governed action-planning layer.

## Primary objective
Create a deterministic, auditable policy and playbook engine that converts V13 alerts into proposed actions, simulations, approvals and controlled execution records without allowing uncontrolled business-state mutation.

## Workstreams

1. **Policy registry**
   - versioned policy definitions by category/severity/alert type
   - explicit impact class: advisory / reversible / high-impact
   - approval requirement and expiry window
   - activation/deactivation without deleting history

2. **Action proposals**
   - deterministic proposal key per alert + policy version
   - proposed action payload, rationale, expected impact and risk score
   - lifecycle: proposed → simulated → approved/rejected/expired → executed/cancelled
   - idempotent transitions and immutable identity

3. **Dry-run and simulation**
   - proposal simulation snapshots current source state
   - no source mutation during simulation
   - stale simulation detection when source state materially changes
   - approval is blocked for stale/unverified proposals

4. **Approval governance**
   - high-impact proposals always require explicit admin approval
   - two-person approval support for critical/high-impact policies
   - approver cannot satisfy both approval slots
   - approval captures immutable evidence snapshot

5. **Safe execution contracts**
   - V14 execution writes only to action execution ledger by default
   - no direct order/stock/refund/loyalty/price/offer mutation
   - execution adapters are allowlisted; V14 initial release contains `human_task`, `notify_admin`, and `record_decision` only
   - future source mutations require separate adapter migrations and explicit rollout review

6. **Escalation and expiry**
   - overdue approval/task escalation signals
   - proposal expiry and automatic cancellation when source alert resolves
   - no repeated proposal spam for the same alert/policy version

7. **Admin Action Center**
   - `/admin/intezkedesek`
   - proposal queue, impact/risk, simulation state, approval state and execution result
   - simulate / approve / reject / execute controls
   - links back to V13 alert and source admin modules

8. **Security and rollout**
   - RLS for every V14 public table
   - service-role-only privileged functions
   - security-invoker views
   - append-only execution/audit ledgers
   - production/main, production Supabase and production Vercel stay untouched until explicit rollout approval
