# Water-K V11 readiness

## Scope
V11 builds on the audited V10 readiness head and adds customer-value, loyalty, lifecycle and retention orchestration without bypassing V9/V10 communication, opportunity or margin controls.

## Implemented migrations
- 074 customer value profiles and immutable loyalty ledger
- 075 reversal and governed tier benefits
- 076 redemption and benefit usage integrity
- 077 loyalty lifecycle orchestration
- 078 tier bonus and lifecycle milestones/opportunities
- 079 loyalty integrity hardening
- 080 V10/V11 opportunity reconciliation
- 081 lifecycle ordering integrity
- 082 debt-aware redemption integrity
- 083 benefit margin integrity

## Audit findings fixed
- Prevented duplicate tier bonuses across tier upgrades.
- Added cutover so tier bonuses are not retroactively granted to historical orders.
- Reversed both base and tier-bonus points on cancelled or fully refunded orders.
- Added debt-aware balances so post-refund overspend remains auditable and blocks redemption until recovered.
- Tightened idempotency ownership for redemption and benefit usage keys.
- Reconciled V11 lifecycle opportunities into V10's one-active-B2C-opportunity invariant.
- Prevented stale V11 lifecycle opportunities after customer recovery.
- Hardened lifecycle sequence so ineligible orders cannot receive a tier bonus after reversal.
- Routed discount benefits through the existing V10 margin preview guard.
- Fixed PostgreSQL CREATE OR REPLACE VIEW column-order compatibility in the migration chain.

## Security
- V11 state tables use RLS.
- Direct anon/authenticated access is revoked from sensitive loyalty/customer-value state.
- Privileged mutating functions use SECURITY DEFINER with pinned empty search_path.
- Privileged functions are executable by service_role only.
- Read models use security_invoker and service-role-only SELECT where appropriate.

## Customer/admin experience
- Customer loyalty page under /fiokom/huseg.
- Admin customer-value dashboard under /admin/ugyfelertek.
- Existing account/admin auth structures are reused; no parallel identity system was introduced.

## Rollout status
V11 remains isolated on feature/native-store-v11 and PR #11 targets feature/native-store-v10. No production/main merge, production Supabase migration or Vercel production deployment is part of this readiness checkpoint.

## Final gate
The latest V11 head must pass the repository TypeScript and production build CI after this readiness commit before V11 is considered fully green.
