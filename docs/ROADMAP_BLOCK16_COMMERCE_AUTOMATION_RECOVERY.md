# Roadmap Block 16 – Commerce Automation & Recovery

## Reconstructed canonical scope

Block 16 is the customer-facing/runtime completion of the already existing retention, replenishment, reorder and checkout-recovery foundation. It does **not** create a second retention scheduler, catalog, pricing, inventory, customer, order, payment or communication authority.

The accepted v1 boundary is the **E9 Retention & Reorder Experience** integrated with the existing customer journey/recovery backend and the shared storefront/Builder foundation.

Mandatory scope:

- intelligent replenishment and buy-again/reorder experiences from real server-authoritative retention evidence;
- recently purchased customer surfaces;
- context/profile replenishment surfaces that may consume E8 context but never hard-lock the catalog;
- post-purchase recommendation surfaces that consume existing E2/E7 discovery/structured-product evidence rather than inventing recommendation or attribute authority;
- authenticated saved-cart/checkout recovery using the existing expiring recovery-token flow;
- customer-account **Naprakész** active-process surface;
- Builder-ready component contracts for Reorder, Recently Purchased, Buy Again, Profile Replenishment, Post-Purchase Recommendations and Saved Cart Recovery;
- reuse of existing lifecycle journey kinds: `post_purchase`, `replenishment`, `winback`, `abandoned_checkout`;
- existing consent/suppression checks, idempotent journey enrollment/dispatch and stale-journey reconciliation remain authoritative;
- existing stock-availability notification flow may participate in recovery communication, but Block 16 does not replace its notification authority;
- current commerce state must be revalidated before mutation: product/variant eligibility, channel visibility, current price, stock, MOQ and order multiple;
- no silent product replacement and no silent quantity correction.

## Reused Shoperation foundations

Block 16 explicitly reuses:

- `shoporation.retention-reorder-engine.v1` (E9);
- E8 Profile Context and E2/E7 discovery/structured-product authority where relevant;
- `customer_journeys` / `customer_journey_steps` and tenant-aware retention planner/dispatcher;
- `checkout_recovery_intents` and `/kosar/visszaallitas` recovery flow;
- the existing communication queue/worker, marketing consent and suppression authority;
- existing stock-notification communication flow;
- existing customer account and Growth/merchant-intelligence surfaces;
- the existing Storefront Builder Foundation and context/retention component registry.

## Authority, privacy and safety boundaries

Customer recovery data is loaded server-side only after authenticated customer resolution. Every privileged read is constrained by both `instance_id` and the authenticated `user_id`/`customer_id`; no cross-tenant or cross-customer recovery surface is permitted.

Marketing journey delivery remains consent-gated and suppression-aware in the existing communication authority. Transactional communication is not converted into marketing communication and remains higher priority. Block 16 does not weaken enqueue/send-time checks.

Recovery UI is evidence, not mutation authority. A saved checkout uses the existing recovery-token route, while reorder surfaces require server retention authority and current commerce revalidation. Historical purchase price is never treated as current price authority.

## Explicit non-scope

Block 16 does not include:

- automatic recurring orders or recurring card charges;
- subscription commerce (separate future Add-on);
- generic workflow/event automation (later roadmap block);
- AI-assisted merchandising/decisioning or predictive revenue optimization;
- Page Schema/Templates implementation (Block 21);
- Visual Builder / drag-and-drop / inline storefront editor (Block 22);
- supplier feed/API sync;
- automatic catalog enrichment;
- marketplace bulk publishing;
- advanced PIM/ERP connectors;
- AI-generated product data.

The Builder-ready component manifests added here are runtime contracts only. They do not introduce a new Page Schema version or editing canvas.

## Database and customer baseline

Block 16 is implemented on top of the existing production retention/journey/recovery schema. It adds **no SQL migration and no sellable customer-database contract change**.

Therefore the genuine Block 14 Fresh Install proof for ordered customer baseline `0001–0009` remains authoritative. The manifest must remain unchanged (`status=ready`, `freshInstallProofRequired=false`) unless a later change actually modifies the customer DB contract.

## Acceptance contract

Before merge:

- Block 16 unit/regression/security tests pass;
- existing E9 tests stay green;
- full CI, customer-baseline guard, typecheck and production build pass;
- branch is synchronized with the then-current `main` if unrelated work lands;
- no production customer mutation is used for acceptance.

After merge:

- green `main` CI;
- production Vercel `READY` and production alias active;
- `/api/health` 200 / `status=ok` / `database=ok`;
- production and staging Supabase healthy;
- customer baseline manifest/proof unchanged because no DB contract changed;
- Water-K remains `pilot` / `pro` with its existing product/variant/order/onboarding invariants unchanged.
