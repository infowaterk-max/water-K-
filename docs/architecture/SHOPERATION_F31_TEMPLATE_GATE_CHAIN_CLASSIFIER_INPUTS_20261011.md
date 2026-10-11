# F31 — Restore canonical Template Factory classifier input dependencies

2026-10-11 · Shoperation Control Plane, Template Factory, Core #1186 · bounded source remediation

## Root cause, verified on real F30 GitHub CI

F30 GitHub run 38134361157 completed FAIL only at the expected Lifecycle Closure Gate. Its Quality Tests (3723/3723), TypeScript, production build and Completion Truth VERIFIED_DONE all passed. However, CI's "Detect required external Completion evidence" reported **none**, while the exact source plan included `scripts/shoperation-external-proof-handoff.mjs`. That file appears in GUARD-TEMPLATE-FACTORY's canonical `chain.liveRuntime.classifierInputs` and in its Factory workflow trigger filters, but was missing from `verification.semanticInputs`.

The generic `guardInputPatterns` ignored `chain.liveRuntime.classifierInputs`. Therefore `compileGateChain` did not select GUARD-TEMPLATE-FACTORY, and `requiredExternalCompletionGuards` had no external guard to verify, even though the later independence filter correctly rejected changes to classifier source when called directly. This was a real **missing dependency edge**, not legitimate visual acceptance.

## F31 bounded correction

Guard input selection now includes precise, canonical `chain.liveRuntime.classifierInputs`, `globalRuntimeInputs`, and `entrypoints` alongside semantic, configuration and authority inputs. It deliberately excludes `safetyFallbackRuntimePatterns` such as `src/**`, which remain relevant to uncertainty-aware runtime-origin classification, not broad selection of every unrelated Core change.

Executable regressions verify:

- The actual F30 plan / exact Git SHA selects GUARD-TEMPLATE-FACTORY external proof (not zero).
- Every declared classifier, global runtime and entrypoint file is selected by the external chain.
- Independent Office backend source files do not inadvertently demand Template Factory proof.
- Existing F29 exact registry semantic-isolation, explicit/provenance checks, unrecognized modifications and transitive blockers remain fail-closed.
- Missing or incomplete Playroom 42-case browser matrix cannot be declared accepted.

## Closure boundaries

F31 itself edits `scripts/lib/shoperation-development-runtime.mjs`, also declared as an input of the Factory workflow and used by its runtime verification tools. It **still needs external evidence** before lifecycle/release completion. F30 must not be retroactively marked VERIFIED_DONE merely because CI produced that verdict while a necessary external guard was absent. Preserve the historical F30 run as diagnostically incomplete; do not tamper with its evidence.

The independent Factory workflow's earlier success contained canary-only 18/42 Playroom browser proof and invalid/missing runtime origin. F31 does not fabricate a 42/42 matrix, alter the Quality Gate threshold, or change Product Owner approval. No preview, Supabase SQL write, main merge or production deployment is authorized by this source unit. Core #1186 and Fresh Install #1228 native Auth/JWT/RLS, entitlement and 69-file clean-target verification remain separate open dependencies.


## Second fail-closed fix: local plan keys are not external evidence

A second execution check showed that adding the missing classifier inputs was insufficient: \`compileGateChain\` now selected GUARD-TEMPLATE-FACTORY, but \`requiredExternalCompletionGuards\` excluded it because the *local resumable verification plan* already had a gate entry with the same ID. This entry signifies planning, not any 42/42 browser/PO proof. F31 therefore also changes the external handoff to never subtract external-execution guards based solely on local plan keys. The actual current F31 plan plus a simulated local shadow gate must still return \`GUARD-TEMPLATE-FACTORY\`. A real external artifact with exact head/run/runtime ancestry is still required independently.

The canonical Factory live runtime \`classifierInputs\` list now includes \`scripts/lib/shoperation-development-runtime.mjs\`, because it implements the shared gate applicability compiler and is explicitly included in the Factory workflow trigger scope. Together, this repairs both the missing dependency edge and the plan-versus-proof confusion without expanding the unrelated backend fallback glob.

## F31 source-CI external proof handoff (second bounded correction)

A source-branch CI previously selected its own `push` Factory canary even when a full 42/42 `pull_request` proof existed for the same commit. F31 now selects only a successful PR evidence run whose PR is open in the same repository and whose GitHub-reported head SHA, head branch and base SHA equal the exact active-plan identities. The producer run must independently report the same PR and immutable SHA pair; a `push` canary remains insufficient. The external handoff also fails closed when a genuine Factory candidate lacks Product Owner handoff readiness: passing the visual browser matrix alone cannot promote an unpinned candidate to Product Owner-approved. Loot Vault remains blocked until separate Factory identity, showroom and PO journey evidence is produced; this source remediation does not create templates or waive requirements.
