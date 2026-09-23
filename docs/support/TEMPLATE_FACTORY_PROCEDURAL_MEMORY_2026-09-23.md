# Template Factory Procedural Memory

Date: 2026-09-23

## Classification
Shared Template Factory invariant / Quality System authority.

Executable authority:
- `src/lib/builder/template-factory/knowledge-registry.ts`
- `src/lib/builder/template-factory/procedural-memory.ts`
- `tests/template-factory-procedural-memory.test.ts`
- `scripts/template-factory-quality-gate.mjs`
- `scripts/template-factory-product-owner-handoff.mjs`

## Purpose
A defect that was already understood must not depend on a future developer or agent remembering it from conversation history.

Canonical chain:

**Incident → Known Failure → Authority Invariant → Failure Replay → Automated Gate → Acceptance Proof**

A fix is not organizationally learned until this chain exists.

## Mandatory model

### Known Failure Registry
Every reusable lesson records a stable failure ID, symptom, root cause, occurrence count, automatable status, authority invariants, regression tests and remediation policy.

If a failure class occurs at least twice, its remediation policy is `shared-root-cause-required`. It may not be closed only with a template-local patch.

### Authority Graph
Canonical ownership:
- auth behavior → platform;
- signed-out auth presentation → template;
- Factory candidate package resolution → Factory;
- header/footer composition → template;
- commerce behavior → platform;
- responsive semantics → platform, bounded composition → template;
- demo media/content → template/Factory and non-authoritative;
- Product Owner handoff proof → Quality System.

### Knowledge-before-build preflight
Registered recipes must pass preflight before compilation. Current fail-closed rules require a canonical template header/footer, template-owned account/auth composition, ownership of reference-critical pages, an explicit media contract and an approved reference authority.

### Provenance stamp
Every Factory-compiled page carries `compileSource=template-factory`, recipe identity, target template key/version, Foundation identity and reference identity. Product Owner preview must expose the same candidate identity.

### Failure Replay Bank
Every registered candidate replays known failures after compilation. Failed replay = Quality System defect = blocked registered build.

### Cross-template invariant suite
Recurring failure classes require shared regression authority. A rule learned on Playroom must not be protected only by a Playroom-specific test.

### Quality System Defect rule
If a Product Owner finds a mechanically detectable defect, fix both the visible defect and the missing Quality System protection. Closure question: **Why did the Product Owner find this instead of the system?**

### Maturity model
1. `scaffold`
2. `compiled`
3. `technically-ready`
4. `visually-ready`
5. `journey-proven`
6. `product-owner-ready`
7. `accepted`

Technical/browser CI alone may not claim Product Owner handoff readiness.

### Acceptance proof
The Factory quality artifact binds exact source commit, template key/version, provenance, browser matrix, procedural-memory replay and candidate identity. Factory CI remains `handoffReady=false` until post-deployment journey proof exists.

### Product Owner Journey Gate
The exact URL intended for handoff must prove:
1. template key/version and `factory=1`;
2. technical evidence from the same exact head;
3. template-aware signed-out auth;
4. same template key/version in the auth shell;
5. preserved `next` target;
6. authenticated return to the same candidate;
7. final preview provenance stamp.

The post-deployment gate is fail-closed and requires dedicated test credentials or an authenticated Playwright storage state.

## Loot Vault incident conversions
The 2026-09-23 Loot Vault incident permanently establishes:
- internal QA and Product Owner preview resolve the same Factory package authority;
- Factory/version identity survives navigation and auth boundaries;
- Factory account/auth presentation is template-owned;
- category Foundation may not leak another template's auth visual composition;
- preview demo brand context uses template identity rather than category-generic branding;
- green 14×3 browser QA is necessary but insufficient for Product Owner handoff.

## Definition of learned
A lesson is learned only when a fresh agent can enter the repository with no prior conversation memory and the repository itself prevents or identifies the old mistake.
