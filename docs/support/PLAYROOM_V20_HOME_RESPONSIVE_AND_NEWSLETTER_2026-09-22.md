# Playroom v20 homepage responsive polish + shared Newsletter readiness — 2026-09-22

Status: implemented
Evidence target: code/test + staging human acceptance
Scope: shared Newsletter interaction + Playroom v20 homepage composition

## Incident A — Newsletter looked actionable before consent

### Symptom

The Newsletter CTA looked active after entering an e-mail address even when the required marketing-consent checkbox was still unchecked. Clicking it did not submit, but the visual state implied that the form was ready.

### Root cause

The shared Newsletter runtime disabled the submit button only while a request was busy. Consent was checked inside the submit handler, so readiness and visual affordance were inconsistent.

### Shared fix

- compute readiness from both a valid e-mail address and explicit consent;
- disable and visually de-emphasize submit until both are valid;
- expose a visible readiness hint;
- validate again before calling the canonical `/api/marketing/newsletter` endpoint;
- keep `marketing_consents` as the only consent authority.

### Regression invariant

**A consent-gated action must not look actionable before every required consent/input condition is satisfied.**

---

## Incident B — Playroom homepage responsive composition broke on narrow/tablet-like widths

### Human evidence

The Playroom v20 homepage showed several template-specific composition defects:

- hero copy/trust overlay collided on mobile;
- play-style choices used abstract placeholder glyphs instead of meaningful symbols;
- Finder and platform cards were forced into six columns on narrow screens;
- the multiplayer CTA overlapped copy because it was absolutely positioned with a long label;
- the Featured CTA used the same collision-prone absolute pattern;
- the community benefit strip was `nowrap` and clipped on mobile;
- merchandising cards stacked as full-width “stretched” panels at tablet-like widths although the content could use a denser composition.

### Classification

**Template-local composition defect, not shared Runtime/grid/finder failure.**

The shared `guided.finder` and `guided.attribute-navigation` renderers already implement responsive column reduction:

- desktop: requested columns;
- tablet: up to 3 columns;
- mobile: 2 columns.

Playroom overrode that shared behavior with template-owned fixed `repeat(6,...)` style slots. Other templates such as Beauty Lab, Derma Studio and Creator Station rely on the shared responsive behavior and therefore must not receive a global compensation patch.

### Playroom v20 fix

- hero copy becomes full-width on narrow breakpoints and the trust strip leaves absolute overlay mode;
- trust items use 4-up tablet / 2x2 mobile composition;
- play-style placeholder glyphs are replaced by six dedicated Playroom SVG icons: solo player, co-op pair, party group, checkered racing flag, compass, and family;
- Finder and platform navigation use explicit 6 / 3 / 2 desktop-tablet-mobile grids;
- multiplayer and upgrade panels use a denser tablet two-column layout with 2x2 internal cards;
- multiplayer CTA becomes short (`Tovább →`) and non-absolute below desktop;
- Featured CTA becomes shorter and non-absolute below desktop;
- community benefit copy may wrap on tablet/mobile.

### Staging proof

The accepted pilot tenant was refreshed through the existing template-installation refresh authority only:

- 14/14 persisted Page Schema drafts remained present;
- every draft revision advanced exactly one step;
- exact document hashes matched the planned Playroom v20 package;
- published revision count remained zero;
- orders/products business snapshot remained unchanged.

### Regression invariant

**Do not patch shared responsive engines when one template locally overrides a correct shared responsive contract. Fix the owning template composition, then prove the shared matrix remains green.**


## Icon asset rule

Selector icons must remain readable at roughly 32–36 px and must communicate the option without requiring the label. Large scene illustrations must not be shrunk into selector-icon slots.

Current Playroom play-style icon authority:

- `/storefront/playroom/icons/play-style-solo.svg`
- `/storefront/playroom/icons/play-style-coop.svg`
- `/storefront/playroom/icons/play-style-party.svg`
- `/storefront/playroom/icons/play-style-racing.svg`
- `/storefront/playroom/icons/play-style-adventure.svg`
- `/storefront/playroom/icons/play-style-family.svg`

The runtime fallback must not silently return to abstract glyphs or emoji for these six canonical Playroom choices.


## Desktop density follow-up — compatibility + community

Human desktop review found that low-density informational blocks became visually over-stretched when allowed to consume the full 12-column width.

