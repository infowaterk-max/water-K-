# Shoperation Support Knowledge — Playroom v20 Phase 4 Visual Builder acceptance incidents, 2026-09-18

Status: **current acceptance-verified / code-and-test-verified engineering knowledge**

Scope: Playroom v20 Phase 4 human Visual Builder acceptance on the staging acceptance tenant and protected Vercel Preview.

Purpose: preserve the defects, misleading symptoms, failed approaches, verified repairs and **Template Factory prevention rules** discovered while bringing the Playroom Builder representation into parity with direct storefront Preview.

This record is deliberately reusable beyond Playroom. Most root causes were shared Visual Builder wrapper/canvas issues and can affect any of the remaining 41 templates.

---

## Global rules extracted for the remaining 41 templates

### F1 — Builder decorators must be layout-transparent

Any wrapper inserted for selection, labels, floating tools, drag handles or inspection must preserve the runtime node's layout authority.

At minimum audit:

- CSS Grid placement: `gridColumn`, `gridRow`, `order`, `alignSelf`, `justifySelf`;
- absolute placement: `position`, inset/top/right/bottom/left, width/height, z-index;
- grid row stretch;
- min-width / intrinsic-size behavior;
- breakpoint-specific effective style.

A wrapper that is visually harmless in simple stacks may break complex templates.

### F2 — Test Builder and direct Preview side-by-side

A template can render correctly in direct Preview and incorrectly in Builder while using the same Page Schema.

Therefore every Template Factory acceptance should include:

1. Builder Desktop canonical viewport;
2. direct Runtime Preview of the same draft;
3. targeted parity comparison for geometry, media and row heights.

### F3 — Canonical viewport width is not the same thing as available editor width

Desktop means the layout must be calculated at the canonical Desktop viewport (currently 1200px), even if the editor center column is narrower.

Do not render Desktop rules inside a 500–700px physical frame simply because side panels are open.

### F4 — Zoom is presentation, not responsive authority

Zoom must not change the logical breakpoint/layout width.

If the editor cannot physically display the canonical viewport, use a scaled viewport wrapper and **Fit-to-canvas**, not responsive compression.

### F5 — Fit must use measured workspace width

A fixed minimum such as 60% is not universally safe.

With both Builder side panels open, 1200px × 60% = 720px may exceed the actual center workspace. Compute the fit factor from measured available width and keep a guarded minimum.

### F6 — Shared fixes beat template-local compensation

If direct Preview is correct and Builder is wrong, do not change the template until the shared Builder wrapper/canvas path has been ruled out.

Template-local width/height/grid hacks would encode editor defects into the storefront schema and pollute all future runtime output.

### F7 — Green CI is not visual PASS

CI proves contracts/code/build/security. It does not prove visual fidelity.

Live human comparison found multiple real defects after automated acceptance was already green.

### F8 — Keep failed approaches as first-class knowledge

Intermediate attempts that were logically plausible but incomplete must remain searchable. A later AI/support agent should know what not to repeat.

---

# Incident records

## SKB-P4-001 — Platform-owner session could not resolve a unique tenant

- status: `implemented`
- evidence: `acceptance_verified`
- area: `admin/auth/tenant-context/visual-builder`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

Opening the Visual Builder from the protected Preview produced the admin fail-closed page instead of a merchant Builder.

### Context

The authenticated platform owner had **two active owner tenant bindings** on staging.

### Diagnosis

The current store resolver intentionally auto-selects only when the actor resolves to one unambiguous tenant.

### Root cause

The session had legitimate access to multiple tenants, so automatic selection would have been unsafe.

### Failed / rejected paths

- Do not invent a tenant from route appearance.
- Do not set an unsigned/manual tenant cookie.
- Do not weaken the fail-closed resolver.
- Do not create a new user merely to bypass ambiguity.

### Verified resolution

Add a Preview-only explicit acceptance entry:

- authenticated platform operator required;
- exact pilot tenant required;
- active owner/admin binding required;
- existing HMAC-signed pilot acceptance token reused;
- HttpOnly, SameSite=Lax, short-lived;
- no tenant/business-data mutation.

### Verification

Human acceptance successfully entered the selected Alap tenant Builder.

### Prevention

Template/merchant acceptance tooling must always make tenant selection explicit when the actor has >1 valid tenant.

---

## SKB-P4-002 — Alap tenant was redirected to Csomagkezelés before Builder capability rendering

- status: `implemented`
- evidence: `acceptance_verified`
- area: `builder/entitlement/route-gate`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

After correct tenant selection, the Alap acceptance tenant landed on Csomagkezelés instead of Visual Builder.

### Root cause

The Builder page executed `requirePlanFeature('contentMarketing')` before the Builder's own entitlement-aware capability model could render available/locked Alap vs Pro features.

### Rejected path

Do **not** temporarily change the acceptance tenant to Pro. That would destroy the validity of Alap locked/available acceptance.

### Verified resolution

Allow only the outer Builder route gate to pass when **all** are true:

- Vercel Preview;
- valid signed pilot acceptance session;
- platform operator;
- acceptance tenant id exactly matches current store context.

Inside Builder, the real Alap plan remains authoritative.

### Prevention

Acceptance bypasses may open a test surface, but must never spoof the entitlement state being tested.

---

## SKB-P4-003 — Acceptance deep-link template page key did not match persisted page key

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `builder/navigation/page-key`
- risk: `low`
- automation: `DIAGNOSE_ONLY`

### Symptom

The acceptance entry targeted `page=playroom.home`, but the Builder initially opened **Fiókom** instead of Főoldal.

### Evidence

Persisted staging page keys are canonical runtime keys such as:

- `home`
- `account`
- `product`
- `catalog`

Template metadata separately contains preset identities such as `playroom.home`.

### Likely root cause

The Builder page selector compares the route query to persisted `storefront_pages.page_key`. `playroom.home` is therefore not a persisted page key and falls back to the first available page.

### Verified resolution

The Preview-only platform acceptance action now deep-links with the persisted runtime key `page=home`, not the template preset identity `playroom.home`. The Builder therefore resolves Főoldal deterministically instead of falling back to the first available persisted page.

Regression coverage now asserts both sides of the contract:
- the acceptance action contains `page=home&acceptance=platform`;
- `page=playroom.home` must not return.

### Prevention

Do not conflate **template preset page identity** with **persisted runtime page key**. Acceptance/deep links must use the persisted page key or an explicit preset→page mapping. Keep this contract covered whenever acceptance/navigation entry points are changed.

---

## SKB-P4-004 — Builder selection wrapper collapsed CSS Grid spans to one track

- status: `implemented`
- evidence: `acceptance_verified`
- area: `visual-builder/canvas/css-grid`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

Playroom blocks became extremely narrow; headings wrapped character-by-character; large unused space remained on the right.

Browser zoom changes did not explain the geometry.

### Diagnosis

The Page Schema and direct runtime had correct spans, including 6/12, 7/12 and 5/12.

### Root cause

Visual Builder V3 wrapped every runtime node in a selection `div`.

The runtime node's `grid-column` stayed on the nested child, while the new wrapper became the direct CSS Grid child. The wrapper therefore auto-placed as one grid track.

### Verified resolution

Builder wrapper now preserves the node's effective:

- `gridColumn`;
- `gridRow`;
- `order`;
- `alignSelf`;
- `justifySelf`;
- `minWidth: 0`.

### Verification

Live human re-check showed normal hero and merchandising grid proportions.

### Prevention

