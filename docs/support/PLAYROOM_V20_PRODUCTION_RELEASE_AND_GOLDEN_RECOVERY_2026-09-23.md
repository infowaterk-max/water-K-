# Shoperation Support Knowledge — Playroom v20 production release and golden-baseline recovery — 2026-09-23

Status: **implemented / production_verified**

Scope: Playroom v20 production release, shared Storefront support wizard, Template Factory release proof, golden-baseline lifecycle and production stabilization.

Versions:
- template: `gaming.playroom@20`
- support wizard: `shared-v1`
- quality evidence: `shoporation.template-factory-quality-evidence.v2`

This record is the production follow-up to the Playroom v20 closure and post-release polish records. It preserves both the successful release and the production-only quality-gate discrepancy that appeared after merge.

## Production release chain

### Runtime release

- Release PR: **#349**
- Accepted feature head: `b6ae6f10455590b5451dc412d9e3f5ebe33b6a15`
- First production main commit: `aff3be1c3099fbe0242a92f1eea5c3ab0d56270b`
- Production deployment: `dpl_3S7z8TXubXptiJ4doF1vLYYMxt4m`
- Production deployment state: **READY**
- Main CI run: `35822655691` — **SUCCESS**
- Main Template Factory run: `35822655683` — structural/runtime steps passed, browser matrix failed only on six accepted golden diffs.

The six diffs were exactly:
- `gaming.playroom-v20-catalog-desktop`
- `gaming.playroom-v20-catalog-tablet`
- `gaming.playroom-v20-catalog-mobile`
- `gaming.playroom-v20-contact-desktop`
- `gaming.playroom-v20-contact-tablet`
- `gaming.playroom-v20-contact-mobile`

No responsive-authority, TypeScript, Runtime build, Runtime start, route, shell or non-golden browser error accompanied those diffs.

### Golden stabilization

- Stabilization PR: **#350**
- Stabilization exact head: `b94b808247c18d96688343974026e6db680b4380`
- Stabilized main commit: `f4651b9ad46ad48a8c5669450d70f05e1f8325c2`
- Production deployment: `dpl_Dd6Nkr1HrPgMiaCLUwx4friJ3oty`
- Production deployment state: **READY**
- Main CI run: `35823850985` — **SUCCESS**
- Main Template Factory Quality Gate v2 run: `35823851004` — **SUCCESS**, including the 14×3 browser matrix.

Fresh Install was **SKIPPED**, not PASS, because this release did not change customer-baseline/schema authority.

## SKB-2026-09-23-01 — Release-base proof must finish before merge

```yaml
id: SKB-2026-09-23-01
status: implemented
evidence: production_verified
scope: global
area: release/template-factory
symptom: "Feature-head quality runs were green, but the first main production quality run exposed six golden diffs."
root_cause: "Diff-scoped feature runs were evaluated against recent feature commits. The release integration changed the comparison base to the previous production/main state, re-selecting catalog/contact visual changes that had been introduced earlier in the branch."
attempted_or_failed:
  - "Treating the latest feature push PASS as equivalent to a completed base-aware release PR gate."
resolution:
  - "Require the base-aware PR/release gate to complete before merge."
  - "Re-run exact main-head CI and Template Factory after merge."
verification:
  - "PR #350 CI and Template Factory both passed."
  - "Main f4651b9... CI and Template Factory both passed."
prevention:
  - "Do not merge a production release while the PR gate against current main is still in progress."
  - "A feature-parent exact-head PASS is necessary evidence, not sufficient release-integration evidence."
automation: HUMAN_REQUIRED
risk: high
```

## SKB-2026-09-23-02 — Accepted golden drift needs a non-circular promotion path

```yaml
id: SKB-2026-09-23-02
status: implemented
evidence: production_verified
scope: global
area: template-factory/golden-baseline
symptom: "Intentional, human-accepted visual changes caused GOLDEN_DIFF, while the promotion script required evidence.errors=[] before it could update the baseline."
root_cause: "The old promotion rule was circular for already-accepted templates: the new screenshot had to equal the old baseline before the new screenshot could become the baseline."
attempted_or_failed:
  - "Blindly replacing the full 14x3 baseline set."
  - "Treating any failed quality evidence as promotable."
resolution:
  - "Add an explicit accepted-golden-drift mode."
  - "Require exact source identity and the complete canonical 14x3 matrix."
  - "Permit only GOLDEN_DIFF / GOLDEN_BASELINE_MISSING in the explicit drift mode."
  - "Keep every non-golden failure blocking."
  - "When drift mode is used, copy only cases that actually contain golden drift; do not churn unrelated passing baselines."
verification:
  - "PR #350 Template Factory run 35823544256 passed."
  - "Main Template Factory run 35823851004 passed."
prevention:
  - "Golden promotion never substitutes for human visual acceptance."
  - "Do not update passing baselines merely because a full evidence bundle exists."
automation: HUMAN_REQUIRED
risk: high
```