Playroom v20 composition rule:

- `Újdonságok & Kiemelt játékok` keeps the denser commerce role and pairs with the Gift card as the upper desktop row;
- `Platform kompatibilitás` and `Játsszatok együtt / Csatlakozz a közösséghez` form a dedicated **6 / 6** desktop and tablet row;
- mobile returns both blocks to **12 / 12** stacking;
- existing node IDs and compatibility/community authorities remain unchanged.

Regression invariant:

**Desktop width is not a target by itself. A low-density block should only consume 12 columns when its information hierarchy or interaction genuinely benefits from the width; otherwise prefer a balanced multi-column composition and stack it on mobile.**


## Homepage acceptance follow-up — compatibility, community, catalog projection, product rail

### Compatibility teaser

The canonical compatibility engine remains fail-closed: missing evidence is `unknown` and must never be treated as compatible.

The Playroom homepage, however, is a teaser surface rather than the final compatibility decision surface. Showing a bare `Ismeretlen` state there made the shop look only partially configured.

Accepted rule:

- `compatibility.status` supports opt-in `hideWhenUnknown`;
- Playroom Home enables it;
- unknown is hidden only on the teaser;
- PDP/configurator/cart technical surfaces retain the real fail-closed status;
- decorative platform ticks were removed because they resembled fabricated compatibility evidence;
- Home now explains the feature briefly and links to `Kompatibilitás ellenőrzése`.

**Invariant:** Never improve demo appearance by inventing positive compatibility evidence.

### Community split composition

The former community block used a full-width text/benefit/CTA overlay over a background image. At compact desktop widths this wasted the left content area and produced an unnecessarily stretched CTA.

Playroom Home now uses:

- left 6/12: concise community copy, short benefit line, `Csatlakozz a közösséghez →`;
- right 6/12: community image;
- mobile 12/12 stack;
- no employment-like `csapatunkhoz` wording.

### Existing-commerce product card projection

A shared binding mismatch was exposed by Playroom Home:

- existing-commerce catalog authority emits `label`, nested `price.display`, nested `stock.statusLabel`, and engine IDs;
- `commerce.product-grid` previously expected `name`, direct `price`, `stockLabel`, and card IDs;
- visible result was generic `Termék` cards and missing commerce metadata.

Shared correction:

- the product-card normalizer accepts both canonical card rows and existing-commerce engine rows;
- identity may derive from product/variant IDs;
- name falls back to `label`;
- display price and stock label are projected from their authoritative nested objects;
- primary product media is read from the canonical `product_media` authority and projected as `imageUrl`;
- Finder/Configurator engine catalog shape remains unchanged.

**Invariant:** Never use template demo data to mask a shared catalog projection mismatch.

### Playroom demo catalog

Playroom now contains a namespaced 12-game preview catalog for empty/template-preview states, with local demo artwork. It does not write prices, stock, compatibility, reviews, release dates or other commerce authority into merchant product records.

The shipped titles are intentionally fictional demo identities rather than current commercial game titles. This avoids presenting unlicensed cover art, live-market availability, pricing, or platform claims as template-owned truth.

The existing template demo lifecycle remains the authority:

- fixture;
- adopted;
- retired;
- no product/variant/order mutation on template switch.

### Shared opt-in product rail

`commerce.product-grid` gained an opt-in `presentation: 'carousel'` rail:

- desktop/tablet: visible previous/next controls;
- mobile: native horizontal swipe / scroll-snap;
- no automatic change to other templates or ordinary product grids.

Playroom `Újdonságok & Kiemelt játékok` opts into this presentation.

### Staging proof

Pilot draft refresh advanced all 14 Page Schema drafts from revision 16 to 17:

- exact documents: true;
- template version: 20;
- published page count: 0;
- mutation scope: storefront page drafts only;
- orders/products business boundary unchanged.



## CTA consistency + compatibility density follow-up

Human desktop review found two final composition inconsistencies:

- the paired merchandising cards used two different CTA patterns: a bottom-left text CTA and a top-right icon-only CTA;
- after the compatibility/community 6/6 pairing, the compatibility side had less meaningful content and therefore looked visually under-filled beside the community split.

Playroom v20 rule:

