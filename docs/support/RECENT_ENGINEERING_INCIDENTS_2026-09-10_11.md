# Shoperation Support Knowledge — Recent engineering incidents, 2026-09-10 → 2026-09-11

Status: **historical verified engineering/support knowledge**

Purpose: capture recent defects, misleading symptoms, failed fixes, proven repairs and explicit **do-not-repeat** rules. This record is intended for future human support, Support AI retrieval and engineering diagnostics.

Historical fixes are never replayed blindly. Validate the current route, release, tenant, component contract and environment first.

---

## Global engineering rules extracted from these incidents

### R1 — Inspect navigation authority before changing a route target

Before changing Sidebar, mobile drawer, quick-task or CTA routing:

1. identify the previously approved destination;
2. inspect desktop + mobile/tablet navigation contracts together;
3. inspect the current route/page authority and any central hub relationship;
4. inspect regression tests and historical acceptance decisions;
5. change the smallest routing surface necessary.

**Do not substitute a developer-preferred “more logical” landing page for an already accepted product-owner decision.**

### R2 — A local UI defect does not justify a global shell fix

If only Digital Office, Product Intake or another module is broken, first prove the shared admin shell is also broken. Prefer a route/module-scoped owner. Do not add a global admin viewport/layout override based on one module screenshot.

### R3 — One responsive mode must have one authoritative CSS/layout owner

Do not allow two files/components to independently own the same responsive mode, viewport height, Desktop-site behavior or sidebar skin. Duplicate ownership creates order-dependent regressions and misleading partial fixes.

### R4 — Confirm the exact route and mode before diagnosing a screenshot

For UI incidents capture the exact route, viewport mode, host device/browser mode, active scroll owner and computed layout state. Do not infer Team Chat, e-mail, Send Center or shared admin root cause from appearance alone.

### R5 — Platform operator controls must not disappear because of heuristic device detection

Do not hide platform-only Desktop/Tablet/Mobile controls using host-width, pointer or hover heuristics unless that behavior is explicitly part of the accepted product contract. A platform operator may intentionally use those controls from unusual host environments.

### R6 — Fail-closed acceptance means inspect the failure artifact before changing code

When a contract-first gate fails:

- download/inspect the actual quality/evidence artifact;
- separate test/harness defects from implementation drift;
- repair only the proven deviation;
- never weaken a shared authority contract merely to make a legacy template pass.

If the first stronger gate is green, do not create speculative “hardening” changes.

### R7 — Legacy template drift is fixed locally, not by widening shared storefront authority

Repeated Storefront wave failures showed the same safe pattern:

- duplicate node IDs → make template-local IDs unique;
- obsolete binding namespace → map to an already-authoritative shared namespace;
- unsupported page component → use a component already allowed on that page type;
- stale review/compare/story bindings → align to current shared contracts.

Do **not** widen the runtime allowlist/component registry/binding namespaces unless the shared product architecture genuinely changes.

### R8 — Fresh Install proof is a diagnostic, not a box to bypass

A genuine empty-target failure is valuable evidence. If the fresh baseline is missing a dependency that production already requires, restore the canonical shipped dependency into the customer baseline. Do not add fake/dummy DDL, do not relabel an unproven baseline as ready, and do not replay the historical legacy migration chain.

### R9 — Deployment Protection HTTP 302 is not application-health evidence

A protected Vercel preview may redirect `/api/health` to SSO before the application runs. Record that as **unverified application health**, not PASS and not necessarily FAIL. Do not weaken deployment protection to manufacture a 200 response.

### R10 — Concurrent main changes must be reconciled explicitly

Before merge/release, re-check current `main`. When unrelated work lands during a long-running branch:

- identify whether files/authorities overlap;
- use controlled integration/reconciliation where required;
- rerun the final exact-head gate;
- do not assume an earlier base SHA is still the production baseline.

### R11 — Extend canonical authority; do not create parallel engines to fix UX

Product Intake, Page Schema/Templates, Visual Builder, support, automation and storefront fixes must reuse the existing canonical persistence/business authority. A UX problem is not permission to create a second catalog, page, template, ticket, workflow or publication authority.

### R12 — Shoperation UI must not fall back to browser-native dialogs in product workflows

New/updated Shoperation surfaces should use Shoperation-styled confirmation/prompt/error UX rather than `window.alert`, `window.confirm` or `window.prompt`, while keeping destructive actions explicit and auditable.

---

## INC-2026-0911-01 — Product Intake Sidebar opened the wrong/old landing

