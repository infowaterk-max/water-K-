# Roadmap Block 19 – Predictive Optimization & Autonomous Commerce Guardrails

## Canonical reconstruction

Block 19 is the previously deferred **Predictive Optimization & Autonomous Commerce Guardrails** layer. It follows Block 18 AI-Assisted Decisioning & Merchandising Intelligence and raises the autonomy level only inside deterministic, explicit, tenant-scoped guardrails.

Canonical sequence:

- Block 17 — Event-Driven Workflow Automation;
- Block 18 — AI-Assisted Decisioning & Merchandising Intelligence;
- **Block 19 — Predictive Optimization & Autonomous Commerce Guardrails**;
- Block 20 — Platform Ecosystem & Enterprise Extensibility;
- Block 21 — Page Schema / Templates;
- Block 22 — Visual Builder.

The reconstruction is constrained by earlier deferrals and existing authorities. Block 19 does not create a second event bus, workflow engine, cron, approval system, pricing engine, inventory authority, promotion authority or generic AI write authority.

## Scope implemented

Block 19 now provides:

- deterministic predictive commerce signals from current tenant-scoped evidence;
- expected outcome estimates for current commercial opportunities;
- stock-pressure prediction from current canonical variant stock evidence;
- promotion-risk prediction from `preview_promotion_margin_v2`;
- customer-value risk prediction from `v9_growth_dashboard_v2`;
- explicit evidence-quality failure when cost data is missing, instead of generated price/cost assumptions;
- a per-tenant autonomy policy with `off`, `supervised` and `bounded` maturity modes;
- explicit confidence, risk, impact, margin, inventory, promotion, budget and staleness guardrails;
- explicit per-tenant action allowlist;
- tenant kill switch plus composition with the existing Block 17 `automation_control` pause/circuit breaker;
- a tenant-scoped, idempotent evidence ledger for every Block 19 guardrail decision and execution attempt;
- human override/compensation for bounded runbook execution through the existing runbook transition authority;
- high-risk routing into the existing `action_proposals` approval authority;
- an admin API and UI surface for policy, evidence, guarded execution and emergency stop.

Prediction and execution are separate. Re-loading server-side evidence is mandatory before execution. Caller-supplied tenant identity, evidence, risk score, confidence or business mutation payload is not accepted as execution authority.

## Bounded autonomous execution contract

Unattended execution is intentionally narrower than the predictive scope.

The only unattended action kinds in Block 19 are:

- `workflow.inventory-pressure` → existing Block 17 `inventory.pressure.detected` event / `inventory-pressure` runbook;
- `workflow.customer-value-risk` → existing Block 17 `customer.value_risk.detected` event / `customer-value-risk` runbook.

These actions trigger governed workflows only. They do **not** directly mutate product price, stock quantity, promotion configuration, order, customer, consent or catalog state.

The following remain supervised / approval-required and cannot enter the bounded-autonomous allowlist:

- `commerce.price-adjustment`;
- `commerce.promotion-adjustment`;
- `commerce.inventory-adjustment`;
- `commerce.merchandising-adjustment`.

High/critical risk also remains under human approval regardless of thresholds.

## Guardrail order

Before any autonomous dispatch the deterministic guard evaluator checks, fail-closed:

1. tenant mode is not `off`;
2. tenant kill switch is not engaged;
3. an existing tenant `automation_control` record exists;
4. Block 17 global pause is not active;
5. Block 17 circuit breaker is not open;
6. prediction evidence is not stale;
7. confidence meets the tenant minimum;
8. risk score is within the tenant maximum;
9. expected financial impact is within the tenant maximum;
10. margin floor is not violated when the action has margin evidence;
11. inventory floor is not violated when the action has inventory evidence;
12. promotion limit is not violated when the action has discount evidence;
13. budget/spend guard is not violated when the action has spend evidence;
14. action kind is in the hardcoded platform allowlist;
15. action kind is explicitly enabled in the tenant allowlist.

Any missing control state, unknown action, stale evidence, unsupported mutation, or guard breach blocks unattended execution.

## Risk and approval model

Block 19 keeps the existing governance vocabulary rather than introducing a second approval lifecycle.