- `playroom-player-two-cta` and `playroom-upgrade-cta` now share the same text CTA pattern, placement and sizing across desktop/tablet/mobile;
- icon-only corner CTA treatment is not used for these sibling merchandising cards;
- the compatibility card gains a concise “Hogyan ellenőrizd?” guide and a slightly larger media area;
- height parity is achieved with useful content and stretch behavior, not with empty spacer/min-height filler;
- Newsletter remains its own conversion section and is not inserted into the compatibility/community row.

Regression invariants:

**SIBLING MERCHANDISING CARDS MUST USE ONE CTA PATTERN.**

**WHEN BALANCING A TWO-COLUMN ROW, PREFER USEFUL CONTENT DENSITY OVER EMPTY HEIGHT FILLER.**


## Final desktop density pass — merchandising, gift and pre-newsletter row

True desktop review exposed three issues that mobile “desktop mode” had hidden:

- the paired merchandising blocks did not share one internal vertical rhythm, so media rows and CTAs drifted;
- the Gift card did not fill the height of its Featured-carousel neighbor;
- the compatibility/community row above Newsletter was too airy because compatibility content was distributed with `space-between` and community content/media carried oversized desktop minimum heights.

Fix:

- paired merchandising parents use a desktop `header / intro / content / CTA` grid with shared card/media heights;
- all eight merchandising tile images use the same 4.15rem desktop media height;
- both CTAs sit in the same final grid row;
- the Gift column and Gift card stretch to the full Featured-row height;
- compatibility status content uses compact `flex-start` flow instead of `space-between`;
- community copy/media desktop minimum height is reduced to 9.25rem with bounded media height;
- tablet/mobile behavior remains independently responsive.

Regression invariants:

**TRUE DESKTOP ACCEPTANCE MUST BE VERIFIED ON A DESKTOP VIEWPORT; MOBILE BROWSER “DESKTOP SITE” IS NOT A SUBSTITUTE.**

**SIBLING CARDS MUST SHARE MEDIA, CONTENT AND CTA BASELINES WHEN THEY ARE PRESENTED AS A VISUAL PAIR.**


## True-desktop rollback correction — density pass regression

A real desktop viewport exposed that the previous density pass over-corrected three areas:

- the original 8/4 hero-selector composition became visually cramped on a real monitor even though mobile “desktop site” had looked acceptable;
- stretching the Gift wrapper with `height:100%` did not make the Gift card fill the Featured row and instead left a large empty area;
- the compatibility/community pair was compressed too far and became a strip rather than two balanced content blocks.

Correction:

- Hero and selectors are both full-width at desktop/tablet/mobile; the discovery flow is vertically stacked on true desktop.
- The Gift wrapper, inner grid, card and image all participate in the stretch contract; the card fills its actual commerce-row height.
- The compatibility/community row keeps the accepted 6/6 split with a medium 14rem desktop target, 13rem tablet target, and natural mobile height.
- Previously accepted merchandising CTA/media alignment remains unchanged.

Regression invariant:

**MOBILE BROWSER “DESKTOP SITE” MUST NEVER BE USED AS THE SOLE DESKTOP ACCEPTANCE SURFACE.**

**HEIGHT PARITY MUST BE SOLVED THROUGH THE ACTUAL CHILD LAYOUT CHAIN, NOT BY STRETCHING ONLY AN OUTER WRAPPER.**

## True-desktop forensic recovery — rollback-correction regression

The preceding “True-desktop rollback correction” is retained as incident history, but its full-width/forced-height prescriptions are **superseded** by this recovery. True desktop proof showed that the correction itself introduced a larger visual regression.

Offending changes were isolated to two template-only commits:

- `e5003636…` — added nested desktop `display:grid`, `gridTemplateRows`, `gridAutoRows`, and `height:100%` chains to the paired merchandising cards and began the Gift stretch chain;
- `c3181b92…` — forced Hero and Selectors from the inherited 8/4 desktop composition to 12/12, deepened the Gift wrapper → grid → card → image stretch chain, and imposed 14rem/13rem Compatibility/Community height contracts.

Why they regressed:

- 12/12 Hero + Selectors discarded the established desktop visual hierarchy and let selector tiles dominate the viewport;
- the merchandising override duplicated a media-height invariant that already existed in the v18 fidelity layer (all eight images were already 4.15rem), while the new nested grid/height chain changed the card composition;
- the Gift card already had an accepted landscape treatment in the fidelity layer: relative 11.3rem card plus an absolute right-side image. Replacing that with a four-row grid and a 100%-height image converted it into a tall narrow card;
- Compatibility/Community parity was imposed at several nested levels at once, so natural content sizing was replaced by a synthetic height contract.

