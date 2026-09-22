# Shoperation Support Knowledge — Backfill from 2026-09-12 → 2026-09-18

Status: **current historical/acceptance knowledge backfill**

Purpose: capture reusable failures, security findings, misleading symptoms, superseded approaches and verified repairs that occurred after the original Support Knowledge baseline but before/during Phase 4. This file complements the dedicated Phase 4 Builder incident file.

Historical matches are diagnostic shortcuts only. Validate the current branch/release, tenant, entitlement and authority before reusing a fix.

---

# Global prevention rules

## B1 — Never create a parallel controller/authority to fix a presentation problem

If a canonical route/controller/schema/runtime already exists, extend it. A second mobile controller, UI route, renderer, ticket store, theme engine or commerce engine may appear faster but creates split authority and future regressions.

## B2 — Persisted Page Schema does not change just because source template code changed

If a merchant already has a persisted template installation, changing the source package without a real version upgrade will not update the installed draft/published schema. Template version/provenance is part of the product contract.

## B3 — Do not deploy a stale stacked branch directly over a newer production main

A historically accepted stack can be hundreds of commits behind current main. Reconcile the minimum runtime delta into current main and rerun exact-head integration gates. Old acceptance/docs/tests are evidence, not necessarily release-tree authority.

## B4 — Technical green is not authenticated visual acceptance

CI, build, security audit and READY deployment do not prove an authenticated Builder/admin surface visually works. Keep human/browser acceptance as a separate gate.

## B5 — Fresh Install SKIPPED is never PASS

If customer-baseline/schema changes exist and the workflow did not execute a genuine empty-target proof, retain the baseline as proof-required/snapshot-reviewed. Never convert a skipped job into release evidence.

## B6 — Special Commerce decorates shared commerce; it does not own commerce truth

Pricing, inventory, catalog eligibility, cart, checkout, order and payment remain shared canonical authorities. Scene/recipe/release/configurator engines may reference or compose them, but must not fork them.

## B7 — Client time, template copy and merchant-entered claims are never server commerce truth

Release unlocks, stock scarcity, compatibility, allergen/dietary claims, pricing and entitlement must come from explicit server-authoritative data. Unknown must fail closed rather than be fabricated.

## B8 — Product documents, purchased digital assets and order documents are separate authorities

They may be shown in one customer “Documents and downloads” experience, but their authorization, lifecycle, revocation and retention rules remain separate.

## B9 — Private digital/document delivery must be proven end-to-end

A database row is not delivery proof. Acceptance should cover real private object upload, authorization, short-lived access, HTTP bytes/hash match, audit/counter behavior and revocation/expiry.

## B10 — Never weaken security boundaries to simplify acceptance

Do not grant browser/service-role table mutation, expose raw tokens, use public permanent storage URLs, bypass tenant resolution, disable immutable history, weaken Preview Protection or fake storage rows merely to make a proof easier.

---

# Incident records

## SKB-BF-001 — CSS-only Visual Builder candidate created parallel UI authority

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `visual-builder/ui-authority`
- PRs: `#266 → #269`
- automation: `DIAGNOSE_ONLY`
- risk: `medium`

### Symptom

An earlier Visual Builder UI acceptance candidate attempted to solve the accepted workspace direction largely as a parallel/CSS-only candidate.

### Root cause

The candidate did not sit cleanly on the current canonical Builder workspace authority.

### Resolution

PR #266 was intentionally closed without merge. PR #269 implemented the dedicated Builder workspace from current main on top of the existing Block 22 engine.

### Prevention

When a newer canonical workspace/controller exists, close superseded UI candidates. Do not keep two editable Builder shells alive “temporarily”.

---

## SKB-BF-002 — Email Builder mobile Dynamic Data inserted into stale target

- status: `implemented`
- evidence: `production_verified`
- area: `email-builder/mobile/dynamic-data`
- PRs: `#273, #276`
- automation: `DIAGNOSE_ONLY`
- risk: `medium`

### Symptom

On mobile, selecting a dynamic variable could reuse a previously focused/stale editor target instead of waiting for the merchant to choose the next destination.

### Root cause

Target focus state survived the library interaction and was treated as current intent.

### Resolution

