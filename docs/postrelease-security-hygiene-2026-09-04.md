# Post-release Security & Hygiene — 2026-09-04

## Scope and evidence standard

This checkpoint covers only the post-#56 Supabase Security Advisor findings and their release implications. It does not reopen the completed functional/release audit.

Production evidence captured on 2026-09-04 showed:

- `public.sync_product_recommendation_instance()` is `SECURITY DEFINER`, owned by `postgres`, has an empty `search_path`, and is attached only as the `product_recommendation_rules_sync_instance` trigger.
- Production incorrectly retained direct `EXECUTE` for `authenticated` and `service_role`; staging already had trigger-only ACL (`postgres` only).
- Every Advisor `RLS enabled / no policy` relation listed below had **no effective DML privilege for either `anon` or `authenticated`**. These relations are therefore intentionally fail-closed to Data API clients; no client policy should be added merely to silence the INFO lint.
- Production Supabase organization is on the **Free** plan. Leaked-password protection is a Pro+ Auth capability and remains a separate launch gate rather than a database migration.

## Trigger-only SECURITY DEFINER decision

`public.sync_product_recommendation_instance()` is not an application RPC. Its tenant responsibility is to derive `product_recommendation_rules.instance_id` from the recommended variant and reject cross-store/mismatched recommendation writes. The table's authenticated write authority remains governed by the existing `can_manage_catalog(instance_id, auth.uid())` RLS policy.

Final privilege contract:

- `postgres`: trigger owner/executor remains allowed.
- `public`: direct execute denied.
- `anon`: direct execute denied.
- `authenticated`: direct execute denied.
- `service_role`: direct execute denied; service writes continue through the table trigger, not through RPC invocation.

The incremental migration `20260904083000_recommendation_trigger_privilege_lockdown.sql` makes this explicit so final ACL no longer depends on environment-specific default function privileges.

## Intentional fail-closed RLS/no-policy inventory

The following Advisor INFO findings are **accepted as intentional fail-closed** because production privilege inspection showed `anon_any_dml=false` and `authenticated_any_dml=false` for every relation.

### Legacy archive schema

- `legacy_public_20260902.admin_audit_log`
- `legacy_public_20260902.coupons`
- `legacy_public_20260902.order_request_keys`

The legacy schema is not usable by client roles (`USAGE=false` for `anon` and `authenticated`) and is retained only as release/baseline history.

### Private/internal runtime

- `private.stock_notification_rate_limits`

No client DML grant exists. Direct `service_role` table DML is also absent; access is intentionally mediated by internal database/runtime paths rather than a client policy.

### Public service/control-plane relations

- `public.action_policies`
- `public.assurance_controls`
- `public.assurance_events`
- `public.assurance_evidence`
- `public.assurance_findings`
- `public.assurance_runs`
- `public.automation_runbook_steps`
- `public.automation_runbooks`
- `public.commerce_provider_catalog`
- `public.communication_job_events`
- `public.communication_suppression_events`
- `public.communication_worker_runs`
- `public.coupon_redemptions`
- `public.inventory_snapshots`
- `public.observability_events`
- `public.operations_processing_runs`
- `public.order_request_keys`
- `public.platform_operators`
- `public.post_release_events`
- `public.post_release_evidence`
- `public.post_release_findings`
- `public.post_release_policies`
- `public.post_release_rollback_decisions`
- `public.post_release_sessions`
- `public.purchase_order_items`
- `public.purchase_orders`
- `public.recovery_decisions`
- `public.recovery_drills`
- `public.recovery_events`
- `public.recovery_evidence`
- `public.recovery_findings`
- `public.recovery_objectives`
- `public.recovery_runs`
- `public.release_approvals`
- `public.release_candidates`
- `public.release_changes`
- `public.release_events`
- `public.release_gate_results`
- `public.release_governance_runs`
- `public.release_policies`
- `public.release_windows`
- `public.rollout_checks`
- `public.rollout_decisions`
- `public.rollout_environments`
- `public.security_rate_limits`
- `public.suppliers`
- `public.webhook_events`
- `public.webshop_instance_addons`
- `public.webshop_instance_commerce_settings`
- `public.webshop_instance_members`
- `public.webshop_instance_provider_connections`
- `public.webshop_instances`

Most of these relations explicitly grant only the minimum required `service_role` operations. `public.security_rate_limits` has no direct service DML grant and remains internal/fail-closed. The absence of an RLS policy is therefore part of the denial model, not a missing customer-facing authorization rule.

## Leaked-password launch gate

Status: **OPEN / launch-blocking when password-authenticated customer onboarding is enabled**.

Current evidence:

- Supabase Security Advisor: `auth_leaked_password_protection` WARN.
- Organization plan: Free.
- Supabase documentation: leaked-password protection uses the HaveIBeenPwned Pwned Passwords API and is available on Pro and above.

Gate closure criteria:

1. Upgrade the production Supabase organization/project to a plan that supports leaked-password protection.
2. Enable leaked-password protection in Auth settings.
3. Re-run Security Advisor and require the WARN to disappear.
4. Execute password-signup/change negative acceptance with a known-compromised test password and require rejection, without weakening existing password requirements.

This gate is intentionally separate from the database privilege release so the trigger ACL fix can be validated and released independently.