Every Builder decorator must be tested as a direct child of `layout.grid`; do not assume nested layout styles survive wrapper insertion.

---

## SKB-P4-005 — Dense Commerce Header activated horizontal-scroll fallback at Desktop 1200px

- status: `implemented`
- evidence: `acceptance_verified`
- area: `storefront/system.commerce-header`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

The Playroom Commerce Header showed an internal horizontal scrollbar at canonical Desktop width.

### Diagnosis

This was not whole-page overflow. It was the shared header's intentional `overflowX:auto` fallback.

Playroom combined:

- 9 navigation items;
- category trigger;
- utility labels;
- decorative right-side tagline;
- generous menu gap.

### Root cause

The configuration was too dense for 1200px before the fallback activated.

### Verified resolution

Shared Commerce Header detects dense Desktop navigation (8+ items):

- tighter menu spacing;
- slightly smaller navigation type;
- decorative tagline suppressed in dense Desktop mode;
- horizontal-scroll fallback retained for genuinely constrained cases.

Sparse headers keep previous behavior.

### Prevention

Do not delete safety overflow just because one template triggers it. First reduce optional density while preserving the fallback.

---

## SKB-P4-006 — Builder said “Desktop 1200px” but physically rendered in a much narrower frame

- status: `implemented`
- evidence: `acceptance_verified`
- area: `visual-builder/canvas/viewport`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

Direct Preview looked correct, while Builder compressed the same Desktop layout aggressively.

### Root cause

Builder frame used:

`width: min(100%, 1200px)`

With left and right editor panels open, the actual center column overrode the 1200px canonical width. The renderer still received `viewport='desktop'`, so Desktop rules ran inside a pseudo-mobile physical width.

### Verified resolution

Keep the inner Builder page frame at exact canonical widths:

- Desktop 1200;
- Tablet 768;
- Mobile 390.

Scale presentation separately.

### Prevention

Never use available editor column width as the logical responsive viewport.

---

## SKB-P4-007 — Transform/CSS zoom attempts did not reliably solve scroll geometry

- status: `superseded`
- evidence: `acceptance_verified`
- area: `visual-builder/canvas/zoom`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

After canonical 1200px width was restored, a horizontal scrollbar remained at 60% zoom.

### Attempt 1 — `transform: scale(...)`

Visually reduced the page but kept the original unscaled layout footprint for browser scrolling.

**Result: incomplete.**

### Attempt 2 — layout-aware/CSS zoom-only approach

Improved presentation but still did not make browser scroll geometry reliably equal visual geometry across the Builder shell.

**Result: incomplete.**

### Verified successor

Separate the concerns:

1. canonical inner frame width;
2. visual transform scale;
3. explicit outer wrapper sized to scaled width/height.

Use `ResizeObserver` to track the natural inner height and set the scaled wrapper height.

### Prevention

When CSS transforms and scrolling interact, explicitly model the scaled scroll footprint instead of assuming the browser will infer it as desired.

---

## SKB-P4-008 — Fixed 60% minimum still overflowed with both Builder side panels open

- status: `implemented`
- evidence: `acceptance_verified`
- area: `visual-builder/canvas/fit`
- risk: `medium`
- automation: `AUTO_FIX`

### Symptom

Even after the scaled viewport wrapper, the 1200px Desktop page still needed horizontal scrolling on the user's workspace.

### Diagnosis

This was no longer hidden overflow.

1200 × 60% = 720px, while the center workspace with both panels open was only about 650–670px.

### Root cause

A fixed minimum zoom cannot guarantee fit across host window sizes/panel combinations.

### Verified resolution

Add **Fit-to-canvas**:

- measure real canvas content width;
- exclude horizontal padding;
- calculate highest zoom that fits canonical viewport;
- allow Fit below 60% to a guarded 35% minimum;
- keep manual zoom up to 130%.

Observed live result: Fit selected ~49% on the user's workspace and removed the horizontal canvas scrollbar.

### Prevention

Template Factory visual QA should use **Fit**, not a hardcoded zoom percentage.

---

## SKB-P4-009 — Absolute media disappeared in Builder but rendered in direct Preview

- status: `implemented`
- evidence: `acceptance_verified`
- area: `visual-builder/decorator/absolute-positioning`
- risk: `high`
- automation: `DIAGNOSE_ONLY`

### Symptom

Builder missed or misplaced Playroom media that appeared correctly in direct Preview:

- hero photo;
- gift-card image;
- PLAY TOGETHER/community background image.

### Root cause

The affected `content.image` nodes used `position:absolute`.

Builder selection wrapper became a new positioning ancestor, changing the containing block.

### Verified resolution

Move absolute placement authority to the decorator wrapper:

- `position`;
- `inset`;
- `top/right/bottom/left`;
- `width/height/minHeight/maxWidth`;
- numeric `zIndex`.

Mark absolute wrappers and normalize the nested runtime element to fill the wrapper box while retaining visual properties such as object-fit/crop/opacity/filter/transform.

### Verification

Live Builder re-check restored the hero, gift and community images.

### Prevention

Any decorator wrapper around absolutely positioned media must preserve the original containing-block semantics.

---

## SKB-P4-010 — Grid row stretch stopped at Builder wrapper instead of the runtime block

- status: `implemented`
- evidence: `acceptance_verified`
- area: `visual-builder/decorator/grid-stretch`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

In Builder, the left **Újdonságok & Kiemelt játékok** block was visibly shorter than the right Platform Compatibility/Gift block.

Direct Preview stretched both to equal row height.

### Root cause

Runtime `layout.grid` defaults to `alignItems:'stretch'`.

Builder wrapper became the direct grid child and stretched correctly, but the nested runtime block retained intrinsic height.

### Verified resolution

Detect the real parent:

- only if parent is `layout.grid`;
- only if effective `alignItems` is `stretch`;
- then nested runtime child receives `height:100%`.

Explicit `start/center/end` remains authoritative.

### Verification

Human re-check: **PASS**. Both blocks now share the same row height and lower edge.

### Prevention

Wrapper transparency includes cross-axis stretch semantics, not only width/grid-column.

---

## SKB-P4-011 — Protected Preview / staging proof cleanup collided with hardened database contracts

- status: `implemented`
- evidence: `acceptance_verified`
- area: `acceptance/staging/security/cleanup`
- risk: `high`
- automation: `HUMAN_REQUIRED`

### Symptom

Temporary acceptance proof reached successful Contact and Newsletter behavior, but cleanup/postflight returned 500.

### Proven constraints

1. `storefront_page_revisions` is immutable by contract/trigger.
2. `service_role` intentionally lacks DELETE on hardened support/marketing acceptance tables.

### Rejected paths

- Do not disable immutable revision trigger.
- Do not grant service-role DELETE merely to simplify acceptance cleanup.
- Do not delete immutable revision history.
- Do not weaken database hardening to turn a proof green.

### Verified resolution

- Preview route proves behavior/postflight only.
- Temporary support/newsletter rows are cleaned separately using authorized staging operator SQL.
- Immutable storefront revision history remains as evidence.

### Prevention

Acceptance harness cleanup must respect production-grade security/immutability contracts. If cleanup authority is intentionally narrower than proof authority, separate proof from operator cleanup.

---

## SKB-P4-012 — Vercel Preview Protection redirect is not runtime HTTP evidence

- status: `historical_verified`
- evidence: `acceptance_verified`
- area: `vercel/preview/evidence`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Symptom

Direct protected Preview requests can return a 302/SSO path before app code runs.

### Rule

A Preview Protection redirect is:

