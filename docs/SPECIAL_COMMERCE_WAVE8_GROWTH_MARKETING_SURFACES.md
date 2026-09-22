# Special Commerce Wave 8 — Growth / Marketing Surfaces

## Baseline and reconstruction

Wave 8 starts from the closed Wave 7 engineering baseline `0f57d75cb5d118da349a40506e4893ab4d3d890b`.

The reconstructed scope is a **surface/integration wave**, not a new commerce-engine wave. The accepted historical direction after Wave 1–7 is to connect already shipped Special Commerce, campaign, consent, promotion, retention/recovery and recommendation capabilities to growth/discovery/marketing experiences while preserving the shared Page Schema, Visual Builder, renderer registry and existing commerce authorities.

Evidence used for the reconstruction:

- Wave 5/6 established that Special Commerce is a composition/read/presentation layer and must not become pricing, inventory, cart, checkout, order, payment or refund authority.
- Wave 7 established shared Template 2.0 / Visual Builder adoption and entitlement-safe rendering.
- Market Ready 1.0 already requires coupons/promotions, newsletter/campaign foundations, abandoned-cart handling, cross-sell/upsell/related products and post-purchase offer support.
- Existing V8/V9/V11 and roadmap blocks already own campaign lifecycle, consent/suppression, attribution, promotion margin controls, retention/recovery and loyalty/customer-value state.
- The Builder already owns Page Schema, isolated Desktop / Tablet / Mobile viewport authority, presets and the shared renderer path.

Wave 8 therefore reuses those authorities. It does not create parallel campaign, coupon, pricing, recommendation, loyalty or Special Commerce state.

## Canonical Wave 8 surface families

1. **Newsletter / consent capture**
   - Existing `marketing.newsletter-signup` remains the Builder component.
   - Submission is wired to the existing tenant-resolving `/api/marketing/newsletter` endpoint and `marketing_consents` ledger.
   - Explicit consent is required; accessible success/error status is surfaced.

2. **Promotion callout**
   - Adds Builder component `marketing.promotion-banner`.
   - The merchant explicitly references a coupon code in Page Schema.
   - Runtime projects only that referenced code from the existing tenant-scoped `coupons` authority.
   - Inactive, not-yet-started, expired, exhausted, missing or unverifiable coupons fail closed and do not render.
   - Checkout remains the only redemption/discount application authority.

3. **Special Commerce discovery / campaign composition**
   - Growth pages continue to compose the already accepted shared components: Guided Finder/Results, Composer, Configurator, Compatibility, Interactive Scene / Shop the Look / Room, Recipe Commerce and Release/Drop.
   - No duplicate engine or template-only runtime is introduced.
   - Existing component manifests and entitlements remain authoritative.

4. **Retention / recovery / recommendation surfaces**
   - Existing `retention.*`, recommendation, saved-cart/recovery and customer-context components remain canonical.
   - Wave 8 may compose them into growth experiences but does not introduce a second lifecycle/recovery planner or customer-value authority.

## Explicit exclusions from this Wave 8 implementation

### Gift Card / Store Credit

No canonical Gift Card / Store Credit domain authority exists in the verified Wave 7 repository baseline. Implementing it here would require a new financial/checkout authority and would violate the reconstructed Wave 8 boundary. It is therefore not fabricated as UI-only state.

### Referral / Affiliate

No canonical Referral/Affiliate authority exists in the verified baseline. `MARKET_READY_1_0.md` places advanced loyalty/referral on the later 1.1+ roadmap. Referral/Affiliate is therefore excluded rather than silently promoted into Wave 8.

### New campaign engine

The existing `marketing_campaigns`, audience snapshots, approval queue, consent/suppression, communication jobs and conversion attribution remain authoritative. Wave 8 does not create a second campaign table, scheduler, attribution model or send pipeline.

## Promotion privacy boundary

An active coupon is **not automatically public**. The existing coupon model does not classify active codes as public versus private. Wave 8 therefore never enumerates active coupons into storefront state.

Only coupon codes explicitly referenced by a `marketing.promotion-banner` node are queried for that tenant, with a hard cap. The public read model contains only display-safe promotion evidence. This preserves private coupon codes that exist for support, retention or targeted campaign use.

## Builder and runtime contract

- Component definitions live in the shared Visual Builder registry.
- Renderers live in the shared storefront renderer registry.
- Published storefront and authenticated preview use the same runtime-source projection.
- Promotion business evidence is injected through a runtime-managed binding slot (`promotion`) under the already-approved `offer.*` namespace.
- Page-authored bindings cannot replace the runtime-owned canonical promotion binding.
- Visual copy, CTA and presentation remain Builder-editable.
- Responsive Page Schema behavior remains inherited from the shared runtime.

## Authority and security contract

Wave 8 does not mutate coupon, campaign, pricing, inventory, cart, checkout, order, payment, customer-value or Special Commerce engine state.

Promotion projection:

- resolves the current tenant server-side;
- queries `coupons` with `instance_id` plus only explicitly referenced codes;
- verifies `active`, start/end window and usage capacity;
- exposes no customer data;
- returns no unreferenced coupon codes;
- performs no insert/update/delete/RPC mutation.

Newsletter capture:

- continues to resolve the current webshop instance server-side;
- records consent in the existing `marketing_consents` authority;
- requires explicit checkbox consent;
- does not use a Builder-authored external form action as consent authority.

## Database / migration impact

Wave 8 requires **no database migration**. All new behavior is a projection/composition layer over existing canonical tables and APIs. The inherited production/customer-baseline migration state is unchanged.

## Stacked PR / CI contract

Wave 8 is based on the Wave 7 head branch `feature/storefront-special-commerce-template2-adoption`, not on `main`. The Wave 8 implementation branch uses the repository-supported `feature/**` namespace so the existing push-triggered CI runs on the stacked branch without retargeting the Draft PR to production `main`.

## Acceptance gates

Before Wave 8 can be considered closed:

1. exact-head focused tests for surface catalogue, promotion binding, tenant projection and newsletter consent wiring are green;
2. TypeScript and production build are green;
3. existing Special Commerce Wave 7 tests remain green with no regression;
4. entitlement failure remains fail-closed;
5. no unreferenced/private coupon is projected to storefront state;
6. promotion rendering is responsive and accessible, and newsletter feedback/consent controls are accessible;
7. Draft PR remains stacked on Wave 7 until the Wave 8 acceptance gate is closed;
8. no merge to `main` and no production deployment occurs before explicit release acceptance.