- low risk: may be bounded autonomous only for the two explicit workflow actions and only when every guard passes;
- medium risk: supervised by default; Block 19 does not silently widen unattended authority;
- high risk: `action_proposals` + human approval;
- critical / non-reversible: human approval and no unattended commerce mutation.

The Block 19 high-risk adapter only creates the existing control alert + `action_proposals` record. Approval, rejection, simulation and governed proposal execution remain owned by the existing action-governance subsystem.

## Existing authorities reused

Block 19 reuses:

- Block 18 `loadMerchantDecisionSnapshot` evidence loading;
- `commercial_opportunities` for expected-value/probability evidence;
- `preview_promotion_margin_v2` for promotion margin authority;
- `product_variants` for current stock and cost evidence;
- `v9_growth_dashboard_v2` for customer-value evidence;
- Block 17 `dispatchEventDrivenWorkflow` for bounded execution;
- Block 17 runbooks, retry/backoff, dead-letter and single `/api/cron/integrations` cron;
- Block 17 `automation_control` global pause/circuit breaker;
- existing `action_proposals` for high-risk approval;
- existing admin audit authority;
- existing entitlement and RBAC (`executiveAnalytics`, `automation`, `analytics.read`, `store.manage`).

There is no tool/function surface that gives AI direct SQL, RPC or business-state write freedom. AI Gateway availability does not affect prediction or guard evaluation; Block 19 is deterministic and therefore remains functional during model outage.

## Database contract

Block 19 adds only governance/evidence persistence:

- `commerce_autonomy_policies` — per-tenant guardrail configuration;
- `commerce_autonomy_runs` — idempotent prediction/guard/execution evidence ledger;
- one narrow high-risk proposal adapter into the existing action authority.

These tables do not own commerce domain state. All direct client mutations are revoked; service-side access is tenant-scoped and RLS-protected for reads.

Production default is deliberately inert:

- no tenant policy is seeded;
- absence of policy resolves to `off`;
- persisted policy default is `mode=off`;
- persisted policy default is `kill_switch=true`;
- absence of tenant `automation_control` is treated as blocked.

Therefore deployment cannot silently activate Water-K or any other tenant for unattended autonomous commerce.

## Customer baseline / Fresh Install

Block 19 does **not** modify `supabase/customer-baseline` and adds no customer forward migration. The current inherited baseline state therefore remains unchanged from the Product Intake merge:

- `status=snapshot-reviewed`;
- `freshInstallProofRequired=true`;
- `proofContractSha256=null`;
- a genuine empty-target Fresh Install proof is still required for ordered baseline `0001–0012` before the manifest may return to `ready`.

Block 19 must not falsify or reset that inherited obligation.

## Acceptance contract

Required acceptance covers:

- deterministic prediction unit tests;
- confidence/risk/impact boundary tests;
- stale prediction tests;
- low/high/critical approval boundaries;
- tenant opt-in and allowlist tests;
- entitlement/RBAC and caller-tenant isolation contract tests;
- idempotent `(instance_id, run_key)` execution evidence;
- Block 17 retry/dead-letter reuse;
- tenant kill-switch and global automation pause/circuit tests;
- human override/compensation through `transition_automation_instance_v2`;
- margin/inventory/promotion/budget guard tests;
- missing-cost fail-closed evidence tests;
- model/AI outage independence;
- regression proving no direct Block 19 update path exists for products, variants, commercial offers, orders or customers;
- regression proving Block 20–22 are not pulled forward.

If bounded execution is accepted end-to-end, it must be demonstrated on staging/test tenant data. Production Water-K price, stock, promotion, order and customer data are never acceptance fixtures.

## Explicit non-scope

The following are not included in Block 19:

- supplier feed / supplier API sync;
- automatic catalog enrichment;
- marketplace bulk publishing;
- advanced PIM / ERP connectors;
- AI-generated product data mass publication;
- subscription commerce;
- general plugin/app ecosystem;
- Block 20 Platform Ecosystem & Enterprise Extensibility;
- Block 21 Page Schema / Templates;
- Block 22 Visual Builder;
- drag-drop canvas, inline storefront editor, template editing UI or builder authoring;
- unattended direct price, inventory, promotion, order, customer or consent mutation;
- a general AI SQL/RPC/business-state write authority.
