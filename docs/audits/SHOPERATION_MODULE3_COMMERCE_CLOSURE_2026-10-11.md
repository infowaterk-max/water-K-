# Shoperation – Module 3 commerce dependency / closure audit

- **Assessment date:** 2026-10-11
- **Inspected source:** `main` @ `615700e74c25b0f87b33318402e24eeb5a44a032`.
- **Authority:** accepted PO functional decisions 3.1–3.12; canonical scopes in `quality/knowledge/living-roadmap.v2.json`.
- **Audit type:** bounded source/roadmap inspection, **not** live provider certification, staging acceptance, implementation completion, or proof of no other code paths.
- **Overall verdict:** **PARTIAL**. Accepted business behavior is not yet proven end-to-end. Do not mark any row DONE from this document alone.
- **Package principle:** baseline safe commerce, legal/financial correctness, essential integrations and recovery in **Alap + Pro**; configurable nonessential advanced workflow/analytics in **Pro**, reusing the canonical event/workflow authority.

## 1. Accepted capability-to-authority closure matrix

| PO ID | Capability, package entitlement | Canonical owner / roadmap | Evidence observed on inspected main | Launch closure proof required | Source-based status |
| --- | --- | --- | --- | --- | --- |
| 3.1 | B2C guest checkout default; merchant optional registered-only B2C; approved B2B, server price/stock/payment authority and duplicate-order prevention; Alap+Pro | `CORE-ENGINE-2`, `MR1-COMMERCE-OPERATIONS` | `src/app/api/orders/route.ts`, `src/lib/orders/tenant-checkout.ts`, idempotent `place_order_provider_v7_fulfillment_idempotent` RPC | Independent-tenant guest/login/B2B matrix; explicit registered-only preference enforced server-side; concurrent stock, double-submit and payment-failure replay | PARTIAL |
| 3.2 | Cart persistence, no cart stock reservation; simple consent-governed abandoned-checkout email Alap+Pro; advanced journey Pro | `MR1-COMMERCE-OPERATIONS`, `EMAIL-BUILDER-MARKETING` | `supabase/migrations/042_checkout_recovery_dispatch.sql`, `src/lib/communication/templates.ts` | Persist guest/auth carts, return visit and stock repricing; merchant-scoped consent/opt-out, suppressed retries, no unsolicited sending; permissions and recovery reporting | PARTIAL |
| 3.3 | Standard shipping choices, charges, threshold/restrictions/zones, physical/digital mixed checkout Alap+Pro; advanced rules Pro | `SHIPPING-FOUNDATION` | `src/lib/integrations/adapters.ts`, `src/lib/integrations/shipping.ts`, `src/app/api/orders/route.ts` | Per-provider sandbox credentials/health; parcel point, weight/size, label, webhook, status, unsupported method, digital-only/mixed and tenant isolation tests | PARTIAL |
| 3.4 | Provider-bound online card, transfer, COD and pickup settlement; payment statuses, safe retry and provider-specific method rules Alap+Pro | `PAYMENT-HUB-1` | `src/lib/integrations/types.ts`, `src/app/api/orders/[id]/retry-payment/route.ts` | Provider-success vs callback lag; no false PAID, signed webhook replay, refund correctness, safe **guest** retry (existing retry route currently requires authentication) | PARTIAL |
| 3.5 | Order view, updates, multiple parcels/partial dispatch, fulfillment audit/basic bulk work Alap+Pro; configurable workflow Pro | `MR1-COMMERCE-OPERATIONS`, `SHIPPING-FOUNDATION` | `src/app/api/admin/orders/[id]/route.ts`, `src/lib/integrations/processor.ts` | Real partial dispatch with independent line/package/tracking records, reserved/fulfilled stock accounting, order/email/invoice reconciliation; basic bulk not Pro-gated | PARTIAL |
| 3.6 | Withdrawal vs warranty/complaint vs voluntary exchange, buyer return entry and evidence, partial/full refund and stock/fiscal coordination Alap+Pro | `MR1-COMMERCE-OPERATIONS`, `PAYMENT-HUB-1`, `INVOICE-FOUNDATION` | `src/app/api/admin/returns/[id]/route.ts`, `src/app/fiokom/visszakuldes/page.tsx`, `src/app/api/admin/orders/[id]/refund/route.ts` | Guest return request via signed order link; card-provider refund (admin manual path intentionally rejects cards), refund amount and status confirmation, invoice correction and correct physical restock | PARTIAL |
| 3.7 | Merchant-bound Számlázz.hu **and Billingo** connectors with manual/automatic invoices, correction/storno/credit, tax/DRS itemization Alap+Pro; advanced workflow Pro; external fees borne by merchant | `INVOICE-FOUNDATION`, `MR1-HUNGARY-TAX-VAT`, `CONTROLLED-INTEGRATION-FRAMEWORK` | `src/lib/integrations/invoicing.ts` currently uses process-wide `SZAMLAZZ_AGENT_KEY`; only Számlázz.hu adapter was found; `InvoiceProvider` interface lacks correction/cancellation contract | **P0:** separate revocable verified merchant credentials per tenant; Billingo adapter; per-provider self-test; idempotent creation, provider-side reconciliation, full fiscal document lifecycle and DRS/tax bundle scenarios | PARTIAL / Billingo launch gap |
| 3.8 | Transactional order/payment/shipment/completion/cancellation/return/refund messages Alap+Pro; advanced configurable workflow Pro; SMS post-launch | `EMAIL-BUILDER-MARKETING`, `EVENT-DRIVEN-WORKFLOW` | `src/lib/integrations/email.ts` and `processor.ts` have `order_confirmation`, `payment_confirmed`, `order_shipped`, `order_completed`; separate communication templates cover additional message classes | End-to-end event coverage, no false shipment claims, transactional vs marketing consent, failed-delivery and idempotent retry; verify cancellation/refund notifications across both message paths | PARTIAL |
| 3.9 | Merchant-created phone/email/in-person orders with same authoritative commerce/finance path Alap+Pro; advanced B2B workflow Pro | `MR1-COMMERCE-OPERATIONS` | `src/app/api/admin/orders/[id]/manual/route.ts` edits existing order fulfillment metadata; no admin **new order** creation endpoint confirmed by targeted inspection | Admin create, customer lookup/create, B2B price/MOQ, line changes, stock reservation, payment request where provider supports it, invoice/audit, tenant guard and failed-path test | UNPROVEN / suspected gap |
| 3.10 | Address/item/quantity changes and cancellation with consent, delta payment/refund, stock/fiscal correction and audit Alap+Pro; advanced workflow Pro | `MR1-COMMERCE-OPERATIONS`, `PAYMENT-HUB-1`, `INVOICE-FOUNDATION` | `src/app/api/admin/orders/[id]/route.ts` handles state/tracking changes; manual route handles references | State-dependent immutable snapshots, pre-/post-dispatch restrictions, buyer-approved upgrades, atomic inventory changes, positive/negative delta settlement, invoice repair, audit, cross-tenant checks | UNPROVEN beyond status/reference updates |
| 3.11 | Observable per-order error, explicit intervention, safe retry/reconciliation, audit Alap+Pro; advanced prioritized workflow Pro | `MR1-COMMERCE-OPERATIONS`, `EVENT-DRIVEN-WORKFLOW` | `src/lib/integrations/outbox.ts`, `processor.ts`, `src/app/api/admin/integration-jobs/[id]/retry/route.ts` | Failed/uncertain provider receipts, safe recovery/no duplicate charge-invoice-label, Alap user permission to **basic** retry vs Pro-only `advancedIntegrations` endpoint, tenant boundary and evidence | PARTIAL / existing foundation |
| 3.12 | Chargeback/dispute evidence, order/payment linkage, notification, conflict prevention Alap+Pro; external provider is dispute authority | `PAYMENT-HUB-1` | `src/lib/integrations/types.ts` provider interface only requires `createPayment`, `verifyCallback`, optional `healthCheck`; no dispute contract found in targeted search | Supported-provider dispute event intake or explicitly bounded merchant manual case, event deduplication, evidence extraction, refund-dispute conflicts, merchant alerts, tenant and permission checks | UNPROVEN / contract gap |

