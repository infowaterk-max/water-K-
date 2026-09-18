# Shoperation Support Knowledge Baseline v1

Created: 2026-09-09

Purpose: initial consolidated support knowledge derived from the implemented Shoperation platform contracts, current repository evidence and previously verified development/acceptance experience.

This file is a **living baseline**, not a frozen specification. Every historical resolution must be checked against the current release before reuse.

---

## A. Implemented platform/support foundations

### SKB-001 — Tenant isolation is a release and support invariant

- status: `implemented`
- evidence: `documented_contract`
- scope: `global`
- area: `tenant/security`
- symptom: A merchant/support actor could potentially see or mutate another webshop's objects if tenant scope is lost.
- root cause: Missing or bypassed tenant/instance scoping is a platform-severity defect, not a normal support configuration issue.
- diagnostic:
  - identify the current webshop instance explicitly;
  - verify access is scoped by tenant/instance and user/role;
  - use a negative test: tenant A must not be able to read or mutate tenant B orders, products, settings or integration objects.
- resolution: restore/repair the authorization and tenant-scope contract; do not work around it with UI hiding.
- verification: negative cross-tenant access test passes.
- automation: `HUMAN_REQUIRED`
- risk: `critical`
- notes: Any suspected cross-tenant leakage is an incident/escalation, never an auto-fix opportunity.

### SKB-002 — Fresh customer provisioning must never replay legacy migrations

- status: `implemented`
- evidence: `documented_contract`
- scope: `global`
- area: `database/provisioning`
- symptom: A new customer environment contains historical customer-era assumptions, data, branding or incompatible migration state.
- root cause: Historical `supabase/migrations` is provenance for existing environments, not a fresh-customer template.
- diagnostic:
  - run the customer baseline guard;
  - inspect the fresh-customer manifest/status;
  - verify the environment was created from the neutral customer baseline only.
- resolution: provision from `supabase/customer-baseline/`; existing environments receive forward migrations only.
- verification:
  - neutral schema starts without products/customer identity/credentials;
  - default package is `alap`;
  - tenant isolation and order E2E pass.
- automation: `HUMAN_REQUIRED`
- risk: `critical`
- notes: Never “repair” this by replaying the legacy chain into a paying customer's fresh database.

### SKB-003 — Release/support diagnosis is fail-closed

- status: `implemented`
- evidence: `documented_contract`
- scope: `global`
- area: `release/operations`
- symptom: A release or support check has incomplete evidence but appears healthy because missing data is treated as success/empty state.
- root_cause: Fail-open interpretation of missing build, audit, provider, database or runtime evidence.
- diagnostic:
  - distinguish “verified empty” from “could not load”;
  - require explicit health/evidence for critical gates.
- resolution: stop promotion or mutation until evidence is complete.
- verification: required CI/build/database/tenant/smoke evidence is explicit and green.
- automation: `DIAGNOSE_ONLY`
- risk: `high`
- notes: Production ad-hoc fixes are not the default recovery path; use a known rollback/forward-fix procedure.

### SKB-004 — Payment lifecycle must remain tenant-scoped, signed and idempotent

- status: `implemented`
- evidence: `documented_contract`
- scope: `global`
- area: `checkout/payment`
- symptom: Payment retries/callbacks produce inconsistent states, duplicate effects or affect the wrong order/tenant.
- root_cause: Missing payment-attempt isolation, signature validation, idempotency or server-only secret handling.
- diagnostic:
  - confirm a unique payment attempt exists;
  - verify callback/webhook signature validation;
  - check repeat webhook idempotency;
  - verify retry affects only the owning order;
  - confirm provider secrets never reach the client.
- resolution: repair the payment lifecycle contract before accepting transactions.
- verification: success/failure/retry paths remain isolated to the correct tenant/order.
- automation: `HUMAN_REQUIRED`
- risk: `critical`
- notes: Payment credentials, provider activation and financial state changes are not generic auto-fix actions.

### SKB-005 — Integration setup uses selection-first progressive disclosure

- status: `implemented`
- evidence: `documented_contract`
- scope: `global`
- area: `integrations/payment/shipping/invoicing`
- symptom: Merchant cannot understand which provider is active/configured or is exposed to irrelevant credential/setup fields.
- root_cause: Provider setup UI/configuration mixing selection, credentials and verification without an authoritative server-side state.
- diagnostic:
  - identify selected provider;
  - inspect server-side connection/config/verification state;
  - do not infer readiness from UI selection alone.
