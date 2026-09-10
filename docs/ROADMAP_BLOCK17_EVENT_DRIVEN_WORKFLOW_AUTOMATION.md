# Roadmap Block 17 — Event-Driven Workflow Automation

## Canonical reconstruction

Block 17 is the previously deferred **Event-Driven Workflow Automation** layer. The reconstruction is based on the accepted roadmap order and the explicit Block 15–16 deferrals: Block 16 closed commerce-specific retention/recovery automation while generic workflow/event automation was reserved for the next workflow block. AI-assisted decisioning and merchandising intelligence belongs to Block 18; predictive optimization/autonomous guardrails belongs later and is not part of Block 17.

Canonical sequence around this block:

- Block 16 — Commerce Automation & Recovery
- **Block 17 — Event-Driven Workflow Automation**
- Block 18 — AI-Assisted Decisioning & Merchandising Intelligence
- Block 19 — Predictive Optimization & Autonomous Commerce Guardrails
- Block 20 — Platform Ecosystem & Enterprise Extensibility
- Block 21 — Page Schema / Templates
- Block 22 — Visual Builder

## Required scope

1. A normalized, allowlisted event catalog with deterministic event identity.
2. Developer-authored event → subscriber/runbook mappings. The mappings are versioned application code, not a visual authoring system.
3. Tenant-safe event ingress. Tenant identity comes from current store context, never from caller supplied tenant data.
4. Immediate deterministic dispatch into the existing governed automation runbooks.
5. Idempotent processing and run evidence using the existing `automation_processing_runs` authority.
6. Bounded retry/backoff with an authenticated retry worker.
7. Dead-letter state after bounded engine/step exhaustion; no infinite silent retry.
8. Existing approval gates remain authoritative. `commercial-high-risk` does not bypass human approval.
9. Admin observability for subscriptions, runs, retry state and dead-letter state.
10. Evidence minimization/redaction before persistence.

## Reused Shoperation foundation

Block 17 deliberately reuses:

- `control_alerts` as the existing governed control-plane incident authority;
- `automation_runbooks` and `automation_runbook_steps` as the existing workflow catalog;
- `automation_runbook_instances` and `automation_step_runs` as execution state;
- `automation_events` as immutable runbook execution evidence produced by the existing RPCs;
- `automation_processing_runs` as tenant-scoped processing/idempotency evidence;
- `activate_automation_runbook_v2` and `execute_automation_step_v2` as tenant-safe execution authorities;
- the existing automation circuit-breaker/pause model;
- current RBAC, Pro entitlement and current-store scope;
- the existing communication/journey/order/catalog/pricing/inventory authorities rather than duplicating them.

The Block 17 event dispatcher itself never writes orders, prices, inventory, products or customer state. Runbook actions remain control-plane-only and delegate through already governed platform authorities.

## Canonical event/subscriber contract v1

| Event | Governed runbook |
| --- | --- |
| `operations.exception.detected` | `operations-triage` |
| `inventory.pressure.detected` | `inventory-pressure` |
| `service.escalation.requested` | `service-escalation` |
| `commercial.high_risk.detected` | `commercial-high-risk` |
| `customer.value_risk.detected` | `customer-value-risk` |
| `system.recovery.requested` | `system-recovery` |

This catalog is intentionally small and semantic. Future modules may emit these normalized events through the shared dispatcher; they must not create module-specific workflow engines.

## Retry / dead-letter contract

- A processing run key is deterministic from tenant + event type + source id.
- A completed or approval-waiting event is idempotent on replay.
- Runtime failures are retried with bounded backoff and persisted `nextAttemptAt` evidence.
- Engine retries stop after five attempts.
- Step retries continue to obey the existing runbook step `max_attempts` and `retry_backoff_minutes` contract.
- Exhausted execution is marked `dead_letter` and requires investigation; it is not silently converted to success.
- `/api/cron/workflows` only retries already emitted events. It never discovers or invents first-time business events.

## Security / tenancy

- Admin event ingress requires `store.manage`, current store context, and the existing `automation` plan feature.
- Tenant id is never accepted from request JSON.
- Retry-by-run-id re-reads the run inside the current tenant and verifies the Block 17 authority marker.
- Evidence is bounded and sensitive-looking keys are redacted before persistence.
- CRON retry execution requires `CRON_SECRET`.
- Existing tenant-safe v2 runbook RPCs remain mandatory.

## Explicit non-scope

Block 17 does **not** include AI-assisted decisioning; that remains Block 18. It does not include predictive revenue/merchandising optimization, autonomous commerce, subscription commerce, supplier feed/API sync, automatic catalog enrichment, marketplace bulk publishing, advanced PIM/ERP connectors, or AI-generated product data.

It does not create recurring orders or recurring charges. It does not create silent product replacement or silent quantity correction. It does not make historical prices authoritative and it does not create a second order, pricing, inventory, catalog or customer authority.

It also does not pull forward **Block 21 — Page Schema / Templates** or **Block 22 — Visual Builder**. There is no drag-and-drop workflow canvas, inline storefront editor, template authoring UI, page-schema engine or visual workflow authoring surface in this block.

## Database and customer-baseline impact

Block 17 adds no database migration and does not alter the customer baseline contract. It uses existing production tables/RPCs. Therefore Block 17 itself does not invalidate Fresh Install proof.

At branch creation, current `main` already contained the unrelated Product Intake Center merge (#212), which introduced customer-baseline migration 0010 and moved the manifest to `snapshot-reviewed` with `freshInstallProofRequired=true`. That inherited proof obligation is not Block 17 scope, but it remains a release gate for any subsequent main merge until a genuine empty-target proof is completed.