**Status semantics:** PARTIAL = bounded implementation is visible, full accepted behavior is not proven. UNPROVEN = scoped code search did not establish an end-to-end path; **not** a repository-wide proof of absence. A missing provider contract is a concrete dependency gap. External service availability and tariff claims are outside this audit.

## 2. Required fix mapping; no new parallel engines

| Priority | Existing authority to complete | Specific discrepancy / closure obligation |
| --- | --- | --- |
| P0 | `INVOICE-FOUNDATION` + `CONTROLLED-INTEGRATION-FRAMEWORK` | Move Billingo from post-launch to launch; separate merchant account identity/secrets, secure connection wizard and self-test; provider-neutral issue / query / correction / cancellation with evidence and fail-closed behavior |
| P0 | `PAYMENT-HUB-1` | Add provider-authoritative full/partial refunds, confirmed financial status and provider-specific dispute handling; resolve guest retry without requiring registration; no unsafe charge/refund replays |
| P0 | `MR1-COMMERCE-OPERATIONS` + `SHIPPING-FOUNDATION` | Close order creation/edit/cancellation, buyer consent, fulfilment line and package truth, partial dispatch, mixed carts, guest returns and financial+stock reconciliation |
| P0 | `MR1-HUNGARY-TAX-VAT` + `INVOICE-FOUNDATION` | Configured DRS amount and quantity must be separately and legally correctly passed to invoice provider, never silently merged in product price |
| P0 | `EMAIL-BUILDER-MARKETING` + `EVENT-DRIVEN-WORKFLOW` | Ensure event coverage for cancellation/returns/refunds, transaction/marketing separation, bounded retries and failure visibility |
| P0 | `MR1-COMMERCE-OPERATIONS` + `EVENT-DRIVEN-WORKFLOW` | Ensure essential retry/incident administration is accessible to Alap; Pro `advancedIntegrations` restriction must never gate core operational recovery |
| P0 evidence | `SANDBOX-TEST-MODE` + `MARKET-READY-1-0` | Run real schema integration and provider sandbox matrix including duplicate/timeout/wrong-tenant/partial-success/fiscal/document/email failures. Preserve proof tied to actual source SHA and environment. |