Every mobile variable selection now starts a fresh pending-target handoff:
1. close variable library;
2. keep selected variable pending;
3. insert only after merchant focuses the next supported field.

### Prevention

Transient UI focus must not be treated as durable merchant intent after a modal/library flow. Mobile handoff state should be explicit.

---

## SKB-BF-003 — Visual Builder mobile fixes duplicated the canonical route controller

- status: `implemented`
- evidence: `production_verified`
- area: `visual-builder/mobile/controller`
- PRs: `#329, #330, #331`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Mobile Builder shell changes appeared implemented, yet real Android screenshots still showed desktop behavior.

### Root cause

The early <=820px fixes introduced separate mobile workspace/viewport controllers. The observed device exposed roughly an 832px layout viewport, so those controllers did not activate, while the canonical route controller remained a separate authority.

### Resolution

PR #331 consolidated behavior into the existing `VisualBuilderRouteController`:
- one small/mobile authority;
- <=1100px small workspace;
- <=900px phone presentation;
- one-time initial Mobile breakpoint choice;
- mutual exclusion of library/Inspector;
- one scrim and canonical bottom-sheet drawers.

Duplicate controllers were removed.

### Prevention

Do not create a second responsive controller to patch a viewport symptom. First identify the existing route/session authority and extend it.

---

## SKB-BF-004 — Width-only mobile detection still failed on physical phones

- status: `implemented`
- evidence: `production_verified`
- area: `visual-builder/mobile/device-detection`
- PRs: `#332, #333`
- automation: `DIAGNOSE_ONLY`
- risk: `medium`

### Symptom

Some physical phones exposed desktop-like layout viewport characteristics, so compact/mobile UI did not activate reliably.

### Failed direction

A width-only or coarse-pointer-only heuristic was insufficient as a universal signal.

### Resolution

Keep one canonical route controller and derive explicit canonical state classes from:
- CSS/layout viewport;
- touch capability;
- bounded physical screen size evidence.

### Prevention

Device heuristics may inform presentation, but must feed one canonical state authority. Never spread independent width/pointer checks across several components.

---

## SKB-BF-005 — Superseded Builder route must not be reintroduced

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `visual-builder/supersession`
- PR: `#319`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

A historical “95% fidelity” Builder route remained as a plausible branch even after the canonical `StorefrontVisualBuilderV3` was established on main.

### Resolution

PR #319 was closed explicitly as superseded.

### Prevention

Support/engineering must check whether an old branch/route is superseded before cherry-picking or “restoring” it. Reapplying a superseded UI branch can regress newer production-completion work.

---

## SKB-BF-006 — Authenticated visual acceptance remained open despite green technical gates

- status: `historical_verified`
- evidence: `production_verified`
- area: `visual-builder/release-evidence`
- PRs: `#313, #315, #318`
- automation: `HUMAN_REQUIRED`
- risk: `high`

### Pattern

Quality tests, TypeScript, production build, security audit and Vercel READY were green, while authenticated Builder screenshots/Product Owner visual acceptance were still not proven.

### Resolution

Treat:
- engineering gate;
- authenticated browser evidence;
- Product Owner visual PASS;
- production health
as distinct release evidence.

### Prevention

Never infer visual fidelity from build health. This later became especially important in Phase 4, where live Builder comparison found serious geometry defects after automated gates were green.

---

## SKB-BF-007 — Playroom source visuals changed but persisted v1 storefront did not

- status: `implemented`
- evidence: `production_verified`
- area: `storefront/template-versioning`
- PR: `#339`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Accepted Playroom visual changes were merged into source code, but an already-installed Playroom storefront rendered the old persisted page unchanged.

### Root cause

The source package still identified itself as `gaming.playroom@1`. Template Library correctly considered the persisted v1 installation current and did not offer/reinstall the new composition.

### Resolution

- preserve historical v1 exactly;
- publish accepted composition as v2;
- expose v2 as the current catalog target;
- keep upgrade draft-first until merchant publish.

### Prevention

A source composition change that should reach existing installations requires a real template version/provenance transition. Never overwrite historical package identity in place.

---

## SKB-BF-008 — Internal Playroom evolution reached v18 but installable package remained v2

