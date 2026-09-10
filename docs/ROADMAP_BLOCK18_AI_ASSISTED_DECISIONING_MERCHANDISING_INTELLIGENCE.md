# Roadmap Block 18 – AI-Assisted Decisioning & Merchandising Intelligence

## Canonical reconstruction

Block 18 is the previously deferred **AI-Assisted Decisioning & Merchandising Intelligence** layer. The reconstruction is anchored in the accepted roadmap sequence after Block 17 and in the earlier V9 commerce-intelligence plan: product/contribution-margin evidence, promotion margin-floor simulation, reseller reorder suggestions, at-risk revenue/reorder/low-margin decision cards, and a later AI business-advisor layer that explains rather than replaces underlying measurements.

Canonical sequence around this block:

- Block 17 — Event-Driven Workflow Automation;
- **Block 18 — AI-Assisted Decisioning & Merchandising Intelligence**;
- Block 19 — Predictive Optimization & Autonomous Commerce Guardrails;
- Block 20 — Platform Ecosystem & Enterprise Extensibility;
- Block 21 — Page Schema / Templates;
- Block 22 — Visual Builder.

Block 18 is advisory. It can detect, rank, explain and recommend from existing evidence, but it does not receive a new mutation authority.

## Mandatory scope implemented

The Block 18 decisioning layer now:

- composes merchant decision cards from current tenant-scoped commerce and operational evidence;
- surfaces existing high-risk `action_proposals` without duplicating their lifecycle or approval authority;
- evaluates active commercial offers through the existing `preview_promotion_margin_v2` promotion-margin authority;
- surfaces existing B2B/reseller `commercial_opportunities` as reorder/commercial opportunities instead of creating a second reseller planner;
- interprets current V9 growth aggregates for at-risk/win-back customers and checkout recovery;
- detects missing product cost evidence and fails closed instead of estimating contribution margin;
- exposes the source authority and bounded source evidence on every recommendation;
- adds a rate-limited AI explanation endpoint to explain an already-derived recommendation;
- uses the Vercel AI Gateway only as an optional explanation layer; if the gateway is unavailable or not configured, the canonical evidence-based explanation remains available;
- records explanation access through the existing admin audit authority;
- keeps the merchant in the loop for every business decision.

## Existing authorities reused

Block 18 explicitly reuses, rather than replaces:

- `v9_growth_dashboard_v2` and the existing executive analytics/customer-value foundation;
- `commercial_opportunities` as the existing commercial/reorder opportunity evidence;
- `commercial_offers` plus `preview_promotion_margin_v2` as the promotion/margin simulation authority;
- `product_variants.unit_cost_net_huf` as canonical cost evidence for contribution-margin reasoning;
- `action_proposals` and the existing Intézkedési központ for governed high-risk actions;
- Block 17 `sanitizeWorkflowEvidence` for bounded machine-consumed evidence;
- the existing security rate-limit RPC;
- the existing admin audit log;
- existing entitlement and RBAC (`executiveAnalytics` + `analytics.read`).

The new layer performs read/calculation work only against business state. It does not write product, pricing, inventory, promotion, order, customer, communication or automation state.

## AI contract and human-in-the-loop boundary

The deterministic decision engine runs first. AI never decides which tenant records exist, never receives a caller-supplied evidence payload, and cannot select arbitrary records. The admin API accepts only a decision-card key, re-loads current server-side tenant evidence, reconstructs the card, and then explains that exact current recommendation.

The AI prompt contains only bounded non-customer-identifying recommendation evidence. No tool/function execution is exposed. The system prompt explicitly forbids direct business-state mutation, automatic price/stock/promotion changes, approval bypass and unsupported factual invention.

For high-risk actions the card points to the existing `action_proposals` authority. Approval, rejection, simulation and execution remain there. Block 18 cannot approve or execute a proposal.

AI Gateway calls are separately rate-limited. Gateway/model failure is fail-safe: the endpoint returns the same deterministic evidence explanation instead of fabricating a result or mutating state. AI explanation access is recorded in the existing audit authority with mode/model/card metadata, not raw sensitive commerce payloads.

## Merchandising intelligence boundary

The historical promotion-intelligence requirement is satisfied by consuming the already-shipped margin simulator and cost authority. Block 18 does not introduce a second promotion calculator or arbitrary margin threshold. A promotion-risk card is emitted only when `preview_promotion_margin_v2` returns a verified `safe=false` result for the current tenant and offer.

If product cost evidence is absent, Block 18 reports an evidence-quality problem. It does not infer, estimate or generate missing product cost data.

Existing reseller/reorder planning remains authoritative. Block 18 ranks and explains its evidence; it does not silently create offers, contact customers, change quantities or publish promotions.

## Block 17 integration

Block 18 consumes the governance/evidence patterns established by Block 17 and reuses its evidence sanitization helper. It does **not** add a second event bus, workflow engine, cron or approval mechanism.

No new event needs to be emitted merely because a merchant opened an insight. If a future governed action is represented by an existing `action_proposals` record, the existing Block 17 high-risk approval/runbook path remains authoritative.

## Explicit non-scope

Block 18 does not include any Block 19 predictive/autonomous authority, including:

- unattended autonomous execution;
- autonomous price, inventory, promotion or merchandising changes;
- predictive optimization engine;
- automatic revenue maximization;
- automatically executed AI decisions;
- a new autonomous commerce authority.

It also does not include:

- supplier feed/API sync;
- automatic catalog enrichment;
- marketplace bulk publishing;
- advanced PIM/ERP connectors;
- mass automatic publishing of AI-generated product data;
- subscription commerce;
- Block 21 Page Schema / Templates implementation;
- Block 22 Visual Builder, drag-drop canvas, inline storefront editing or template editing UI.

## Database and customer baseline

Block 18 requires **no SQL migration** and makes no sellable customer-database contract change. It is implemented entirely on top of existing production authorities and views.

Therefore Block 18 does not alter the inherited customer baseline manifest. The current Product Intake migration `0010` obligation remains exactly as inherited:

- `status=snapshot-reviewed`;
- `freshInstallProofRequired=true`;
- `proofContractSha256=null`.

The manifest must not return to `ready` until a genuine empty-target Fresh Install proof covers the current ordered baseline, including `0010`.

## Acceptance contract

Before merge:

- pure decision-engine unit tests pass;
- tenant/auth/entitlement/rate-limit integration contracts pass;
- regression tests prove there is no Block 18 business-state mutation path or Block 18 SQL migration;
- the existing customer-baseline guard remains green without changing the manifest;
- full tests, typecheck and production build pass;
- branch is synchronized with the then-current `main` if unrelated work lands.

After merge:

- green `main` CI;
- production Vercel deployment is READY and the production alias serves the merged Block 18 version;
- `/api/health` returns 200 with `status=ok` and `database=ok`;
- production and staging Supabase stay healthy;
- the inherited baseline/Fresh Install proof state stays unchanged;
- Water-K stays `pilot` / `pro`, with its product/variant/order/onboarding invariants unchanged.
