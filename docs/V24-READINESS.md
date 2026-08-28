# V24 Readiness – Staging & Rollout

## Scope

V24 closes the pre-cloud engineering phase with deterministic release identity, environment validation, cloud smoke verification, rollout evidence and governed GO/NO-GO decisions.

## Implemented

- environment schema from `.env.example` and server/public key separation;
- `scripts/validate-env.mjs` supporting current Supabase publishable/secret keys and legacy fallbacks;
- deterministic SHA-bound `release-manifest.json`;
- CI release-manifest artifact;
- cloud smoke gate for health, storefront, checkout and login;
- staging/production rollout runbook;
- rollout control plane (`rollout_environments`, `rollout_checks`, `rollout_decisions`);
- append-only evidence and decision ledgers;
- trusted production evidence requirement;
- exact evidence-bundle-bound GO/NO-GO decision RPC;
- Admin → Rollout központ read model.

## Audit findings fixed

1. Environment validator initially required legacy Supabase variable names only; aligned with current publishable/secret key names while retaining legacy fallback.
2. Rollout evidence needed idempotency-key ownership checks; `record_rollout_check` rejects reuse for a different environment/SHA/check/hash.
3. Production checks could otherwise be self-asserted as untrusted evidence; production recording now requires `trusted=true`.
4. GO decisions could drift from their evidence; decisions persist the exact evidence bundle hash.
5. A green build alone did not prove the deployed SHA; CI now emits a deterministic release manifest artifact.
6. Cloud deployment needed an executable smoke contract; critical public routes now have a fail-closed smoke script.

## Gates before staging cloud deployment

- GitHub CI green on the final V24 head.
- Supabase migration rehearsal must happen on a non-production project first.
- Vercel staging must use a separate project/environment and non-production integration credentials.
- Smoke gate must pass against the actual deployment URL.
- Supabase security/performance advisors must be reviewed after migration rehearsal.

## Production boundary

V24 code does **not** automatically merge `main`, apply production Supabase migrations, promote a Vercel production deployment, execute a rollback, or call live payment/shipping/invoicing side effects. Those remain explicit rollout actions after staging evidence is green.