## SKB-2026-09-23-03 — Dynamic Support Intake Wizard is topic-first

```yaml
id: SKB-2026-09-23-03
status: implemented
evidence: production_verified
scope: global
area: storefront/support
symptom: "A multi-step contact form behaved like a conventional form split across pages and asked for order data before the customer had identified the issue."
root_cause: "The initial wizard model was field-first instead of intent-first."
resolution:
  - "First screen contains compact topic choices only."
  - "Desktop: topic list left, hover/focus explanation panel right."
  - "Mobile: accordion rows with an explicit Ezt választom action."
  - "Topic choice routes into branch-specific fields."
  - "General information never asks for an order number."
  - "Order/product-return branches may require order identity."
  - "Contact data is collected later."
  - "Changing topic clears stale branch-only state."
  - "Required-field errors remain silent until an attempted step/submit."
verification:
  - "Shared wizard tests and Playroom acceptance tests pass."
  - "Production CI and Template Factory pass on f4651b9..."
prevention:
  - "Do not fork support business logic per template."
  - "Shared semantic flow; template-owned presentation."
automation: CONFIRM_FIX
risk: medium
```

## SKB-2026-09-23-04 — Page Schema contact canvas must paint the template background

```yaml
id: SKB-2026-09-23-04
status: implemented
evidence: production_verified
scope: global
area: storefront/runtime
symptom: "White background appeared between dark Playroom contact sections even though the individual sections used correct dark styles."
root_cause: "Transparent spacing exposed the application/body background because the Page Schema contact Runtime root did not paint the active template background token."
resolution:
  - "The shared contact Page Schema canvas paints var(--shoporation-color-background)."
verification:
  - "Production-ready contact evidence no longer exposes white gaps."
  - "Main Quality Gate is green."
prevention:
  - "A template-native page root must own the full visual canvas, including spacing between child sections."
automation: AUTO_FIX
risk: low
```

## SKB-2026-09-23-05 — Playroom post-release visual defects

Production-verified corrections include:

- Újdonságok: explicit breathing room between selection/help and Newsletter surfaces.
- Catalog hero: desktop/tablet media height aligned to the copy panel.
- Contact wizard: desktop width bounded; shared engine retained.
- Catalog categories: one `/webaruhaz` implementation with contextual query-driven headings, not duplicated category pages.
- Header: misleading desktop category/hamburger trigger hidden for Playroom; real mobile menu retained.
- Cart: explicit top/bottom breathing room around the live shared cart.
- Account: footer separation, dark empty-state presentation and readable marketing-consent labels.
- Product/catalog purchase action: Playroom primary blue.
- Stock count: red and scoped to stock only.

## Strict responsive-authority negative evidence

A rejected implementation placed a plain, non-materialized `config.style` object directly on the strict v2 `playroom-contact-form` node. Template Factory correctly failed with:

`QUALITY_RESPONSIVE_AUTHORITY_NOT_MATERIALIZED:pages.contact`

Rule:

**Strict canonical template nodes must preserve explicit responsive authority. Shared component defaults may provide safe presentation, but template-authored visual authority must be materialized as base/desktop/tablet/mobile when required by the contract.**

## Production release checklist learned here

Before declaring a future template release complete:

1. human visual acceptance is explicit;
2. exact feature head CI is green;
3. exact feature head Template Factory is green for its selected scope;
4. the PR against current main is mergeable;
5. the **PR/base-aware CI and Template Factory runs finish green before merge**;
6. production main deployment reaches READY;
7. main CI finishes green;
8. main Template Factory finishes green, including golden comparison;
9. Fresh Install is reported accurately as PASS or SKIPPED;
10. only then mark the release production-verified and refresh Shoperation Knowledge.

A Vercel **READY** deployment does not override a failed quality gate.