- not application-health PASS;
- not necessarily application-health FAIL;
- evidence that the app HTTP path is **unverified through that request**.

### Verified approach

Use the authorized protected acceptance path/workflow with exact SHA proof and Preview bypass secret where appropriate. Do not weaken protection to manufacture HTTP 200.

### Prevention

Release proof must distinguish deployment READY from application-runtime HTTP evidence.

---

## SKB-P4-013 — CI failures caused by acceptance-test defects must not be misdiagnosed as runtime failures

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `ci/testing/acceptance`
- risk: `medium`
- automation: `DIAGNOSE_ONLY`

### Incidents observed

During Phase 4 fixes, several exact-head CI attempts failed for test/harness reasons:

- regression test used impossible typed `gridSpan:99`;
- a newly inserted `it(...)` block landed in the wrong syntax location;
- another inserted test block landed inside the fixture object;
- grid-stretch helper initially accepted `StorefrontResolvedComponentNode` while Builder flat-tree parent was `StorefrontComponentNode`.

### Correct response

For each:

1. inspect the exact failing CI step/log;
2. determine whether production implementation or test harness is wrong;
3. repair the smallest proven defect;
4. rerun full exact-head CI;
5. never claim the prior red head as accepted.

### Prevention

Support/engineering AI should not recommend runtime rollback or contract weakening from a red CI status alone. Read the failing artifact/log first.

---

## SKB-P4-014 — Automated acceptance was green before live Builder fidelity was actually proven

- status: `implemented`
- evidence: `acceptance_verified`
- area: `release/visual-acceptance`
- risk: `high`
- automation: `HUMAN_REQUIRED`

### Symptom

Code/runtime/staging acceptance was green, yet live Visual Builder inspection exposed multiple serious fidelity defects.

### Defects found only through human/live comparison

- grid spans collapsed by decorator wrapper;
- canonical Desktop width compressed by editor column;
- scroll-footprint/zoom mismatch;
- need for measured Fit-to-canvas;
- absolute media positioning loss;
- grid stretch mismatch.

### Root cause

Automated tests proved contracts and isolated render behavior but did not reproduce all browser layout interactions introduced by the real Builder shell/decorator stack.

### Rule

**CI green ≠ visual release-ready.**

### Prevention

For every launch-quality template family:

- direct Preview;
- Builder;
- Desktop/Tablet/Mobile canonical viewport;
- Fit-to-canvas;
- human side-by-side comparison;
- only then visual acceptance.

---


## SKB-P4-015 — Hungarian template contained English customer-facing labels

- status: `implemented`
- evidence: `code_and_test_verified`
- area: `storefront/template/localization`
- risk: `medium`
- automation: `AUTO_FIX`

### Symptom

The Hungarian Playroom template still exposed English or mixed-language customer-facing labels, including examples such as `PRODUCT FILES`, `PLAYER SUPPORT`, `AFTER PURCHASE`, `PLAYER LIBRARY`, `STOCK`, `CHECKOUT`, `GAME NIGHT READY`, `PLAY TOGETHER` and mixed copy using `gaming/setup/co-op/multiplayer`.

### Root cause

The template family was assembled over multiple fidelity/version waves. Visual parity and capability work preserved older English marketing/eyebrow strings, while later commerce additions introduced additional English labels.

### Verified resolution

- localized the active Playroom Home source, v19 full-page family, v19 parity/archetype pages and v20 Digital Commerce additions;
- brand/proper names remain unchanged where appropriate (e.g. Playroom, PlayStation, Xbox, Nintendo, PC, RGB);
- functional labels, CTAs, helper copy and natural-language category text are Hungarian;
- added `tests/storefront-playroom-v20-hungarian-language.test.ts` to scan customer-facing config fields and reject known English UI terms.

### Prevention

Every localized template must have a language gate over customer-facing Page Schema/config strings before portfolio acceptance. Do not treat internal metadata/component ids as storefront language.


# Failed-approach / do-not-repeat index

## DNR-01 — Do not “fix” Alap acceptance by changing the tenant to Pro

It invalidates the entitlement behavior under test.

## DNR-02 — Do not compensate Builder wrapper defects in template Page Schema

If direct Preview is correct, a template-local width/grid/position hack makes runtime wrong to hide an editor bug.

## DNR-03 — Do not remove Commerce Header overflow safety because a dense template triggers it

Adapt optional density first.

## DNR-04 — Do not rely on `min(100%, canonicalWidth)` for Builder canonical viewport

That renders Desktop rules in a narrower physical box.

## DNR-05 — Do not assume `transform:scale` fixes scroll footprint

Visual scale and layout footprint are separate.

## DNR-06 — Do not use a fixed zoom as the Template Factory acceptance standard

Use measured Fit-to-canvas.

## DNR-07 — Do not weaken immutable revision, service-role or Preview Protection boundaries to simplify testing

Acceptance must adapt to security contracts, not the reverse.

## DNR-08 — Do not treat every red CI as a runtime regression

Inspect the exact failing job/log and distinguish harness defects.

---

# Template Factory preflight derived from Phase 4

Before accepting each of the remaining 41 templates, run this shared preflight:

1. Builder and direct Preview render the same persisted draft.
2. Desktop canonical layout is calculated at 1200px.
3. Use **Fit** with both editor side panels open.
4. Test at least one multi-column `layout.grid` composition.
5. Test unequal-content siblings in a stretched grid row.
6. Test at least one absolutely positioned image/layer if the template uses them.
7. Test a dense navigation/header if the template has one.
8. Compare visible media slots between Builder and Preview.
9. Confirm no template-local workaround was introduced for a shared Builder defect.
10. Confirm Alap/Pro capability difference without switching template skin.
11. Record any failed hypothesis before moving on.
12. Run the template language gate: customer-facing labels/copy must match the template locale; brand/proper names may remain unchanged.
13. On product pages, keep only **public Product Documents** discoverable in the primary PDP decision zone. Prefer embedding the shared `commerce.downloads-tile` as a compact peer tile inside an existing product-facts / compatibility / specification cluster when the template has one; only fall back to a standalone section directly after the main product surface when there is no suitable cluster. Never bury it near the footer. Purchased digital assets are **never downloaded from the PDP**; after an eligible purchase they belong to `Fiókom → Letöltéseim` and remain entitlement-authorized. A digital/mixed PDP may show a short informational note pointing users to the profile library after purchase, but must not expose a digital asset download link there.
13. Final exact-head CI + READY Preview + human visual PASS are separate gates.

---

# Evidence anchors

Phase 4 Draft PR: **#346**

Protected Preview → staging functional proof:
- proof SHA `b04946a26975f5ba1ab96e4c79ebd9aab04ae8b4`;
- Actions proof run `35319456085`: SUCCESS.

Current knowledge-backfill baseline before documentation commits:
- accepted implementation head `5dfbe070627a8c788ccd3bab9c92da4d6e3d5f3d`;
- CI #3848 / Actions `35388115813`: SUCCESS;
- Vercel deployment `dpl_DYbT5zwnC9W36TH82Wgw5bi5sDf6`: READY.

Human evidence:
- grid composition re-check: PASS;
- absolute media re-check: PASS;
- Fit-to-canvas live behavior: ~49% and no unnecessary horizontal scroll;
- grid row stretch re-check: PASS.

Safety:
- no merge to `main`;
- no production deploy;
- no production database mutation;
- no tenant plan mutation;
- PR remains Draft.

---

# Next knowledge work

The following should be added as acceptance continues:

- Catalog page findings;
- PDP 7/5 + Product Documents findings;
- Cart/Checkout shared commerce runtime findings;
- Account document-center findings;
- remaining 14-page Builder family findings;
- Pro-context acceptance and Alap→Pro capability-delta findings;
- Tablet/Mobile findings in later canonical phases.

Do not wait until all 41 templates are complete. Promote reusable findings as soon as they become verified.


### 2026-09-19 — Playroom compact downloads placement refinement
- Human visual feedback showed the standalone full-width downloads section was still too prominent.
- Playroom now embeds `playroom-product-downloads` directly into `playroom-product-facts-container` as the third peer tile after `Játékadatok` and `Platform Compatibility`.
- This is a presentation/composition refinement only; public-vs-account document authority and entitlement rules are unchanged.
- Template Factory guidance: when a PDP already has a compact facts/specification cluster, downloads should usually join that cluster instead of creating a new full-width section.


### 2026-09-19 — Cart customer-task simplification
- Human visual acceptance rejected customer-facing `Valós ár`, `Valós készlet`, `Végső ellenőrzés` trust tiles and the `Innen már vezetünk` step panel as internal-engine communication rather than useful cart UX.
- Playroom v20 cart now focuses on cart lines, quantity, authoritative price/total, checkout CTA and optional recommendations.
- Price, inventory and final order validation remain mandatory server/runtime responsibilities; removing the explanatory tiles does **not** remove validation.
- The standalone cart `commerce.fulfillment-summary` surface was also removed. Physical/digital fulfillment belongs with the actual cart line/runtime where relevant, not in a detached full-width panel.
- Persisted v20 acceptance drafts are normalized in Builder/Direct Preview without mutating published storefront pages.
- Template Factory guidance: do not expose internal authority/validation assurances as decorative cart tiles when the engine can enforce them silently and correctly.


## SKB-P4-016 — Template-native checkout crashed because staging missed reusable-symbol migrations

- status: `verified_fixed`
- evidence: `runtime_log_plus_staging_schema_verification`
- area: `storefront/checkout/runtime/environment-drift`
- risk: `high`
- automation: `PRECHECK_REQUIRED`

### Symptom

Opening the interactive Playroom checkout acceptance route reached the generic application error boundary instead of the Playroom checkout. The visible message looked like an idempotency/retry warning, which initially made the failure appear related to order recovery.

### Root cause

Vercel runtime logs showed the real failure:

`STOREFRONT_SYMBOL_LIST_FAILED: Could not find the table 'public.storefront_reusable_symbols' in the schema cache`

The template-native checkout resolver correctly materializes current linked/global reusable symbols before rendering. The staging acceptance database had not received:

- `20260912235500_storefront_reusable_symbols.sql`
- `20260913211500_storefront_global_commerce_header_symbol.sql`

The failure was therefore **environment/migration drift**, not checkout recovery and not an already-submitted order.

### Verified resolution

- confirmed `storefront_reusable_symbols` and `storefront_reusable_symbol_events` were absent in staging;
- confirmed their prerequisite functions/tables already existed;
- applied the two canonical forward migrations to **staging only**;
- verified both reusable-symbol tables now exist;
- kept production unchanged;
- added an acceptance preflight so the interactive checkout test reports `STOREFRONT_SYMBOL_SCHEMA_REQUIRED` before launching instead of falling through to the generic application error boundary.

### Failed approach / do not repeat

Do not infer the root cause from the generic `src/app/error.tsx` copy. That screen intentionally contains conservative order-retry language and can mask unrelated server-render failures. Always inspect the exact Vercel runtime error for the failing route first.

### Template Factory prevention

Before interactive storefront acceptance for any template:

1. verify all runtime schema dependencies required by the active template/runtime are present in the target staging environment;
2. distinguish migration/schema drift from component/runtime defects;
3. fail acceptance preflight with a specific dependency code instead of opening a route that will hit the global error boundary;
4. only then continue with human UI acceptance.



## SKB-P4-017 — Live checkout rendered with light fallback theme; search icon and footer lost Playroom fidelity

- status: `implemented`
- evidence: `human_visual_plus_code_contract`
- area: `storefront/template-shell/live-checkout-fidelity`
- risk: `medium`
- automation: `AUTO_FIX_AND_VISUAL_GATE`

### Symptom

The template-native Playroom checkout successfully loaded the real shared E13 flow, but three visual regressions remained:

1. the embedded checkout cards, fields and summary used the generic light fallback instead of the Playroom dark storefront theme;
2. the icon-only search action used a tiny text glyph that was optically off-center;
3. the Playroom footer inherited an aggressively compressed historical fidelity override and appeared unnaturally flat.

### Root cause

- `StorefrontCheckoutShell.checkoutThemeStyle` resolved the active storefront global CSS variables, then overwrote them with light hard-coded fallbacks whenever a persisted draft did not yet contain the newer `checkoutTheme` metadata.
- `system.search` rendered the historical `⌕` label as font text instead of a stable SVG icon with a centered fixed hit area.
- persisted Playroom v20 drafts still carried the v16 compact footer values such as `.34rem ... .42rem` padding and near-zero link spacing.

### Verified resolution

- checkout theme inheritance now keeps the active storefront Global Styles as authority and only applies explicit `checkoutTheme` values as overrides;
- icon-only search controls render an 18 px SVG magnifier in a centered fixed-width action button;
- the Playroom v20 shared-shell normalizer restores footer vertical padding, minimum height, column gap and navigation line spacing for current/future v20 pages without rewriting historical exact-version packages;
- regression coverage locks all three contracts.

### Follow-up diagnosis

The first footer fix still did not affect the live checkout footer. The reason was the global reusable-symbol materializer: when a global footer replaces a page-local footer with a different root id, it remaps the root and every descendant id to generated `global-footer-*` / `sym-*` ids. An id-based `playroom-footer-*` compatibility pass therefore cannot reliably target the live footer.

The first SVG search fix also remained visually weak because the template's persisted `buttonStyle.padding` was merged after the icon-only geometry and overrode its fixed padding/box model.

### Follow-up resolution

- Playroom v20 footer normalization is now semantic: it detects the footer by preserved customer-facing content (`Vásárlási információk`, `Kövess minket`, Playroom brand copy) and normalizes the entire detected footer subtree regardless of remapped node ids.
- The search button applies template visual styles first, then reapplies invariant icon-only geometry (fixed width, zero padding, flex centering), so template-local padding cannot distort the icon control.
- Regression coverage explicitly remaps all footer ids before normalization and verifies the footer still receives the v20 spacing contract.

### Prevention

For every remaining template, live shared commerce surfaces must inherit the active template's Global Styles by default. A missing optional template-local theme block must never fall back to a different visual system. Icon-only controls must use deterministic SVG geometry, and historical fidelity compression must be normalized at the current template-version boundary before portfolio acceptance.


## SKB-P4-018 — Dark checkout inherited panel colors but not readable field-label hierarchy

- status: `implemented`
- evidence: `human_visual_plus_css_contract`
- area: `checkout/dark-theme/readability`
- risk: `medium`
- automation: `STYLE_CONTRACT`

### Symptom

After the E13 checkout inherited the Playroom dark theme, the inner form remained hard to read:
- native `fieldset > legend` titles visually sat on the panel border instead of reading as content inside the panel;
- field labels inherited insufficient contrast and nearly disappeared against the dark muted surface;
- placeholders were not clearly differentiated from actual field labels.

### Root cause

