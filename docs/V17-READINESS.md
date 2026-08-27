# V17 Readiness – Release & Change Governance

Final audit scope: migrations 132–142, admin release center and governance API.

## Implemented
- versioned release policies for standard/high-impact releases
- release candidates bound to source ref + source SHA
- immutable initial change summary and rollback plan
- complete change-set hash bound to evaluation
- trusted CI evidence gate (`github_actions` / `vercel` + trusted verification)
- V16 assurance score/readiness/evidence-bundle gate
- standard single approval and high-impact dual approval
- approvals bound to the current gate hash
- freeze/allow change-window governance
- stale evidence/window invalidation, including already-approved candidates
- idempotent release governance reconciliation cycle
- append-only release gate, approval and event audit
- Admin → Kiadási központ

## Audit fixes
1. Dual approval rejection slot conflict removed.
2. Old approval cannot survive a re-evaluation because approvals are gate-hash scoped.
3. Manual admin CI attestation is explicitly untrusted and cannot satisfy the default release policy.
4. Approved candidates become stale when V16 evidence/readiness, trusted CI freshness, change-set hash or release window changes.
5. High-risk change items cannot pass under a standard-risk candidate.
6. Direct candidate/change/audit mutations are restricted; guarded SECURITY DEFINER RPCs own lifecycle transitions.
7. Governance-cycle failures surface as RPC errors rather than silent failed results.
8. Candidate cancellation is explicit, terminal and audited.

## Safety boundary
V17 does not merge branches, deploy to Vercel, apply production Supabase migrations, mutate commerce data or alter customer state. It only records and governs go/no-go authorization evidence.