- status: `historical_verified`
- evidence: `production_verified`
- area: `admin/navigation/product-intake`
- key PRs: `#212`, `#247`, `#250`, `#253`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

The new Product Intake Center existed and could be opened directly, but clicking **Termékek** in the Sidebar still led the operator to the older/central Product Management experience. This looked like the new feature had been rolled back or had disappeared.

### What happened

PR #212 had established `/admin/termekek/feltoltes` as the Product Intake Center and made Sidebar `Termékek` a direct entry to it. Later navigation work changed the accepted landing relationship. PR #247 routed Products to `/admin/termekek`; PR #250 fixed the upload CTA but intentionally kept Sidebar Products on the central page. That still did not satisfy the previously approved direct-entry contract. PR #253 restored the accepted Sidebar destination to `/admin/termekek/feltoltes` across desktop/mobile-tablet navigation, while keeping `/admin/termekek` available for catalogue management and `/admin/termekek/import-export` for CSV import/export.

### Root cause

Navigation was changed without preserving the previously approved **entrypoint contract**. The feature itself was not rolled back; the route leading to it drifted.

### Resolution

Restore the accepted direct Product Intake Sidebar target and lock the contract with regression tests.

### Do not repeat

- Do not decide that a central hub is a better landing than an explicitly approved direct destination.
- Do not repair only the CTA when the reported failure is the Sidebar entrypoint.
- Do not change desktop navigation without checking mobile/tablet parity.
- Before any menu change, map `menu item → route → page authority → downstream navigation` and compare it with the last accepted decision.

---

## INC-2026-0911-02 — Product Intake Sidebar skin regressions from unstable selectors

- status: `historical_verified`
- evidence: `production_verified`
- area: `admin/product-intake/css`
- key PRs: `#230`, `#234`
- risk: `low`
- automation: `DIAGNOSE_ONLY`

### Symptom

Parts of the canonical dark Shoperation Sidebar/quick-task area remained light or visually inconsistent on Product Intake routes.

### Root causes

Two related selector-authority mistakes were exposed:

1. a reset assumed an `.adminSide` intermediate DOM wrapper that did not exist in the actual matching path, so the older Product Intake global CSS kept winning;
2. route-specific styling had relied on a CSS-module/class relationship rather than a stable route-level DOM contract.

### Resolution

- remove the invalid `.adminSide` selector dependency;
- bind Product Intake route styling to a stable `data-product-intake-route` marker;
- make the full canonical Sidebar the single expected skin;
- add regression coverage for the rendered selector contract.

### Do not repeat

Do not write overrides against assumed DOM structure or generated CSS-module names. Inspect the rendered selector path and prefer stable semantic `data-*` route markers for cross-component route skinning.

---

## INC-2026-0911-03 — Device preview controls disappeared due host-device heuristic

- status: `historical_verified`
- evidence: `production_verified`
- area: `platform/responsive-preview`
- key PRs: `#242`, `#245`, `#247`, `#248`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

Desktop / Tablet / Mobile platform preview controls were missing in sessions where the operator expected to use them.

### Root cause

PR #247 added a “native-device” gate based on host viewport/pointer/hover characteristics. The heuristic encoded an assumption about when the platform operator should need the controls, rather than preserving the platform-level product contract.

### Resolution

PR #248 removed the host-width/pointer-type gate. The three platform view buttons remain available in every top-level platform browser session. Tablet/Mobile render the **current live admin route** at the selected responsive viewport, and Desktop returns to that same route.

### Do not repeat

Do not hide operator tooling because the host browser “looks like” a phone/tablet/desktop. Authorization and product role should decide visibility; preview mode should decide rendering.

---

## INC-2026-0910-04 — Digital Office bottom/height defect was repeatedly misattributed

- status: `historical_verified`
- evidence: `production_verified`
- area: `digital-office/layout/responsive`
- key PRs: `#196`, `#197`, `#200`, `#201`, `#206`, `#207`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

Digital Office / Team Chat showed bottom empty space, premature workspace termination or incorrect height, especially on tall desktop viewports and mobile browser Desktop-site mode.

### Failed/misleading path

PR #196 tested whether the floating Team Chat dock shadow caused horizontal/visual overflow. Production evidence disproved that hypothesis.

PR #197 then added a **global admin viewport floor** based on the legacy `.adminGrid{min-height:calc(100vh - 76px)}` observation. Later diagnosis proved the defect was isolated to Digital Office, so the global fix was too broad and was reverted.

### Proven root causes

PR #201 isolated Digital Office vertical sizing conflicts:

- 840/860px workspace caps;
- touch Desktop-site `digitalOfficeShell` using a full `100dvh` even though route/header context already consumed vertical space;
- inner workspace height being calculated again, creating double-counting.

PR #207 exposed a second concrete ownership defect: both `communication-app-final.css` and `mobile-desktop-compat.css` owned `data-desktop-site-touch` behavior; the obsolete legacy block hard-coded 760px dimensions.

### Resolution

- keep the fix Digital Office-scoped;
- use one final vertical layout owner;
- let route context/toolbar use natural measured height;
- flex the e-mail/Team Chat workspace into the actual remaining height;
- remove hard 840/860/760px ownership and Desktop-site double-counting;
- remove the duplicate legacy Desktop-site CSS owner and keep `mobile-desktop-compat.css` authoritative.

### Do not repeat

- Do not patch the global admin shell because one module has a height defect.
- Do not add another viewport-height formula before listing all current owners.
- Do not remove/alter a floating overlay simply because it sits visually above an exposed area.
- Treat screenshots as symptoms, not proof of the responsible element.

---

## INC-2026-0910-05 — Digital Office request waterfall caused slow/blank navigation

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `digital-office/performance`
- key PR: `#224`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

Digital Office navigation could feel blank/unresponsive for roughly 5–10 seconds while nested server-rendered authorization/data reads completed.

### Root cause

Layout and page performed serial/repeated work instead of sharing a request-scoped access snapshot; independent data reads were not parallelized.

### Resolution

- share a request-scoped cached access snapshot between layout/page;
- keep cache request-local, never cross-user/cross-request;
- parallelize independent reads while preserving tenant/RBAC/capability checks;
- add immediate loading/skeleton feedback;
- colocate Vercel compute with production Supabase region (`fra1`).

### Do not repeat

Performance fixes must not remove or persist authorization state. Eliminate duplicate work, not security gates.

---

## INC-2026-0911-06 — Genuine Fresh Install exposed a hidden baseline dependency gap

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `database/customer-baseline`
- key PRs: `#238`, `#237`, `#244`
- risk: `critical`
- automation: `HUMAN_REQUIRED`

### Symptom

The first genuine empty-target Block 20 Fresh Install proof failed even though existing production/staging environments worked.

### Root cause

The fresh-customer snapshot predated already-shipped Block 11 data-driven entitlement authority. Existing long-lived environments had acquired those dependencies through historical forward migrations, but the standalone customer baseline had not.

### Resolution

- failed attempt rolled back atomically and was kept as evidence;
- restore the canonical production Block 11 migrations **byte-identically** into the customer baseline;
- apply Block 20 after those dependencies;
- rerun genuine empty-target proof;
- only after target preflight, ordered atomic baseline apply, Auth bootstrap, neutral seed and postflight succeeded was the manifest set to `ready` / `freshInstallProofRequired=false`.

### Do not repeat

- Do not fabricate a proof.
- Do not write a second entitlement implementation into the baseline.
- Do not use dummy DDL merely to make a later migration apply.
- Do not assume “works on staging” proves a fresh customer can be provisioned.
- If a later release changes no customer-baseline file relative to the proof-bound baseline, do not burn another identical Fresh Install run solely for appearance.

---

## INC-2026-0910-07 — Recurrent Storefront legacy drift against current shared contracts

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `storefront/templates/page-schema`
- representative PRs: `#195`, `#208`, `#210`, `#213`, `#215`, `#217`, `#220`, `#225`, `#227`, `#229`, `#232`, `#233`, `#243`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Recurrent symptoms

Current-baseline re-acceptance repeatedly found inherited historical templates that no longer matched current shared contracts:

- `NODE_ID_DUPLICATE`;
- `COMPONENT_PAGE_TYPE_NOT_ALLOWED`;
- stale/disallowed binding namespaces (`checkout.*`, `workflow.*`, `performance.*`, `compare.*`, `drop.*`, `story.*` where not allowed);
- stale review-summary bindings;
- missing explicit responsive wrapper evidence.

### Proven safe repair pattern

- fix stable IDs locally;
- project data through already-existing authoritative shared namespaces;
- use components already allowed by current Page Schema contracts;
- preserve provider-neutral shared checkout and product/pricing/inventory authority;
- do not widen shared runtime/registry/allowlist merely to accommodate inherited template code.

### Important diagnostic nuance

Not every failing acceptance assertion proves template drift:

- Wave 44 also exposed a greedy acceptance regex bug (`hotspot` false match);
- Wave 39 exposed a test-harness registry mismatch for canonical Story surfaces.