Minimal recovery:

- remove the Playroom v20 12/12 Hero/Selectors override and inherit the established 8/4 true-desktop composition;
- remove merchandising parent/grid/card forced-height overrides and retain the existing 4.15rem media authority from the fidelity layer;
- align only the two sibling merchandising CTAs locally with `margin-top:auto` in the existing flex-column stack;
- remove the Gift stretch/grid overrides and inherit the existing landscape card/image treatment;
- keep Compatibility/Community 6/6, but remove the 14rem/13rem forced chain and restore the medium pre-regression content sizing;
- do not modify shared Runtime/Grid.

Regression guards:

- assert Hero 8/4 desktop and 12/12 tablet stacking;
- assert merchandising 5/4/3 desktop composition, equal 4.15rem media heights, and no forced desktop grid/height chain;
- assert both merchandising CTAs resolve to the same bottom-aligned flex behavior;
- assert Featured and Gift retain the shared 11.3rem visual target while Gift remains landscape, without a grid-row stretch contract;
- assert Compatibility/Community remain 6/6 and no 14rem paired-grid/card/media contract returns;
- run true-desktop proof before tablet/mobile regression proof.

**A desktop layout módosítás nem tekinthető elfogadottnak true-desktop proof nélkül. Mobilos „Desktop site” nézet vagy egyetlen viewport nem bizonyítja a valódi desktop kompozíció helyességét.**

**A height-parity javítás csak azon a rétegen történhet, amely ténylegesen létrehozza az eltérést; parent → grid cell → wrapper → card → media/content láncot előbb bizonyítani kell.**

### First true-desktop proof finding: residual confidence-row stretch

The first 1440×1000 and 1280×800 exact-head screenshots proved that Hero/Selectors, merchandising and Gift were recovered, but also exposed one remaining desktop-only problem: Compatibility/Community was still much too tall.

The residual cause was not the outer 6/6 grid. It was the restored legacy percentage-height chain inside the row:

- Compatibility card: `height:100% / minHeight:100%`;
- Compatibility layout: `height:100%`;
- status wrap: `height:100% + space-between`;
- Community media: `height:100%`.

That chain expanded the low-density content after the 6/6 split and recreated the large empty area immediately above Newsletter.

Final desktop-only correction:

- keep the accepted 6/6 parent grid unchanged;
- Compatibility desktop height returns to natural sizing with the inherited 11.3rem fidelity floor;
- Compatibility layout and status content resolve to `height:auto`, with compact `flex-start` flow;
- Community desktop content/media use the same 11.3rem fidelity-derived visual target;
- Community media is explicitly bounded on desktop instead of inheriting `height:100%`;
- tablet/mobile overrides are left intact.

**Regression guard:** after a 6/6 composition split, percentage-height descendants must not be assumed safe. True-desktop evidence must verify the actual rendered row height and whitespace before acceptance.



## True-desktop composition restoration — targeted proportion pass

A later human review confirmed that the forensic recovery correctly removed the destructive stretch/grid chains, but its restored desktop baseline remained visually too flat. This is a **Playroom template proportion issue**, not a shared Runtime/Grid defect.

Root cause and minimal correction:

- the inherited Hero floor had drifted down from the original 18rem composition to 13.75rem while the selector column retained compact v18 tile sizing;
- the merchandising trio inherited the v18 10.2rem floor, even though the earlier desktop-polish composition had materially more vertical weight;
- the right-hand `Dobd fel a játékestét` header is intrinsically shorter than `Jöhet a 2. játékos?`, so equal 4.15rem media heights alone do not align the image-row start;
- the commerce row remained 7/5, leaving `Ajándékot keresel` visibly narrow beside the carousel;
- Compatibility/Community had been safely recovered to 11.3rem, but that floor was still visually strip-like on true desktop.

Playroom v20 desktop-only rules:

