# Water-K V13 – Business Control Tower and decision governance

V13 starts from the fully audited V12 readiness head `6c9b954843eb181c6730880d3ceca49eb666889d` and turns the V9–V12 intelligence layers into one governed management/control plane.

## Primary objective

Create a deterministic, auditable control tower that detects operational and commercial risk, explains the evidence, prioritizes human action and tracks resolution without automatically changing money, customer eligibility, prices, refunds or fulfillment state.

## Workstreams

1. **Unified control alerts**
   - persistent alerts with category, severity, score, dedupe key, evidence and recommended action
   - lifecycle: open → acknowledged / snoozed → resolved / dismissed
   - deterministic re-opening when a previously resolved condition becomes materially active again
   - explicit entity links to orders, customers, resellers and product variants

2. **Cross-domain detectors**
   - operations SLA/backlog and blocked-order risk from V12
   - service/return attention signals
   - inventory pressure / zero ATP
   - overdue/high-value commercial opportunities from V10
   - customer-value / loyalty liability signals from V11 where available through stable read models
   - system/data-integrity signals for impossible or stale control states

3. **Human-in-the-loop decision tasks**
   - actionable tasks linked to alerts
   - owner, due date, priority and outcome
   - deterministic task keys prevent duplicates
   - no automatic high-impact commercial or customer action

4. **Alert governance and audit ledger**
   - immutable alert events for creation, acknowledgement, snooze, resolution, dismissal and reopen
   - idempotent transition keys
   - service-role-only privileged mutations
   - RLS and explicit grants for all new public-schema objects

5. **Executive control views**
   - open critical/high alerts, overdue tasks, SLA exposure and commercial value at risk
   - category/severity breakdown
   - oldest unresolved alerts and decision queue
   - control-health score based on unresolved severity and aging

6. **Admin command center**
   - new `/admin/iranyitokozpont` page
   - run detector cycle button
   - acknowledge / resolve / snooze controls
   - decision task queue and key control KPIs
   - links back to existing operations/customer/commercial modules rather than parallel workflows

7. **Safe orchestration**
   - idempotent `process_control_tower_cycle` orchestration
   - V13 only creates/updates control-plane state; it does not autonomously change orders, refunds, loyalty balances, offers, prices or stock
   - production/main and production Supabase remain untouched until a separate rollout approval

## Engineering guardrails

- New migrations continue after V12 migration `092`.
- New public tables use RLS and explicit grants because Supabase no longer guarantees automatic Data API exposure for new tables.
- Privileged `SECURITY DEFINER` functions revoke PUBLIC/anon/authenticated EXECUTE and grant only service_role.
- Views are `security_invoker=true` and service-role-only unless a customer-facing use case explicitly requires otherwise.
- Every state transition has strict lifecycle validation and idempotency ownership.
- Detectors are deterministic and never create duplicate active alerts for the same control condition.
- TypeScript and production build must both pass on the final V13 head before readiness is declared.