The shared checkout CSS had only switched surface/input colors. It did not define a dark-theme-safe semantic hierarchy for native fieldset legends, checkout labels, helper text and placeholders. The global checkout stylesheet still supplied the structural legend behavior.

### Resolution

- fieldset legends are moved into the panel's visual content flow with a full-width internal heading row and divider;
- `.checkoutField > span` receives explicit high-contrast text, weight and line-height;
- helper text remains muted while placeholders use a separate, lower-emphasis token blend;
- input/select/textarea text is explicitly bound to the active checkout text token;
- regression coverage locks the dark-theme readability contract.

### Prevention

Every shared form surface used inside a template-native shell must define a complete semantic contrast hierarchy: section heading → field label → field value → helper/placeholder. Theme inheritance is not complete if only background and border tokens are inherited.

## SKB-P4-019 — Acceptance mixed cart bypassed shared CartProvider state and checkout stayed at 0 Ft

- status: `verified_fixed`
- evidence: `staging_rpc_plus_preview_runtime_logs_plus_code_contract`
- area: `storefront/checkout/acceptance-cart-state`
- risk: `high`
- automation: `SHARED_STATE_REQUIRED`

### Symptom

The interactive Playroom checkout acceptance page rendered the real shared E13 checkout and the fulfillment preview could identify one physical and one digital product, but the live order summary showed `Termékek: 0 Ft` / `Fizetendő: 0 Ft` and no line items.

The intended acceptance basket is:

- Acceptance Physical Product — 1270 Ft;
- Acceptance Digital Product — 2540 Ft;
- mixed subtotal before coupon/shipping — 3810 Ft.

### Diagnosis

Read-only staging verification proved that both acceptance variants exist and the canonical checkout RPC classifies the exact pair as `mixed`. Calling the canonical quote function with the same variant ids returned two lines and a 3810 Ft subtotal.

The corresponding Preview runtime logs showed `/penztar` page loads but no `/api/checkout/quote` request at all. Therefore the failure was upstream of the quote backend: the client checkout never had usable quote items.

### Root cause

The acceptance seeder wrote `shoperation-cart-v4` directly to `localStorage` while the root shared `CartProvider` independently hydrated and persisted its own cart state. The seeder also navigated with a native anchor.

This created a state-authority race: the acceptance helper could report itself ready after a raw storage write even though the shared provider still held an empty basket and could persist that empty state. A second race existed at mount time as well: a child seeder could attempt to seed before the root `CartProvider` finished its initial storage hydration, allowing the provider hydration pass to overwrite the seed. The following navigation could therefore reach checkout with an empty shared state. Because `CheckoutForm` correctly skips quote calls when there are no quoteable cart items, no quote request was emitted and the summary stayed at 0 Ft.

### Failed approach / do not repeat

- Do not hard-code 3810 Ft or acceptance line items into the checkout summary.
- Do not seed commerce acceptance by writing the provider's storage key directly.
- Do not treat a correct database quote RPC as proof that the browser cart pipeline is healthy.
- Do not debug the quote backend first when Preview runtime logs prove that the quote endpoint was never called.

### Implemented resolution

The acceptance seeder now uses the shared cart authority:

- the shared `CartProvider` exposes an explicit `hydrated` readiness flag;
- the acceptance seeder waits for `hydrated === true` before it may seed;
- `useCart().replace(items)` seeds the same state consumed by the storefront checkout;
- `setCouponCode('')` resets the coupon through the same provider contract;
- readiness is derived from the hydrated provider's actual cart items, not from completion of a storage write;
- navigation uses Next `Link`, preserving the shared provider during the route transition while normal CartProvider persistence remains responsible for storage.

No production database or order path was changed.

### Regression coverage

The Playroom Phase 4 functional acceptance test now locks that the acceptance seeder:

- uses `useCart`;
- requires the shared provider's `hydrated` contract before seeding or enabling navigation;
- calls `replace(items)`;
- clears the coupon through `setCouponCode`;
- gates checkout navigation on provider-observed readiness;
- no longer writes `shoperation-cart-v4` directly.

Live verification is still required before changing this incident to `verified_fixed`: the checkout must visibly show both lines and a 3810 Ft subtotal and must emit the real shared quote request.

### Template Factory prevention

All future template acceptance seeders must enter commerce state through the shared runtime/provider API rather than through implementation-detail storage keys. Acceptance helpers must consider state ready only after provider hydration has completed and the canonical provider observes the seeded lines. Storage format and migrations remain private implementation details of the shared cart engine.



### Verification
Human Preview proof showed both acceptance items with 1270 Ft + 2540 Ft = 3810 Ft, and exact-head Preview runtime logs showed `POST /api/checkout/quote 200` after provider-driven cart hydration/seeding.

---

## SKB-P4-020 — Search action optical centering and checkout summary secondary-text contrast escaped shared semantic styling

**Status:** `verified_fixed`  
**Evidence:** `human_preview_screenshot_plus_shared_renderer_contract`  
**Area:** `storefront/header/search + checkout/summary`  
**Risk:** medium  
**Automation:** `SEMANTIC_CONTRAST_AND_ICON_ALIGNMENT_REQUIRED`

### Symptom

On the exact-head Playroom Checkout Preview, the search action was functionally present but the magnifier still looked vertically wrong inside its button. In the same Preview, the verified order summary rendered correct line items and a correct 3810 Ft total, but item labels and trust/verification copy were too dark against the dark summary surface.

### Deeper root cause

The first icon-centering patch treated the symptom but missed the real parent/child geometry contradiction.

The Playroom search root is intentionally compact: the inherited desktop-polish preset resolves it to a fixed `height:'2.24rem'`, and the shared search root clips overflow. The first patch then gave the icon-only button `minHeight:'2.75rem'`.

That made the button's minimum cross-size larger than its own clipped parent. Grid centering could be mathematically correct inside the oversized button while the button itself was vertically clipped by the 2.24 rem search root. Repeated SVG sizing or Y translation therefore could not reliably solve the visible defect.

The checkout-summary issue was separate: secondary text did not explicitly bind to checkout semantic color tokens, while legacy global checkout styles still expose `var(--muted)` for trust text.

### Failed approach / do not repeat

Do not fix a clipped icon by repeatedly changing SVG size, `translateY`, or by adding a child `min-height` without first checking the resolved parent height and overflow contract. In protected storefront chrome, parent and child geometry must be inspected together.

### Resolution

- the Playroom compact search height remains a valid template decision;
- the shared icon-only search button no longer imposes a larger minimum height than its root; it stretches to the resolved root with `height:'auto'` and `minHeight:0`;
- the magnifier is removed from normal flow and centered from the actual clickable button box with absolute `left:50%` / `top:50%` plus `translate(-50%,-50%)`;
- the shared guided checkout summary explicitly maps line labels to `--checkout-label`, trust copy to `--checkout-helper`, total text to `--checkout-heading`, and keeps monetary values on one line;
- no business logic, quote logic, production database state, or production deployment was changed.

### Regression coverage

The shared commerce-header renderer has a render-level regression that deliberately combines a fixed 2.24 rem search root, `overflow:hidden`, and an icon-only action. The test requires the button to remain at `min-height:0` / `height:auto`, the icon to use absolute 50/50 centering, and forbids the previous 2.75 rem child minimum. The Playroom Phase 4 acceptance contract also verifies that the real checkout search remains the compact 2.24 rem parent so this exact collision cannot silently return.

### Template Factory prevention

