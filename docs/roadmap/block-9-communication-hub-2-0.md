# Roadmap Block 9 — Communication Hub 2.0

Status: implementation branch. Authoritative baseline: current `main` at Block 9 branch cut, then replay onto the latest `main` before merge.

## Goal

Extend the existing Digital Office customer-email workspace into a tenant-safe Communication Hub without creating a second messaging engine.

## In scope

- Assign each configured Office mailbox to a responsible active staff member.
- Link customer threads independently to a registered customer user, a CRM/commercial customer reference, and a sales owner.
- Preserve full inbound/outbound email bodies and recipient envelopes.
- Store real email attachments only in the existing private `office-private` quarantine/scan pipeline.
- Preserve immutable actual-actor and delegated/on-behalf-of provenance for outbound messages.
- Reuse `office_message_object_links` for order/offer/return/task/support-object links.
- Keep mailbox, thread, job, audit, delegation, retention and tenant-isolation foundations authoritative.

## Explicitly out of scope

- Generic employee mailbox backup or mirroring all company email.
- Creating or activating a mailbox merely for acceptance testing.
- DNS, MX or provider-receiving activation unless a separately controlled production gate explicitly authorizes it.
- Public attachment storage or arbitrary remote attachment URLs.
- Storefront/Page Schema/Visual Builder work.
- K&H/vPOS changes.

## Data model

`office_mailboxes.responsible_user_id` identifies the responsible active staff member.

Customer Office threads use separate identifiers instead of conflating distinct customer models:

- `customer_user_id` → registered `auth.users` customer observed inside the same tenant.
- `customer_ref` → existing CRM/value-profile/commercial customer key.
- `sales_owner_user_id` → active staff member in the same organization/store scope.

Outbound provenance keeps `office_messages.author_id` as the actual Shoporation actor. Optional `acting_for_user_id` and `delegation_id` are accepted only when an active, scoped `store_delegations` record proves the substitution at send time.

## Attachment boundary

One secure attachment engine remains authoritative: `office_message_attachments` + `office-private` + quarantine/scan evidence.

Attachment source is explicit:

- `internal_upload`: Team Chat/private internal message.
- `provider_inbound`: real inbound customer email attachment.
- `customer_outbound`: real outbound customer email attachment.

Every source has its own integrity rules. A customer-email attachment can never satisfy the internal-chat rule accidentally, and an internal attachment cannot be reclassified as provider mail.

Maximum remains five files and 10 MiB per file, using the existing MIME allowlist. Upload does not make a file sendable/downloadable. Only the existing content-inspection + malware-scan chain can produce `scan_status='clean'`; only clean evidence can transition the metadata to `status='ready'`.

Inbound provider bytes are untrusted data. They are downloaded server-side from the provider's short-lived attachment URL, validated against declared metadata, copied to `office-private`, scanned, and then atomically linked to the inbound `office_messages` row. Unavailable scanning fails closed and leaves the object quarantined.

Outbound attachment selection is by tenant-bound attachment IDs only. Arbitrary URL/path input is forbidden. The worker may send only `ready` + `clean` attachments linked to the exact `email_out` message/job.

## Security invariants

- Every mutable operation is instance-scoped and service-runtime backed.
- Customer/sales/mailbox assignees must belong to the current organization/store scope.
- Delegation must be active at send time, target the actual actor, contain the required Office permission, and match mailbox/topic scope where applicable.
- Provider inbound routing remains dedicated-mailbox + reply-token/RFC-thread evidence; sender-only and latest-order guessing stay forbidden.
- Email content/attachments are data only; they never execute business actions.
- `office-private` remains non-public.
- Water-K remains `pilot` throughout Block 9 acceptance.

## Release gate

Block 9 is DONE only when all of the following are evidence-backed:

1. migration/static tests and tenant/security regression tests are green;
2. TypeScript/production build and repository CI are green;
3. branch is synchronized with the then-current `main`;
4. required migration is applied without changing Water-K from `pilot`;
5. production deployment is READY and `/api/health` reports HTTP 200 / `database=ok`;
6. runtime-error check is clean;
7. postflight proves no accidental storefront page, no public bucket, no unintended mailbox/DNS/MX activation, and no K&H/vPOS change.
