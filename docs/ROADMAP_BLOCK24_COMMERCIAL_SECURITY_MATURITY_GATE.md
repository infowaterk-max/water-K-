# Roadmap Block 24 – Commercial / Security / Maturity Gate

Status: implementation in progress

## Canonical reconstruction

Block 24 is the historically accepted **Commercial / Security / Maturity Gate** immediately after Block 23 AI-Assisted Builder / Template Generation. It is a launch-hardening and commercialization gate, not a new feature-expansion block.

The reconstruction is bounded by existing repository evidence:

- `MARKET_READY_1_0.md` defines the public 1.0 packaging and release gates.
- Block 11 is the canonical Alap / Pro / Add-on entitlement and capability authority.
- Block 16 already owns continuous assurance evidence and findings.
- Block 17 already owns release/change governance and SHA-bound approval evidence.
- historical V24 already owns environment validation, deterministic release manifests, rollout evidence and GO/NO-GO decisions.
- Block 23 explicitly deferred commercial packaging, paid AI quota/credit policy, final monetization, broad maturity certification and launch-commercial policy to Block 24.

Block 24 therefore **composes and hardens** those authorities. It must not create a second entitlement, billing-security, release, rollout, storefront, AI-generation or persistence authority.

## Canonical commercial policy

The accepted launch packaging is represented in the source-controlled commercial policy:

- Alap list price: **17 990 Ft + ÁFA / hó**;
- Pro list price: **39 990 Ft + ÁFA / hó**;
- Founding / Early Adopter Alap: **14 990 Ft + ÁFA / hó**;
- Founding / Early Adopter Pro: **34 990 Ft + ÁFA / hó**;
- founding discount guarantee: **12 months**;
- trial: **30 days**;
- persisted package authority remains only `alap` and `pro`;
- Add-ons remain separate Block 11 entitlements;
- usage billing is allowed only where Shoporation has a real variable cost;
- `ai-assistant` is an explicit Add-on and may carry usage-based cost, but Block 24 does **not invent** an included-credit amount, overage price or token allowance that was never accepted;
- merchant payment, shipping, domain and other provider contracts remain the merchant's contracts; Shoporation integrates/configures them rather than becoming the merchant-of-record for those services.

Commercial configuration is descriptive/product policy. It never grants a capability by itself. Effective access continues to come from Block 11's server-side entitlement resolver.

### AI commercialization boundary

Block 23's AI storefront generator is now required to pass the existing `addon:ai-assistant` entitlement before invoking the model. The existing hourly security rate limit remains an abuse/safety limit and is **not** re-labelled as a paid quota or credit balance.

No new AI credit ledger, token wallet, billing table or client-supplied entitlement authority is introduced.

## Canonical security hardening

The Block 23 production Security Advisor baseline exposed three public-schema trigger guard functions as directly executable `SECURITY DEFINER` RPCs:

- `storefront_revisions_immutable()`;
- `storefront_events_immutable()`;
- `storefront_preview_session_guard()`.

These functions exist only as trigger guards. Direct invocation is not a supported authority, so Block 24 revokes direct execution from `PUBLIC`, `anon`, `authenticated` and `service_role` while retaining the triggers themselves.

This is deliberately **not** a broad RLS rewrite. The customer-baseline contract documents several server-only tables where `RLS enabled + zero browser policies + revoked browser grants` is intentional. Block 24 must not weaken that boundary merely to reduce advisor INFO counts.

The pre-existing leaked-password-protection advisor warning is an Auth project setting, not a database/application authority created by Block 24. It is tracked in the live maturity evidence, while the release rule remains: Block 24 may introduce **no new** Security Advisor finding.

## Maturity / release-readiness gate

Block 24 adds a deterministic repository-level market-ready contract artifact. It verifies that:

1. accepted commercial policy is source-controlled and internally consistent;
2. the AI generator is server-gated by the existing AI Add-on entitlement;
3. the Block 24 production hardening migration and customer forward migration are byte-identical;
4. customer baseline lifecycle remains explicit and Fresh Install proof cannot be silently bypassed;
5. live launch authorization remains delegated to the existing assurance, release-governance and rollout authorities.

The repository contract is **not** itself a deploy/merge authority. Final launch evidence still requires green CI, READY preview, non-Water-K staging acceptance, tenant/auth/entitlement isolation, Security Advisor diff, current customer-baseline proof, Water-K invariant preservation, exact-head merge protection and post-merge production verification.

## Database / Fresh Install impact

A database migration is justified only for the direct-EXECUTE hardening above. Therefore:

- production migration: `20260911125000_block24_security_maturity_hardening.sql`;
- customer forward migration: `0018_block24_security_maturity_hardening.sql`;
- the two SQL files must remain byte-identical;
- customer baseline is reset to `snapshot-reviewed` / `freshInstallProofRequired=true` / `proofContractSha256=null` until a genuine empty-target 0001–0018 Fresh Install proof succeeds;
- only after that proof may the manifest return to `ready`.

No commercial pricing table, AI credit ledger, storefront table or duplicate governance table is added.

## Acceptance contract

Before merge, a dedicated non-Water-K staging tenant must prove:

- the Block 24 migration applies cleanly;
- direct browser-role execution of the three trigger guards is no longer available;
- existing storefront draft/publish guard behavior still functions through canonical RPCs;
- AI generation is denied when `addon:ai-assistant` is not effective;
- enabling the canonical AI Add-on on the staging tenant satisfies only the commercial entitlement gate, without bypassing store/RBAC/template authority;
- caller-supplied tenant/role/entitlement data cannot grant access;
- commercial policy does not mutate persisted plan or entitlement state;
- customer baseline 0001–0018 has a genuine empty-target proof;
- full regression, TypeScript, production build, dependency security audit and market-ready contract are green;
- no new Block 24-caused Security Advisor finding exists;
- Water-K production invariants remain unchanged.

Only after those gates may the PR be marked ready and merged with exact expected-head SHA protection.