- resolution: selected provider exposes its setup; server-side secrets, verification and audit remain authoritative.
- verification: only the selected provider's detailed setup/actions are exposed and the backend state matches the UI.
- automation: `CONFIRM_FIX`
- risk: `medium`

### SKB-006 — Basic Support ticket/message foundation already exists

- status: `implemented`
- evidence: `code_and_test_verified`
- scope: `global`
- area: `support/ticketing`
- symptom: Merchant needs a support case and conversation history.
- context:
  - customer case centre combines support and returns;
  - ticket detail requires authenticated ownership and current instance scope;
  - closed tickets disable replies;
  - admin support has a priority queue, `urgent` handling and 48+ hour aging signal.
- diagnostic:
  - verify ticket belongs to current instance and user where customer-scoped;
  - inspect ticket status, priority and message thread.
- resolution: use/extend the existing ticket primitives rather than creating a disconnected second support store.
- verification: repository contract tests cover authenticated ownership, support messages, admin priority queue and explicit closed-state handling.
- automation: `DIAGNOSE_ONLY`
- risk: `low`
- notes: Future Support Intelligence should extend this foundation with central operator dashboard, support access/session, AI triage, diagnostics and resolution memory.

### SKB-007 — Support changes already participate in the audit model

- status: `implemented`
- evidence: `code_and_test_verified`
- scope: `global`
- area: `support/audit`
- context:
  - audit action labels already include `support.ticket_updated` and `support.reply_added`;
  - support ticket state/reply writes are coupled with audit writes;
  - admin audit is instance-scoped and presents actor plus human-readable before/after state.
- diagnostic:
  - correlate ticket id, actor, action, before/after and timestamp;
  - if audit data cannot be loaded, do not treat it as “no events”.
- resolution: future support sessions/actions must reuse and extend this audit chain rather than create untracked side effects.
- verification: support mutation + audit atomicity tests remain green.
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### SKB-008 — Loyalty starts safely disabled

- status: `implemented`
- evidence: `code_and_test_verified`
- scope: `global`
- area: `loyalty`
- symptom: A newly provisioned merchant unexpectedly starts awarding loyalty points.
- root_cause: Unsafe default enablement or earning logic that ignores program/accrual switches.
- diagnostic:
  - inspect `enabled` and `accrual_enabled`;
  - verify automatic earning returns no points while either switch is off.
- resolution: new/default configuration remains `enabled=false`, `accrual_enabled=false`; merchant mutation requires store-manage permission and is audited.
- verification: loyalty configuration regression tests and audit event checks pass.
- automation: `CONFIRM_FIX`
- risk: `medium`
- notes: Do not “repair” disabled loyalty by enabling it unless merchant intent is explicit.

---

## B. Historical verified development/acceptance knowledge

Historical entries are useful shortcuts but require current-version validation.

### SKB-101 — Production provider catalog missing while staging had expected providers

- status: `historical_verified`
- evidence: `production_verified`
- scope: `global_pattern_from_tenant_incident`
- area: `integrations/provider-catalog`
- symptom: Payment/shipping/invoicing choices appear missing or unavailable in production despite existing in staging.
- historical_context: Production provider catalog was observed empty while staging contained the expected provider set; the catalog was repaired/restored.
- diagnostic:
  - compare provider catalog cardinality and provider kinds against the expected release baseline;
  - distinguish missing catalog definitions from per-tenant connection configuration.
- root_cause: provider catalog state absent/incomplete in the production environment.
- resolution: restore the approved provider catalog through the controlled migration/seed path.
- verification: provider kinds/count and admin selection UI agree with the approved baseline.
- automation: `HUMAN_REQUIRED`
- risk: `high`
- notes: Never auto-copy arbitrary staging data into production. Only the neutral provider definitions are candidates for controlled reconciliation.

### SKB-102 — Selected integration is not the same as checkout-ready integration

- status: `historical_verified`
- evidence: `acceptance_verified`
- scope: `global_pattern_from_tenant_incident`
- area: `integrations/checkout-readiness`
- symptom: Merchant selected a payment/shipping provider but checkout still cannot use it.
- root_cause: Selection state existed while connection activation/readiness prerequisites were not satisfied.
- diagnostic:
  - inspect separately: selected → enabled/active → verified → checkout-ready;
  - do not infer readiness from a checked/selected UI item.
