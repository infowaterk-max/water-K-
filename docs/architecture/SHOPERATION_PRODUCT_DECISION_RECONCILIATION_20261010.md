# Shoperation – Product decision reconciliation checkpoint (2026-10-10)

**Scope:** product authority synchronization only, not implementation, billing, database migration, or release acceptance.

**Single canonical source of truth:** `quality/knowledge/living-roadmap.v2.json`. This document records evidence, discrepancies and pending decisions; it must **not** be interpreted as a second authority, entitlement grant, release proof or new implementation specification. Later explicit Product Owner decisions supersede older package narratives. #1186 and #1228 remain **PARTIAL/BLOCKED** until their complete capability dependencies and runtime proof close.

## Reconciled, accepted into Living Roadmap v2 in F24

**Product Owner decision accepted 2026-10-09**: Alap is a complete B2C webshop **and an independently usable simple B2B webshop**. Alap must support simple partner registration and merchant approval, partner groups, standard partner prices, minimum order quantity/order multiples, and simple PDP RFQ/Ajánlatkérés to merchant review/basic offer, acceptance and order. This must not need Digital Office, `officeCommunicationAdvanced` or Team Chat.

**Pro is incremental**: multi-member company buying permissions and audit, verified/reverified identities, contractual/negotiated complex price lists, multi-stage RFQ/opportunity/approvals, delegated work, purchase thresholds, spending/credit limits and maker-checker controls. Digital Office and Team Chat remain **Pro-only**, with full server-authoritative entitlement enforced through catalogue, admin navigation, API and database. Ordinary customer/order notification delivery is an Alap service, **not** a Digital Office dependency.

**Repository discrepancy resolved only in product authority**: before F24, `MR1-PACKAGE-CAPABILITY-MATRIX.scope[8]` placed *all* RFQ, partner pricing and MOQ in Pro; the structured `packageMatrix.alap.capabilities` lacked any simple B2B/RFQ, and `packageMatrix.pro.capabilities` bundled both simple and advanced paths. F24 corrects narrative **and** structured package matrix and prepends the Alap/Pro distinction to `B2B-MATURITY.scope`. It does **not** certify those features are already implemented. Original package roles, original 67 roadmap item IDs/statuses, Builder priorities and Pro-only Office exclusions are unchanged.

## Accepted product decisions recorded for later *separate* authority synchronization

These other-chat decisions are **not applied to runtime or roadmap commercial policy in F24**. They require a separately scoped, evidence-backed product decision sync and commercial/technical dependency audit before implementation:

| Decision | Accepted state | Current disposition |
| --- | --- | --- |
| Trial commercial operation | A Trial webshop may make real sales; on Trial only a `*.shoperation.hu` subdomain, no custom domain | Accepted; separate domain/checkout/account capability reconciliation pending |
| Paid custom domain | Custom domain is part of the paid-package launch checklist / Quick Step Guide | Accepted; launch readiness dependency review pending |
| Account shop allowance | Trial: 1 webshop. Paid Alap: up to 3 Alap shops, with 2nd/3rd +10,000 HUF each. Paid Pro: up to 3, with 2nd/3rd Alap +10,000 HUF or Pro +15,000 HUF each. Agency: unlimited shops; price undecided | Accepted allowance/prices except Agency; account/billing/tenant plan authority review pending |
| Shop archiving | Never-activated Trial: 30 days. Previously activated webshop: first 90 days in restricted active state, days 91–365 cold archive | Accepted lifecycle; data retention/legal and recovery/backup/deletion proof pending |
| Merchant-initiated pause | No fee, at most one year | Accepted; separate lifecycle implementation and audit pending |
| Repeat pause conditions | Whether another pause requires 12 months of continuous paid subscription | **OPEN – do not encode rule or automatic lifecycle action** |

The above are from recent Product Owner discussions, **not inferred from implementation**. A pending decision may not be silently filled with a default. Product changes must pass Capability Closure dependency requirements before DONE.

## Mandatory pre-implementation synchronization gates

1. **B2B / RFQ code** – Before edits: reconcile `plan_capability_grants`, catalogue gating, product/detail page RFQ, merchant response/admin UI, buyer account cases, price/MOQ/partner access, quote acceptance→order, external customer notifications, persistence, API authorization, invoice/order accounting and tenant/security guards. Verify end-to-end Alap simple RFQ **without any Pro Office grant**. Pro must add governed workflows without stealing the Alap path. F24 is metadata only; **runtime implementation remains BLOCKED until scoped and tested**.
2. **Digital Office / Communication Hub 2.0 / Alap–Pro entitlements** – Cross-check newer accepted Pro-only Digital Office rules with legacy Alap grants, Pro downgrade, `officeCommunicationAdvanced`, admin UI/API/server/DB and actual Fresh Install. No new entitlement implementation until the PO decision- and dependency-chain reconciliation is complete. F23 locally proved only 69 SQL migrations on isolated PostgreSQL with a minimal Supabase fixture, not native Supabase/JWT/provider proof.
3. **Trial, multiple shops, domain, archive and pause runtime** – Audit billing/account/tenant schema, subscription, expiry notices, real sales, domain setup, data export, legal retention/deletion, store reactivation and all notification jobs before any lifecycle write. Keep the repeat-pause rule explicitly OPEN and Agency pricing unset.
4. **Independent, nonblocking work** – Control Plane assurance, existing regression hardening, private local PostgreSQL rehearsal, source dependency graph and non-product-changing security proofs may continue. No Builder/Template jump ahead of Core maturity gates.

### Claim ceiling

**Decision synchronized ≠ feature implemented ≠ PostgreSQL proof ≠ native Supabase proof ≠ integrated customer-ready capability.**

No hosted Supabase target, preview, CI workflow or production runtime was changed in F24. This checkpoint can only mark the accepted **Alap-simple / Pro-advanced B2B package boundary** as aligned in the canonical roadmap. Other decisions are staged for separate review rather than implicitly applied.