- status: `implemented`
- evidence: `production_verified`
- area: `storefront/template-versioning`
- PR: `#341`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Template Library still did not offer the expected newer Playroom upgrade after substantial internal fidelity evolution.

### Root cause

The installable package remained `templateVersion:2` even though the accepted composition had evolved to v18.

### Resolution

Expose real `gaming.playroom@18`, preserve v1/v2 exact historical resolution, stamp v18 pages/provenance, and target QA at the actual version.

### Prevention

Do not let internal/reference version progression diverge from installable package version if merchant upgrade semantics depend on that version.

---

## SKB-BF-009 — Stale Storefront Wave 76 branch was unsafe as a production release tree

- status: `implemented`
- evidence: `production_verified`
- area: `release/stacked-branches`
- PRs: `#327, #328`
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### Symptom

A fully validated historical Storefront stack was ready, but the branch was hundreds of commits behind current production main.

### Failure evidence

Current-main integration CI exposed eight obsolete historical acceptance assertions. The failures were in imported tests/evidence, not the current runtime.

Repository comparison showed the entire stack contributed only one actual production-runtime file relative to current main; the rest were historical docs/tests/metadata.

### Resolution

Use a controlled two-parent integration:
- current main remains authoritative;
- take only the accepted runtime blob/delta from the Storefront stack;
- resolve stale evidence paths to current main;
- rerun exact-head CI and production health.

### Prevention

Never promote a stale Vercel preview or merge tree simply because that historical branch passed its own CI. Compute the true current-main runtime delta first.

---

## SKB-BF-010 — Special Commerce must reuse existing engines rather than proliferate engines

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `special-commerce/architecture`
- PRs: `#306–#312`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Proven pattern

- Room/Scene Composer reuses Interactive Scene + E4 Multi-Product Composer.
- Recipe Commerce composes the existing Multi-Product Composer.
- grouped checkout v6 is a thin metadata wrapper over authoritative v5 checkout.
- existing non-3D media remains the shared media authority.

### Prevention

Before creating a new commerce engine, search existing primitives/adapters. New UX may compose an existing engine but must not duplicate cart/checkout/order/pricing/inventory authority.

---

## SKB-BF-011 — Special Commerce anti-fake boundaries

- status: `implemented`
- evidence: `acceptance_verified`
- area: `special-commerce/data-truth`
- PRs: `#307–#312`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Rules proven

- Release state comes from server timestamps; client clock cannot unlock.
- Do not invent “limited stock” thresholds when no canonical scarcity authority exists.
- Recipe allergen/dietary claims are explicit structured merchant data; never inferred.
- Multiple eligible variants require explicit variant choice unless canonical merchant config supplies one.
- Compatibility unknown remains fail-closed.
- display subtotal/countdown/scene copy is non-authoritative.

### Prevention

Support AI must distinguish presentation state from commerce truth before recommending a fix.

---

## SKB-BF-012 — Grouped checkout must preserve idempotency identity

- status: `implemented`
- evidence: `acceptance_verified`
- area: `checkout/special-commerce/idempotency`
- PRs: `#310, #312`
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### Proven behavior

Same idempotency key + same cart/group metadata:
- returns same order;
- does not duplicate order lines/groups;
- does not decrement stock twice.

Same idempotency key + changed group metadata fails closed with `COMMERCE_GROUP_IDEMPOTENCY_MISMATCH`.

### Prevention

Idempotency identity includes semantic grouped-composition metadata, not only the ordinary cart body.

---

## SKB-BF-013 — Schema-changing Special Commerce waves had Fresh Install SKIPPED

- status: `historical_verified`
- evidence: `documented_contract`
- area: `database/fresh-install/release-evidence`
- PRs: `#306–#310`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Normal branch CI reported Fresh Install job as SKIPPED even when customer-baseline migrations changed.

### Correct interpretation

This is an evidence gap, not PASS. Baseline remains proof-required until genuine empty-target acceptance runs.

### Prevention

Do not copy a green overall CI badge into Support/Release evidence as “Fresh Install PASS”. Read the individual job and manifest state.

---

## SKB-BF-014 — AI Builder must generate bounded Page Schema, never source code or implicit publication

