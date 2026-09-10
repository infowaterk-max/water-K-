# Roadmap Block 10 — Business Pulse / Trial Intelligence

## Goal

Block 10 implements the accepted 30-day full-Pro trial as an auditable decision-support lifecycle. A trial webshop remains persistently `Alap` while temporary, instance-scoped `source='trial'` entitlements expose every currently released Pro capability. Reserved `teamChatSecureAttachments` and `apiAccess` capabilities are never granted by the trial.

The trial is only startable for a Pilot + Alap instance by a platform operator. It is not a hidden plan change. At day 30 the system produces a Business Pulse report that can recommend **Alap or Pro**, and activation remains an explicit decision.

## Business Pulse evidence

Each report persists three independent evidence layers:

1. `facts` — observed commerce evidence;
2. `calculations` — AOV, ratios, usage counts and data-quality declarations;
3. `recommendations` — plan and opportunity recommendations with confidence/reason codes.

Existing tenant-scoped sources are reused for recognized orders/revenue, customers, product performance, stockout events, campaign configuration and attributed revenue, checkout recovery, and measurable CRM/campaign/automation/procurement use.

No data is invented. Category performance remains unavailable until an authoritative catalog-category model exists. Actual campaign spend is not currently persisted, so configured budget and attributed revenue are shown separately and their ratio is explicitly **not ROAS**. View-only Pro usage that is not instrumented is declared as such rather than treated as non-use.

## Recommendation rule

Revenue alone never causes a Pro recommendation. The conservative v1 rule recommends Pro only when at least one is true:

- two measurable Pro capabilities were actually used;
- one measurable Pro capability was used and a separate relevant Pro opportunity is evidenced;
- two separate relevant-but-unused Pro opportunities are evidenced.

Otherwise the recommendation is Alap. Current opportunity evidence includes automation for open recovery/retention signals and procurement for stockout evidence when those capabilities were not used.

## Trial lifecycle

The existing single daily protected cron remains authoritative. Block 10 adds no second Vercel schedule.

- after 5 days without owner sign-in/admin activity, one inactivity reminder may be planned;
- about 7 days before expiry, one trial-status notice is planned;
- 2 days before expiry, one final reminder is planned;
- at day 30 the immutable Business Pulse report is generated and the recommendation notice is planned.

Notifications are transactional **Shoperation platform-account** messages. They use the existing outbound provider transport but do not depend on Digital Office/customer-email mailboxes, MX/DNS receiving, or Office attachment infrastructure.

## Non-activation and retention

A non-activated trial does not delete anything and does not set the whole tenant to `suspended`. The Business Pulse trial enters `paused`, the storefront access gate is paused, while the merchant admin and Business Pulse report remain reachable. The initial retention marker is exactly 30 days after trial end. Block 10 introduces **no automatic deletion/purge** at the retention boundary.

This distinction is intentional: pausing commerce must not destroy the evidence needed to choose a plan or reactivate the store.

## Activation

Alap or Pro activation is explicit. `service_activate_business_pulse_trial_v1` delegates the actual plan/status mutation to the existing audited `platform_mutate_webshop_config_v3(..., 'plan_status', ...)` authority. Activation sets the webshop to `active`, preserves all data/configuration, and records which plan was chosen. No automatic upgrade to Pro occurs merely because Pro was recommended.

## Full-Pro trial UX

During the active 30-day window the merchant admin navigation resolves with an effective Pro presentation even though `webshop_instances.subscription_plan` remains Alap. This prevents a hidden UX mismatch where direct Pro URLs work through trial entitlements but Pro menu items remain invisible. Once the trial ends, the effective Pro navigation disappears automatically.

## Security / launch invariants

- strict instance + organization binding and RLS for trial/report/event data;
- DB-level platform-operator authorization for start and activation;
- service-role-only lifecycle and notification mutations;
- exact temporary entitlements with natural expiry;
- no Office mailbox activation or provider-receiving setup;
- no public attachment storage;
- no Team Chat Secure Attachments release;
- no K&H/vPOS change;
- no Page Schema or Visual Builder work;
- no hardcoded Water-K mutation; Water-K can remain Pilot/Pro untouched;
- no automatic data purge.

The first Block 10 migration was compatibility checked in a rolled-back production transaction before commit. Production receives neither migration until repository/PR gates are green.
