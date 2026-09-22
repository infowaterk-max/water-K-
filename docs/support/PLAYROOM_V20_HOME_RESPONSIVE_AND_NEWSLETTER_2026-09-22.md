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