**Provider product decision:** launch invoice adapters are **Számlázz.hu + Billingo**; any later third-party invoicing/ERP adapter remains `POSTLAUNCH-ADAPTER-ECOSYSTEM`. Integrated billing is included in Alap and Pro without an extra Shoperation integration charge. Merchants may incur their selected provider's own API/service charges.

## 3. Capability Closure Gate contract for this review

A Module 3 subcapability **may be marked DONE only when** its declared chain is closed and verified:

`merchant/admin/customer UI → tenant/actor permission → authoritative state/RPC → integration adapter → provider outcome reconciliation → inventory/payment/invoice/communication side effects → audit and failure path → automated tests + relevant sandbox/live-like evidence`.

Required qualities:
1. **No fabricated success.** A client callback, admin status toggle or a successful HTTP request is not the payment/refund/invoice/shipment authority by itself.
2. **No accidental duplicates.** Order, payment retry, invoice issue, shipment and refunds are idempotent and reconcile uncertainty before replay.
3. **Correct merchant isolation.** Provider tokens/keys, order numbers, document links and evidence never cross independent webshop tenants or legal businesses.
4. **Legally/financially correct documents.** Distinguish credit, correction, cancellation, sale, tax, DRS and partial returns by actual provider capability and verified source truth.
5. **No artificial Alap restrictions on essential operations.** Safe basic returns/recovery/bulk processing are Alap+Pro; configurable nonessential workflows, AI and deeper analytics may be Pro.
6. **No new commerce or automation authority.** The crosswalk calls for capability closure in existing engines only.
7. **No production mutation during audit.** This record is a specification and source-analysis handoff; no provider credentials were touched or live test transactions created.

## 4. Next verification sequence

1. Resolve concrete 3.7 and 3.4 P0 contract/tenant gaps and add direct regression tests first; separately establish merchant self-test for launch provider choice.
2. Trace 3.1–3.6 and 3.9–3.10 across checkout, order, return, fulfillment, stock, payment and fiscal side effects; close only missing end-to-end paths.
3. Validate 3.2, 3.8 and 3.11 email/workflow operation, legal consent, Alap/Pro access and exception-state recovery.
4. Exercise positive, negative, timeout, duplicate, wrong-tenant, zero-stock, mixed-cart, partial-shipment, guest and legal-document cases on an isolated test environment.
5. Update the evidence ledger and closure status **only after** actual test evidence exists; preserve unresolved cases as PARTIAL/MISSING.

**No redefinition of PO-approved plan split and no Builder/Template production dependency is introduced by this audit.**