- resolution: complete the provider-specific activation/verification prerequisites, or keep the option unavailable fail-closed.
- verification: readiness checks and checkout smoke succeed.
- automation: `CONFIRM_FIX`
- risk: `high`

### SKB-103 — Customer-specific storefront hardcodes are contamination defects

- status: `historical_verified`
- evidence: `code_and_test_verified`
- scope: `global`
- area: `storefront/white-label`
- symptom: A tenant sees another customer's brand-specific text, threshold, marker or business rule.
- root_cause: historical customer-specific hardcode/fallback instead of instance configuration.
- resolution: remove customer-specific fallback and source runtime behavior from tenant/instance configuration; add white-label regression coverage.
- verification: neutral tenant does not render the historical customer string/business rule and intended tenant configuration still works.
- automation: `HUMAN_REQUIRED`
- risk: `critical`
- notes: This is also a Support AI memory rule: never promote one tenant's business settings into a global recommendation/default.

### SKB-104 — Vercel deployment rate-limit must not be misdiagnosed as application failure

- status: `historical_verified`
- evidence: `acceptance_verified`
- scope: `global`
- area: `deployment/operations`
- symptom: Preview/production deployment is unavailable/red while CI/application evidence is otherwise green.
- root_cause: platform deployment/build rate-limit rather than application regression.
- diagnostic:
  - inspect deployment failure reason separately from CI/test/build source results;
  - identify explicit rate-limit messages before changing code.
- resolution: avoid unnecessary rebuild loops; continue code/evidence work that does not require deployment and trigger the next build only when a consolidated testable batch is ready.
- verification: later deployment succeeds without code changes specifically targeting the rate-limit condition.
- automation: `DIAGNOSE_ONLY`
- risk: `medium`

### SKB-105 — Preview/login problems require environment-aware diagnosis

- status: `pending_validation`
- evidence: `acceptance_verified`
- scope: `global_pattern_from_repeated_acceptance`
- area: `auth/deployment`
- symptom: pilot account cannot log into a preview while another deployed environment works.
- root_cause: not yet promoted to a single reusable verified cause; environment/deployment state has repeatedly mattered.
- diagnostic:
  - identify exact environment/deployment first;
  - verify auth/session/callback/env configuration and deployed commit before modifying auth code;
  - do not assume a login symptom proves an application auth regression.
- resolution: case-specific until a repeatable root cause is verified.
- verification: successful login on the exact intended environment.
- automation: `DIAGNOSE_ONLY`
- risk: `high`

---

## C. Approved Support Intelligence design decisions

These records are **design decisions**, not claims of current implementation.

### SKB-D01 — Central Support Admin dashboard

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/operations`
- requirement:
  - central Support page for platform operator;
  - visible counts for open, in-progress, waiting-customer, waiting-support, critical, AI-resolved and closed cases;
  - ticket timeline shows requester, company/webshop, request, priority, timestamps, owner, diagnosis, actions and closure;
  - searchable/filterable by company, webshop, ticket id, user, provider, issue type, priority, status and date;
  - closed tickets remain auditable and may be reopened when the same case recurs.

### SKB-D02 — Two-stage Support Access, no merchant password sharing

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/access`
- requirement:
  - merchant grants support access from a Support page;
  - grant may wait long enough for an off-desk support operator to notice/respond;
  - privileged session timer begins only when the support operator accepts/opens the session;
  - access is scoped and time-limited;
  - merchant can see grant/session state;
  - support agent never needs the merchant's own admin password;
  - all privileged changes correlate to the support grant/session and audit trail.
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### SKB-D03 — Notification/escalation must work for mobile/off-desk operation

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/notifications`
- requirement:
  - new important tickets must not depend on a single transient in-app notification;
  - mobile-readable ticket summary should be available before activating privileged support access;
  - critical/business-blocking cases receive stronger escalation than normal configuration requests;
  - customer sees whether a case is received, waiting for support, active or resolved;
  - first-response expectations/SLA are explicit and separate from full resolution time.

### SKB-D04 — AI interprets; deterministic engines diagnose and mutate

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/ai`
- requirement:
  - AI performs natural-language understanding, intent/severity classification, context selection, explanation and playbook selection;
  - Diagnostic Engine obtains current facts from typed read-only tools/checks;
  - Action/Playbook Engine performs authorized state changes;
  - AI cannot execute arbitrary SQL or unrestricted admin actions;
  - payment, authorization, destructive and ambiguous operations remain human/confirmation gated.