- status: `implemented`
- evidence: `documented_contract`
- area: `ai-builder/authority`
- PRs: `#256, #260`
- automation: `HUMAN_REQUIRED`
- risk: `high`

### Contract

- AI output is source-controlled allowlisted Page Schema/component configuration;
- existing tenant/RBAC/entitlement authority remains canonical;
- generation is draft-only;
- no implicit publish;
- resulting storefront stays fully editable in Visual Builder;
- AI allowance/entitlement is resolved server-side, never trusted from caller input.

### Prevention

Do not allow an AI support/builder workflow to “fix” a site by emitting arbitrary Next.js/HTML/CSS/JS or bypassing the canonical draft/publish lifecycle.

---

## SKB-BF-015 — Block 24 separated engineering release from public password-auth launch readiness

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `security/release-gates`
- PR: `#260`
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### Proven distinction

Block 24 engineering integration could be GO while public password-authenticated commercial onboarding remained NO-GO because leaked-password protection required an external Supabase plan/settings change.

### Prevention

Do not collapse independent release gates into one status. “Code can ship” and “public commercial signup can open” may legitimately differ.

---

## SKB-BF-016 — Product Documents staging failed because canonical catalog grants were missing

- status: `implemented`
- evidence: `acceptance_verified`
- area: `product-documents/staging/database-privileges`
- automation: `HUMAN_REQUIRED`
- risk: `high`

### Symptom

Product Documents/catalog acceptance could not access the expected product/variant data on staging.

### Root cause

Staging lacked the canonical `service_role` grants on `products` / `product_variants`.

### Resolution

Restore the canonical privilege contract and re-prove through Fresh Install/CI/staging.

### Prevention

When a server-authority feature fails on staging, compare environment privileges with the canonical migration/baseline before changing application logic.

---

## SKB-BF-017 — Guest storefront tenant resolver returned null before pilot acceptance context

- status: `implemented`
- evidence: `acceptance_verified`
- area: `storefront/guest/tenant-resolution`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Guest Product Documents storefront acceptance failed even though the pilot acceptance context existed.

### Root cause

Preview tenant resolution returned null before reading the signed `shoperation_pilot_acceptance` context.

### Resolution

Resolve the approved Preview pilot acceptance context before declaring guest tenant resolution unavailable; regression-tested.

### Prevention

Fail-closed tenant resolution must still evaluate the canonical signed acceptance mechanism in the correct order. Do not “fix” guest access by hardcoding a tenant.

---

## SKB-BF-018 — Post-purchase Product Documents existed, but account authorization was incomplete

- status: `implemented`
- evidence: `acceptance_verified`
- area: `product-documents/account-authorization`
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### Symptom

Database/storage proof for post-purchase documents passed, but unauthorized accounts could discover/download documents.

### Root cause

Discovery/download authorization did not yet enforce purchase-aware entitlement strongly enough.

### Resolution

Introduce purchase-aware authority for both discovery and download.

Verified behavior:
- unauthorized account: DENY;
- paid entitled account: ALLOW;
- public/variant/guest/cross-tenant/storage privilege tests: PASS.

### Prevention

Never prove only the file/storage row. Discovery authorization and byte-delivery authorization are separate attack surfaces and both require negative tests.

---

## SKB-BF-019 — Full guest digital delivery requires real storage and hash-only tokens

- status: `implemented`
- evidence: `acceptance_verified`
- area: `digital-commerce/guest-download`
- automation: `HUMAN_REQUIRED`
- risk: `critical`

### Verified chain

1. signed private upload;
2. real private storage object;
3. asset activation;
4. paid order / entitlement;
5. guest token stored/handled hash-only;
6. signed HTTP download;
7. downloaded bytes/hash match;
8. audit/counter update;
9. refund revokes entitlement/token;
10. subsequent download DENY.

### Do not repeat

- no fake storage metadata rows;
- no raw token persistence/logging;
- no permanent public URL;
- no bypass of upload authority;
- no entitlement that survives refund/cancel contrary to order authority.

---

## SKB-BF-020 — Phase 3 Builder/runtime omitted shared Digital Commerce models

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `phase3/builder/runtime-models`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Symptom

