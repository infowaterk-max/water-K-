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
