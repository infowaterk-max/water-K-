# Shoperation Core — PO business acceptance register, Modules 1–4
**Record created:** 2026-10-12 (Europe/Budapest) · **GitHub tracking authority:** [#1259](https://github.com/infowaterk-max/water-K-/issues/1259)  
**Business acceptance:** Module 1 ACCEPTED; Module 2 (2.1–2.30) ACCEPTED; Module 3 (3.1–3.12) ACCEPTED; Module 4 (4.1–4.12) ACCEPTED.  
**Implementation / assurance status:** **NOT DONE / PARTIAL / UNPROVEN** until exact-source dependency/evidence proof. PO business acceptance ≠ implementation completion ≠ release approval.

> **RESUME RULE:** Every later Core-development or business review session must read this record, issue #1259, Module 3 audit, Module 4 audit, and the actual current Living Roadmap and main/PR status. Accepted decisions are **not open questions**. Before implementing a capability, cross-check latest explicit PO decisions against older package entries. Missing transcribed prose is **not** a license to guess or re-decide.

## Priority and coordination
1. Follow agreed sequence **Core capability complete → Core operational/adversarial proof → unified customer/merchant experience → Builder Core → Template Factory**. No arbitrary template diversion.
2. At the 2026-10-12 business handoff, a separate development session is finishing the bounded Digital Office **U11/B** task. Do not restart, alter, or automatically advance its development as a side effect of this record.
3. After business review, reconcile accepted requirements into the existing `quality/knowledge/living-roadmap.v2.json`, actual plan/entitlement/route/RPC/schema/CI tests; preserve active branch and exact-head guards. This register is a **decision crosswalk**, not a parallel runtime or roadmap.
4. Business decisions are frozen unless the PO explicitly changes one; improvements not needed for closure are future opportunities, not new launch P0 scope.

## M1 — Plans, trial, storage and recurring subscription
Business-closed. Accepted known values:

| Authority | Accepted rule | Scope / caveat |
| --- | --- | --- |
| Trial storage | **2 GB** | Trial |
| Alap storage | **5 GB** | Alap |
| Pro storage | **20 GB** | Pro |
| Video upload max | **50 MB per video** | Preserve upload cap |
| Storage thresholds | Notice at **80% / 95%**; stop new upload at **100%** | Does not silently delete previous media |
| Shoperation Points | **Pro: 2,000 Points/month** | No arbitrary AI expenditure without separately accepted policy |
| Recurring payment | Accepted for recurring plan/subscription billing | Distinguish merchant's plan billing from *consumer subscription commerce* in M2.30 |
| Storage expansion price | **UNDECIDED** | Do not invent tariffs or mark pricing closed |

The full original M1 numbered transcript was not exhaustively recovered in this pass. **M1 remains PO ACCEPTED**, and provenance/transcription is follow-up verification, not permission to silently adjust requirements.

## M2 — Product catalog (2.1–2.30)
Business-closed. Only grounded accepted points are summarized here; authoritative original per-subpoint wording should be linked/verified when retrieved. Missing prose ≠ missing PO decision.

| Point | Acceptance crosswalk (known, non-exhaustive) |
| --- | --- |
| 2.1–2.2 | Physical and digital product types, shared catalog/product lifecycle foundations. |
| 2.3 | Stockout and precise stock notifications; preorder behavior. |
| 2.4 | Real combinations each have own SKU/barcode, price, stock; selectable combination generation; nonexistent combinations not orderable. Sold-out variant visibly inactive, tooltip on desktop and comprehensible mobile status, cannot add to cart, exact-combination notification available. **Alap + Pro.** |
| 2.5–2.6 | Bundle = **one fixed purchased product**, not buyer-configurable ingredients; BOM component SKU/variant/quantity and component stock reservation; accepted pricing/discount basis. Shop the Look/Room is separate, advanced presentation. |
| 2.7–2.9 | Promotions/conflict/reference price; quantity price tiers. |
| 2.10 | Secure digital goods/files, unique activation-key stock and automatic delivery, supported external activation URLs. **Alap + Pro**. No automatic provisioning of third-party accounts in Market Ready. |
| 2.11 | Draft / active / hidden / archived; prefer archiving, never rewrite historical order snapshots. |
| 2.12 | Multiple categories per product without cloning, category-specific structured filtering; **Alap + Pro**. |
| **2.13–2.19** | **PO ACCEPTED; exact numbered text currently NOT VERIFIED.** Source-reconciliation required; do not infer or recreate subpoints. |
| 2.20 | Shared B2C/B2B product detail; applicable price, MOQ and direct purchase / RFQ. |
| 2.21 | DRS handling with distinct fiscal/invoice treatment; **Alap + Pro**, Market Ready. |
| 2.22 | Warranty and product/customer/order documents as distinct access scopes. |
| 2.23 | Verified buyer reviews, stars/moderation, no arbitrary censorship of negative reviews. |
| 2.24 | Product Q&A accepted; any unverified scoring detail **not authoritative**. |
| 2.25 | **Alap up to 2 active languages; Pro more**; manual translation in both; AI translation only when separately authorized/cost controlled (including applicable Points). |
| 2.26 | LOT, expiry, serial advanced scope later/Pro-oriented; not silently required for Alap launch. |
| 2.27–2.28 | Scheduled product visibility and basic personalizable products in accepted Pro / Market Ready scope, no parallel catalog authority. |
| 2.29–2.30 | Gift cards and consumer subscription commerce later/post-launch; some PO summaries specify Pro but roadmap describes specialized Add-on/post-launch. **Resolve provenance at future launch packaging review, never silently force Market Ready launch.** |

## M3 — Cart, checkout, orders, fulfillment and financial lifecycle
**Authoritative accepted-and-audited detail:** [`docs/audits/SHOPERATION_MODULE3_COMMERCE_CLOSURE_2026-10-11.md`](../audits/SHOPERATION_MODULE3_COMMERCE_CLOSURE_2026-10-11.md) and [merged PR #1237](https://github.com/infowaterk-max/water-K-/pull/1237). This audit's **PARTIAL/UNPROVEN verdict remains in force**.

| PO | Accepted business capability | Plan |
| --- | --- | --- |
| 3.1 | B2C guest checkout default (merchant may enforce registered B2C), approved B2B checkout, authoritative pricing/stock/idempotency | Alap+Pro |
| 3.2 | Durable guest/user cart, no implicit stock reservation, simple opt-in cart-recovery message | Alap+Pro; advanced multistep Pro |
| 3.3 | Standard shipping, method/zones/fees, parcel points, mixed physical/digital | Alap+Pro; advanced rules Pro |
| 3.4 | Provider-bound card/bank transfer/COD/pickup settlement, safe payment retry | Alap+Pro |
| 3.5 | Orders, multiple parcels, partial dispatch, fulfillment audit, basic bulk | Alap+Pro; advanced workflow Pro |
| 3.6 | Distinguish withdrawal/warranty/complaint/voluntary exchange, item-level return and verified refund, fiscal/stock coordination | Alap+Pro |
| 3.7 | Built-in **Számlázz.hu AND Billingo**, per-merchant credentials, issue/correct/storno, DRS/tax; no Shoperation connector surcharge (external provider fees possible) | Alap+Pro; advanced workflow Pro |
| 3.8 | Transactional order/payment/shipping/cancellation/return/refund email via shared authority; marketing separated; SMS later | Alap+Pro; advanced Pro |
| 3.9 | Merchant-created phone/email/in-person order via canonical commerce | Alap+Pro |
| 3.10 | State-dependent buyer-consented edits/cancellations with stock/payment/fiscal audit | Alap+Pro |
| 3.11 | Fail-closed incident/retry/reconciliation and basic merchant intervention | Alap+Pro; advanced Pro |
| 3.12 | Chargeback/dispute evidence, conflict prevention, provider-authoritative result | Alap+Pro |

No false refund, paid invoice or shipping claims. Maintain the complete downstream closure proof chain before DONE.

## M4 — Customer account, customer service and retention (4.1–4.12)
**PO business-closed on 2026-10-12.** Technical evidence and missing paths: [issue #1241](https://github.com/infowaterk-max/water-K-/issues/1241). **Warning:** #1241's internally numbered audit M4.x is a capability grouping, *not necessarily the same numbering as this PO acceptance register*. Match by feature description, not number alone.

### 4.1 Guest self-service and order lookup
A clearly discoverable public **footer “Rendelésem követése”** link is mandatory. Order number and matching email initiate lookup, but **cannot authorize protected order view**: verified owner-email, expiring scoped and replay-safe server token or equivalent proof required. Guest may see order/shipment/payment/invoice/document details as authorized and start permitted returns/refunds/support without registering. **Alap + Pro.**

### 4.2 Optional claim of earlier guest orders
After signup the customer may claim their own historical guest orders only after authenticated customer, matching email, *order confirmation proof/token*, correct tenant and unclaimed ownership checks. Revoke superseded guest credentials; never alter historical order, tax or fiscal snapshots. Synchronize genuine digital entitlements. **Alap + Pro.**

### 4.3 Unified customer account and collection
Orders/status/tracking, saved profile/addresses, **Ügyeim**, **Letöltéseim** paid digital access separately from **Dokumentumaim** invoices/manuals/warranties, wishlist, privacy preferences and purchased-item **Gyűjteményem** shared Core capability (not Loot Vault-only). Purchases/collection claims require verified factual evidence; independent of any template. **Alap + Pro.**

### 4.4 Baseline vs advanced B2B + one/many companies
Alap includes B2B partner registration and merchant approval, basic partner pricing, MOQ, simple **RFQ → offer → order**. Pro includes advanced member authority/approvals, contract pricing, exposure/spend/credit. Merchant can choose whether one authenticated personal account can use **one** or **multiple** separately verified companies in a tenant; selection affects current B2B context, never mixes companies' documents, prices, orders or identity. Safe when merchant policy changes. **Basic B2B + one/many option in Alap + Pro.**

### 4.5 Engagement
Heart icon wishlist storing intended SKU/variant with live availability/current price (not reservation); exact-SKU sold-out notifications by guest email or account with simple cancellation; verified-purchase star reviews, understandable moderation and own review history. **Alap + Pro.**

### 4.6 Addresses
Multiple saved delivery and billing addresses with labels and distinct defaults, HU postcode→city convenience, explicit opt-in for saving address from checkout. Do not mutate past orders/invoices; verified business-identity changes require reapproval. **Alap + Pro.** Current single saved-billing-profile code is not full completion.

### 4.7 Communication/privacy
One place for clear preference management. Transaction/security messages distinct from optional newsletters/offers/marketing; separately opt-in/out with consent/audit and effective send-time suppression, guest unsubscribe links. Data subject requests for access, rectification, export, lawful deletion/restriction through trackable **Ügyeim** cases (including verified guest), with lawful invoice/record retention. Ordinary core **Alap + Pro**, advanced segmentation Pro. This **does not grant Digital Office** to Alap.

### 4.8 After-sales cases
One customer-service journey with case ID, timeline, files/messages, registered+verified-guest access; distinguish withdrawal, warranty, defect, complaint, voluntary exchange, stateful modifications. Quantity/item-aware partial returns. Merchant vs platform incidents separated; payment provider authoritative refund outcome, fiscal correction and inventory reconciliation; no false PAID/REFUNDED status. **Alap + Pro** baseline, advanced prioritization/workflows Pro.

### 4.9 Buy again / saved checkout / replenishment
Manual repeat purchase of one or more previously purchased SKUs/items and secure saved-cart restoration **Alap + Pro**, revalidate live SKU, variant, channel, price, stock, MOQ/order multiples, promotions; no silent substitution, quantity correction or recurring payment. Simple, consent-respecting abandoned-checkout reminder from 3.2 remains Alap+Pro.

**Automatic purchase-frequency analysis / proactive replenishment reminders = Pro ONLY**. Merchant enables by choice (**OFF initially**); purchaser separately explicitly opts in (**OFF initially**) and can allow/disallow **each product** (simple per-product selector). Transparent reason, frequency cap, easy cancellation/withdrawal, effective suppression, no hidden purchase-frequency profiling for opted-out customers. Reuse E9 shared retention/communication; do not create new engine or elaborate calendars.

### 4.10 B2B package confirmation
**No new B2B engine/features added.** Reconfirm 4.4: registration/verified tax ID, simple pricing/MOQ, RFQ→offer→order, company switch policy, Ajánlatkéréseim/Ügyeim **Alap+Pro**; Pro advanced enterprise approvals/roles, contracts, spending and credit, automation/analytics. A later explicit PO decision supersedes older roadmap text that assigned *all* RFQ to Pro.

### 4.11 CRM / loyalty
Alap basic customer DB, history, customer groups and ordinary reports. Pro advanced CRM, LTV/value, segmentation, advanced campaigns and automations included in Market Ready. **Loyalty/points full program is deferred post-launch**, keep existing implementation but do not require closure for Market Ready, may advance only if core completion/assurance not harmed. Future package assignment not invented.

### 4.12 Business package closure
All M4 subpoints accepted **as business requirements**. Alap cannot lose guest claims, aftersales, returns, core B2B or essential email. Pro owns Advanced B2B/CRM/replenishment automation and **all Digital Office workforce features**. Enforce on API/action/route/job/database plus UI; tenant/cross-company/guest/expiry/negative tests required. Accepted != E2E verified.

## Entitlement reconciliation worklist (not fresh PO decisions)
| Priority | Drift/evidence | Expected action |
| --- | --- | --- |
| P0 | `MR1-PACKAGE-CAPABILITY-MATRIX` still says company B2B/RFQ Pro | Align to explicit later PO M4.4/M4.10 basic Alap; advanced Pro; server-sided regression tests |
| P0 | `docs/ROADMAP_BLOCK16_COMMERCE_AUTOMATION_RECOVERY.md` and E9 do not distinguish newly agreed proactive refill eligibility | Implement Pro-only, merchant opt-in + buyer opt-in + per-product controls, preserve simple Alap cart reminder |
| P0 | #1241 guest service currently account-only return route; consent/privacy/address book partial | Build/test bounded paths using existing authorities; do not assert DONE |
| P0 | Financial/provider/fulfillment chain M3 partial | Follow Module3 audit, provider sandbox & fail-closed evidence |
| P1 | Hűségprogram exists but postlaunch; CRM must remain Pro | Prevent accidental scope expansion; identify existing toggles and entitlements |
| P1 | Street Drop Release Bar previously accepted on Alap despite generic Special Commerce Pro | Preserve explicit exception; reconcile manifests/navigation/entitlements without automatic reassignment |
| Proof | Plan catalog alone is not the complete tenant entitlement authority | Verify plan sync, manual/trial overrides, revocation, negative tests, cross-tenant and backend enforcement |
| Source fidelity | M1 full original transcript and M2.13–2.19 wording not yet verified | Backfill from original accepted source **without changing acceptance**; mark source-text reconciliation PENDING, not product decision pending |

## Operational closure and implementation handoff
- Decision authority: explicit PO acceptance in conversations, captured persistently in [issue #1259](https://github.com/infowaterk-max/water-K-/issues/1259) and this register. Business scope conflicts require source reconciliation, **not assumption**.
- M3 audited source: `docs/audits/SHOPERATION_MODULE3_COMMERCE_CLOSURE_2026-10-11.md`.
- M4 source-evidence audit: [issue #1241](https://github.com/infowaterk-max/water-K-/issues/1241).
- Actual completion must pass Capability/Dependency Closure and exact-head CI, Truth/Lifecycle, applicable schema/staging provider and customer E2E/negative proofs; no claimed completion from file existence, positive CI alone or package navigation only.
- No code, DB, migrations, provider secrets, CI, Vercel/production settings are changed by this document.
