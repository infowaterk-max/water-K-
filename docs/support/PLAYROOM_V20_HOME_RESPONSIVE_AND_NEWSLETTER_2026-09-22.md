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