Therefore inspect the failed artifact before editing production code.

### Do not repeat

Never “solve” a template acceptance failure by granting the template new authority. The failure may be the exact evidence that the template has drifted outside the architecture.

---

## INC-2026-0911-08 — Green contract-first gate means no speculative template change

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `storefront/reacceptance`
- representative PRs: `#222`, `#246`, `#249`, `#251`
- risk: `low`
- automation: `DIAGNOSE_ONLY`

### Pattern

Monarche, Ritual House, Beauty Lab and Alpine Lodge current-baseline gates passed without proving inherited template drift.

### Resolution

The inherited canonical template files were intentionally left unchanged. Only acceptance/evidence artifacts were added.

### Do not repeat

Do not modify code because a wave is called “hardening”. Hardening is evidence-driven. If the stronger current contract passes, speculative edits create risk without evidence.

---

## INC-2026-0911-09 — Vercel Deployment Protection produced preview `/api/health` HTTP 302

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `deployment/preview-health`
- representative PRs: `#237`, `#243`, `#246`, `#249`, `#251`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

Exact-SHA preview deployment is `READY`, but direct `/api/health` returns HTTP 302 to Vercel SSO.

### Root cause

Deployment Protection intercepts the request before the Shoperation application health endpoint executes.

### Resolution

Record preview deployment readiness/exact SHA separately from application health. Do not claim 200 application smoke evidence unless the application endpoint was actually reached.

### Do not repeat

Do not weaken Deployment Protection or reinterpret the 302 as a Shoperation health failure merely to complete a checklist.

---

## INC-2026-0911-10 — Concurrent main advancement requires controlled reconciliation

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `release/git-branching`
- representative PRs: `#218`, `#221`, `#240`, `#241`, `#244`, `#251`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

A long-running roadmap/storefront branch is green against its original base, while unrelated Product Intake, Digital Office or roadmap work has already advanced `main`/production.

### Root cause

The branch's earlier proof no longer represents the current integration composition.

### Resolution

- explicitly integrate/reconcile when the release contract requires it;
- preserve unrelated authorities and baseline state;
- rerun exact final-head CI/build/evidence;
- distinguish stacked Storefront branches (which intentionally do not absorb `main` every wave) from release checkpoints that must reconcile current production.

### Do not repeat

Do not casually rebase/merge `main` into a stacked template wave, and do not release a main-targeting roadmap branch based solely on a stale green build.

---

## INC-2026-0911-11 — Product Intake must extend canonical catalog authority, not create a second onboarding engine

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `catalog/product-intake`
- key PRs: `#209`, `#212`, `#223`, `#239`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Pattern

Product Intake evolved from Block 14 draft-first onboarding into guided editing, copy, CSV/XLSX, Copilot and media presentation tools.

### Safe architecture

- reuse existing catalog draft/apply authority;
- explicit publish gate remains authoritative;
- copy creates an inactive target and never mutates the source;
- AI Copilot is suggestion-only and cannot publish/mutate autonomously;
- media fan-out never creates variants;
- Visual Builder consumes canonical media/page authorities instead of becoming upload/persistence authority.

### Do not repeat

A new UX surface is not a new business authority. Search existing catalog/import/media/publish contracts first, then extend them.

---

## INC-2026-0911-12 — Support inbox belongs inside Digital Office without a second ticket engine

- status: `historical_verified`
- evidence: `code_and_test_verified`
- area: `support/digital-office`
- key PR: `#231`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Pattern

The existing support inbox and ticket detail were mounted into the Digital Office hierarchy as a first-class `Ügyfélszolgálat` destination.

### Safety contracts

- reuse existing support ticket/message authority;
- support visibility requires entitlement + `support.manage`;
- attention API rechecks actor permission, feature and current tenant;
- DB read failure is `unavailable`, never false zero;
- attention polling runs only where needed rather than adding support queries to the whole Digital Office server-render path.

### Do not repeat

Do not create a parallel ticket store merely because Support gets a new navigation/home/dashboard surface.

---

## Search keywords for future Support AI retrieval

`old product page`, `Product Intake missing`, `Termékek sidebar`, `wrong route`, `sidebar light`, `adminSide`, `device buttons missing`, `Desktop Tablet Mobile`, `Digital Office bottom gap`, `Team Chat overflow`, `760px`, `840px`, `860px`, `100dvh`, `Fresh Install failed`, `baseline dependency`, `duplicate node id`, `binding namespace`, `component page type`, `Vercel 302`, `Deployment Protection`, `stale main`, `parallel authority`, `native confirm`, `window.alert`.
