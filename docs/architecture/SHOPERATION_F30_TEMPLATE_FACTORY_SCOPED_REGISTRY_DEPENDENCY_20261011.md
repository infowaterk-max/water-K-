# F30 — Exact semantic isolation for Template Factory registry dependencies

2026-10-11 · Control Plane / Template Factory / Core #1186 · bounded source change

## Finding and prior proof

F29 changed only the Customer Baseline guard's source producer, diagnostic evidence path, and source-only Proof Semantics in the common Guard Registry. This shared file is also declared a Template Factory runtime classifier input and a workflow trigger. Its broad path matching caused the central CI to request full browser/provenance evidence even though no Template Factory guard, runtime entrypoint, application component, dependency or global registry policy changed in F29. The independently running Factory workflow reported SUCCESS with canary-only Playroom 18/42, but the external acceptance gate correctly rejected that incomplete proof and a zero-SHA runtime origin. The external acceptance **must not** accept those artifacts as completed browser evidence.

## F30 isolation proof

The semantic comparator is intentionally limited to the *exact verified F29 registry evolution*:
- A checked-out exact Git HEAD and fully valid nonzero base SHA must exist, with proven ancestry and no CI head mismatch.
- The complete registry except its guard list must be identical, and guard order, membership and every non-Customer-Baseline guard object must be unchanged.
- The Customer Baseline guard itself may differ **only** in its real source producer, real CI evidence path, and the exact CAP-QUALITY strength-1 source-only semantics that were implemented in F29. All other keys (including verification dependencies, authority, lifecycle and chain) must remain identical.
- Independently computed current Git registry must agree with the registry loaded by the proof engine.
- If any other planned file is a Template Factory producer/runtime/classifier input, or a required guard is explicit/transitive, external proof remains required.

Missing SHA, incomplete history, unknown ancestry, unexpected file/semantic content, unrecognized registry transition, a missing runtime closure, and every changed Template Factory authority are **fail closed**.

## Release boundary

The F30 implementation modifies scripts/shoperation-external-proof-handoff.mjs, which **is itself a Template Factory classifier input**. F30 consequently still requires its own complete independent external proof before completion. Unit/integration test success cannot create a real 42/42 Playroom matrix or a valid Product Owner preview. No guard was disabled, no browser acceptance threshold reduced, and no fake runtime SHA introduced.

The exact semantics may later be generalized through a separately governed versioned scope registry, with a complete safety and Template Factory proof. This bounded correction only classifies the genuine F29 parent/head evidence without weakening unknown cases.

Customer baseline 69-file Fresh Install, native Supabase Auth/JWT/RLS, actual Pro subscription and deployed advanced Office RPCs remain independent OPEN blockers for #1186/#1228. This unit makes no hosted SQL changes, preview deployment, main merge or release readiness promotion.