Published/Builder shared runtime could render composition but did not expose the required `commerce.digitalCommerce` server-authority models. Preview fixtures were Playroom-key-specific.

### Root cause

Integration was implemented at template/composition level before the shared safe runtime model existed.

### Resolution

Introduce one shared safe Digital Commerce preview/Builder model:
- no real customer entitlements;
- no raw guest token;
- same template-agnostic runtime contract;
- immutable Preview and Builder use the same safe model.

### Prevention

Do not solve shared capability acceptance with a template-key-specific fixture. If every template can inherit the capability, the fixture/model must also be shared.

---

## SKB-BF-021 — Shared capability composition must be installed centrally, not manually in 41 templates

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `phase3/template-factory/composition`
- automation: `DIAGNOSE_ONLY`
- risk: `high`

### Risk found

After fixing live Builder/runtime Digital Commerce models, manually adding capability nodes per template would have repeated the old handcrafted scale-out failure.

### Resolution

Phase 3 established package-level shared composition for normal Template Library install and AI Builder install. Future concrete packages inherit through the shared install path.

### Prevention

Shared launch capability placement belongs in the template/package installation contract. Do not patch all 42 template source files one-by-one.

---

## SKB-BF-022 — Digital assets, Product Documents and Order Documents must not share lifecycle semantics

- status: `implemented`
- evidence: `documented_contract`
- area: `digital-commerce/documents/authority`
- PRs: `#344, #345`
- automation: `DIAGNOSE_ONLY`
- risk: `critical`

### Distinct authorities

1. purchased digital assets / entitlements;
2. product documents (manuals, guides, datasheets);
3. customer/order documents (invoice copies, warranty, certificates, merchant-supplied order records).

### Important lifecycle difference

Refund/cancellation can revoke paid digital entitlement according to order authority. Private invoices/warranty/order records have their own retention/revocation lifecycle and must not disappear merely because a digital entitlement was revoked.

### Prevention

A unified “Documents and downloads” UI may aggregate discovery, but never collapse backend authorization/lifecycle into one table or rule.

---

# Additional Product/Support design lessons

## SKB-BF-D01 — Surface Reduction / Dead Code audit after Market Ready

- status: `design_decision`
- evidence: `design_decision`
- area: `security/attack-surface`

After Market Ready 1.0, perform a deliberate route/dead-code/surface reduction audit. Unused routes/pages/features must be removed or demonstrably disabled. Dormant historical surfaces are a regression and attack-surface risk.

---

# Search keywords

`stale target`, `pending variable`, `duplicate mobile controller`, `832px`, `physical phone detection`, `superseded builder route`, `template version`, `upgrade not visible`, `persisted Page Schema old`, `stale stacked branch`, `Wave 76 release`, `Fresh Install SKIPPED`, `client clock`, `fake scarcity`, `recipe allergen inference`, `COMMERCE_GROUP_IDEMPOTENCY_MISMATCH`, `service_role products grant`, `pilot acceptance tenant resolver`, `unauthorized product document`, `purchase-aware authorization`, `hash-only guest token`, `digitalCommerce runtime model`, `template-specific fixture`, `shared composition install`, `order documents vs digital assets`.

---

# Evidence anchors

Representative PRs:
- #256 AI-Assisted Builder
- #260 Block 24 Commercial/Security/Maturity
- #266/#269 Builder workspace authority
- #273/#276 Email Builder dynamic handoff
- #298–#305 Fidelity/Builder capability stack
- #306–#312 Special Commerce engineering/acceptance
- #313/#315/#318 Builder production fidelity/closure
- #319 superseded Builder route
- #320 Special Commerce production rollup
- #321/#322 Visual Builder v3 product/list completion
- #327/#328 stale Storefront stack production reconciliation
- #329–#334 mobile Builder production fixes
- #339/#341 Playroom template upgrade-path fixes
- #343 Playroom v20 capability consolidation
- #344 Digital Commerce + Product Documents
- #345 Shared Storefront/Builder Integration
- #346 Phase 4 acceptance (separate detailed incident file)

This backfill intentionally excludes Phase 4 geometry incidents already recorded in `PLAYROOM_V20_PHASE4_BUILDER_ACCEPTANCE_INCIDENTS_2026-09-18.md`.