### SKB-D05 — Support has three resolution classes

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/automation`
- requirement:
  - `AUTO_FIX`: deterministic low-risk fix with verification;
  - `CONFIRM_FIX`: system knows the likely fix but merchant/business intent is required;
  - `HUMAN_REQUIRED`: high-risk, financial, permission, credential, destructive or ambiguous change.
- verification: every automated mutation must have an explicit success check and audit event.

### SKB-D06 — Long-term Support Memory uses verified Resolution Records

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/memory`
- requirement:
  - do not rely on informal model memory as the source of truth;
  - store structured Resolution Records in Shoperation-controlled persistent storage;
  - retrieve same-webshop verified history first;
  - then retrieve version-compatible anonymized global patterns;
  - previous resolution is a shortcut to a targeted check, never an instruction to blindly repeat the old mutation;
  - store failed diagnostic attempts when they provide reusable negative evidence.

### SKB-D07 — Ticket closure produces a Resolution Record

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/knowledge-capture`
- requirement: closing a meaningful ticket should capture at least symptom, affected area/provider, root cause, diagnostic checks, successful fix, failed attempts if relevant, verification, actor type, release/component version and automation eligibility.

### SKB-D08 — Ticket timeline and system audit remain distinct but correlated

- status: `design_decision`
- evidence: `design_decision`
- scope: `global`
- area: `support/audit`
- requirement:
  - ticket timeline explains the support case to operator/merchant;
  - system audit proves the actual mutations;
  - both correlate by ticket/session/grant/action identifiers;
  - system audit keeps before/after state and actor identity.

---

## D. Initial playbook candidates

These are candidates for later implementation, not executable automation today.

1. `SHIPPING_METHOD_NOT_VISIBLE`
   - check provider selected/active/verified/readiness;
   - check country/zone mapping;
   - check checkout eligibility rules;
   - verify with checkout smoke.

2. `PAYMENT_PROVIDER_NOT_WORKING`
   - check provider state;
   - credential presence only (never expose secret values);
   - callback/webhook/config health;
   - recent payment attempts/errors;
   - signature/idempotency/runtime state;
   - escalate before financial/provider-sensitive mutation.

3. `EMAIL_NOT_DELIVERED`
   - inspect queue/send status;
   - provider/log evidence;
   - retry only via idempotent audited action;
   - distinguish configuration failure from downstream provider failure.

4. `PRODUCT_NOT_VISIBLE`
   - check channel visibility, status, stock/config, tenant/plan capability and storefront runtime configuration;
   - verify exact storefront route after fix.

5. `LOYALTY_NOT_EARNING`
   - check `enabled` and `accrual_enabled` first;
   - disabled program is a valid merchant state, not automatically a bug;
   - inspect eligible paid-order accrual only after configuration is confirmed.

6. `DEPLOYMENT_RED_BUT_CI_GREEN`
   - classify deployment-provider/rate-limit/environment failure separately from application/test regression;
   - do not burn repeated builds without new evidence.

---

## E. Support knowledge backlog

The baseline should be expanded from future development and from deeper historical extraction in these areas:

- K&H vPOS lifecycle and failure patterns;
- shipping provider readiness and checkout eligibility;
- invoicing/Számlázz.hu workflows;
- e-mail queue/provider/delivery incidents;
- Digital Office / Team Chat operational issues;
- B2B ownership, reseller approval, MOQ/order-multiple and price visibility;
- order/refund/return consistency;
- campaign/automation queueing;
- catalog/variant/bulk/CSV evidence rules;
- storefront runtime/template/page-schema failures;
- domain/auth/session/deployment environment mismatches;
- scheduled jobs/cron/loyalty evidence;
- role/RBAC/support-access permission incidents;
- production/staging configuration drift.

When a backlog item gains a verified diagnosis/resolution, promote it into a numbered SKB entry and mark its evidence level and automation class.
