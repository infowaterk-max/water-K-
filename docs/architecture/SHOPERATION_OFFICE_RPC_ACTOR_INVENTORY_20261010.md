# F27 – Shoperation Office / Communication RPC security inventory

**2026-10-10 | local source-only evidence | #1186 PARTIAL**

The local TypeScript AST scanner `scripts/shoperation-office-rpc-actor-inventory.mjs` found **55** sensitive Office/Communication/Team Chat/email/support RPC calls across **35** TS/TSX source files. The reviewed source-expression snapshot lives at `quality/knowledge/office-rpc-actor-inventory.v1.json`. Neither this file nor this note overrides the canonical Living Roadmap v2, accepted Pro-only Digital Office decision or Alap-simple B2B decision.

| Source binding class | Count | Proof limitation |
| --- | ---: | --- |
| `p_actor:actor.id` directly | 17 | Server actor candidate; no native JWT proof |
| `p_actor:userId/actorId/input.userId` indirectly | 15 | Caller/helper provenance requires trace |
| User-subject `p_user_id` | 4 | May denote subject rather than authenticated operator |
| Customer-recipient `p_user_id` | 2 | `enqueue_communication_v2` recipients, **not** operator actors |
| Without explicit actor argument | 17 | System/provider/read scopes require independent review |
| **Total** | **55** | **35 files; 0 currently observed dynamic RPC targets in known sensitive paths** |

The command `node scripts/shoperation-office-rpc-actor-inventory.mjs --check` fails for any **new, removed or moved** sensitive statically named RPC, changed `p_actor`/`p_instance_id` expression, changed reviewed classification, duplicate call identity or new dynamic RPC expression inside a known Office/Communication directory. `--print` emits a **candidate only to stdout**, never modifies the baseline or approves a security change. Calls are keyed by file + RPC name + within-file ordinal.

**Important traced pathways:** Office Composer uses `input.userId`/`input.instanceId` from its `access()` helper (server `getAdminRequestUser('support.manage')`, Advanced plan and `requireCurrentStoreContext('support.manage')`). Communication Hub responsibility/relationship actions use `actorId`/`instanceId` from `advancedAccess()` with the same source-of-authority shape. Parallel Team Chat actions derive their actor/store IDs from `privateChatAccess()`, and the API `/api/admin/office/chat/message` was dynamically mock-tested for caller actor/tenant spoof attempts in F26. All other indirect helpers and system-bound no-actor RPCs still need individual traces before native readiness.

**Limitations / mandatory next steps:** An AST snapshot is a **drift detector, not proof that the current 55 calls are safe**. It cannot certify every helper's runtime origin, dynamic wrappers in unrelated directories, signed Supabase Auth/JWT/cookies/MFA, RLS and service_role on a real managed target, storage/provider callbacks, background jobs or tenant isolation under populated accounts. The service-role SQL SECURITY DEFINER RPCs still trust their supplied `p_actor`: every real privileged caller must prove that value came from an authenticated authorized user. New snapshot entries/changes require manual security review and preferably a dynamic negative test. Do not claim Customer Fresh Install or Pro entitlement/downgrade DONE from this inventory.

**What did not change:** No application route, SQL migration, actual grant, package, commercial workflow, provider operation, CI, preview or hosted Supabase project. Customer baseline is `snapshot-reviewed`, 69 migrations, full native Fresh Install proof required. #1186 OPEN/PARTIAL; #1228 OPEN/BLOCKED. Trial repeat-pause and Agency pricing remain unresolved in the separate product audit.

