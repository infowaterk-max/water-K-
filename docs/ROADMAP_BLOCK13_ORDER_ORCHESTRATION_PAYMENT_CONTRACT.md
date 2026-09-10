# Roadmap Block 13 — Order Orchestration & Payment Contract

## Canonical scope

Block 13 closes the already accepted order/payment orchestration contract. It does not replace the existing checkout, K&H vPOS, invoicing, shipping or return implementations. The mature database primitives that were hardened earlier are reused; this block makes their lifecycle vocabulary and acceptance guarantees canonical at application level so later roadmap work cannot silently fork order or payment semantics.

The minimum accepted scope is:

1. **One order lifecycle vocabulary**
   - `draft`, `pending`, `pending_payment`, `pending_transfer`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `refunded` are the canonical order states.
   - Direct admin status mutation has one shared transition contract.
   - `refunded` is deliberately not a generic admin status target; refund remains a dedicated payment/return operation.

2. **Provider-neutral payment state contract**
   - Verified payment callbacks use the shared `pending | paid | failed | cancelled | refunded | unknown` vocabulary.
   - Payment attempts use the shared `created | pending | requires_action | succeeded | failed | cancelled | expired | refunded` vocabulary.
   - Event-to-attempt state mapping and terminal-attempt semantics have one application source of truth, independent of a concrete gateway.

3. **Atomic order transition and side-effect evidence**
   - Tenant-scoped admin order mutation remains permission checked and database authoritative.
   - Status transition, audit/event evidence and the required e-mail/invoice/shipment/logistics outbox plan remain one database transaction.
   - A route-level success response is valid only when the RPC returns matching order and side-effect evidence.

4. **Verified callback atomicity and idempotency**
   - Provider verification happens before business-state mutation.
   - A verified callback is resolved to exactly one tenant/order before the transactional payment-event RPC is allowed to mutate payment/order state.
   - Payment event, payment attempt, order/order-event and required downstream integration evidence are committed atomically and duplicate provider events remain idempotent.
   - Failure to persist an already verified callback is retryable and returns HTTP 503 rather than being misclassified as an authentication failure.

5. **Safe customer payment retry and reconciliation**
   - A retry may operate only on the authenticated customer’s tenant-scoped `pending_payment` order and configured online provider.
   - Active/ambiguous previous payment attempts block unsafe duplicate sessions.
   - A successfully created provider session is attached to its attempt/order together with `payment_retried` evidence atomically.
   - If full reconciliation fails after an external session may exist, the provider reference/checkout URL and failure context remain durable as `requires_action` evidence; terminal payment attempts are never downgraded.

6. **Dedicated refund boundary**
   - Financial refund is not modeled as a generic status PATCH and never implies physical inventory return.
   - Manual admin refund remains limited to supported non-provider flows; online-card refunds require the payment provider’s verified refund path.
   - Block 13 does not initiate a real K&H or other provider refund/payment transaction as release evidence.

## Authority and isolation

The existing tenant/account/organization authority remains authoritative. Sensitive order/payment/refund SECURITY DEFINER RPCs stay service-role-only, while public/admin routes enforce the appropriate authenticated tenant scope before calling them. Provider references remain tenant-bound and ambiguous/cross-store resolution fails closed.

Block 13 introduces no new package tier or entitlement. Existing Basic / Pro / Add-on rules remain unchanged.

## Database and customer baseline decision

No new database schema is required for the canonical Block 13 scope. The required transactional primitives, indexes, event/outbox tables and hardened RPC privileges are already present in production and staging from the earlier core hardening work. Therefore Block 13 intentionally adds **no SQL migration** and does not advance the customer Fresh Install chain beyond `0001–0008`.

The Block 12 genuine Fresh Install proof remains valid: the customer-baseline manifest stays `status = ready` and `freshInstallProofRequired = false`. A new proof is required only when a later block actually changes the customer schema/baseline contract.

## Explicit non-scope

- no Page Schema / Templates runtime implementation (remains Roadmap Block 21);
- no Visual Builder, drag-and-drop canvas or inline storefront editor (remains Roadmap Block 22);
- no new payment, shipping or invoicing provider;
- no K&H credential, callback or production transaction changes;
- no production customer/order/product mutation for acceptance testing;
- no Water-K status change from `pilot`;
- no pricing/package redesign and no new entitlement source;
- no storefront design/template work.

## Acceptance contract

Block 13 is releasable only when all of the following are green:

- the canonical TypeScript order/payment contract is used by shared order types, the admin order mutation route and payment integration types/helpers;
- regression tests prove tenant/RBAC enforcement, atomic order + outbox evidence, verified-callback atomicity, retry/reconciliation durability, dedicated refund boundaries and service-role-only database authority;
- the full repository quality suite, TypeScript and production build pass;
- production/staging database state is unchanged by Block 13 and the existing customer baseline remains ready without a new proof requirement;
- Vercel production health is green after merge/deploy;
- Water-K remains `pro / pilot` and its existing product, variant and order rows are not altered for acceptance.