Protected system chrome must not give a child control a minimum cross-size larger than a themed parent that clips overflow. Search/icon controls must center decorative glyphs against the final clickable box rather than by raw SVG offsets. Template-specific compact heights are allowed, but shared controls must honor them instead of fighting them. Checkout summaries must bind customer-facing secondary copy to checkout semantic tokens, not legacy global variables.

Live human screenshot verification is still required before changing this incident to `verified_fixed`.



### Verification
Human Preview screenshots on desktop and mobile showed the search magnifier centered inside the compact Playroom search action and the checkout summary secondary text readable against the dark surface. The later mobile summary proof also showed stable one-line monetary values.

---

## SKB-P4-021 — Checkout field theming missed nested textarea and browser autofill; legal links relied on uncontrolled wrapping

**Status:** `verified_fixed`  
**Evidence:** `human_preview_screenshot_plus_shared_css_contract`  
**Area:** `storefront/checkout/form-theme + legal-consent-layout`  
**Risk:** medium  
**Automation:** `CHECKOUT_CONTROL_STATE_COVERAGE_REQUIRED`

### Symptom

In the Playroom Checkout Preview, a browser-autofilled e-mail field rendered with a light background while adjacent themed inputs stayed dark. The order-note textarea also rendered light. The legal-consent sentence wrapped into an irregular multi-column-looking line with links breaking at visually poor positions.

### Root cause

The shared guided checkout theme covered controls under `.form-grid` and a direct `.formSection>textarea`, but the order-note textarea is nested inside `.checkoutField`, so it fell back to the legacy global `.formSection textarea { background:#fbfcfa; }` rule. Separately, browser autofill paints its own input background/text unless explicitly neutralized, so the e-mail field could escape the theme even though normal input state was correctly themed. The legal copy was one inline text run and therefore delegated all wrapping to available width and link boundaries.

### Resolution

- all `.checkoutField>input/select/textarea` controls now receive the checkout semantic surface, input-text, border, placeholder and focus tokens;
- Chromium/WebKit autofill states are explicitly repainted with the same semantic surface and text tokens using inset autofill hardening, with the standard `:autofill` state covered as well;
- the two independent legal statements now have two independent required checkbox controls: one for accepting the ÁSZF and one for acknowledging the adatkezelési tájékoztató; each control owns its own state and row;
- no checkout business rules, legal acceptance semantics, order submission logic or production state changed.

### Regression coverage

The Phase 4 acceptance contract now requires nested textarea theming, autofill hardening, and two distinct controlled legal checkboxes with separate names and state. The checkout submit gate requires both controls, while the existing backend `legalAccepted=true` contract is only produced after both conditions pass.

### Template Factory prevention

Checkout visual acceptance must cover control states, not only control types: empty, populated, focused and autofilled inputs plus textarea/select. Shared theme selectors must target semantic field wrappers rather than depend on incidental layout containers such as `.form-grid`. Independent legal statements must not be visually grouped behind one checkbox. Each independently required user action needs its own explicit control and state; layout may group the rows visually, but must not merge the actions.

Live human screenshot verification is still required before changing this incident to `verified_fixed`.



### Verification
Human Preview confirmation established that the e-mail field now stays on the Playroom dark checkout theme in the tested browser state, the order-note textarea is themed consistently, and the legal area renders as two independent checkbox rows. This closes the remaining visual verification for the field-theme/legal-layout incident.

---

## SKB-P4-022 — Acceptance preview disabled the final submit control and made fail-closed proof impossible

**Status:** `verified_fixed`  
**Evidence:** `human_preview_screenshot_plus_shared_checkout_contract`  
**Area:** `storefront/checkout/acceptance-submit-guard`  
**Risk:** high  
**Automation:** `ACCEPTANCE_FAIL_CLOSED_MUST_BE_CLICKABLE`

### Symptom

The acceptance Checkout reached the final summary with a valid quote, selected payment method and both legal controls checked, but the final action remained disabled. The UI therefore stated that order submission was blocked without allowing the acceptance flow to prove that the runtime submit guard actually intercepted a real submit attempt.

### Root cause

The shared checkout implemented two independent protections at once: the submit handler already returned immediately when `acceptancePreview` was true, but the button was also rendered as `type='button'` and disabled whenever `acceptancePreview` was true. The UI-level disable made the deeper fail-closed guard unreachable and therefore untestable.

### Resolution

- the final acceptance action is now a real `type='submit'` control once quote, payment and both legal acknowledgements are valid;
- acceptance mode is no longer part of the button's disabled predicate;
- the submit handler still intercepts `acceptancePreview` before any order-creation path and returns an explicit proof message that no order, payment, invoice or shipment was started;
- live checkout behavior remains unchanged.

### Regression coverage

The shared checkout workflow contract now requires the acceptance final action to be clickable, requires the acceptance guard to appear before the `/api/orders` call in source order, and forbids reintroducing an `acceptancePreview`-based disabled predicate or button-only control.

### Template Factory prevention

Acceptance and sandbox flows must exercise the same customer action surface as production up to the protected boundary. A safety mode must block the side effect at the authoritative action handler, not by making the action unreachable. Otherwise the acceptance test proves only that a button can be disabled, not that the transactional guard is fail-closed.

### Verification
Human Preview proof showed the explicit fail-closed message after clicking the final action. Exact-head Preview runtime logs for the same interaction window contained `POST /api/checkout/quote 200` and no `/api/orders` request, confirming that no order-creation side effect crossed the protected boundary.


---

## SKB-P4-023 — Acceptance coupon fixture was missing and failed coupon quote erased the last valid total

**Status:** `verified_fixed`  
**Evidence:** `human_preview_screenshot_plus_preview_runtime_log_plus_staging_read`  
**Area:** `storefront/checkout/coupon + acceptance-fixtures`  
**Risk:** high  
**Automation:** `ACCEPTANCE_FIXTURE_AND_LAST_VALID_QUOTE_REQUIRED`

### Symptom

After entering `ACCEPT10`, the Checkout displayed “A kupon nem alkalmazható”, the verified summary changed from 3810 Ft to 0 Ft, and the final action became unavailable.

### Evidence and root cause

Exact-head Preview runtime logs showed `POST /api/checkout/quote 409` with database error `Érvénytelen vagy inaktív kuponkód.`. A read-only staging query for the acceptance tenant returned zero rows from `public.coupons`, so the documented `ACCEPT10` acceptance code had never been provisioned. The first fixture implementation then failed closed with `permission denied for table coupons`. A read-only privilege check proved that `public.coupons` had table privileges only for `postgres`: the historical coupon migration had revoked browser roles, but no later migration restored the service-role CRUD contract used by server-side coupon administration and acceptance setup. Separately, `refreshQuote` correctly invalidated its quote on a failed authoritative request, but `applyCoupon` had no rollback to the last known-good quote. Because the shared coupon code was already empty, resetting it to an empty string triggered no follow-up refresh, leaving the UI at a false 0 Ft state.

### Resolution

- a dedicated privilege-repair migration restores `select,insert,update,delete` on `public.coupons` to `service_role` only; it does not widen direct browser-role CRUD;
- the preview-only Checkout acceptance entry idempotently upserts an active tenant-scoped `ACCEPT10` coupon with a 10% percentage discount before exposing the test flow;
- fixture creation is fail-closed: if the coupon cannot be prepared, the acceptance page stops with `ACCEPTANCE_COUPON_FIXTURE_REQUIRED` instead of pretending the coupon test is available;
- failed coupon attempts preserve the previous authoritative quote and only show a coupon-specific error, so an invalid promotion can never turn a valid basket total into a misleading 0 Ft summary;
- production code paths do not seed coupons; the fixture is reachable only through the existing Vercel Preview + platform-operator + pilot-acceptance route.