- Hero keeps the accepted **8/4** grid and receives an **18rem** desktop minimum; the selector wrapper receives the same 18rem minimum;
- the two existing selector stacks use the existing flex-column mechanism with `flex: 1 1 0` and `justify-content: space-between`, so their combined rendered column fills the same desktop grid row as Hero without `height:100%` or a new grid-row chain;
- Finder remains **6/3/2**; desktop option floor becomes **4rem** and the platform tile floor **5.45rem** while semantic icon dimensions remain unchanged;
- Gamer setup / Player 2 / Game Night keep the accepted **5/4/3** desktop spans and use a **12.8rem** desktop floor;
- all eight merchandising media slots remain **4.15rem**; only `playroom-upgrade-grid` receives **0.4rem desktop top padding**, lowering the right-hand image row without enlarging images;
- sibling merchandising CTAs keep the same existing bottom-aligned flex behavior;
- Featured/Gift becomes a balanced **6/6 desktop row**, with both visual cards using a **12.2rem** floor; Gift retains its existing landscape/absolute-image treatment rather than reintroducing a height-stretch chain;
- Compatibility/Community remain **6/6**, with Compatibility at **13rem** desktop minimum and Community content/media at **12.3rem** inside the existing stage; the compatibility media grows only to **7.7rem** desktop;
- tablet/mobile overrides are not changed by this pass.

Regression guards:

- do not solve Hero/selector parity with nested `height:100%`, `gridTemplateRows` or `gridAutoRows`;
- do not change the 4.15rem merchandising image authority to fix vertical alignment; align the owning content row instead;
- do not make Gift tall/narrow by stretching wrapper → grid → card → image; widen the owning desktop grid allocation first;
- do not change shared Runtime/Grid for a Playroom-owned proportion problem;
- desktop composition changes require proof at **1440×900 or larger** and **1280×800**, followed by **768px tablet** and **390px mobile** regression checks.

**Desktop layout módosítás nem fogadható el valódi true-desktop proof nélkül.**

**Mobilos „Desktop site” nézet vagy egyetlen viewport nem bizonyítja a desktop kompozíció helyességét.**

Evidence execution contract: the acceptance commit must run the Playroom v20 screenshot workflow so the same exact HEAD is captured at 1440×1000, 1280×800, 768×1024 and 390×844 before human/agent visual sign-off.


## Acceptance runtime authority mismatch — persisted draft vs source package

Human review of the staging `/` route exposed a process-level acceptance error after the desktop proportion pass.

### Symptom

The exact-head visual QA package contained the intended Playroom desktop changes, but the linked staging homepage still showed the earlier composition:

- Hero inherited the old `13.75rem` floor instead of the new `18rem` desktop target;
- selector wrapper had no desktop height target;
- merchandising still resolved to the old `10.2rem` floor;
- `playroom-upgrade-grid` had no desktop image-row offset;
- Featured/Gift still resolved as `7/5`, not `6/6`.

### Root cause

The public preview homepage does **not** render the source-controlled template package directly.

In Vercel preview, `resolveCurrentStorefrontHomeRuntimePage()` resolves `getPreviewStorefrontDraftPage(instance.id,'home')`. Therefore the `/` route renders the immutable draft revision currently referenced by the staging tenant's `storefront_pages.draft_revision_id`.

Updating `playroom-v20.ts` does not and must not silently overwrite that persisted merchant/acceptance draft.

At incident confirmation:

- source package had already advanced with the desktop proportion patch;
- acceptance tenant `digital-commerce-acceptance-20260918` still pointed to Playroom v20 draft revision 22;
- that stored Home document still contained the pre-patch desktop values.

### Controlled recovery

Use the existing guarded acceptance refresh authority only:

- preview environment only;
- exact Playroom acceptance branch only;
- staging Supabase URL only;
- fixed pilot acceptance tenant only;
- fixed authorized actor binding;
- require 14/14 existing `gaming.playroom@20` drafts;
- require zero published revisions;
- preserve the existing global style state;
- materialize the current canonical Playroom v20 package through the normal template-installation plan;
- persist with `save_storefront_template_drafts_v1`;
- verify every revision advances exactly one step;
- verify every persisted document hash equals the planned exact document;
- verify product/order business snapshots are byte-for-byte unchanged.

Recovery evidence for this incident:

- 14/14 pages: revision **22 → 23**;
- exact documents: **true**;
- all v20: **true**;
- published count: **0**;
- mutation scope: **storefront_page_drafts_only**;
- orders/products boundary: unchanged (**7 orders / 4 products**).

### Regression invariant

