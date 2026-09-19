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
13. On product pages, keep only **public Product Documents** discoverable in the primary PDP decision zone: the shared `commerce.downloads-tile` belongs directly after the main product gallery/buybox surface (or the first primary product section as fallback), never buried near the footer. Purchased digital assets are **never downloaded from the PDP**; after an eligible purchase they belong to `Fiókom → Letöltéseim` and remain entitlement-authorized. A digital/mixed PDP may show a short informational note pointing users to the profile library after purchase, but must not expose a digital asset download link there.
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
