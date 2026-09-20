# B2B customer RFQ — shared storefront capability

Date: 2026-09-20  
Scope: Draft PR #346 / `feature/playroom-v20-functional-acceptance`

## Purpose

The B2B request-for-quote workflow is implemented as a shared, template-agnostic commerce capability. It is not owned by Playroom and must remain reusable by every storefront template.

## Customer account contract

The canonical account capability registry exposes core customer functions and conditionally exposes:

- `B2B szervezet` when the customer has a B2B account;
- `Ajánlatkéréseim` only for an approved reseller/B2B purchase authority;
- `Hűségprogram` only when the tenant loyalty program is enabled.

Digital purchases and documents are intentionally separate:

- `/fiokom/letoltesek` — digital entitlements/downloads;
- `/fiokom/dokumentumok` — invoices, order documents, warranties and product documents.

## RFQ authority

The customer RFQ draft/submission layer stores account-scoped requests in `b2b_quote_requests` and `b2b_quote_request_items`.

A submitted request does not create a second offer engine. It enters the existing commercial pipeline as a tenant-scoped `commercial_opportunities` record and sales task. Merchant offers continue to use the existing commercial offer authority, margin guard, audit and transition contracts.

Customer offer acceptance is permitted only when:

1. the caller has current B2B purchase authority for the tenant;
2. the request belongs to the caller's B2B account;
3. the offer belongs to the request's opportunity;
4. the offer status is `sent`.

Acceptance reuses `transition_commercial_offer_v2`; opportunity closure and sibling-offer handling therefore remain canonical.

## Quantity authority

RFQ quantities are not trusted from the UI. The database RPC validates both `minimum_order_quantity` and `order_multiple` before a draft can be saved.

## Storefront / Builder contract

All product templates receive the shared `commerce.b2b-quote-cta` capability through common composition. Runtime authority hides the component for non-eligible customers. Approved B2B customers receive an `Ajánlatot kérek` action linked to `/fiokom/ajanlatkeresek?variantId=...`.

Builder preview uses fixture data only; it never grants real B2B authority.

## Release evidence required

Because this slice adds a customer-baseline migration, acceptance requires:

- normal CI quality tests;
- TypeScript;
- production build;
- customer database baseline guard;
- Fresh Install proof on an exact commit containing the baseline migration.

Production database mutation is explicitly out of scope for this proof.


## 2026-09-20 live acceptance incident — draft duplication + submit failure

Human acceptance proved draft creation, but submitting the same form produced a second draft and returned the generic failure message.

Two independent defects were confirmed:

1. The customer manager always called the save RPC with `requestId:null`, so every save/submit cycle created a new draft instead of reusing the current one.
2. The submit RPC inserted the sales task with `on conflict(task_key)`, while the real database uniqueness authority is `sales_tasks_instance_key_uidx(instance_id,task_key)`. PostgreSQL rejected the submit with: `there is no unique or exclusion constraint matching the ON CONFLICT specification`.

Resolution:

- the customer manager resumes the latest single-item draft when entering the account RFQ page without an explicit product deep-link;
- subsequent save/submit calls reuse that draft id;
- successful submit clears the active draft id only after the submit RPC succeeds;
- the submit RPC now targets `on conflict(instance_id,task_key)`;
- the original migration/customer baseline are corrected for fresh installs and a forward migration repairs already-installed staging/customer databases.


## 2026-09-20 live acceptance incident — sales workspace responsive collapse

Human acceptance on both Android native mobile and Android "Desktop site" mode exposed a second, independent presentation defect after the RFQ handoff itself had already succeeded.

Observed failure:
- the seven-column `/admin/ertekesites` opportunity table stayed in desktop-table geometry on native mobile;
- the RFQ type/summary and offer form were squeezed to character-wide columns;
- in touch Desktop-site mode the table was allowed to compress instead of preserving a usable desktop minimum width and scrolling inside its own table wrapper.

Resolution:
- the opportunity table now opts into the shared `adminMobileCardTable` contract with explicit `data-mobile-label` cells;
- offer actions/forms expose stable responsive hooks and become one-column, full-width controls on native mobile;
- desktop and touch Desktop-site keep a real wide table (`1180px` minimum) inside `adminTableScroll`, so the table scrolls rather than crushing content;
- native mobile and Desktop-site remain separate responsive contracts. Browser/Desktop-site mode is never used as a substitute for mobile card layout.


## Quote conversion probability — learning mode

Product decision accepted on 2026-09-20:

- the underlying commercial probability capability remains in place; it is not deleted;
- synthetic/default RFQ probability (currently a fixed bootstrap value) must not be presented to merchants as if it were an evidence-backed forecast;
- the Sales workspace therefore hides both the visible `Becsült esély` field and probability-weighted `Várható érték` KPI until enough tenant-specific outcome history exists;
- launch-visible KPIs use factual values only: open opportunity value, open opportunity count, overdue opportunity value and open task count;
- Shoperation begins collecting quote lifecycle evidence immediately from the existing RFQ/opportunity/offer authorities, so the learning period starts from launch rather than from a later feature release.

Activation policy for a future visible estimate:

1. minimum learning age: **3 months**;
2. minimum evidence volume: **30 closed quote outcomes** for the tenant;
3. if the evidence threshold is not met after 3 months, learning continues silently;
4. by **6 months**, activation is still evidence-gated — elapsed time alone must never force a percentage;
5. the visible estimate must identify its evidence basis, including sample size and calculation time;
6. if confidence/evidence quality drops below the accepted threshold, the probability UI must hide again rather than fall back to a fabricated default.

Future probability metadata should distinguish source and evidence, e.g. historical/manual/model source, sample size, confidence and calculated-at timestamp. The initial implementation should prefer transparent historical conversion statistics over an opaque model.