**SOURCE-PACKAGE VISUAL QA AND PERSISTED-TENANT HOMEPAGE QA ARE TWO DIFFERENT AUTHORITIES.**

Before giving a merchant/stakeholder a staging homepage link after template-package changes:

1. prove the source package;
2. prove the target staging tenant draft hash matches the planned package document;
3. only then use the `/` route for human acceptance.

A green `/visual-fidelity-qa` capture does not prove that the staging `/` route has been refreshed to the same document.


## Desktop-only vertical composition correction — human re-check #2

Human review of the persisted staging Home revision confirmed that the first proportion pass fixed the Player 2 / Game Night inner media alignment but left three desktop regions visually too flat.

This correction is deliberately **desktop-only**. No tablet/mobile style slot is changed.

Desktop targets:
- Hero and the selector column: `22rem` minimum on both owning siblings; the two selector cards continue to divide the existing selector column using the already-proven flex mechanism.
- Gift card: `19.25rem` minimum so the right 6/6 card carries the same visual row weight as the content-driven Featured carousel beside it. The 6/6 width remains unchanged.
- Compatibility: `15.5rem` minimum; compatibility media `9rem`.
- Community: content and media `14.8rem`, preserving the existing 6/6 internal split.

Guard:
- do not compensate these desktop proportions by changing tablet/mobile values;
- do not alter Finder 6/3/2 or platform selector responsive behavior;
- do not reintroduce nested `height:100%` / grid-row stretch chains;
- staging `/` acceptance is valid only after the persisted tenant draft is refreshed to the exact source package document.


## Desktop-only style leakage incident — resolver inheritance guard

A human mobile re-check after the accepted desktop vertical pass exposed a responsive isolation regression.

### Symptom

Desktop composition was correct, but mobile showed oversized / overlapping Home blocks, especially:

- Hero retained desktop vertical weight;
- game-style and platform selector containers became abnormally tall;
- selector cards inherited desktop flex filling;
- Gamer setup inherited the desktop height increase;
- later Gift / Community blocks were also at risk of inheriting desktop-only floors.

### Root cause

The canonical visual-style resolver intentionally cascades:

`base → desktop → tablet → mobile`.

Therefore a property placed only in `style.desktop` is **not desktop-exclusive**. Tablet inherits the resolved desktop value, and mobile inherits the resolved tablet value unless the property is explicitly overridden downstream.

The desktop vertical pass correctly avoided shared Runtime/Grid changes, but incorrectly assumed that writing `minHeight`, `flex`, `paddingTop` and related properties only under `desktop` isolated them from smaller viewports.

### Recovery

Revision 22 was used as the accepted non-desktop geometry authority. The current Playroom Home keeps the accepted desktop targets while explicitly restoring the previous effective tablet/mobile values for every property changed by the desktop pass.

Key examples:

- Hero: desktop 22rem; tablet/mobile 13.75rem;
- selector wrapper: desktop 22rem; tablet/mobile min-height reset to auto;
- selector cards: desktop flex fill; tablet/mobile restored to natural `0 1 auto` flow and original padding;
- Finder option: desktop 4rem; tablet/mobile 3.58rem;
- Gamer setup: desktop 12.8rem; tablet/mobile 10.2rem;
- Gift: desktop 19.25rem; tablet/mobile 11.3rem;
- Compatibility: desktop 15.5rem; tablet 11.3rem; mobile 0 floor;
- Community content/media: desktop 14.8rem; tablet/mobile restored to the prior effective dimensions.

Staging recovery evidence:

- Home revision 24 → 25 only;
- exact persisted hash matched the planned document;
- other 13 page pointers unchanged;
- published revisions: 0;
- orders/products business boundary unchanged.

### Regression invariant

**A DESKTOP SLOT IS NOT A DESKTOP-ONLY GUARANTEE.**

For any Playroom / Template Factory responsive polish:

1. identify every property introduced or changed in the desktop slot;
2. resolve that property at desktop, tablet and mobile using the canonical resolver;
3. if tablet/mobile must remain unchanged, explicitly preserve their previously accepted effective value;
4. add regression assertions against `resolveStorefrontVisualStyle(..., 'tablet'|'mobile')`;
5. run tablet/mobile visual regression after the true-desktop proof.

Do not change the shared resolver to compensate for a template-level isolation mistake.