### Regression coverage

Phase 4 acceptance coverage locks the service-role-only coupon privilege repair, the `ACCEPT10` fixture contract, its tenant-scoped upsert conflict key, the 10% discount, the fail-closed fixture error, and preservation of the previous quote after a failed coupon request.

### Template Factory prevention

Acceptance scenarios that name a coupon, shipping provider, payment provider, product or other commerce object must provision that object as part of the acceptance fixture rather than rely on hidden environment state. Fixture code must also validate that its server-side authority has the table/function privileges it depends on; RLS policy presence alone does not imply SQL table privileges. Coupon failure is a local promotion failure; it must not erase an already verified cart quote unless the underlying cart itself became invalid.

### Verification
Human Preview proof showed `ACCEPT10` applied successfully to the mixed acceptance cart: 3810 Ft products, −381 Ft discount, free delivery, and 3429 Ft payable total. Exact-head Preview runtime logs in the same interaction window showed repeated `POST /api/checkout/quote 200` responses, confirming the authoritative quote path accepted the coupon.



---

## SKB-P4-024 — Guided checkout blocked invalid fields without visible in-app validation feedback

**Status:** `verified_fixed`  
**Evidence:** `human_preview_behavior_plus_shared_checkout_contract`  
**Area:** `storefront/checkout/guided-validation`  
**Risk:** medium  
**Automation:** `VISIBLE_STEP_VALIDATION_REQUIRED`

### Symptom

On the Shipping step, clearing a required field correctly prevented navigation to Payment, but no visible error message appeared in the checkout. The implementation relied on the browser's native `reportValidity()` UI, which was not reliably surfaced in the mobile Preview.

### Root cause

`validatePanel()` returned `false` after `checkValidity()` / `reportValidity()`, but it did not set the checkout's own error state, identify the failing field for assistive technology, or render feedback inside the active accordion panel. The navigation guard therefore worked while the UX gave no explanation.

### Resolution

- the first invalid control receives `aria-invalid=true`, focus, and centered scroll positioning;
- the shared checkout derives a customer-facing field name from the semantic `.checkoutField > span` label and emits an explicit Hungarian error message such as `Név / kapcsolattartó: kitöltése kötelező.`;
- the message is rendered inside the currently active accordion step, next to the step action, instead of only after the complete accordion;
- editing the marked field clears stale validation feedback;
- native `reportValidity()` remains as a secondary browser hint, not the sole feedback channel.

### Regression coverage

Checkout workflow and Playroom Phase 4 acceptance contracts now require explicit application-level validation text, `aria-invalid`, focus/scroll behavior, active-step error placement and stale-error clearing on edit.

### Template Factory prevention

A guided/multi-step form must never depend exclusively on browser-native validation bubbles. Every blocked progression must provide an application-rendered error within the active step and identify the failing control programmatically. Native constraint validation is a guardrail, not the user-facing error system.

Live human proof of the visible required-field message is required before changing this incident to `verified_fixed`.


### Verification
Human mobile Preview proof showed the Shipping step refusing progression with the required name field empty, the invalid field visibly highlighted, and an in-step application error reading `Név / kapcsolattartó: kitöltése kötelező.`. This confirms the guided checkout no longer depends solely on browser-native validity UI.


---

## SKB-P4-025 — Account post-purchase block was redundant and shared capability insertion could land below a wrapped footer

**Status:** `implemented_pending_live_verification`  
**Evidence:** `human_builder_screenshot_plus_shared_composition_contract`  
**Area:** `storefront/digital-commerce/account-composition + footer-boundary`  
**Risk:** medium  
**Automation:** `FOOTER_MUST_BE_FINAL_AND_ACCOUNT_POST_PURCHASE_NOT_REQUIRED`

### Symptom

The Playroom Fiókom Builder preview rendered a complete “Dokumentumok és letöltések” center, then the footer, and then an additional “Vásárlás után / Hozzáférés és dokumentumok” block below the footer.

### Root cause

Two shared composition assumptions combined:

- the digital-commerce page contract required `commerce.post-purchase-guidance` on `account` even though the account document center already owns post-purchase access and document discoverability;
- `resolveCapabilityInsertIndex()` only recognized a footer when the top-level section itself had a footer component key. Playroom wraps its real footer inside a layout section, so the shared capability fallback treated the document as footer-less and appended the missing block after the visual footer.

### Resolution

- `account` now requires only `commerce.documents-center`; post-purchase guidance remains a Checkout concern;
- previously generated shared account sections containing only the stale post-purchase capability are pruned during composition;
- footer detection now walks each top-level section recursively and treats nested `system.footer`, `editorial.footer`, or any `*.footer` component as the terminal boundary;
- shared capability insertion therefore cannot append customer-facing content below a wrapped footer.

### Regression coverage

The shared digital-commerce integration suite now covers a nested footer boundary and stale account post-purchase cleanup. Playroom Phase 4 acceptance additionally requires zero post-purchase guidance nodes on the composed Account page and requires the section containing the footer to be the final top-level section.

### Template Factory prevention

The footer is a semantic document boundary, not merely a top-level component-key convention. Capability composition must detect footer surfaces recursively. Account/document-center pages must not duplicate post-purchase guidance already represented by the canonical customer document center.

Live Builder screenshot verification is required before changing this incident to `verified_fixed`.


---

## SKB-P4-026 — Storefront desktop scale/density contract drift made 75% browser zoom look “normal”

**Status:** `implemented_pending_live_verification`  
**Evidence:** `human_storefront_screenshot_plus_static_shared_runtime_audit`  
**Area:** `storefront/runtime/container + responsive-authority + account-density`  
**Risk:** high  
**Automation:** `STOREFRONT_DESKTOP_SCALE_DENSITY_CONTRACT`

### Symptom

The Playroom storefront Account / B2B RFQ route looked naturally proportioned only around 75% browser zoom. Canonical customer-facing Desktop acceptance is 100% browser zoom; 125% must remain usable.

### Root cause

This was not one RFQ card defect. Four shared assumptions overlapped:

1. Builder/direct template Preview use a canonical 1200px Desktop logical viewport, while shared `layout.container` / primitive header content could keep growing to 1440px in published runtime.
2. The active storefront Account shell wraps legacy `/fiokom/*` route content. Those routes still inherited marketing-era geometry such as global `.sectionTitle`, `.section`, `.card` and button sizing instead of semantic operational-page density. Some B2B subroutes also omit the `accountPage` class entirely, so account-only selectors were insufficient.
3. The legacy `.sectionTitle` can reach 62px. At 75% browser zoom that is visually about 46.5px, closely matching the intended account page-title range; browser zoom therefore masked the semantic typography error.
4. Published Page Schema Home and Account chrome selected `desktop/tablet/mobile` from User-Agent only. A desktop browser narrowed below 1200 CSS pixels — including zoom-induced layout viewport changes — could keep the Desktop renderer active and violate the breakpoint contract.

The form controls were not the primary source of enlargement: legacy account controls already had a 44px minimum height. They looked disproportionately small because headings, vertical rhythm and surrounding chrome belonged to a much larger marketing density system.

### Shared resolution

