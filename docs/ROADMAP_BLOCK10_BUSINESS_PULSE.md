# Roadmap Block 10 — Business Pulse / Trial Intelligence

## Accepted goal

Block 10 turns the previously agreed 30-day full-Pro trial into an auditable decision-support flow. The trial is not a hidden plan upgrade: the persisted `webshop_instances.subscription_plan` remains unchanged. Released Pro capabilities are granted with temporary, instance-scoped `feature_entitlements` whose validity is exactly the trial window.

At the end of the 30 days the system produces one immutable Business Pulse snapshot per trial. The report must be able to recommend either **Alap** or **Pro**. Revenue alone is never a Pro-upgrade rule.

## Evidence layers

The report stores three independent JSON evidence layers:

1. `facts` — observed/aggregated commerce evidence from authoritative tenant-scoped sources;
2. `calculations` — ratios, AOV, usage counts and data-quality declarations;
3. `recommendations` — plan and opportunity recommendations with confidence/reason codes.

This separation matches the existing admin reporting contract (`fact`, `calculation`, `recommendation`) and prevents recommendations from being presented as measurements.

## Measured scope

Authoritative sources already available in production are reused:

- recognized orders/revenue and customer counts;
- order-item product performance;
- inventory stockout events;
- campaign configuration/budget and attributed conversion revenue;
- checkout-recovery intents;
- CRM, campaign, automation and procurement usage evidence.

Two requested metrics are intentionally marked unavailable rather than inferred:

- **category performance**: there is no authoritative product-category model in the current catalog;
- **true campaign spend / ROAS**: actual campaign spend is not persisted. Configured budget and attributed revenue may be shown, but their ratio is explicitly not ROAS.

View-only Pro feature usage (for example executive/cash-flow page viewing) is also marked `not_instrumented`; absence of telemetry is not treated as non-use.

## Trial lifecycle

`service_start_business_pulse_trial_v1` is service-role only and callable by the platform-operator UI. It:

- accepts only `pilot` or `active` instances;
- refuses overlapping active trials;
- creates a 30-day trial row;
- creates temporary `source='trial'` entitlements only for currently released Pro features;
- never includes `teamChatSecureAttachments` or `apiAccess`;
- never mutates instance status or subscription plan.

`service_generate_business_pulse_report_v1` refuses early generation. `service_generate_due_business_pulse_reports_v1` is called by the existing protected daily `/api/cron/integrations` worker. Block 10 deliberately reuses the single daily Vercel schedule instead of adding a second cron. Due reports are generated idempotently.

## Recommendation rule

The first version is deliberately conservative and evidence based. Pro is recommended only when at least one of these is true:

- at least two measurable Pro capabilities were actually used;
- at least one measurable Pro capability was used and at least one separate Pro opportunity is evidenced;
- at least two separate relevant Pro opportunities are evidenced.

Otherwise the recommendation is Alap. The rule never uses a revenue threshold.

Currently measurable relevant-but-unused opportunities are:

- automation when open checkout recovery or retention-risk evidence exists and automation was not used;
- procurement when stockout evidence exists and procurement was not used.

## Security and launch invariants

- strict `instance_id` + `organization_id` binding;
- report/trial tenant guard;
- RLS on both new tables;
- authenticated clients get read-only access through membership policy;
- all mutations/RPC orchestration are service-role only;
- no Office mailbox/provider/DNS/MX activation;
- no public attachment storage;
- no Team Chat Secure Attachments release;
- no K&H/vPOS changes;
- no storefront/Page Schema/Visual Builder changes;
- Water-K status is not changed by Block 10.

The migration was syntax/compatibility validated in a rolled-back production transaction before repository commit; no Block 10 production schema object was left behind by that validation.
