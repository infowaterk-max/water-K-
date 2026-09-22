# V18 Readiness Audit

## Scope
V18 adds post-release verification and rollback governance on top of V17 without performing deployment or rollback.

## Implemented
- approved V17 release candidate → post-release verification session
- versioned observation policy and observation deadline
- trusted/untrusted evidence ledger with hashes
- smoke, health, business, integration and manual evidence types
- regression finding lifecycle
- observing → degraded / rollback_recommended → stable → closed lifecycle
- human rollback authorization/continue-observation decision ledger
- evidence-bundle hash, KPI and queue read models
- replay-safe reconciliation and admin cycle
- Admin → Utóellenőrzési központ

## Audit findings fixed
1. Evidence counts could multiply because evidence and findings were joined in one aggregate view. Replaced with independent lateral aggregates.
2. Historical trusted failures could keep a recovered session degraded forever. Health now uses the latest trusted evidence per check kind while findings resolve only on newer trusted pass evidence.
3. Reconciliation could increment finding occurrence counts when replaying the same evidence. Count changes now require a different evidence id.
4. Reconciliation emitted an incorrect lifecycle event when returning to observing. Only meaningful degraded/rollback/stable transitions are emitted.
5. Evidence/events were not fully append-only at database level. Mutation triggers and grants now enforce immutability.
6. Direct service-role insertion/mutation could bypass guarded session/finding lifecycle. Runtime mutation is now RPC-controlled.
7. Admin UI initially had no path to start a session from an approved V17 release. Start workflow is now exposed end-to-end.

## Security boundary
V18 does not deploy, rollback, modify Git branches, apply production database migrations, or change commerce/customer/inventory/payment/refund/loyalty state.

## Final verification gate
- V17 → V18 diff only
- PR mergeability checked
- TypeScript check required
- production build required
- production/main, production Supabase and production Vercel remain untouched