- breakpoint authority is explicit: mobile 0–767, tablet 768–1199, desktop 1200+;
- logical Preview widths come from one contract: 1200 / 768 / 390;
- default Page Schema `content` max-width is aligned to 1200px; an explicit `wide` role preserves deliberate 1440px surfaces;
- published Page Schema runtime re-resolves from actual browser layout width after hydration and on resize/orientation changes; User-Agent is only the SSR initial hint;
- semantic shared CSS variables define page-title and form-control usability metrics;
- the storefront Account bridge scopes operational-page title/section/control density from the shell's `storefrontAccountRouteContent`, so every `/fiokom/*` subroute inherits it even without an `accountPage` class;
- the legacy public `.shell` contract is aligned from 1280/1240px to the same canonical 1200px max used by Page Schema content;
- canonical Account capability navigation is compact and wrap-aware on Desktop/Tablet and horizontally scrollable on Mobile.

### Regression coverage

`tests/storefront-desktop-scale-density-contract.test.ts` locks breakpoint boundaries, logical widths, 100%/125% browser-zoom contract metadata, actual-layout viewport authority, semantic Account density tokens and compact capability navigation.

### Template Factory prevention

Do not approve a new template/page family when default `content` expands beyond the canonical Desktop logical viewport without an explicit wide role; an operational page uses marketing display typography; form controls bypass shared usability metrics; responsive authority depends only on device/User-Agent; or capability navigation requires browser zoom-out.

Browser zoom is an accessibility/user preference input, never a layout compensation mechanism. Builder zoom remains presentation-only and is not storefront runtime geometry.

### Live verification still required

The protected Preview is SSO-gated from the automated browser available to this audit, so computed DOM measurements could not be collected from the live deployment in this pass. Before changing this incident to `verified_fixed`, authorized browser proof must record at 100% and 125% browser zoom: viewport width, scroll width, primary content width, H1 computed size, Account nav item bounds, form control height, card padding, section gap and horizontal overflow on the representative template sample.


### 2026-09-20 human 100% / 100% re-baseline

The original visual symptom was partly amplified by the local workstation display scale: Windows had been set to 150% while the browser was viewed around 75%. That combination produces an effective physical scaling near 112.5% relative to a 100% / 100% baseline and therefore must not be used as evidence that the storefront itself needs another global shrink.

Fresh human screenshots with both Windows display scale and browser zoom at 100% show the shared 1200px Desktop density as broadly correct. The remaining defects are local information-architecture and form-layout issues, not a reason to reduce global storefront scale again:

- the customer Account capability set must live in a Desktop left rail rather than consume the top of every route as a large tile row;
- the Account overview keeps only primary actions in its heading while the rail owns secondary destinations;
- the B2B RFQ form requires semantic field wrappers and a responsive product/quantity grid, with the note field full-width;
- Tablet/Mobile collapse the Account rail to a horizontally scrollable compact navigation instead of forcing a narrow sidebar.

The implementation therefore adds the shared `storefrontAccountWorkspace` / `storefrontAccountSidebar` shell and normalizes the RFQ field geometry. Global container and typography density are intentionally not reduced further.

Status remains `implemented_pending_live_verification` until the same route passes human proof at browser 125% with Windows display scale held at 100%.


---

## SKB-P4-027 — Protected commerce header became technically complete but visually unreadable at Desktop density

**Status:** `implemented_pending_live_verification`  
**Evidence:** `human_storefront_screenshot_plus_shared_renderer_audit`  
**Area:** `storefront/protected-header/readability + account-navigation-density`  
**Risk:** medium  
**Automation:** `PROTECTED_COMMERCE_HEADER_READABILITY_FLOOR`

### Symptom

At the canonical Windows 100% / browser 100% acceptance baseline, the Account / B2B RFQ page body was proportioned correctly, but the Playroom commerce header remained visually undersized. Search copy, utility labels and the dense nine-item primary navigation were difficult to read, even though all controls and links were functionally present.

### Root cause

The protected shared commerce header still allowed template fidelity styles to shrink critical text and chrome below a practical customer-facing readability floor. Playroom reference styling requested a compact 2.35rem search bar, .76rem search text, .72rem utility labels and .73rem navigation. The shared dense-navigation fallback then reduced nine-item Desktop navigation further to .68rem. Template inner padding also compressed the total header height.

### Shared resolution

- protected Desktop search text now has a shared .875rem readability floor and the search root has a minimum usable height;
- brand/logo/tagline, utility items, top-row height and navigation-frame height receive protected minimum geometry after template style slots;
- dense Desktop navigation uses .82rem instead of .68rem;
- the category trigger and utility labels receive explicit readable sizing;
- the customer Account left rail is widened modestly and its navigation targets now use 48px minimum height with .95rem labels;
- template identity, colors, borders and composition remain inherited; the fix only prevents protected chrome from becoming too small to read.

### Template Factory prevention

Template fidelity may make a header visually compact, but protected search, primary navigation and customer utility controls must remain readable at the canonical 100% browser baseline. Dense-navigation fallback may reduce spacing before it reduces type size, and it must not cross the shared readability floor.

Live human proof at 100% and 125% browser zoom is required before changing this incident to `verified_fixed`.


---

## SKB-P4-028 — Playroom footer typography fell below the 1920×1080 / 100% readability baseline

**Status:** `implemented_pending_live_verification`  
**Evidence:** `human_storefront_screenshot_plus_runtime-normalizer-audit`  
**Area:** `storefront/footer/readability`  
**Risk:** medium  
**Automation:** `PLAYROOM_FOOTER_READABILITY_FLOOR`

### Symptom

On a 1920×1080 display with both operating-system scaling and browser zoom at 100%, the Playroom footer structure was visible but its menu labels and supporting copy were too small for comfortable reading.

### Root cause

The accepted visual-reference footer carried fidelity-era micro-type values around .52–.66rem. Existing runtime normalization repaired footer height, spacing and link target geometry, but did not raise the actual text size. The result was technically navigable but visually undersized at the canonical Desktop acceptance baseline.

### Shared resolution

Persisted Playroom v20 pages now receive a runtime footer readability floor: links and navigation are at least .82rem, strong labels at least .8rem, supporting text at least .75rem and headings at least 1rem. Footer padding, vertical spacing and link target height were increased moderately so the larger type is not cramped.

### Template Factory prevention

A visual-reference footer may preserve density and brand character, but customer-facing navigation must remain readable at 1920×1080 with OS scale 100% and browser zoom 100%. Micro-copy below the shared footer floor is not acceptable solely for visual fidelity.

---

## SKB-P4-029 — B2B RFQ quantity control diverged from the canonical cart interaction

**Status:** `implemented_pending_live_verification`  
**Evidence:** `human_storefront_screenshot_plus_cart-source-parity`  
**Area:** `storefront/account/b2b-rfq + shared-commerce-controls`  
**Risk:** medium  
**Automation:** `RFQ_CART_STYLE_QUANTITY_CONTROL_PARITY`

### Symptom

The B2B RFQ form used a native HTML number input. Browser-native spinner arrows did not match the cart quantity UI, and the selected product could not be removed with the cart's red trash control.

### Root cause

The RFQ form independently implemented quantity editing instead of consuming the canonical cart interaction. That produced browser-dependent steppers and omitted the removal affordance.

### Shared resolution

The cart quantity UI has been extracted into one shared `CartStyleQuantityControl`. The cart and RFQ now use the same vertical chevron buttons, dimensions, borders, output layout and red trash control. In RFQ, trash clears the selected product and returns the selector to `Válassz terméket`; the native `type="number"` spinner is removed.

### Template Factory prevention

When a commerce interaction already has an accepted canonical control, account/B2B surfaces must reuse that control rather than reproducing browser-native or template-local variants. Visual and behavioral parity must be enforced from one component authority.
